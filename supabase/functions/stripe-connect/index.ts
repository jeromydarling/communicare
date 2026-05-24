// =============================================================================
// stripe-connect — Supabase Edge Function (Deno runtime)
// =============================================================================
// Two operations under one function, switched by `?op=onboard|webhook` so we
// can deploy a single function and route. For real production traffic, split
// into two functions.
//
// Routes:
//   POST  /functions/v1/stripe-connect?op=onboard
//         { farm_id, return_url, refresh_url, email, country?: "US" }
//         → { url: "https://connect.stripe.com/...", account_id: "acct_..." }
//
//   POST  /functions/v1/stripe-connect?op=webhook
//         Stripe webhook body; verified via the signing secret.
//         → 200 OK
//
// Deploy:
//   supabase functions deploy stripe-connect
//   supabase secrets set \
//     STRIPE_SECRET_KEY=sk_live_... \
//     STRIPE_WEBHOOK_SECRET=whsec_... \
//     COMMUNICARE_PLATFORM_FEE_BPS=100
//
// Configure Stripe:
//   - In the Stripe Dashboard → Connect → Settings, set the platform branding.
//   - Add a webhook endpoint pointing to this function with ?op=webhook,
//     subscribed to: account.updated, payout.failed, charge.dispute.created
//   - The webhook signing secret you receive → STRIPE_WEBHOOK_SECRET.
//
// The 1% platform fee is set via Stripe `application_fee_amount` on each
// PaymentIntent created on behalf of the connected account; this function
// only handles onboarding + webhook receipt.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import Stripe from "npm:stripe@^17.0.0";
import { z } from "npm:zod@^3.24.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const OnboardInput = z.object({
  farm_id: z.string().uuid(),
  return_url: z.string().url(),
  refresh_url: z.string().url(),
  email: z.string().email(),
  country: z.string().length(2).optional().default("US"),
  business_type: z
    .enum(["individual", "company", "non_profit"])
    .optional()
    .default("individual"),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const op = url.searchParams.get("op");

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return json(
      { error: "STRIPE_SECRET_KEY is not configured on this function." },
      500,
    );
  }

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2024-11-20.acacia",
  });

  if (op === "onboard") {
    return await handleOnboard(req, stripe);
  }
  if (op === "webhook") {
    return await handleWebhook(req, stripe);
  }

  return json(
    {
      error:
        "Specify op=onboard to create an onboarding link or op=webhook for Stripe webhooks.",
    },
    400,
  );
});

// -----------------------------------------------------------------------------
// Onboarding — create Connect account + return onboarding link
// -----------------------------------------------------------------------------

async function handleOnboard(req: Request, stripe: Stripe): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = OnboardInput.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400,
    );
  }

  const { farm_id, return_url, refresh_url, email, country, business_type } =
    parsed.data;

  // If we already have a Connect account stored for this farm, reuse it
  const admin = adminClient();
  let accountId: string | null = null;
  if (admin) {
    const { data } = await admin
      .from("payment_config")
      .select("stripe_account_id")
      .eq("farm_id", farm_id)
      .maybeSingle();
    accountId = data?.stripe_account_id ?? null;
  }

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email,
      business_type,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        us_bank_account_ach_payments: { requested: true },
      },
      business_profile: {
        product_description:
          "Farm-share subscriptions, raw-milk herd shares, pastured meat shares, and farm-direct produce sales via Communicare.",
        mcc: "5499", // Miscellaneous food stores — closest match
      },
      metadata: { farm_id },
    });
    accountId = account.id;

    if (admin) {
      await admin
        .from("payment_config")
        .upsert(
          {
            farm_id,
            mode: "managed_stripe",
            stripe_account_id: accountId,
          },
          { onConflict: "farm_id" },
        );
    }
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url,
    return_url,
    type: "account_onboarding",
    collect: "eventually_due",
  });

  return json({ url: link.url, account_id: accountId });
}

// -----------------------------------------------------------------------------
// Webhook — verify + dispatch
// -----------------------------------------------------------------------------

async function handleWebhook(req: Request, stripe: Stripe): Promise<Response> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, 500);
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "Missing stripe-signature" }, 400);

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch (err) {
    console.error("Invalid Stripe signature:", err);
    return json({ error: "Invalid signature" }, 400);
  }

  const admin = adminClient();

  switch (event.type) {
    case "account.updated": {
      // The connected account's onboarding / capabilities changed
      const account = event.data.object as Stripe.Account;
      const charges_enabled = account.charges_enabled === true;
      const payouts_enabled = account.payouts_enabled === true;
      const details_submitted = account.details_submitted === true;
      const farm_id = account.metadata?.farm_id;

      if (admin && farm_id) {
        await admin
          .from("payment_config")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id);
      }

      console.log(
        `account.updated id=${account.id} charges=${charges_enabled} payouts=${payouts_enabled} details=${details_submitted}`,
      );
      break;
    }

    case "payout.failed": {
      const payout = event.data.object as Stripe.Payout;
      console.error(
        `payout.failed id=${payout.id} amount=${payout.amount} ${payout.currency}`,
      );
      // TODO: alert the farm owner
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      console.warn(
        `charge.dispute.created id=${dispute.id} amount=${dispute.amount} reason=${dispute.reason}`,
      );
      // TODO: queue for staff review
      break;
    }

    default:
      // Unhandled — return 200 so Stripe doesn't retry
      console.log("Unhandled Stripe event:", event.type);
  }

  return json({ received: true });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
