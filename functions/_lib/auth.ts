// =============================================================================
// auth — request-level identity check for API routes
// =============================================================================
// Two paths, in order:
//
//   1. D1 session cookie (the new, Workers-native auth). When DB is
//      bound and the cookie validates, return the user. This is the
//      target end-state.
//
//   2. Supabase JWT (transitional fallback). When DB isn't bound yet
//      OR the cookie isn't present, fall back to the Supabase
//      /auth/v1/user endpoint that the legacy flow uses. Lets the
//      site keep working while D1 is being seeded.
//
// Both paths return the same AuthResult shape so callers don't care
// which one validated the request.
// =============================================================================

import { json } from "./cors";
import { getSessionFromRequest } from "./sessions";
import { one } from "./db";

export type AuthedUser = {
  id: string;
  email: string;
};

export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: Response };

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export async function verifyAuth(
  req: Request,
  env: Env,
): Promise<AuthResult> {
  // ---- Path 1: D1 session cookie ----
  if (env.DB && req.headers.get("Cookie")?.includes("__Host-cmcr_session=")) {
    const result = await getSessionFromRequest(env.DB, req);
    if (result) {
      const user = await one<{ id: string; email: string }>(
        env.DB,
        `select id, email from users where id = ?`,
        [result.session.user_id],
      );
      if (user) return { ok: true, user };
    }
    // Cookie present but invalid — fall through to bearer path rather
    // than rejecting; lets us migrate one user at a time without
    // breaking the others.
  }

  // ---- Path 2: Supabase JWT fallback ----
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return {
        ok: false,
        response: json({ error: "Auth not configured on this deploy." }, 500),
      };
    }
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: env.SUPABASE_ANON_KEY },
    });
    if (res.ok) {
      const u = (await res.json()) as { id?: string; email?: string };
      if (u?.id) return { ok: true, user: { id: u.id, email: u.email ?? "" } };
    }
  }

  return {
    ok: false,
    response: json({ error: "Sign in to continue." }, 401),
  };
}
