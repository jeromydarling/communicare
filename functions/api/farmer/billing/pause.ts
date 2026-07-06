// =============================================================================
// POST /api/farmer/billing/pause — pause the platform subscription
// =============================================================================
// The seasonal-pause churn tool. Farmer picks a resume date; we tell
// Stripe pause_collection { behavior: 'void', resumes_at }. Their
// subscription stays 'active' on Stripe's side but no invoices are
// collected until the resume date. Our gate treats 'paused' as
// read-only (no SMS sends, no publishing) and the dashboard banner
// reads "Paused until <date>."
//
// Request body:
//   { resume_at: "2027-04-01" }    // ISO date; midnight UTC
//   { resume_at: null }             // pause indefinitely
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { one, run, nowIso } from "../../../_lib/db";
import { stripeRequest, type StripeSubscription, type StripeEnv } from "../../../_lib/stripe";

type Env = StripeEnv & {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  if (!ctx.env.STRIPE_SECRET_KEY) {
    return json({ error: "STRIPE_SECRET_KEY missing on this deploy." }, 500);
  }
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: { resume_at?: string | null };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // resume_at can be null (indefinite pause) or an ISO date/time in the
  // future. Reject past dates so a fat-finger doesn't accidentally
  // pause+resume in the same second.
  let resumesAtEpoch: number | null = null;
  if (body.resume_at !== null && body.resume_at !== undefined) {
    const parsed = Date.parse(body.resume_at);
    if (!Number.isFinite(parsed)) {
      return json({ error: "resume_at must be an ISO date." }, 400);
    }
    if (parsed < Date.now() + 60_000) {
      return json({ error: "resume_at must be at least a minute in the future." }, 400);
    }
    resumesAtEpoch = Math.floor(parsed / 1000);
  }

  const u = await one<{ subscription_id: string | null }>(
    ctx.env.DB,
    `select subscription_id from users where id = ?`,
    [auth.user.id],
  );
  if (!u?.subscription_id) {
    return json({ error: "No active subscription to pause." }, 400);
  }

  const params: Record<string, string> = {
    "pause_collection[behavior]": "void",
  };
  if (resumesAtEpoch !== null) {
    params["pause_collection[resumes_at]"] = String(resumesAtEpoch);
  }
  const res = await stripeRequest<StripeSubscription>(
    ctx.env,
    "POST",
    `/subscriptions/${u.subscription_id}`,
    params,
  );
  if (!res.ok) {
    return json({ error: `Stripe pause failed: ${res.error}` }, 502);
  }

  // Denormalize locally for immediate effect — the webhook will land
  // shortly and confirm, but the farmer's next page load should see the
  // paused banner without waiting.
  await run(
    ctx.env.DB,
    `update users set subscription_status = 'paused', updated_at = ? where id = ?`,
    [nowIso(), auth.user.id],
  );

  return json({
    ok: true,
    subscription_status: "paused",
    resume_at: resumesAtEpoch
      ? new Date(resumesAtEpoch * 1000).toISOString()
      : null,
  });
};
