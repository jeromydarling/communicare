// =============================================================================
// POST /api/farmer/invite-members — send magic-link invites in batch
// =============================================================================
// Called from the import wizard's success screen ("Send N invites now?") and
// available for any future "re-send invite" flow at /farmer/members. For
// each email:
//   1. Confirm the email belongs to a user bound to the calling farm
//      (anti-spam — operators can't blast random addresses)
//   2. Generate a magic_link_tokens row with purpose='invite'
//   3. Send via Resend with the invite template
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { newToken, sha256Hex } from "../../_lib/crypto";
import {
  magicLinkEmail,
  sendEmail,
  type EmailSendBinding,
  type Locale,
} from "../../_lib/email";
import { one, run } from "../../_lib/db";
import { safeRedirectOr } from "../../_lib/redirects";

type Env = {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = {
  farm_id?: string;
  emails?: string[];
  redirect_to?: string;
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
  if (!farmId) return json({ error: "Missing farm_id." }, 400);
  const emails = Array.from(
    new Set((body.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)),
  );
  if (emails.length === 0) return json({ error: "No emails to invite." }, 400);
  if (emails.length > 2000) return json({ error: "Max 2000 emails per call." }, 400);

  // Verify operator is staff
  const fm = await one<{ role: string }>(
    db,
    `select role from farm_members
      where farm_id = ? and user_id = ? and archived_at is null`,
    [farmId, auth.user.id],
  );
  if (!fm || (fm.role !== "owner" && fm.role !== "staff")) {
    return json({ error: "You're not on staff at this farm." }, 403);
  }

  // Find which of these emails belong to users on this farm. Also pull
  // each user's preferred_locale so the invite goes out in their
  // language.
  const placeholders = emails.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `select u.id as user_id, u.email, u.preferred_locale
         from users u
         join farm_members fm on fm.user_id = u.id
        where fm.farm_id = ? and u.email in (${placeholders}) collate nocase`,
    )
    .bind(farmId, ...emails)
    .all<{ user_id: string; email: string; preferred_locale: string }>();
  const userByEmail = new Map<
    string,
    { userId: string; locale: Locale }
  >();
  for (const r of rows.results ?? []) {
    const loc: Locale = r.preferred_locale === "es" ? "es" : "en";
    userByEmail.set(r.email.toLowerCase(), { userId: r.user_id, locale: loc });
  }

  // Default to /share/ if no redirect provided. Reject protocol-
  // relative redirects + anything not single-slash same-origin.
  const siteUrl = (ctx.env.SITE_URL ?? "https://mycommuni.care").replace(/\/+$/, "");
  const redirectTo = safeRedirectOr(body.redirect_to, "/share/");

  let invited = 0;
  let skipped = 0;
  let errored = 0;
  const results: { email: string; status: "invited" | "skipped" | "error"; message?: string }[] = [];

  for (const email of emails) {
    const entry = userByEmail.get(email);
    if (!entry) {
      results.push({ email, status: "skipped", message: "not a member of this farm" });
      skipped++;
      continue;
    }
    const { userId, locale } = entry;
    try {
      const token = newToken();
      const tokenHash = await sha256Hex(token);
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await run(
        db,
        `insert into magic_link_tokens
            (token_hash, email, user_id, purpose, redirect_to, locale, expires_at)
         values (?, ?, ?, 'invite', ?, ?, ?)`,
        [tokenHash, email, userId, redirectTo, locale, expires],
      );
      const link = `${siteUrl}/api/auth/magic-callback?token=${encodeURIComponent(token)}`;
      const sent = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
        ...magicLinkEmail({ to: email, link, purpose: "invite", locale }),
        replyTo: ctx.env.SYSTEM_REPLY_TO,
      });
      if (sent.ok) {
        results.push({ email, status: "invited" });
        invited++;
      } else {
        results.push({ email, status: "error", message: sent.error });
        errored++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ email, status: "error", message: msg });
      errored++;
    }
  }

  return json({ ok: true, invited, skipped, errored, results });
};
