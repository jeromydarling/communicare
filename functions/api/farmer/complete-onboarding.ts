// =============================================================================
// POST /api/farmer/complete-onboarding — stamp farms.onboarded_at
// =============================================================================
// Optional body { farm_id } lets multi-farm operators say which farm
// they're completing. Without it we stamp the first farm they staff
// (the wizard's normal single-farm case).

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { requireActiveSubscription } from "../../_lib/billing";
import { one, run, nowIso } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = { farm_id?: string };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  // Publishing the farm flips is_published — that's the moment the
  // listing goes live. Gate it behind an active subscription so unpaid
  // accounts can fill in the wizard but can't push the published bit.
  const gate = await requireActiveSubscription(ctx.env.DB, auth.user.id);
  if (!gate.ok) return gate.response;

  // Body is optional; if present, pin the farm_id.
  let body: RequestBody = {};
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    // empty body is fine
  }

  const fm = body.farm_id
    ? await one<{ farm_id: string }>(
        ctx.env.DB,
        `select farm_id from farm_members
          where user_id = ? and farm_id = ?
            and role in ('owner', 'staff')
            and archived_at is null`,
        [auth.user.id, body.farm_id],
      )
    : await one<{ farm_id: string }>(
        ctx.env.DB,
        `select farm_id from farm_members
          where user_id = ? and role in ('owner', 'staff')
            and archived_at is null
          order by joined_at asc
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
