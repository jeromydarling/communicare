// =============================================================================
// auth — Supabase JWT verification, transitional
// =============================================================================
// During the migration window (Phase 0 — Phase 7), auth still lives on
// Supabase. Pages Functions that need an authenticated caller verify the
// Supabase JWT by hitting Supabase's auth endpoint. Once auth moves to
// Workers (Phase 3), this file's verifyAuth() gets swapped for a local
// session-cookie check against the SESSIONS KV namespace.
//
// We don't validate the JWT signature locally yet — the round-trip to
// Supabase's /auth/v1/user keeps us correct without bundling a JWT crypto
// library, and adds ~20ms which is fine for upload-URL signing latency.
// =============================================================================

import { json } from "./cors";

export type AuthedUser = {
  id: string;
  email: string;
};

export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: Response };

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export async function verifyAuth(
  req: Request,
  env: Env,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: json({ error: "Missing Authorization bearer." }, 401) };
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      response: json(
        { error: "Auth not configured on this deploy." },
        500,
      ),
    };
  }

  // Supabase's /auth/v1/user endpoint validates the JWT and returns the
  // user row. apikey is required even when the JWT is in Authorization.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) {
    return { ok: false, response: json({ error: "Invalid session." }, 401) };
  }
  const user = (await res.json()) as { id?: string; email?: string };
  if (!user?.id) {
    return { ok: false, response: json({ error: "Invalid session." }, 401) };
  }
  return { ok: true, user: { id: user.id, email: user.email ?? "" } };
}
