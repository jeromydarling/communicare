// =============================================================================
// POST /api/farmer/billing/cancel — schedule cancellation at period end
// =============================================================================
// Cancels the platform subscription at the END of the current billing
// period (not immediately) so the farmer keeps everything they paid
// for. Two side effects on top of the Stripe update:
//
//   1. Concierge email from gardener@thecros.app with:
//      - a link to /api/farmer/data-export
//      - one honest question: was something broken, or is it just not
//        the season?
//   2. users.canceled_at + users.cancel_reason snapshotted so the
//      CRM's contact timeline picks up the story without waiting for
//      Stripe's cancellation-at-period-end webhook (which won't fire
//      for weeks).
//
// The gate keeps letting them in until Stripe actually flips the
// status — this route only signals intent.
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { verifyAuth } from "../../../_lib/auth";
import { one, run, nowIso } from "../../../_lib/db";
import {
  stripeRequest,
  type StripeSubscription,
  type StripeEnv,
} from "../../../_lib/stripe";
import {
  sendEmail,
  conciergeCancelEmail,
  detectLocaleFromRequest,
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

  let body: { reason?: string } = {};
  try {
    body = (await ctx.request.json().catch(() => ({}))) as { reason?: string };
  } catch {
    body = {};
  }

  const u = await one<{
    id: string;
    email: string;
    display_name: string | null;
    preferred_locale: string;
    subscription_id: string | null;
  }>(
    ctx.env.DB,
    `select id, email, display_name,
            coalesce(preferred_locale,'en') as preferred_locale,
            subscription_id
       from users where id = ?`,
    [auth.user.id],
  );
  if (!u) return json({ error: "User not found." }, 404);

  // Schedule Stripe-side cancellation at period end. If they don't
  // have a subscription (never Checked out), just record locally.
  if (u.subscription_id) {
    const res = await stripeRequest<StripeSubscription>(
      ctx.env,
      "POST",
      `/subscriptions/${u.subscription_id}`,
      { "cancel_at_period_end": "true" },
    );
    if (!res.ok) {
      return json({ error: `Stripe cancel failed: ${res.error}` }, 502);
    }
  }

  const now = nowIso();
  await run(
    ctx.env.DB,
    `update users
        set canceled_at = ?, cancel_reason = ?, updated_at = ?
      where id = ?`,
    [now, body?.reason?.slice(0, 500) ?? null, now, u.id],
  );

  // Concierge email — one honest note. Skip if EMAIL isn't bound
  // (dev deploys) but still return ok so the client's UX flows.
  if (ctx.env.EMAIL) {
    const site = (ctx.env.SITE_URL ?? "https://communicare.farm").replace(/\/+$/, "");
    const exportLink = `${site}/api/farmer/data-export`;
    const locale =
      u.preferred_locale === "es" ? "es" : detectLocaleFromRequest(ctx.request);
    ctx.waitUntil(
      sendEmail(ctx.env.EMAIL, ctx.env.SEND_FROM, {
        ...conciergeCancelEmail({
          to: u.email,
          displayName: u.display_name,
          exportLink,
          locale,
        }),
        replyTo: ctx.env.SYSTEM_REPLY_TO ?? "gardener@thecros.app",
      }),
    );
  }

  return json({ ok: true, canceled_at: now });
};
