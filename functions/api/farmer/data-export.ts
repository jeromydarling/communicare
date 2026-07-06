// =============================================================================
// GET /api/farmer/data-export — the "returns every byte" export bundle
// =============================================================================
// The manifesto says the farm's data comes home with them at cancel;
// this is what that means concretely. We assemble a single JSON
// document with every row the account owns and return it as an
// application/json download. Grepable, importable, human-readable.
//
// We chose one JSON blob over a ZIP of CSVs for two reasons:
//   1. Streams cleanly out of a Worker without a zip lib in the bundle
//   2. Preserves the JSON columns (drop_sites, share_contents, etc.)
//      exactly, whereas CSV would flatten and lose them
// The tradeoff is you can't double-click a JSON in Numbers; you need
// jq or a spreadsheet import. Feels honest for the audience.
//
// Available to any signed-in farmer at any time, not just at cancel —
// they own their data, they can pull it whenever.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, many } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;
  const db = ctx.env.DB;

  const user = await one<Record<string, unknown>>(
    db,
    `select id, email, display_name, preferred_locale, canceled_at,
            subscription_status, subscription_current_period_end,
            created_at, updated_at
       from users where id = ?`,
    [auth.user.id],
  );
  if (!user) return json({ error: "User not found." }, 404);

  const profile = await one<Record<string, unknown>>(
    db,
    `select id, email, display_name, phone, preferred_sms,
            preferred_email, created_at, updated_at
       from profiles where id = ?`,
    [auth.user.id],
  );

  // Owner/staff farms only — you don't get to export other farms'
  // members if you're merely a member of theirs.
  const farms = await many<Record<string, unknown>>(
    db,
    `select f.* from farms f
       join farm_members m on m.farm_id = f.id
      where m.user_id = ? and m.role in ('owner','staff')
        and m.archived_at is null`,
    [auth.user.id],
  );
  const farmIds = farms.map((f) => f.id as string);

  const shareDefinitions = await manyForFarms(
    db,
    farmIds,
    `select * from share_definitions where farm_id in`,
  );
  const pickupSites = await manyForFarms(
    db,
    farmIds,
    `select * from pickup_sites where farm_id in`,
  );
  const subscriptions = await manyForFarms(
    db,
    farmIds,
    `select * from subscriptions where farm_id in`,
  );
  const orders = await manyForFarms(
    db,
    farmIds,
    `select * from orders where farm_id in`,
  );
  const memberSmsSubscriptions = await manyForFarms(
    db,
    farmIds,
    `select * from member_sms_subscriptions where farm_id in`,
  );
  const smsMessages = await manyForFarms(
    db,
    farmIds,
    `select * from sms_messages where farm_id in`,
  );
  const weeklyOffers = await manyForFarms(
    db,
    farmIds,
    `select * from weekly_offers where farm_id in`,
  );

  const stripeSubs = await many(
    db,
    `select id, status, price_id, current_period_start, current_period_end,
            cancel_at_period_end, canceled_at, trial_end, created,
            paused_at, resume_at
       from stripe_subscriptions where user_id = ?`,
    [auth.user.id],
  );

  const bundle = {
    _meta: {
      exported_at: new Date().toISOString(),
      exported_by: auth.user.email,
      format: "communicare-export/v1",
      note:
        "Your farm and everyone in it, exactly as we hold it. Use jq or import into a spreadsheet. If a row is missing, tell us at gardener@thecros.app and we'll fix it before it happens to anyone else.",
    },
    user,
    profile,
    farms,
    share_definitions: shareDefinitions,
    pickup_sites: pickupSites,
    subscriptions,
    orders,
    member_sms_subscriptions: memberSmsSubscriptions,
    sms_messages: smsMessages,
    weekly_offers: weeklyOffers,
    stripe_subscriptions: stripeSubs,
  };

  const filename = `communicare-export-${(user.id as string).slice(0, 8)}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};

// -----------------------------------------------------------------------------
// Utility — safe `where farm_id in (?, ?, ...)` with variadic bindings
// -----------------------------------------------------------------------------

async function manyForFarms(
  db: D1Database,
  farmIds: string[],
  sqlPrefix: string,
): Promise<Record<string, unknown>[]> {
  if (farmIds.length === 0) return [];
  const placeholders = farmIds.map(() => "?").join(",");
  return many(db, `${sqlPrefix} (${placeholders})`, farmIds);
}
