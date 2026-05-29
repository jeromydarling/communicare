// =============================================================================
// import-members — Supabase Edge Function (Deno runtime)
// =============================================================================
// Powers the /farmer/import wizard's commit step. The client has already
// parsed the CSV, asked the AI to map columns, and let the operator confirm
// the share-type and pickup-site mapping. We receive the cleaned rows + the
// mapping and write them transactionally:
//
//   1. Validate the operator is staff at this farm
//   2. Create the import_runs audit row (status=pending)
//   3. For each row:
//      a. Find or invite an auth.users record (by email)
//      b. The handle_new_user trigger creates the public.profiles row
//      c. Upsert a farm_members row (binding the profile to this farm)
//      d. Create the subscription with the chosen share_definition_id +
//         pickup_site_id (bigint)
//      e. If credit_cents > 0, insert one credit_ledger entry
//   4. Optionally send a magic-link invite via auth.admin.inviteUserByEmail
//   5. Update import_runs with the counts + results jsonb
//
// We use the SERVICE_ROLE_KEY for the writes so the auth.admin calls work
// and the per-row trigger logic (credit_ledger balance) runs without RLS.
//
// Deploy:   supabase functions deploy import-members --no-verify-jwt
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import { z } from "npm:zod@^3.24.0";
import { preflightResponse } from "../_lib/cors.ts";
import { json } from "../_lib/response.ts";
import { verifyStaff } from "../_lib/verify-staff.ts";

// -----------------------------------------------------------------------------
// Input schema
// -----------------------------------------------------------------------------

const RowSchema = z.object({
  // Original CSV row number, for error reporting back to the user.
  row_number: z.number().int().min(1),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  // The operator (or AI) mapped this row to one of their share_definitions.
  share_definition_id: z.string().uuid(),
  // Optional — null means "no default pickup site, member picks weekly."
  // pickup_sites.id is bigint in the schema, so accept a number.
  pickup_site_id: z.number().int().positive().nullable().optional(),
  // Opening credit balance in cents. Default 0.
  credit_cents: z.number().int().min(0).default(0),
  // ISO date string, when the member joined. Default today.
  started_on: z.string().nullable().optional(),
  // Free-form note the operator wants to keep on the subscription.
  note: z.string().max(1000).nullable().optional(),
});

const ImportSourceEnum = z.enum([
  "barn2door",
  "local-line",
  "harvie",
  "grazecart",
  "csaware",
  "shopify",
  "spreadsheet",
  "paper",
  "other",
]);

