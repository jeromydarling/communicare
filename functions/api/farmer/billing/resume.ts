// =============================================================================
// POST /api/farmer/billing/resume — resume a paused subscription
// =============================================================================
// Clears pause_collection on the Stripe side. Their next scheduled
// invoice will be charged normally. Idempotent: resuming an
// already-active sub is a no-op.
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { one, run, nowIso } from "../../../_lib/db";
import { stripeRequest, type StripeSubscription, type StripeEnv } from "../../../_lib/stripe";
import {
  sendEmail,
  subscriptionResumedEmail,
  type EmailSendBinding,
} from "../../../_lib/email";

type Env = StripeEnv & {
  DB?: D1Database;
  EMAIL?: EmailSendBinding;
  SEND_FROM?: string;
  SYSTEM_REPLY_TO?: string;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  if (!ctx.env.STRIPE_SECRET_KEY) {
    return json({ error: "STRIPE_SECRET_KEY missing." }, 500);
  }
  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  const u = await one<{
    subscription_id: string | null;
    email: string;
    display_name: string | null;
    preferred_locale: string | null;
  }>(
    ctx.env.DB,
    `select subscription_id, email, display_name,
            coalesce(preferred_locale,'en') as preferred_locale
       from users where id = ?`,
    [auth.user.id],
  );
  if (!u?.subscription_id) {
    return json({ error: "No subscription on file." }, 400);
  }

  // Empty string clears pause_collection per Stripe's convention on
  // form-encoded updates.
  const res = await stripeRequest<StripeSubscription>(
    ctx.env,
    "POST",
    `/subscriptions/${u.subscription_id}`,
    { "pause_collection": "" },
  );
  if (!res.ok) {
    return json({ error: `Stripe resume failed: ${res.error}` }, 502);
  }

  await run(
    ctx.env.DB,
    `update users set subscription_status = 'active', updated_at = ? where id = ?`,
    [nowIso(), auth.user.id],
  );

  if (ctx.env.EMAIL) {
    const site = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
    const msg = subscriptionResumedEmail({
      to: u.email,
      displayName: u.display_name,
      siteUrl: site,
      locale: u.preferred_locale === "es" ? "es" : "en",
    });
    ctx.waitUntil(
      sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
        ...msg,
        replyTo: ctx.env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
      }),
    );
  }

  return json({ ok: true, subscription_status: "active" });
};
