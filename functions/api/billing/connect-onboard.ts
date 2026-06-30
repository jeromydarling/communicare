// =============================================================================
// POST /api/billing/connect-onboard — open a Stripe Connect onboarding link
// =============================================================================
// The Managed Payments upsell: each farm that opts in gets its own
// Stripe Express account. Charges go to the connected account; we
// take a 1% application_fee_amount on every PaymentIntent we create on
// their behalf (set at charge time, not here).
//
// This route:
//   1. Verifies the caller is owner/staff on the target farm.
//   2. If the farm has no connect_account_id, creates a new Express
//      account (US-only at launch) and stores the id.
//   3. Creates an AccountLink (the onboarding URL Stripe hosts) and
//      returns it for the client to redirect to.
//
// AccountLinks expire in ~5 minutes per Stripe's design; if the farmer
// abandons and comes back, we just generate a fresh one. The account
// itself persists.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, run, nowIso } from "../../_lib/db";
import {
  stripeRequest,
  type StripeAccount,
  type StripeAccountLink,
  type StripeEnv,
} from "../../_lib/stripe";

type Env = StripeEnv & {
  DB?: D1Database;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type FarmRow = {
  id: string;
  name: string;
  connect_account_id: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  if (!ctx.env.STRIPE_SECRET_KEY) {
    return json({ error: "STRIPE_SECRET_KEY missing on this deploy." }, 500);
  }
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: { farm_id?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const farmId = body.farm_id ?? null;
  const fm = await one<{ farm_id: string }>(
    ctx.env.DB,
    farmId
      ? `select farm_id from farm_members
          where user_id = ? and farm_id = ?
            and role in ('owner', 'staff') and archived_at is null`
      : `select farm_id from farm_members
          where user_id = ? and role in ('owner', 'staff')
            and archived_at is null
          order by joined_at asc limit 1`,
    farmId ? [auth.user.id, farmId] : [auth.user.id],
  );
  if (!fm) return json({ error: "No farm." }, 404);

  const farm = await one<FarmRow>(
    ctx.env.DB,
    `select id, name, connect_account_id from farms where id = ?`,
    [fm.farm_id],
  );
  if (!farm) return json({ error: "Farm not found." }, 404);

  let accountId = farm.connect_account_id;
  if (!accountId) {
    const created = await stripeRequest<StripeAccount>(ctx.env, "POST", "/accounts", {
      type: "express",
      country: "US",
      "capabilities[card_payments][requested]": "true",
      "capabilities[transfers][requested]": "true",
      "business_type": "individual",
      "business_profile[name]": farm.name,
      "metadata[farm_id]": farm.id,
    });
    if (!created.ok) {
      return json({ error: `Stripe account creation failed: ${created.error}` }, 502);
    }
    accountId = created.data.id;
    await run(
      ctx.env.DB,
      `update farms set connect_account_id = ?, updated_at = ? where id = ?`,
      [accountId, nowIso(), farm.id],
    );
  }

  const siteBase = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
  const link = await stripeRequest<StripeAccountLink>(
    ctx.env,
    "POST",
    "/account_links",
    {
      account: accountId,
      refresh_url: `${siteBase}/farmer/payments/?connect=refresh`,
      return_url: `${siteBase}/farmer/payments/?connect=complete`,
      type: "account_onboarding",
    },
  );
  if (!link.ok) {
    return json({ error: `AccountLink failed: ${link.error}` }, 502);
  }
  return json({ url: link.data.url, accountId });
};
