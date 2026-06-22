// =============================================================================
// /api/farmer/pickup-sites — list + create pickup_sites for the current farm
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, many, run, nowIso } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type PickupRow = {
  id: number;
  name: string;
  address: string | null;
  day_of_week: number | null;
  window_start: string | null;
  window_end: string | null;
};

async function resolveOperatorFarm(
  db: D1Database,
  userId: string,
  requestedFarmId: string | null,
): Promise<string | null> {
  if (requestedFarmId) {
    const fm = await one<{ farm_id: string }>(
      db,
      `select farm_id from farm_members
        where user_id = ? and farm_id = ?
          and role in ('owner', 'staff')
          and archived_at is null`,
      [userId, requestedFarmId],
    );
    return fm?.farm_id ?? null;
  }
  const fm = await one<{ farm_id: string }>(
    db,
    `select farm_id from farm_members
      where user_id = ? and role in ('owner', 'staff')
        and archived_at is null
      order by joined_at asc
      limit 1`,
    [userId],
  );
  return fm?.farm_id ?? null;
}

export const onRequestOptions: PagesFunction = () => preflight();

function farmIdFromQuery(req: Request): string | null {
  const v = new URL(req.url).searchParams.get("farm_id");
  return v && v.trim() ? v.trim() : null;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const farmId = await resolveOperatorFarm(
    ctx.env.DB,
    auth.user.id,
    farmIdFromQuery(ctx.request),
  );
  if (!farmId) return json({ pickup_sites: [] });

  const rows = await many<PickupRow>(
    ctx.env.DB,
    `select id, name, address, day_of_week, window_start, window_end
       from pickup_sites
      where farm_id = ? and is_active = 1
      order by display_order, name`,
    [farmId],
  );
  return json({ pickup_sites: rows });
};

type CreateBody = {
  name?: string;
  address?: string;
  day_of_week?: number;
  window_start?: string;
  window_end?: string;
  farm_id?: string;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: CreateBody;
  try {
    body = (await ctx.request.json()) as CreateBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const farmId = await resolveOperatorFarm(
    ctx.env.DB,
    auth.user.id,
    typeof body.farm_id === "string" ? body.farm_id : null,
  );
  if (!farmId) {
    return json({ error: "You don't own a farm yet — finish onboarding first." }, 400);
  }

  const name = (body.name ?? "").trim();
  if (!name) return json({ error: "Pickup name required." }, 400);
  const day =
    typeof body.day_of_week === "number" &&
    body.day_of_week >= 0 &&
    body.day_of_week <= 6
      ? body.day_of_week
      : null;

  const result = await ctx.env.DB
    .prepare(
      `insert into pickup_sites
         (farm_id, name, address, day_of_week, window_start, window_end,
          is_active, display_order, created_at)
       values (?, ?, ?, ?, ?, ?, 1, 0, ?)`,
    )
    .bind(
      farmId,
      name,
      (body.address ?? "").trim() || null,
      day,
      body.window_start ?? null,
      body.window_end ?? null,
      nowIso(),
    )
    .run();
  return json({ ok: true, id: result.meta?.last_row_id ?? null });
};
