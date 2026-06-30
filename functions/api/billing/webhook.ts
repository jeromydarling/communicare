// =============================================================================
// POST /api/billing/webhook — Stripe webhook for platform subscriptions
// =============================================================================
// Verifies the Stripe-Signature header, logs the event in stripe_events
// (idempotently — Stripe retries identical event ids on slow 2xx),
// updates stripe_subscriptions, and denormalizes the user's
// subscription_status for the gate query.
//
// Required subscriptions in the Stripe dashboard webhook config:
//   - customer.subscription.created
//   - customer.subscription.updated
//   - customer.subscription.deleted
//   - checkout.session.completed (catches the initial subscription)
//   - invoice.payment_failed (flips status to past_due if Stripe hasn't)
//
// We deliberately do NOT touch the user's row from the Checkout success
// redirect — that path is informational only. This webhook is the source
// of truth.
// =============================================================================

import { json } from "../../_lib/cors";
import { one, run, nowIso } from "../../_lib/db";
import {
  verifyStripeSignature,
  type StripeEvent,
  type StripeSubscription,
  type StripeCheckoutSession,
  type StripeEnv,
} from "../../_lib/stripe";

type Env = StripeEnv & {
  DB?: D1Database;
  STRIPE_WEBHOOK_SECRET?: string;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return new Response("db missing", { status: 500 });
  if (!ctx.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("webhook secret missing", { status: 500 });
  }

  const sig = ctx.request.headers.get("stripe-signature") ?? "";
  const rawBody = await ctx.request.text();
  const verify = await verifyStripeSignature({
    rawBody,
    signatureHeader: sig,
    secret: ctx.env.STRIPE_WEBHOOK_SECRET,
  });
  if (!verify.ok) {
    console.warn("stripe webhook signature failed:", verify.reason);
    return new Response("invalid signature", { status: 403 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Idempotency: insert-or-ignore the event row. If we already processed
  // it, the second insert is a no-op and we return 200 so Stripe stops
  // retrying.
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
    await dispatchEvent(ctx.env.DB, event);
    await run(
      ctx.env.DB,
      `update stripe_events set processed_at = ? where id = ?`,
      [nowIso(), event.id],
    );
  } catch (err) {
    console.error("stripe event dispatch failed:", err);
    // Returning 500 makes Stripe retry; the event row stays unprocessed
    // and dedup gates the retry safely.
    return new Response("dispatch failed", { status: 500 });
  }

  return json({ received: true });
};

// -----------------------------------------------------------------------------
// Dispatch
// -----------------------------------------------------------------------------

async function dispatchEvent(db: D1Database, event: StripeEvent): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as StripeCheckoutSession;
      if (session.subscription && session.customer) {
        // The subscription object lands on the subsequent
        // customer.subscription.created event — we just mark the user's
        // customer_id here (it may already be set if they had a Customer
        // before Checkout).
        await db
          .prepare(
            `update users set stripe_customer_id = ?, updated_at = ?
              where stripe_customer_id is null
                and id = (
                  select id from users where stripe_customer_id = ? limit 1
                )`,
          )
          .bind(session.customer, nowIso(), session.customer)
          .run();
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as StripeSubscription;
      await upsertSubscription(db, sub, event.type === "customer.subscription.deleted");
      break;
    }
    case "invoice.payment_failed": {
      // Stripe flips the underlying subscription status to past_due on
      // its own; the subscription.updated event that follows will land
      // through the case above. We don't need to handle invoices.
      break;
    }
    default:
      // Other events are recorded in stripe_events but not acted on.
      break;
  }
}

async function upsertSubscription(
  db: D1Database,
  sub: StripeSubscription,
  forceCanceled: boolean,
): Promise<void> {
  const userId = await resolveUserIdForCustomer(db, sub.customer);
  if (!userId) {
    console.warn("subscription event for unknown customer:", sub.customer);
    return;
  }

  const status = forceCanceled ? "canceled" : sub.status;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const now = nowIso();
  const cps = new Date(sub.current_period_start * 1000).toISOString();
  const cpe = new Date(sub.current_period_end * 1000).toISOString();
  const canceledAt = sub.canceled_at
    ? new Date(sub.canceled_at * 1000).toISOString()
    : null;
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const created = new Date(sub.created * 1000).toISOString();

  await run(
    db,
    `insert into stripe_subscriptions
       (id, user_id, stripe_customer_id, status, price_id,
        current_period_start, current_period_end, cancel_at_period_end,
        canceled_at, trial_end, created, raw_json, inserted_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(id) do update set
       status = excluded.status,
       price_id = excluded.price_id,
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       canceled_at = excluded.canceled_at,
       trial_end = excluded.trial_end,
       raw_json = excluded.raw_json,
       updated_at = excluded.updated_at`,
    [
      sub.id, userId, sub.customer, status, priceId,
      cps, cpe, sub.cancel_at_period_end ? 1 : 0,
      canceledAt, trialEnd, created, JSON.stringify(sub), now, now,
    ],
  );

  // Denormalize onto users for fast gate reads.
  const userStatus = mapToUserStatus(status);
  await run(
    db,
    `update users
        set subscription_status = ?,
            subscription_id = ?,
            subscription_current_period_end = ?,
            updated_at = ?
      where id = ?`,
    [userStatus, sub.id, cpe, now, userId],
  );
}

async function resolveUserIdForCustomer(
  db: D1Database,
  customerId: string,
): Promise<string | null> {
  const row = await one<{ id: string }>(
    db,
    `select id from users where stripe_customer_id = ? limit 1`,
    [customerId],
  );
  return row?.id ?? null;
}

function mapToUserStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    default:
      return "unpaid";
  }
}
