// =============================================================================
// slugify — used in onboarding farm-creation and could pop up elsewhere.
// =============================================================================
// Constraints baked in: lowercase letters / numbers / dashes only, no
// leading or trailing dashes, ≤60 characters. Matches the validation in
// supabase/migrations/20260525230000_onboarding_rls_fixes.sql →
// create_farm_for_self, so a slug that passes here also passes the RPC.
//
// The Deno-side edge function (supabase/functions/find-nearby-farms) has a
// near-identical function with a `zip` suffix appended; we don't share that
// across runtimes — copying eight lines costs less than threading a Node↔
// Deno bundling story for a leaf utility.
// =============================================================================

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
