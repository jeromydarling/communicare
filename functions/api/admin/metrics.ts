// =============================================================================
// GET /api/admin/metrics — top-of-page business signals
// =============================================================================
// A small strip of numbers on /admin. All computed from D1; no Stripe
// roundtrip. MRR is derived from the count of users with
// subscription_status = 'active' × $9. Fine at launch scale; when
// pricing grows a plan-per-price table this becomes a proper join.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { requireAdmin } from "../../_lib/admin";
import { one } from "../../_lib/db";

type Env = { DB?: D1Database; SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

const PLATFORM_PRICE_CENTS = 900; // $9/mo

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;

  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
  const sevenAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

  const [
    active,
    paused,
    pastDue,
    unpaid,
    canceledLast30,
    signupsLast30,
    recentSignup,
    recentCancel,
  ] = await Promise.all([
    one<{ n: number }>(db, `select count(*) as n from users where coalesce(subscription_status,'unpaid')='active'`),
    one<{ n: number }>(db, `select count(*) as n from users where subscription_status='paused'`),
    one<{ n: number }>(db, `select count(*) as n from users where subscription_status='past_due'`),
    one<{ n: number }>(db, `select count(*) as n from users where coalesce(subscription_status,'unpaid')='unpaid'`),
    one<{ n: number }>(db, `select count(*) as n from users where canceled_at is not null and canceled_at >= ?`, [thirtyAgo]),
    one<{ n: number }>(db, `select count(*) as n from users where created_at >= ?`, [thirtyAgo]),
    one<{ email: string; created_at: string }>(db, `select email, created_at from users order by created_at desc limit 1`),
    one<{ email: string; canceled_at: string }>(db, `select email, canceled_at from users where canceled_at is not null order by canceled_at desc limit 1`),
  ]);

  const activeCount = active?.n ?? 0;
  const mrrCents = activeCount * PLATFORM_PRICE_CENTS;

  return json({
    active: activeCount,
    paused: paused?.n ?? 0,
    past_due: pastDue?.n ?? 0,
    unpaid: unpaid?.n ?? 0,
    canceled_last_30d: canceledLast30?.n ?? 0,
    signups_last_30d: signupsLast30?.n ?? 0,
    mrr_cents: mrrCents,
    recent_signup: recentSignup ?? null,
    recent_cancel: recentCancel ?? null,
    window: { seven_days_ago: sevenAgo, thirty_days_ago: thirtyAgo },
  });
};
