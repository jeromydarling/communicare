// =============================================================================
// Intent handlers — apply a parsed SMS intent to the database
// =============================================================================
// These are the action layer behind the swap-by-text loop. Each handler:
//   - Looks up the user + the next-upcoming order for that farm
//   - Mutates the relevant tables (orders, order_items, subscriptions,
//     credit_ledger, profiles, sms_messages)
//   - Returns a `replyText` the webhook sends back to the member
//
// Every function is idempotent where possible (no double-credits if the
// member texts twice). Errors return a friendly fallback reply instead of
// throwing — we'd rather the member get "Sorry, didn't catch that" than
// silence.
//
// Money is always in cents. Append-only writes to credit_ledger via insert
// (the trigger blocks UPDATE/DELETE).
// =============================================================================

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2.50.0";

type Admin = SupabaseClient;

const SHARE_PRICE_CENTS = 3600; // demo default — in production read from subscription

export type IntentContext = {
  admin: Admin;
  farmId: string;
  userId: string;
  memberPhone: string;
};

export type IntentResult = {
  reply: string;
  details?: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// SWAP — replace one item in the upcoming order with another
// -----------------------------------------------------------------------------
export async function handleSwap(
  ctx: IntentContext,
  from: string,
  to: string,
): Promise<IntentResult> {
  const order = await findUpcomingOrder(ctx);
  if (!order) {
    return {
      reply: `We couldn't find an upcoming order to swap. If your next pickup is more than a week out, try replying closer to the date.`,
    };
  }

  // Find the line item matching "from"
  const { data: items } = await ctx.admin
    .from("order_items")
    .select("id, product_id, products(name)")
    .eq("order_id", order.id);

  type ItemRow = {
    id: number;
    product_id: number;
    products: { name: string } | null;
  };
  const rows = (items ?? []) as unknown as ItemRow[];
  const fromItem = rows.find((r) =>
    r.products?.name.toLowerCase().includes(from.toLowerCase()),
  );

  if (!fromItem) {
    return {
      reply: `We didn't find "${from}" in this week's share. Reply with the current item name to swap.`,
    };
  }

  // Find a product matching "to" that the farm carries
  const { data: matchingProducts } = await ctx.admin
    .from("products")
    .select("id, name")
    .eq("farm_id", ctx.farmId)
    .eq("is_active", true)
    .eq("is_sold_out", false)
    .ilike("name", `%${to}%`)
    .limit(1);

  const toProduct = matchingProducts?.[0];
  if (!toProduct) {
    return {
      reply: `Sorry — we don't have ${to} available this week. Reply with another item, or SKIP to skip the week.`,
    };
  }

  // Replace the line item — same qty, new product_id
  await ctx.admin
    .from("order_items")
    .update({ product_id: toProduct.id })
    .eq("id", fromItem.id);

  return {
    reply: `Done. Swapped ${fromItem.products?.name ?? from} for ${toProduct.name}. Pickup details unchanged.`,
    details: { order_id: order.id, swapped_item_id: fromItem.id },
  };
}

// -----------------------------------------------------------------------------
// SKIP — cancel the next N orders, credit the member's account
// -----------------------------------------------------------------------------
export async function handleSkip(
  ctx: IntentContext,
  weeks: number,
): Promise<IntentResult> {
  const n = Math.max(1, Math.min(weeks, 12)); // cap at 12 weeks
  const { data: upcoming } = await ctx.admin
    .from("orders")
    .select("id, total_cents, pickup_date")
    .eq("farm_id", ctx.farmId)
    .eq("user_id", ctx.userId)
    .in("status", ["draft", "confirmed"])
    .order("pickup_date", { ascending: true })
    .limit(n);

  type OrderRow = { id: string; total_cents: number; pickup_date: string };
  const orders = (upcoming ?? []) as OrderRow[];

  if (orders.length === 0) {
    return {
      reply: `No upcoming orders to skip. We'll save your spot for the next pickup.`,
    };
  }

  let totalCredited = 0;
  for (const o of orders) {
    await ctx.admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", o.id);

    const creditCents = o.total_cents > 0 ? o.total_cents : SHARE_PRICE_CENTS;
    totalCredited += creditCents;

    await insertCredit(ctx, {
      delta: creditCents,
      reason: "refund_skip_week",
      reference_order_id: o.id,
      note: `Skip-week credit for ${o.pickup_date}`,
    });
  }

  const dollars = (totalCredited / 100).toFixed(2);
  return {
    reply: `Skipped ${orders.length} week${orders.length === 1 ? "" : "s"}. Account credited $${dollars}. Back on the roster after that.`,
    details: { cancelled_orders: orders.map((o) => o.id), credit_cents: totalCredited },
  };
}

// -----------------------------------------------------------------------------
// PAUSE — set the subscription's paused_until date
// -----------------------------------------------------------------------------
export async function handlePause(
  ctx: IntentContext,
  weeks: number,
): Promise<IntentResult> {
  const { data: subs } = await ctx.admin
    .from("subscriptions")
    .select("id")
    .eq("farm_id", ctx.farmId)
    .eq("user_id", ctx.userId)
    .eq("status", "active");

  if (!subs || subs.length === 0) {
    return {
      reply: `We didn't find an active subscription to pause. Reply HELP if this is a mistake.`,
    };
  }

  const until = new Date();
  until.setDate(until.getDate() + weeks * 7);
  const untilIso = until.toISOString().slice(0, 10);

  for (const s of subs as { id: string }[]) {
    await ctx.admin
      .from("subscriptions")
      .update({ status: "paused", paused_until: untilIso })
      .eq("id", s.id);
  }

  // Skip + credit the implicit orders that fall in the pause window
  const skipResult = await handleSkip(ctx, weeks);

  return {
    reply: `Paused for ${weeks} week${weeks === 1 ? "" : "s"}. We'll text you when you're back on the list. ${skipResult.reply.includes("Account credited") ? skipResult.reply.split(". ")[1] : ""}`.trim(),
    details: { paused_until: untilIso, ...skipResult.details },
  };
}

// -----------------------------------------------------------------------------
// RESUME — clear paused_until on the subscription
// -----------------------------------------------------------------------------
export async function handleResume(ctx: IntentContext): Promise<IntentResult> {
  const { data: subs, error } = await ctx.admin
    .from("subscriptions")
    .update({ status: "active", paused_until: null })
    .eq("farm_id", ctx.farmId)
    .eq("user_id", ctx.userId)
    .eq("status", "paused")
    .select("id");

  if (error || !subs || subs.length === 0) {
    return {
      reply: `You're already on the list for the next pickup. See you Tuesday.`,
    };
  }

  return {
    reply: `Welcome back. You're on the list for the next pickup.`,
  };
}

// -----------------------------------------------------------------------------
// DONATE — mark the next order as donated to the food pantry + credit
// -----------------------------------------------------------------------------
export async function handleDonate(ctx: IntentContext): Promise<IntentResult> {
  const order = await findUpcomingOrder(ctx);
  if (!order) {
    return {
      reply: `No upcoming order to donate. If your pickup is further out, try replying the morning of.`,
    };
  }

  await ctx.admin
    .from("orders")
    .update({ status: "donated" })
    .eq("id", order.id);

  const creditCents = order.total_cents > 0 ? order.total_cents : SHARE_PRICE_CENTS;
  await insertCredit(ctx, {
    delta: creditCents,
    reason: "refund_no_show_donation",
    reference_order_id: order.id,
    note: "Donated to local food pantry",
  });

  const dollars = (creditCents / 100).toFixed(2);
  return {
    reply: `Got it. Your share goes to the food pantry. Account credited $${dollars} for the value of the box. Thank you.`,
    details: { order_id: order.id, credit_cents: creditCents },
  };
}

// -----------------------------------------------------------------------------
// GIFT — create a one-time gift voucher and SMS the recipient
// -----------------------------------------------------------------------------
export async function handleGift(
  ctx: IntentContext,
  recipientName: string,
  recipientPhone: string | undefined,
): Promise<IntentResult> {
  const order = await findUpcomingOrder(ctx);
  if (!order) {
    return {
      reply: `No upcoming share to gift right now.`,
    };
  }

  // Persist a metadata note on the order so the farmer's roster shows it
  await ctx.admin
    .from("orders")
    .update({
      metadata: {
        gifted_to: recipientName,
        gifted_to_phone: recipientPhone ?? null,
        gifted_at: new Date().toISOString(),
      },
    })
    .eq("id", order.id);

  // Compose the SMS that would go to the recipient (the actual send happens
  // server-side via Twilio; we log the outbound message here)
  if (recipientPhone) {
    await ctx.admin.from("sms_messages").insert({
      farm_id: ctx.farmId,
      user_id: null,
      phone: recipientPhone,
      direction: "outbound",
      body: `Hi ${recipientName} — a friend has gifted you this week's farm share. Reply CLAIM to set a pickup time and address. (You're not signing up for anything ongoing.)`,
      sent_at: new Date().toISOString(),
    });
  }

  return {
    reply: `Sent a pickup pass to ${recipientName}${recipientPhone ? ` at ${recipientPhone}` : ""}. They'll get a text with a magic link to claim it.`,
    details: { order_id: order.id, recipient: recipientName },
  };
}

// -----------------------------------------------------------------------------
// CONFIRM — light acknowledgement
// -----------------------------------------------------------------------------
export async function handleConfirm(ctx: IntentContext): Promise<IntentResult> {
  const order = await findUpcomingOrder(ctx);
  if (order) {
    await ctx.admin
      .from("orders")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", order.id);
  }
  return { reply: `Confirmed. See you at pickup.` };
}

// -----------------------------------------------------------------------------
// OPT-OUT — disable SMS on the user's profile
// -----------------------------------------------------------------------------
export async function handleOptOut(
  admin: Admin,
  phone: string,
): Promise<IntentResult> {
  await admin
    .from("profiles")
    .update({ preferred_sms: false })
    .eq("phone", phone);
  return {
    reply: `You're unsubscribed. We won't text you again. To re-subscribe, reply START.`,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function findUpcomingOrder(
  ctx: IntentContext,
): Promise<{ id: string; total_cents: number; pickup_date: string } | null> {
  const { data } = await ctx.admin
    .from("orders")
    .select("id, total_cents, pickup_date")
    .eq("farm_id", ctx.farmId)
    .eq("user_id", ctx.userId)
    .in("status", ["draft", "confirmed"])
    .order("pickup_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; total_cents: number; pickup_date: string } | null) ?? null;
}

async function insertCredit(
  ctx: IntentContext,
  entry: {
    delta: number;
    reason: string;
    reference_order_id?: string;
    note?: string;
  },
): Promise<void> {
  // Read current balance to compute balance_after_cents
  const { data: lastRow } = await ctx.admin
    .from("credit_ledger")
    .select("balance_after_cents")
    .eq("user_id", ctx.userId)
    .eq("farm_id", ctx.farmId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastBalance = (lastRow as { balance_after_cents: number } | null)
    ?.balance_after_cents ?? 0;

  await ctx.admin.from("credit_ledger").insert({
    farm_id: ctx.farmId,
    user_id: ctx.userId,
    delta_cents: entry.delta,
    balance_after_cents: lastBalance + entry.delta,
    reason: entry.reason,
    reference_order_id: entry.reference_order_id ?? null,
    note: entry.note ?? null,
  });
}

export function makeAdmin(): Admin | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
