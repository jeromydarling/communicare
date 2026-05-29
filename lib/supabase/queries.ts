// =============================================================================
// Shared Supabase queries
// =============================================================================
// Place for cross-cutting queries that were starting to live in three or
// four pages. Each one is a tiny pure function that takes a Supabase
// client (or null in demo mode) and returns the result — no side effects,
// no React hooks. The pages keep their own useEffect / loading state.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatorFarm = {
  farm_id: string;
  role: "owner" | "staff";
};

/**
 * Look up the farm the signed-in user owns or staffs. Three callers depend
 * on this exact shape (app/farmer/page.tsx, app/farmer/import/page.tsx,
 * app/farmer/onboarding/page.tsx) — keeping the role filter and the
 * maybeSingle semantics here so they can't drift.
 *
 * Returns null when the user isn't bound to any farm (e.g. mid-onboarding,
 * before farms.insert + farm_members.insert have happened).
 *
 * The signature uses the untyped SupabaseClient because farm_members isn't
 * in the hand-maintained Database type yet (see lib/supabase/types.ts). The
 * cast is the same pattern the calling pages already use for inserts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOperatorFarm(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<OperatorFarm | null> {
  const { data } = await supabase
    .from("farm_members")
    .select("farm_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "staff"])
    .maybeSingle();
  return (data as OperatorFarm | null) ?? null;
}
