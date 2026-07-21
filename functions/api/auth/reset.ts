// =============================================================================
// POST /api/auth/reset — set a new password from a reset token
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import {
  hashPassword,
  isPasswordStrongEnough,
  sha256Hex,
} from "../../_lib/crypto";
import { createSession, sessionCookie, destroyAllUserSessions } from "../../_lib/sessions";
import { one, run, nowIso } from "../../_lib/db";
import {
  sendEmail,
  passwordChangedEmail,
  type EmailSendBinding,
} from "../../_lib/email";

type Env = {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
};

type RequestBody = { token?: string; password?: string };

type TokenRow = {
  token_hash: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }
  const db = ctx.env.DB;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const token = body.token ?? "";
  const password = body.password ?? "";
  if (!token) return json({ error: "Missing token." }, 400);
  if (!isPasswordStrongEnough(password)) {
    return json(
      {
        error:
          "Pick a stronger password — twelve characters or more, mixed case and a number.",
      },
      400,
    );
  }

  const tokenHash = await sha256Hex(token);
  const row = await one<TokenRow>(
    db,
    `select token_hash, user_id, expires_at, used_at
       from password_reset_tokens where token_hash = ?`,
    [tokenHash],
  );
  if (!row || row.used_at) {
    return json({ error: "This reset link isn't valid anymore." }, 400);
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return json({ error: "This reset link has expired. Start over." }, 400);
  }

  const hash = await hashPassword(password);
  const now = nowIso();

  await db.batch([
    db.prepare(`update users set password_hash = ?, updated_at = ? where id = ?`)
      .bind(hash, now, row.user_id),
    db.prepare(`update password_reset_tokens set used_at = ? where token_hash = ?`)
      .bind(now, tokenHash),
  ]);

  // Standard practice: invalidate every session on password reset
  await destroyAllUserSessions(db, row.user_id);

  const ip = ctx.request.headers.get("cf-connecting-ip") ?? undefined;
  const ua = ctx.request.headers.get("user-agent") ?? undefined;
  const sess = await createSession(db, row.user_id, { ip, userAgent: ua });

  // Security alert — send the "your password just changed" note. Fire
  // via waitUntil so a slow SMTP path doesn't hold the response.
  const user = await one<{
    email: string;
    display_name: string | null;
    preferred_locale: string | null;
  }>(
    db,
    `select email, display_name, coalesce(preferred_locale,'en') as preferred_locale
       from users where id = ?`,
    [row.user_id],
  );
  if (user && ctx.env.EMAIL) {
    const site = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
    const msg = passwordChangedEmail({
      to: user.email,
      displayName: user.display_name,
      siteUrl: site,
      ip,
      locale: user.preferred_locale === "es" ? "es" : "en",
    });
    ctx.waitUntil(
      sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
        ...msg,
        replyTo: ctx.env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
      }),
    );
  }

  const res = json({ ok: true });
  res.headers.append("Set-Cookie", sessionCookie(sess.id, sess.expiresAt));
  return res;
};
