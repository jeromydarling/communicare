// =============================================================================
// verifyStaff — confirm the caller is owner/staff at a farm
// =============================================================================
// Used by import-members and invite-members (and any future function gated
// to farm operators). Returns the auth user_id on success, or a Response
// the caller can return immediately on failure (400/401/403).
//
// The function expects:
//   - `Authorization: Bearer <jwt>` header on the request
//   - A service-role Supabase client to verify the JWT and look up the role
//   - The farm_id the operator is claiming to act on
// =============================================================================

import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.50.0";
import { json } from "./response.ts";

export type StaffVerification =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function verifyStaff(
  req: Request,
  admin: SupabaseClient,
  farmId: string,
): Promise<StaffVerification> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: json({ error: "Missing Authorization bearer." }, 401) };
  }
  const token = authHeader.slice(7);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, response: json({ error: "Invalid session." }, 401) };
  }
  const userId = userData.user.id;

  const { data: membership } = await admin
    .from("farm_members")
    .select("role")
    .eq("farm_id", farmId)
    .eq("user_id", userId)
    .maybeSingle();
  type Membership = { role: "owner" | "staff" | "member" } | null;
  const m = membership as Membership;
  if (!m || (m.role !== "owner" && m.role !== "staff")) {
    return { ok: false, response: json({ error: "You're not on staff at this farm." }, 403) };
  }
  return { ok: true, userId };
}
