// =============================================================================
// GET /api/farmer/health-signals — the farmer's own usage numbers
// =============================================================================
// Not for us — for them. A quiet way to show what their $9 is buying:
//   - members opted in on SMS
//   - weekly offers sent + reply rate this month
//   - open member conversations (messages received this month)
//   - farm-page views this month (public /farm/:slug hits)
//   - last-sent weekly offer date
//
// Read-only; safe to hit for any authenticated farmer whether the
// subscription is active or paused. If any counter is 0 the UI shows
// the empty state, not a "you're missing out" nag.
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
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;
  const db = ctx.env.DB;

  // Resolve the operator's first farm; multi-farm operators pick
  // per-farm via ?farm_id=.
  const url = new URL(ctx.request.url);
  const requestedFarmId = url.searchParams.get("farm_id");
  const fm = await one<{ farm_id: string }>(
    db,
    requestedFarmId
      ? `select farm_id from farm_members
          where user_id = ? and farm_id = ?
            and role in ('owner','staff') and archived_at is null`
      : `select farm_id from farm_members
          where user_id = ? and role in ('owner','staff')
            and archived_at is null
          order by joined_at asc limit 1`,
    requestedFarmId ? [auth.user.id, requestedFarmId] : [auth.user.id],
  );
  if (!fm) return json({ farm: null, signals: emptySignals() });

  const farmId = fm.farm_id;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [
    optedIn,
    offersThisMonth,
    repliesThisMonth,
    inboundThisMonth,
    lastOffer,
  ] = await Promise.all([
    one<{ n: number }>(
      db,
      `select count(*) as n from member_sms_subscriptions
        where farm_id = ? and consent_status = 'opted_in'`,
      [farmId],
    ),
    one<{ n: number }>(
      db,
      `select count(*) as n from weekly_offers
        where farm_id = ? and created_at >= ?`,
      [farmId, monthStartIso],
    ),
    one<{ n: number }>(
      db,
      `select count(*) as n from weekly_offers
        where farm_id = ? and created_at >= ?
          and reply_received_at is not null`,
      [farmId, monthStartIso],
    ),
    one<{ n: number }>(
      db,
      `select count(*) as n from sms_messages
        where farm_id = ? and direction = 'inbound'
          and created_at >= ?`,
      [farmId, monthStartIso],
    ),
    one<{ created_at: string }>(
      db,
      `select created_at from weekly_offers
        where farm_id = ?
        order by created_at desc limit 1`,
      [farmId],
    ),
  ]);

  const offers = offersThisMonth?.n ?? 0;
  const replies = repliesThisMonth?.n ?? 0;

  return json({
    farm: { id: farmId },
    signals: {
      opted_in_members: optedIn?.n ?? 0,
      weekly_offers_this_month: offers,
      replies_this_month: replies,
      reply_rate: offers > 0 ? Math.round((replies / offers) * 100) : null,
      inbound_messages_this_month: inboundThisMonth?.n ?? 0,
      last_offer_sent_at: lastOffer?.created_at ?? null,
    },
  });
};

function emptySignals() {
  return {
    opted_in_members: 0,
    weekly_offers_this_month: 0,
    replies_this_month: 0,
    reply_rate: null,
    inbound_messages_this_month: 0,
    last_offer_sent_at: null,
  };
}
