// =============================================================================
// admin — auth guard for /api/admin/* routes
// =============================================================================
// Reads users.is_admin (flipped manually via wrangler d1 execute; no
// admin-signup route exists). Chains verifyAuth first, then checks the
// flag. Returns a plain 404 when the flag is 0 — the CRM shouldn't
// advertise its existence to a signed-in-but-not-admin user.
// =============================================================================

import { json } from "./cors";
import { verifyAuth } from "./auth";
import { one } from "./db";

type AdminEnv = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export type AdminAuthResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; response: Response };

export async function requireAdmin(
  req: Request,
  env: AdminEnv,
): Promise<AdminAuthResult> {
  const auth = await verifyAuth(req, env);
  if (!auth.ok) return { ok: false, response: auth.response };
  if (!env.DB) {
    return { ok: false, response: json({ error: "Database not configured." }, 500) };
  }
  const row = await one<{ is_admin: number }>(
    env.DB,
    `select coalesce(is_admin, 0) as is_admin from users where id = ?`,
    [auth.user.id],
  );
  if (!row?.is_admin) {
    return { ok: false, response: json({ error: "Not found." }, 404) };
  }
  return { ok: true, user: auth.user };
}
