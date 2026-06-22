// =============================================================================
// POST /api/farmer/onboarding/create-farm
// =============================================================================
// Replaces the Postgres `create_farm_for_self` security-definer RPC.
// In one D1 batch:
//   1. Insert the farms row (slug, name, kind, location).
//   2. Insert the farm_members row with the caller as owner.
//
// On slug collision returns 409 with a friendly message; the onboarding
// wizard already knows how to suggest "try adding your town or initials."
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/ratelimit";
import { one, uuid, nowIso } from "../../../_lib/db";

type Env = {
  DB?: D1Database;
  RATELIMIT?: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

// Operators rarely run more than one or two farms. A small hard cap
// prevents the obvious abuse of squatting slugs / DoSing the farms
// table. If a real multi-farm operator hits this, we can lift it from
// the dashboard one user at a time.
const MAX_FARMS_PER_USER = 5;

type RequestBody = {
  name?: string;
  slug?: string;
  kind?: string;
  location?: string;
};

const VALID_KINDS = new Set([
  "vegetable_csa", "raw_milk_herd_share", "pastured_meat",
  "pastured_eggs", "mixed_farm", "market_garden",
  "orchard_fruit", "flower_farm",
]);

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }
  const db = ctx.env.DB;

  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  // Per-user lifetime cap on farm creation. Prevents slug-squatting +
  // farms-table pollution by a single account.
  const farmCount = await one<{ n: number }>(
    db,
    `select count(*) as n from farm_members
       where user_id = ? and role = 'owner' and archived_at is null`,
    [auth.user.id],
  );
  if (farmCount && farmCount.n >= MAX_FARMS_PER_USER) {
    return json(
      {
        error: `You already own ${farmCount.n} farms on Communicare — write hello@mycommuni.care if you need more.`,
      },
      403,
    );
  }

  // Hourly per-user cap — slows down even a legitimate operator who's
  // bumping the unique-slug error and retrying. 2 farms/hour is plenty
  // for any real onboarding session.
  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: `create-farm:${auth.user.id}`,
    limit: 2,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = (body.name ?? "").trim();
  const slug = (body.slug ?? "").trim().toLowerCase();
  const kind = (body.kind ?? "").trim();
  const location = (body.location ?? "").trim();

  if (!name) return json({ error: "Farm name is required." }, 400);
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || slug.length > 60) {
    return json({ error: "Farm slug must be lowercase letters, numbers, and dashes only." }, 400);
  }
  if (!VALID_KINDS.has(kind)) return json({ error: "Pick a farm kind." }, 400);
  if (!location) return json({ error: "Farm location is required." }, 400);

  // Detect slug collision up front for a friendly error.
  const existing = await one<{ id: string }>(
    db,
    `select id from farms where slug = ? collate nocase`,
    [slug],
  );
  if (existing) {
    return json(
      { error: "That farm name's taken — try adding your town or initials." },
      409,
    );
  }

  const farmId = uuid();
  const now = nowIso();

  await db.batch([
    db.prepare(
      `insert into farms (id, slug, name, kind, location, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(farmId, slug, name, kind, location, now, now),
    db.prepare(
      `insert into farm_members (farm_id, user_id, role, joined_at)
       values (?, ?, 'owner', ?)`,
    ).bind(farmId, auth.user.id, now),
  ]);

  return json({ ok: true, farm_id: farmId });
};
