// =============================================================================
// /api/farmer/shares — list + create share_definitions for the current farm
// =============================================================================
//   GET  → returns the operator's farm's active shares
//   POST → creates a new share definition. Verifies the caller is staff at
//          the target farm before writing.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, many, run, uuid, nowIso } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const VALID_CADENCE = new Set([
  "weekly", "biweekly", "monthly", "season_long", "on_demand",
]);
const VALID_BILLING = new Set([
  "pay_per_pickup", "monthly_installment",
  "season_upfront", "monthly_boarding_fee",
]);

type ShareRow = {
  id: string;
  name: string;
  description: string | null;
  cadence: string;
  billing_model: string;
  price_per_pickup_cents: number | null;
  monthly_price_cents: number | null;
  season_price_cents: number | null;
};

async function findOperatorFarm(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const fm = await one<{ farm_id: string }>(
    db,
    `select farm_id from farm_members
      where user_id = ? and role in ('owner', 'staff')
        and archived_at is null
      limit 1`,
    [userId],
  );
  return fm?.farm_id ?? null;
}

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const farmId = await findOperatorFarm(ctx.env.DB, auth.user.id);
  if (!farmId) return json({ shares: [] });

  const shares = await many<ShareRow>(
    ctx.env.DB,
    `select id, name, description, cadence, billing_model,
            price_per_pickup_cents, monthly_price_cents, season_price_cents
       from share_definitions
      where farm_id = ? and is_active = 1
      order by name`,
    [farmId],
  );
  return json({ shares });
};

type CreateBody = {
  name?: string;
  description?: string;
  cadence?: string;
  billing_model?: string;
  price_cents?: number;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const farmId = await findOperatorFarm(ctx.env.DB, auth.user.id);
  if (!farmId) {
    return json({ error: "You don't own a farm yet — finish onboarding first." }, 400);
  }

  let body: CreateBody;
  try {
    body = (await ctx.request.json()) as CreateBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = (body.name ?? "").trim();
  const cadence = body.cadence ?? "";
  const billing = body.billing_model ?? "";
  if (!name) return json({ error: "Share name required." }, 400);
  if (!VALID_CADENCE.has(cadence)) return json({ error: "Pick a cadence." }, 400);
  if (!VALID_BILLING.has(billing)) return json({ error: "Pick a billing model." }, 400);

  // Map price into the right column for the chosen billing model
  const price = typeof body.price_cents === "number" && body.price_cents > 0
    ? body.price_cents
    : null;
  let pricePerPickup: number | null = null;
  let monthlyPrice: number | null = null;
  let seasonPrice: number | null = null;
  if (price !== null) {
    if (billing === "pay_per_pickup") pricePerPickup = price;
    else if (billing === "monthly_installment" || billing === "monthly_boarding_fee") monthlyPrice = price;
    else if (billing === "season_upfront") seasonPrice = price;
  }

  const id = uuid();
  await run(
    ctx.env.DB,
    `insert into share_definitions
       (id, farm_id, name, description, cadence, billing_model,
        price_per_pickup_cents, monthly_price_cents, season_price_cents,
        is_active, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id, farmId, name, (body.description ?? "").trim() || null,
      cadence, billing,
      pricePerPickup, monthlyPrice, seasonPrice,
      nowIso(),
    ],
  );
  return json({ ok: true, id });
};
