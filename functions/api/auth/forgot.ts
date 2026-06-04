// =============================================================================
// POST /api/auth/forgot — start a password reset
// =============================================================================
// Same anti-enumeration shape as /api/auth/magic: generic success even
// if the email doesn't have an account. The reset email is fire-and-
// forget; the response always reads "Check your inbox."
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { newToken, sha256Hex } from "../../_lib/crypto";
import { rateLimit, ipBucket } from "../../_lib/ratelimit";
import { passwordResetEmail, sendEmail, type EmailSendBinding } from "../../_lib/email";
import { one, run } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  RATELIMIT?: KVNamespace;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
};

type RequestBody = { email?: string };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }

  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "forgot"),
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

  const user = await one<{ id: string }>(
    ctx.env.DB,
    `select id from users where email = ?`,
    [email],
  );
  if (!user) return json({ ok: true });

  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await run(
    ctx.env.DB,
    `insert into password_reset_tokens (token_hash, user_id, expires_at)
     values (?, ?, ?)`,
    [tokenHash, user.id, expires],
  );

  const siteUrl = (ctx.env.SITE_URL ?? "https://mycommuni.care").replace(/\/+$/, "");
  const link = `${siteUrl}/farmer/reset-password/?token=${encodeURIComponent(token)}`;
  const sent = await sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
    ...passwordResetEmail({ to: email, link }),
    replyTo: ctx.env.SYSTEM_REPLY_TO,
  });
  if (!sent.ok) console.error("reset send failed:", sent.error);

  return json({ ok: true });
};
