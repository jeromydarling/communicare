// =============================================================================
// POST /api/farmer/import-members — Workers-native CSV import
// =============================================================================
// Worker port of supabase/functions/import-members/index.ts. Same input
// schema, same per-row semantics (errors stay row-local, status="warned",
// import continues), same parallel-chunks pacing + auth-admin backoff
// pattern.
//
// Differences vs. Supabase version:
//   - Writes to D1 instead of Postgres
//   - Creates users + profiles + farm_members in D1 batches (no auth.users
//     trigger to ride; we own the table)
//   - Magic-link invites use our own magic_link_tokens + sendEmail
//     instead of supabase auth.admin.inviteUserByEmail
//   - Authorization is session cookie (verifyAuth) not bearer JWT
//
// The frontend payload is unchanged; the page's commit() call swaps URL
// from supabase.functions.invoke("import-members") to fetch("/api/farmer/
// import-members").
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, run, uuid, nowIso } from "../../_lib/db";
import { newToken, sha256Hex } from "../../_lib/crypto";
import {
  magicLinkEmail,
  sendEmail,
  detectLocaleFromRequest,
  type EmailSendBinding,
  type Locale,
} from "../../_lib/email";

type Env = {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const VALID_SOURCE = new Set([
  "barn2door", "local-line", "harvie", "grazecart", "csaware",
  "shopify", "spreadsheet", "paper", "other",
]);

type Row = {
  row_number: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  share_definition_id: string;
  pickup_site_id?: number | null;
  credit_cents?: number;
  started_on?: string | null;
  note?: string | null;
  /** Per-row locale override. Falls back to the request default. */
  locale?: Locale;
};

type RequestBody = {
  farm_id?: string;
  source?: string;
  filename?: string | null;
  rows?: Row[];
  mapping?: Record<string, unknown>;
  dry_run?: boolean;
  send_invites?: boolean;
};

type RowResult = {
  row_number: number;
  name: string;
  email?: string | null;
  status: "imported" | "skipped" | "warned";
  message?: string;
  profile_id?: string;
  subscription_id?: string;
  invited?: boolean;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const db = ctx.env.DB;

  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const farmId = body.farm_id ?? "";
  const source = body.source ?? "";
  const defaultLocale: Locale = detectLocaleFromRequest(ctx.request);
  if (!farmId) return json({ error: "Missing farm_id." }, 400);
  if (!VALID_SOURCE.has(source)) return json({ error: "Invalid source." }, 400);
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return json({ error: "rows is required." }, 400);
  }
  if (body.rows.length > 2000) {
    return json({ error: "Max 2000 rows per import." }, 400);
  }

  // Verify the operator is staff at this farm
  const fm = await one<{ role: string }>(
    db,
    `select role from farm_members
      where farm_id = ? and user_id = ? and archived_at is null`,
    [farmId, auth.user.id],
  );
  if (!fm || (fm.role !== "owner" && fm.role !== "staff")) {
    return json({ error: "You're not on staff at this farm." }, 403);
  }

  // Sanity-check share + pickup IDs belong to this farm
  const shareIds = Array.from(new Set(body.rows.map((r) => r.share_definition_id)));
  const placeholders = shareIds.map(() => "?").join(",");
  const validShares = await db
    .prepare(`select id from share_definitions where farm_id = ? and id in (${placeholders})`)
    .bind(farmId, ...shareIds)
    .all<{ id: string }>();
  const validShareSet = new Set((validShares.results ?? []).map((r) => r.id));
  const badShares = shareIds.filter((id) => !validShareSet.has(id));
  if (badShares.length > 0) {
    return json(
      { error: "Some share_definition_ids don't belong to this farm.", details: badShares },
      400,
    );
  }
  const pickupIds = Array.from(
    new Set(body.rows.map((r) => r.pickup_site_id).filter((v): v is number => typeof v === "number")),
  );
  if (pickupIds.length > 0) {
    const ph = pickupIds.map(() => "?").join(",");
    const validPickups = await db
      .prepare(`select id from pickup_sites where farm_id = ? and id in (${ph})`)
      .bind(farmId, ...pickupIds)
      .all<{ id: number }>();
    const validSet = new Set((validPickups.results ?? []).map((r) => r.id));
    const bad = pickupIds.filter((id) => !validSet.has(id));
    if (bad.length > 0) {
      return json(
        { error: "Some pickup_site_ids don't belong to this farm.", details: bad },
        400,
      );
    }
  }

  // Create the import_runs audit row
  const runId = uuid();
  const now = nowIso();
  await run(
    db,
    `insert into import_runs
       (id, farm_id, initiated_by, source, status, rows_total,
        mapping, filename, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      runId,
      farmId,
      auth.user.id,
      source,
      body.dry_run ? "previewed" : "pending",
      body.rows.length,
      JSON.stringify(body.mapping ?? {}),
      body.filename ?? null,
      now,
    ],
  );

  if (body.dry_run) {
    return json({
      ok: true,
      run_id: runId,
      dry_run: true,
      would_import: body.rows.length,
      message: "Looks good. Confirm with dry_run=false to actually write the rows.",
    });
  }

  // -----------------------------------------------------------------
  // Per-row processing
  // -----------------------------------------------------------------

  async function processRow(row: Row): Promise<RowResult> {
    try {
      const emailLower = row.email ? row.email.toLowerCase() : null;

      // Find existing user by email or phone
      let userId: string | null = null;
      if (emailLower) {
        const found = await one<{ id: string }>(
          db,
          `select id from users where email = ?`,
          [emailLower],
        );
        if (found) userId = found.id;
      }
      if (!userId && row.phone) {
        const found = await one<{ id: string }>(
          db,
          `select id from profiles where phone = ?`,
          [row.phone],
        );
        if (found) userId = found.id;
      }

      // Create user if missing
      if (!userId) {
        if (!emailLower) {
          throw new Error("no email — needs a unique email to invite this member");
        }
        userId = uuid();
        const userNow = nowIso();
        await db.batch([
          db.prepare(
            `insert into users (id, email, display_name, metadata, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?)`,
          ).bind(userId, emailLower, row.name, "{}", userNow, userNow),
          db.prepare(
            `insert into profiles (id, email, display_name, phone, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?)`,
          ).bind(userId, emailLower, row.name, row.phone ?? null, userNow, userNow),
        ]);
      }

      // farm_members upsert (ignore duplicates)
      await run(
        db,
        `insert or ignore into farm_members
            (farm_id, user_id, role, invited_at, joined_at)
         values (?, ?, 'member', ?, ?)`,
        [farmId, userId, now, now],
      );

      // Subscription
      const subId = uuid();
      await run(
        db,
        `insert into subscriptions
           (id, farm_id, user_id, share_definition_id,
            default_pickup_site_id, status, started_on,
            metadata, created_at, updated_at)
         values (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [
          subId,
          farmId,
          userId,
          row.share_definition_id,
          row.pickup_site_id ?? null,
          row.started_on ?? new Date().toISOString().slice(0, 10),
          row.note ? JSON.stringify({ import_note: row.note }) : "{}",
          now,
          now,
        ],
      );

      // Opening credit
      if (typeof row.credit_cents === "number" && row.credit_cents > 0) {
        await run(
          db,
          `insert into credit_ledger
              (farm_id, user_id, delta_cents, balance_after_cents,
               reason, note, created_at)
           values (?, ?, ?, ?, 'import_opening_balance', ?, ?)`,
          [
            farmId, userId,
            row.credit_cents, row.credit_cents,
            `Imported from ${source}`, now,
          ],
        );
      }

      // Optional invite
      let didInvite = false;
      if (body.send_invites && emailLower && ctx.env.EMAIL) {
        try {
          const token = newToken();
          const tokenHash = await sha256Hex(token);
          const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          await run(
            db,
            `insert into magic_link_tokens
               (token_hash, email, user_id, purpose, expires_at)
             values (?, ?, ?, 'invite', ?)`,
            [tokenHash, emailLower, userId, expires],
          );
          const siteUrl = (ctx.env.SITE_URL ?? "https://mycommuni.care").replace(/\/+$/, "");
          const link = `${siteUrl}/api/auth/magic-callback?token=${encodeURIComponent(token)}`;
          const locale: Locale =
            row.locale === "es" || row.locale === "en"
              ? row.locale
              : defaultLocale;
          const sent = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
            ...magicLinkEmail({ to: emailLower, link, purpose: "invite", locale }),
            replyTo: ctx.env.SYSTEM_REPLY_TO,
          });
          if (sent.ok) didInvite = true;
        } catch (err) {
          console.warn("invite failed for row", row.row_number, err);
        }
      }

      return {
        row_number: row.row_number,
        name: row.name,
        email: emailLower,
        status: "imported",
        profile_id: userId,
        subscription_id: subId,
        invited: didInvite,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        row_number: row.row_number,
        name: row.name,
        email: row.email ?? null,
        status: "warned",
        message: msg,
      };
    }
  }

  // Run rows in parallel chunks (same strategy as the Supabase version
  // — D1 + Resend have similar burst limits to GoTrue)
  const CHUNK_SIZE = 10;
  const INTER_CHUNK_MS = 200;
  const results: RowResult[] = [];
  for (let i = 0; i < body.rows.length; i += CHUNK_SIZE) {
    const chunk = body.rows.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(processRow));
    results.push(...chunkResults);
    if (i + CHUNK_SIZE < body.rows.length) {
      await new Promise((r) => setTimeout(r, INTER_CHUNK_MS));
    }
  }

  let imported = 0;
  let warned = 0;
  let invited = 0;
  for (const r of results) {
    if (r.status === "imported") imported++;
    if (r.status === "warned") warned++;
    if (r.invited) invited++;
  }

  await run(
    db,
    `update import_runs set
        status = 'committed',
        rows_imported = ?,
        rows_warned = ?,
        results = ?,
        committed_at = ?
      where id = ?`,
    [imported, warned, JSON.stringify(results), nowIso(), runId],
  );

  return json({
    ok: true,
    run_id: runId,
    imported,
    skipped: 0,
    warned,
    invited,
    results,
  });
};
