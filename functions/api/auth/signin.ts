// =============================================================================
// POST /api/auth/signin — email + password sign-in
// =============================================================================
// On success: sets the session cookie and returns the user shape.
// On failure: rate-limited 401. We deliberately don't distinguish
// "no such email" from "wrong password" — both attackers and honest
// users get the same generic message, while the rate limit makes the
// distinction empirically useless to brute force.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyPassword } from "../../_lib/crypto";
import { createSession, sessionCookie } from "../../_lib/sessions";
import { rateLimit, ipBucket } from "../../_lib/ratelimit";
import { one } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  RATELIMIT?: KVNamespace;
};

type RequestBody = { email?: string; password?: string };

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }
  const db = ctx.env.DB;

  // 10 attempts per hour per IP — generous for a real user fat-fingering
  // their password, very tight for a credential-stuffing script.
  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "signin"),
    limit: 10,
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
  const password = body.password ?? "";
  if (!email || !password) {
    return json({ error: "Email and password required." }, 400);
  }

  const user = await one<UserRow>(
    db,
    `select id, email, password_hash, display_name from users where email = ?`,
    [email],
  );

  // Generic failure on either branch
  if (!user || !user.password_hash) {
    // Run a dummy verify against a fixed hash to avoid timing leaks
    // between "no user" and "user but wrong password"
    await verifyPassword(
      password,
      "pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    return json({ error: "Sign-in didn't work. Check your email and password." }, 401);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return json({ error: "Sign-in didn't work. Check your email and password." }, 401);
  }

  const ip = ctx.request.headers.get("cf-connecting-ip") ?? undefined;
  const ua = ctx.request.headers.get("user-agent") ?? undefined;
  const sess = await createSession(db, user.id, { ip, userAgent: ua });

  const res = json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
    },
  });
  res.headers.append("Set-Cookie", sessionCookie(sess.id, sess.expiresAt));
  return res;
};
