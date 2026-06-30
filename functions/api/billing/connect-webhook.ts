// =============================================================================
// POST /api/billing/connect-webhook — Stripe webhook for Connect events
// =============================================================================
// Separate endpoint from the platform webhook because Stripe Connect
// events come from the platform's *connected accounts*; they're routed
// through a separate webhook endpoint in the dashboard and the signing
// secret is different. Two endpoints, two secrets, clean isolation.
//
// Subscribed events in the Stripe dashboard (Connect tab):
//   - account.updated   → charges_enabled / payouts_enabled tracking
//   - payout.failed     → for the farmer-facing alert (TODO: surface)
//   - charge.dispute.created  → high-priority operator alert
// =============================================================================

import { json } from "../../_lib/cors";
import { run, one, nowIso } from "../../_lib/db";
import {
  verifyStripeSignature,
  type StripeEvent,
  type StripeAccount,
  type StripeEnv,
} from "../../_lib/stripe";

type Env = StripeEnv & {
  DB?: D1Database;
  STRIPE_CONNECT_WEBHOOK_SECRET?: string;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return new Response("db missing", { status: 500 });
  if (!ctx.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    return new Response("connect webhook secret missing", { status: 500 });
  }

  const sig = ctx.request.headers.get("stripe-signature") ?? "";
  const rawBody = await ctx.request.text();
  const verify = await verifyStripeSignature({
    rawBody,
    signatureHeader: sig,
    secret: ctx.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  });
  if (!verify.ok) {
    console.warn("connect webhook signature failed:", verify.reason);
    return new Response("invalid signature", { status: 403 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const insertEvent = await run(
    ctx.env.DB,
    `insert or ignore into stripe_events
       (id, type, account, livemode, raw_json, received_at)
     values (?, ?, ?, ?, ?, ?)`,
    [
      event.id, event.type, event.account ?? null,
      event.livemode ? 1 : 0, rawBody, nowIso(),
    ],
  );
  if (insertEvent.changes === 0) {
    return json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "account.updated") {
      const acct = event.data.object as StripeAccount;
      const matched = await one<{ id: string }>(
        ctx.env.DB,
        `select id from farms where connect_account_id = ? limit 1`,
        [acct.id],
      );
      if (matched) {
        await run(
          ctx.env.DB,
          `update farms
              set connect_charges_enabled = ?,
                  connect_payouts_enabled = ?,
                  connect_details_submitted = ?,
                  updated_at = ?
            where id = ?`,
          [
            acct.charges_enabled ? 1 : 0,
            acct.payouts_enabled ? 1 : 0,
            acct.details_submitted ? 1 : 0,
            nowIso(),
            matched.id,
          ],
        );
      }
    }
    // payout.failed and charge.dispute.created are logged in
    // stripe_events; downstream surfacing lands in a follow-up.

    await run(
      ctx.env.DB,
      `update stripe_events set processed_at = ? where id = ?`,
      [nowIso(), event.id],
    );
  } catch (err) {
    console.error("connect event dispatch failed:", err);
    return new Response("dispatch failed", { status: 500 });
  }

  return json({ received: true });
};
