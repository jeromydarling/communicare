// =============================================================================
// POST /api/billing/create-checkout-session — start the $9/mo gate
// =============================================================================
// Authed farmer hits this; we ensure they have a Stripe Customer, create
// a Checkout Session for the platform price (recurring), and return the
// hosted-checkout URL for the client to redirect to.
//
// On success, Stripe sends the user back to `success_url` (a page on our
// side that polls /api/auth/me to confirm subscription_status='active'
// once the webhook lands). On cancel, back to `cancel_url`.
//
// We never trust the Checkout response itself to flip the gate — the
// webhook is the source of truth.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { one, run, nowIso } from "../../_lib/db";
import {
  stripeRequest,
  type StripeCheckoutSession,
  type StripeCustomer,
  type StripeEnv,
} from "../../_lib/stripe";

type Env = StripeEnv & {
  DB?: D1Database;
  SITE_URL?: string;
  STRIPE_PRICE_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  if (!ctx.env.STRIPE_SECRET_KEY) {
    return json({ error: "STRIPE_SECRET_KEY missing on this deploy." }, 500);
  }
  if (!ctx.env.STRIPE_PRICE_ID) {
    return json({ error: "STRIPE_PRICE_ID missing on this deploy." }, 500);
  }
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  // Pull current Stripe customer id from the user row. If absent, create
  // one and persist before opening Checkout — Stripe needs the customer
  // attached to the session for the subscription to anchor correctly.
  const u = await one<{
    id: string;
    email: string;
    stripe_customer_id: string | null;
    display_name: string | null;
  }>(
    ctx.env.DB,
    `select id, email, stripe_customer_id, display_name from users where id = ?`,
    [auth.user.id],
  );
  if (!u) return json({ error: "User not found." }, 404);

  let customerId = u.stripe_customer_id;
  if (!customerId) {
    const created = await stripeRequest<StripeCustomer>(ctx.env, "POST", "/customers", {
      email: u.email,
      name: u.display_name ?? undefined,
      "metadata[user_id]": u.id,
    });
    if (!created.ok) {
      return json({ error: `Stripe customer creation failed: ${created.error}` }, 502);
    }
    customerId = created.data.id;
    await run(
      ctx.env.DB,
      `update users set stripe_customer_id = ?, updated_at = ? where id = ?`,
      [customerId, nowIso(), u.id],
    );
  }

  const siteBase = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
  const successUrl = `${siteBase}/farmer/onboarding/?billing=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteBase}/farmer/sign-up/?billing=canceled`;

  const session = await stripeRequest<StripeCheckoutSession>(
    ctx.env,
    "POST",
    "/checkout/sessions",
    {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": ctx.env.STRIPE_PRICE_ID,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: "true",
      "subscription_data[metadata][user_id]": u.id,
      "metadata[user_id]": u.id,
    },
  );
  if (!session.ok) {
    return json({ error: `Checkout session failed: ${session.error}` }, 502);
  }
  return json({ url: session.data.url, sessionId: session.data.id });
};
