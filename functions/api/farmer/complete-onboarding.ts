// =============================================================================
// POST /api/farmer/complete-onboarding — stamp farms.onboarded_at
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, run, nowIso } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const fm = await one<{ farm_id: string }>(
    ctx.env.DB,
    `select farm_id from farm_members
      where user_id = ? and role in ('owner', 'staff')
        and archived_at is null
      limit 1`,
    [auth.user.id],
  );
  if (!fm) {
    return json({ error: "No farm found for this account." }, 404);
  }

  await run(
    ctx.env.DB,
    `update farms set onboarded_at = coalesce(onboarded_at, ?),
                      updated_at = ?
      where id = ?`,
    [nowIso(), nowIso(), fm.farm_id],
  );
  return json({ ok: true, farm_id: fm.farm_id });
};
