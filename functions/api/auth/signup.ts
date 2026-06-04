// =============================================================================
// POST /api/auth/signup — email + password account creation
// =============================================================================
// Creates the auth user (users table), the public profile (profiles
// table — same shape as in the Supabase schema, kept for API parity),
// optionally captures the farm_name from user_metadata for the
// onboarding wizard's prefill, and sets a session cookie.
//
// What this does NOT do (intentional):
//   - Email verification before login. We mint the session immediately
//     and send a confirmation magic link in the background (Phase 3.1
//     can flip this to "verify-first" if we see abuse).
//   - Farm row creation. The onboarding wizard handles that on its
//     first step, and it's the one place that knows the kind/location.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { hashPassword, isPasswordStrongEnough, newToken, sha256Hex } from "../../_lib/crypto";
import { createSession, sessionCookie } from "../../_lib/sessions";
import { magicLinkEmail, sendEmail } from "../../_lib/email";
import { one, run, uuid, nowIso } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  SITE_URL?: string;
};

type RequestBody = {
  email?: string;
  password?: string;
  display_name?: string;
  farm_name?: string;
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

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = (body.display_name ?? "").trim();

  if (!/.+@.+\..+/.test(email)) {
    return json({ error: "Valid email required." }, 400);
  }
  if (!isPasswordStrongEnough(password)) {
    return json(
      {
        error:
          "Pick a stronger password — twelve characters or more, mixed case and a number.",
      },
      400,
    );
  }

  // Refuse to create a duplicate. The unique index would catch this
  // too, but the explicit check lets us return a friendlier message.
  const existing = await one<{ id: string }>(
    db,
    `select id from users where email = ?`,
    [email],
  );
  if (existing) {
    return json(
      {
        error:
          "There's already an account with this email. Sign in instead — or send yourself a magic link.",
      },
      409,
    );
  }

  const userId = uuid();
  const passwordHash = await hashPassword(password);
  const now = nowIso();

  // Two writes in a D1 batch (atomic):
  await db.batch([
    db
      .prepare(
        `insert into users (id, email, password_hash, display_name,
                            metadata, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        email,
        passwordHash,
        displayName || null,
        JSON.stringify(body.farm_name ? { farm_name: body.farm_name } : {}),
        now,
        now,
      ),
    db
      .prepare(
        `insert into profiles (id, email, display_name, created_at, updated_at)
         values (?, ?, ?, ?, ?)`,
      )
      .bind(userId, email, displayName || null, now, now),
  ]);

  // Mint a session straight away — the operator goes from signup to
  // the onboarding wizard without a separate sign-in step.
  const ip = ctx.request.headers.get("cf-connecting-ip") ?? undefined;
  const ua = ctx.request.headers.get("user-agent") ?? undefined;
  const sess = await createSession(db, userId, { ip, userAgent: ua });

  // Fire-and-forget confirmation email so we have a record of who
  // controls the address. The signup doesn't block on it — the
  // sliding-window session is durable until the user clicks back in.
  ctx.waitUntil(sendConfirmationEmail(ctx.env, db, userId, email));

  const res = json({
    ok: true,
    user: { id: userId, email, display_name: displayName || null },
  });
  res.headers.append("Set-Cookie", sessionCookie(sess.id, sess.expiresAt));
  return res;
};

async function sendConfirmationEmail(
  env: Env,
  db: D1Database,
  userId: string,
  email: string,
): Promise<void> {
  if (!env.RESEND_API_KEY) return; // Resend not wired, skip silently
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await run(
    db,
    `insert into magic_link_tokens (token_hash, email, user_id, purpose, expires_at)
     values (?, ?, ?, 'confirm', ?)`,
    [tokenHash, email, userId, expires],
  );
  const siteUrl = env.SITE_URL ?? "https://mycommuni.care";
  const link = `${siteUrl.replace(/\/+$/, "")}/api/auth/magic-callback?token=${encodeURIComponent(token)}`;
  await sendEmail(env.RESEND_API_KEY, env.RESEND_FROM, magicLinkEmail({
    to: email,
    link,
    purpose: "confirm",
  }));
}
