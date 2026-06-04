// =============================================================================
// GET /api/farmer/me-with-farm — auth + farm membership in one round-trip
// =============================================================================
// Every farmer page does the same pair of lookups: who am I, and what
// farm do I own / staff? This endpoint folds both into a single response
// so a page can render without a render-stall.
//
// Returns:
//   401 if not signed in
//   { user, farm: null } if signed in but not yet bound to a farm
//   { user, farm: {...}, role } if owner / staff
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const fm = await one<{ farm_id: string; role: string }>(
    ctx.env.DB,
    `select farm_id, role from farm_members
      where user_id = ? and role in ('owner', 'staff')
        and archived_at is null
      order by joined_at asc limit 1`,
    [auth.user.id],
  );

  if (!fm) {
    return json({ user: auth.user, farm: null, role: null });
  }

  const farm = await one<{
    id: string;
    slug: string;
    name: string;
    location: string;
    kind: string;
    onboarded_at: string | null;
  }>(
    ctx.env.DB,
    `select id, slug, name, location, kind, onboarded_at
       from farms where id = ?`,
    [fm.farm_id],
  );

  return json({ user: auth.user, farm, role: fm.role });
};
