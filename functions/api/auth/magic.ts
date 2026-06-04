// =============================================================================
// POST /api/auth/magic — request a magic-link sign-in
// =============================================================================
// Email-only sign-in. Creates a one-shot token, persists it, emails the
// click-through link. Returns a generic success even if the email
// doesn't have an account so we don't leak which emails exist.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { newToken, sha256Hex } from "../../_lib/crypto";
import { rateLimit, ipBucket } from "../../_lib/ratelimit";
import { magicLinkEmail, sendEmail, type EmailSendBinding } from "../../_lib/email";
import { one, run } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  RATELIMIT?: KVNamespace;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
};

type RequestBody = { email?: string; redirect_to?: string };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }

  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "magic-request"),
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) {
    return json({ error: "Valid email required." }, 400);
  }

  // Look up the user. If they don't exist we STILL return success and
  // skip sending — leaking "this email has an account" via timing or
  // response shape is the easy account-enumeration attack.
  const user = await one<{ id: string }>(
    ctx.env.DB,
    `select id from users where email = ?`,
    [email],
  );
  if (!user) {
    return json({ ok: true });
  }

  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Only allow same-origin redirect_to. Don't trust the client.
  const siteUrl = (ctx.env.SITE_URL ?? "https://mycommuni.care").replace(/\/+$/, "");
  let redirectTo: string | null = null;
  if (typeof body.redirect_to === "string" && body.redirect_to.startsWith("/")) {
    redirectTo = body.redirect_to.slice(0, 256);
  }

  await run(
    ctx.env.DB,
    `insert into magic_link_tokens (token_hash, email, user_id, purpose, redirect_to, expires_at)
     values (?, ?, ?, 'signin', ?, ?)`,
    [tokenHash, email, user.id, redirectTo, expires],
  );

  const link = `${siteUrl}/api/auth/magic-callback?token=${encodeURIComponent(token)}`;
  const sent = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
    ...magicLinkEmail({ to: email, link, purpose: "signin" }),
    replyTo: ctx.env.SYSTEM_REPLY_TO,
  });
  if (!sent.ok) {
    console.error("magic send failed:", sent.error);
    // Still return success — never tell the caller why the email failed
  }
  return json({ ok: true });
};