const RequestInput = z.object({
  farm_id: z.string().uuid(),
  source: ImportSourceEnum,
  filename: z.string().max(200).nullable().optional(),
  rows: z.array(RowSchema).min(1).max(2000),
  // Free-form mapping snapshot for the audit row.
  mapping: z.record(z.unknown()).optional(),
  // If true, validate everything but don't actually write.
  dry_run: z.boolean().default(false),
  // If true, send a magic-link invite email to each imported member with
  // a usable email address. Off by default — the wizard surfaces it as a
  // confirmation step after the import lands.
  send_invites: z.boolean().default(false),
});

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse();
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = RequestInput.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400,
    );
  }
  const input = parsed.data;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(
      { error: "Supabase service-role config missing inside the function." },
      500,
    );
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---------------------------------------------------------------------------
  // 1. Authenticate the operator + verify they own this farm.
  // ---------------------------------------------------------------------------
  const verification = await verifyStaff(req, admin, input.farm_id);
  if (!verification.ok) return verification.response;
  const userId = verification.userId;

  // ---------------------------------------------------------------------------
  // 2. Confirm the share_definition_ids + pickup_site_ids actually belong to
  //    this farm. Reject the whole import otherwise — partial-trust mappings
  //    would let one farm bind members into another's subscriptions.
  // ---------------------------------------------------------------------------
  const shareIds = Array.from(new Set(input.rows.map((r) => r.share_definition_id)));
  const pickupIds = Array.from(
    new Set(
      input.rows
        .map((r) => r.pickup_site_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  );

  const { data: validShares } = await admin
    .from("share_definitions")
    .select("id")
    .eq("farm_id", input.farm_id)
    .in("id", shareIds);
  const validShareIds = new Set(
    ((validShares ?? []) as { id: string }[]).map((r) => r.id),
  );
  const badShares = shareIds.filter((id) => !validShareIds.has(id));
  if (badShares.length > 0) {
    return json(
      {
        error: "Some share_definition_ids don't belong to this farm.",
        details: badShares,
      },
      400,
    );
  }

  if (pickupIds.length > 0) {
    const { data: validPickups } = await admin
      .from("pickup_sites")
      .select("id")
      .eq("farm_id", input.farm_id)
      .in("id", pickupIds);
    const validPickupIds = new Set(
      ((validPickups ?? []) as { id: number }[]).map((r) => r.id),
    );
    const badPickups = pickupIds.filter((id) => !validPickupIds.has(id));
    if (badPickups.length > 0) {
      return json(
        {
          error: "Some pickup_site_ids don't belong to this farm.",
          details: badPickups,
        },
        400,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Create the audit row. Even on dry_run we keep this — the
  //    "previewed" status tells us what the operator looked at.
  // ---------------------------------------------------------------------------
  const { data: runRow, error: runErr } = await admin
    .from("import_runs")
    .insert({
      farm_id: input.farm_id,
      initiated_by: userId,
      source: input.source,
      status: input.dry_run ? "previewed" : "pending",
      rows_total: input.rows.length,
      mapping: input.mapping ?? {},
      filename: input.filename ?? null,
    } as never)
    .select("id")
    .single();
  if (runErr || !runRow) {
    console.error("import_runs insert error", runErr);
    return json({ error: "Couldn't open an import run." }, 500);
  }
  const runId = (runRow as { id: string }).id;

  if (input.dry_run) {
    return json({
      ok: true,
      run_id: runId,
      dry_run: true,
      would_import: input.rows.length,
      message:
        "Looks good. Confirm with dry_run=false to actually write the rows.",
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Per-row processing — find-or-invite auth user (which auto-creates the
  //    profile via the handle_new_user trigger), link to farm, subscribe,
  //    seed credit. Each error becomes a warning row in results; we continue
  //    so a single bad row doesn't abort the whole import.
  // ---------------------------------------------------------------------------
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
  // Process one CSV row → auth user, profile, membership, subscription,
  // credit ledger, optional invite. Returns a RowResult either way; never
  // throws, so a single bad row can't poison the chunk.
  async function processRow(
    row: typeof input.rows[number],
  ): Promise<RowResult> {
    try {
      // 4a. Find-or-create the auth user. We use admin.createUser with
      //     email_confirm=true so the row exists without sending an email
      //     yet — the invite step (4e) is opt-in via send_invites.
      let profileId: string | null = null;
      const emailLower = row.email ? row.email.toLowerCase() : null;

      if (emailLower) {
        const { data: existing } = await admin
          .from("profiles")
          .select("id")
          .eq("email", emailLower)
          .maybeSingle();
        const e = existing as { id: string } | null;
        if (e) profileId = e.id;
      }
      if (!profileId && row.phone) {
        const { data: existing } = await admin
          .from("profiles")
          .select("id")
          .eq("phone", row.phone)
          .maybeSingle();
        const p = existing as { id: string } | null;
        if (p) profileId = p.id;
      }
      if (!profileId) {
        if (!emailLower) {
          throw new Error(
            "no email — needs a unique email to invite this member",
          );
        }
        const { data: created, error: createErr } =
          await admin.auth.admin.createUser({
            email: emailLower,
            phone: row.phone ?? undefined,
            email_confirm: true,
            user_metadata: { display_name: row.name },
          });
        if (createErr || !created?.user) {
          throw new Error(`create user: ${createErr?.message ?? "unknown"}`);
        }
        profileId = created.user.id;
        if (row.phone) {
          await admin
            .from("profiles")
            .update({ phone: row.phone } as never)
            .eq("id", profileId);
        }
      }

      // 4b. Bind to farm (no-op if already a member)
      await admin
        .from("farm_members")
        .upsert(
          {
            farm_id: input.farm_id,
            user_id: profileId,
            role: "member",
            invited_at: new Date().toISOString(),
          } as never,
          { onConflict: "farm_id,user_id", ignoreDuplicates: true },
        );

      // 4c. Subscription
      const { data: sub, error: subErr } = await admin
        .from("subscriptions")
        .insert({
          farm_id: input.farm_id,
          user_id: profileId,
          share_definition_id: row.share_definition_id,
          default_pickup_site_id: row.pickup_site_id ?? null,
          status: "active",
          started_on: row.started_on ?? new Date().toISOString().slice(0, 10),
          metadata: row.note ? { import_note: row.note } : {},
        } as never)
        .select("id")
        .single();
      if (subErr) throw new Error(`subscription create: ${subErr.message}`);
      const subId = (sub as { id: string }).id;

      // 4d. Opening credit
      if (row.credit_cents > 0) {
        await admin.from("credit_ledger").insert({
          farm_id: input.farm_id,
          user_id: profileId,
          delta_cents: row.credit_cents,
          balance_after_cents: row.credit_cents,
          reason: "import_opening_balance",
          note: `Imported from ${input.source}`,
        } as never);
      }

      // 4e. Optional invite. We don't fail the row if invite fails — the
      //     member is still imported and can be re-invited later.
      let didInvite = false;
      if (input.send_invites && emailLower) {
        const { error: inviteErr } =
          await admin.auth.admin.inviteUserByEmail(emailLower);
        if (!inviteErr) didInvite = true;
      }

      return {
        row_number: row.row_number,
        name: row.name,
        email: emailLower,
        status: "imported",
        profile_id: profileId,
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

  // Run rows in parallel chunks. Within a chunk the rows are concurrent;
  // chunks run sequentially so we cap in-flight work at CHUNK_SIZE. That
  // keeps us well under the auth-admin burst rate and bounded against
  // PgBouncer connection pool exhaustion, while still cutting wall time
  // from sequential's ~400s down to ~40s on a 2000-row import (the
  // documented max). If real-world auth rate limits surface, the next
  // refinement is per-chunk backoff or moving the workload to a
  // background job table.
  const CHUNK_SIZE = 10;
  const results: RowResult[] = [];
  for (let i = 0; i < input.rows.length; i += CHUNK_SIZE) {
    const chunk = input.rows.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(processRow));
    results.push(...chunkResults);
  }

  let imported = 0;
  let skipped = 0;
  let warned = 0;
  let invited = 0;
  for (const r of results) {
    if (r.status === "imported") imported++;
    else if (r.status === "skipped") skipped++;
    else warned++;
    if (r.invited) invited++;
  }

  // ---------------------------------------------------------------------------
  // 5. Update the audit row with the final counts + per-row results
  // ---------------------------------------------------------------------------
  await admin
    .from("import_runs")
    .update({
      status: "committed",
      rows_imported: imported,
      rows_skipped: skipped,
      rows_warned: warned,
      results,
      committed_at: new Date().toISOString(),
    } as never)
    .eq("id", runId);

  return json({
    ok: true,
    run_id: runId,
    imported,
    skipped,
    warned,
    invited,
    results,
  });
});
