// =============================================================================
// POST /api/billing/portal — Stripe Billing Portal session for self-service
// =============================================================================
// The "manage your subscription" link from the farmer dashboard. Stripe
// hosts the UI for updating cards, viewing invoices, canceling, etc. We
// just create the session and return the URL.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one } from "../../_lib/db";
import {
  stripeRequest,
  type StripeBillingPortalSession,
  type StripeEnv,
} from "../../_lib/stripe";

type Env = StripeEnv & {
  DB?: D1Database;
  SITE_URL?: string;
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

  const u = await one<{ stripe_customer_id: string | null }>(
    ctx.env.DB,
    `select stripe_customer_id from users where id = ?`,
    [auth.user.id],
  );
  if (!u?.stripe_customer_id) {
    return json({ error: "No Stripe customer for this account yet." }, 400);
  }

  const siteBase = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
  const session = await stripeRequest<StripeBillingPortalSession>(
    ctx.env,
    "POST",
    "/billing_portal/sessions",
    {
      customer: u.stripe_customer_id,
      return_url: `${siteBase}/farmer/settings/`,
    },
  );
  if (!session.ok) {
    return json({ error: `Portal session failed: ${session.error}` }, 502);
  }
  return json({ url: session.data.url });
};
