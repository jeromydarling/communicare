// =============================================================================
// smoke-billing — end-to-end smoke against the live billing surface
// =============================================================================
// Node 22+, plain fetch, no dependencies. See the workflow file for what
// this tests and doesn't.
//
// Two-part run:
//   Phase A (steps 1-6): auth + Checkout Session creation. Confirms the
//     signup path works, the Stripe secret is set, we create a Customer,
//     and Stripe accepts the resulting Checkout Session.
//   Phase B (steps 7-10): synthetic-but-real-signature webhook. We
//     construct a customer.subscription.created event JSON, sign it with
//     STRIPE_WEBHOOK_SECRET (mirrored from CF), POST to
//     /api/billing/webhook. The signature validates, the same dispatch
//     code Stripe would trigger runs. Then we verify subscription_status
//     flipped, verify a previously-gated route now returns 2xx, then
//     send subscription.deleted and confirm the flip back.
//
// Emits GitHub Actions step-summary blocks so the run's summary page has
// the full trail without digging through logs.
// =============================================================================

import { createHmac } from "node:crypto";
import { appendFileSync } from "node:fs";

const SITE_URL = process.env.SITE_URL ?? "https://communicare.farm";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const RUN_ID = process.env.GITHUB_RUN_ID ?? String(Date.now());
const EMAIL = `smoketest-${RUN_ID}@thecros.app`;
const PASSWORD = `Sm0ke-${RUN_ID}-passphrase!`;

const summary = [];

function log(msg) {
  console.log(msg);
  summary.push(msg);
}

function fail(msg) {
  console.error(`::error::${msg}`);
  log(`❌ ${msg}`);
  flushSummary();
  process.exit(1);
}

function flushSummary() {
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (!stepSummary) return;
  const body = `# Billing smoke — run ${RUN_ID}\n\n${summary.map((l) => `- ${l}`).join("\n")}\n`;
  try {
    appendFileSync(stepSummary, body);
  } catch {
    /* best effort */
  }
}

let cookie = "";

function parseSetCookie(res) {
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  const m = raw.match(/(__Host-cmcr_session=[^;,]+)/);
  return m ? m[1] : "";
}

async function req(path, init = {}) {
  const url = `${SITE_URL}${path}`;
  const headers = { ...(init.headers ?? {}) };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(url, { ...init, headers });
  return res;
}

// ---------------------------------------------------------------------------
// Phase A — real auth + Checkout Session creation
// ---------------------------------------------------------------------------

log(`Site:  ${SITE_URL}`);
log(`Email: ${EMAIL}`);
log("");
log("## Phase A — auth + Checkout Session");

// Step 1 — signup
log("### 1. POST /api/auth/signup");
{
  const res = await req("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      display_name: "Smoke Test",
      farm_name: "Smoke Test Farm",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`signup HTTP ${res.status}: ${JSON.stringify(body)}`);
  cookie = parseSetCookie(res);
  if (!cookie) fail("signup did not return a __Host-cmcr_session cookie");
  log(`  ✓ user=${body?.user?.id ?? "?"} · cookie captured`);
}

// Step 2 — /api/auth/me sanity
log("### 2. GET /api/auth/me");
{
  const res = await req("/api/auth/me");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`me HTTP ${res.status}`);
  if (body?.user?.email !== EMAIL) fail(`me wrong user: ${JSON.stringify(body)}`);
  log(`  ✓ me.user.email matches`);
}

// Step 3 — billing snapshot before payment
log("### 3. GET /api/farmer/me-with-farm (pre-Checkout snapshot)");
{
  const res = await req("/api/farmer/me-with-farm");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`me-with-farm HTTP ${res.status}`);
  const billing = body?.billing;
  if (!billing) fail("no billing block on me-with-farm");
  if (billing.subscription_status !== "unpaid") {
    fail(`expected unpaid, got ${billing.subscription_status}`);
  }
  if (billing.has_stripe_customer !== false) {
    fail(`expected has_stripe_customer=false, got ${billing.has_stripe_customer}`);
  }
  log(`  ✓ billing = unpaid, no customer yet`);
}

// Step 4 — Checkout session creation (creates Customer as side effect)
log("### 4. POST /api/billing/create-checkout-session");
let checkoutUrl = "";
{
  const res = await req("/api/billing/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`create-checkout-session HTTP ${res.status}: ${JSON.stringify(body)}`);
  checkoutUrl = body?.url ?? "";
  if (!/^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl)) {
    fail(`checkout URL not from Stripe: ${checkoutUrl}`);
  }
  log(`  ✓ Stripe Checkout URL returned (session ${body?.sessionId ?? "?"})`);
}

// Step 5 — Confirm Stripe accepts the session URL
log("### 5. HEAD Stripe Checkout URL");
{
  const res = await fetch(checkoutUrl, { method: "HEAD", redirect: "manual" });
  if (res.status < 200 || res.status >= 400) fail(`Stripe HEAD returned ${res.status}`);
  log(`  ✓ Stripe returned ${res.status}`);
}

// Step 6 — Customer id landed on the user row
log("### 6. GET /api/farmer/me-with-farm (post-Checkout-open)");
let stripeCustomerId = "";
{
  const res = await req("/api/farmer/me-with-farm");
  const body = await res.json().catch(() => ({}));
  const billing = body?.billing;
  if (!billing?.has_stripe_customer) {
    fail(`has_stripe_customer=false after checkout open`);
  }
  log(`  ✓ Stripe Customer id landed on the user row`);
  // We need the actual customer id for the synthetic webhook. Not
  // returned in the billing block for privacy, so we pull it from the
  // dedicated route that returns admin-view data — but that doesn't
  // exist yet. Instead we'll ask Stripe: our secret's fine for that.
  const listRes = await fetch(
    `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(
      `metadata['user_id']:'${body.user.id}'`,
    )}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY ?? ""}`,
      },
    },
  );
  if (listRes.ok) {
    const listBody = await listRes.json().catch(() => ({}));
    stripeCustomerId = listBody?.data?.[0]?.id ?? "";
  }
  if (!stripeCustomerId) {
    log(`  ⚠️  Skipping Phase B — could not resolve customer id (no STRIPE_SECRET_KEY on runner or search failed).`);
  } else {
    log(`  ✓ resolved customer id ${stripeCustomerId}`);
  }
}

// ---------------------------------------------------------------------------
// Phase B — synthetic-but-real-signature webhook
// ---------------------------------------------------------------------------
// Only runs if we have STRIPE_WEBHOOK_SECRET and we resolved the
// customer id. Without those we can't exercise the webhook path.
// ---------------------------------------------------------------------------

if (!STRIPE_WEBHOOK_SECRET) {
  log("");
  log("## Phase B — SKIPPED (STRIPE_WEBHOOK_SECRET not set on runner)");
} else if (!stripeCustomerId) {
  log("");
  log("## Phase B — SKIPPED (could not resolve stripe_customer_id)");
} else {
  log("");
  log("## Phase B — synthetic webhook + gate-release verification");

  const subId = `sub_smoke_${RUN_ID}`;
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + 30 * 86400;

  // Step 7 — synthetic customer.subscription.created signed with the real secret
  log("### 7. POST /api/billing/webhook — synthetic customer.subscription.created");
  {
    const event = {
      id: `evt_smoke_created_${RUN_ID}`,
      type: "customer.subscription.created",
      livemode: true,
      created: now,
      data: {
        object: {
          id: subId,
          customer: stripeCustomerId,
          status: "active",
          current_period_start: now,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          canceled_at: null,
          trial_end: null,
          created: now,
          items: {
            data: [{ price: { id: "price_1ToAcpIuo9wd3dMdBaYJBVzP" } }],
          },
        },
      },
    };
    const status = await postSignedWebhook(event);
    if (status < 200 || status >= 300) fail(`webhook returned ${status}`);
    log(`  ✓ webhook accepted (${status})`);
  }

  // Step 8 — subscription_status should now be 'active'
  log("### 8. GET /api/farmer/me-with-farm — expect subscription_status=active");
  {
    // Small delay so the D1 write commits before the next read.
    await new Promise((r) => setTimeout(r, 500));
    const res = await req("/api/farmer/me-with-farm");
    const body = await res.json().catch(() => ({}));
    if (body?.billing?.subscription_status !== "active") {
      fail(
        `expected active, got ${body?.billing?.subscription_status} — the webhook DIDN'T flip the flag`,
      );
    }
    log(`  ✓ subscription_status = active`);
  }

  // Step 9 — a previously-gated route now returns non-402
  log("### 9. POST /api/farmer/sms/send-test — expect NOT 402");
  {
    const res = await req("/api/farmer/sms/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "(555) 555-0100" }),
    });
    // We accept 400 (bad phone / config missing), 404 (no farm), or 502
    // (Twilio failure) — anything that means "gate released, real
    // request-processing happened". 402 would mean the gate is still on.
    if (res.status === 402) fail(`gate still closed (402) after subscription active`);
    const body = await res.json().catch(() => ({}));
    log(`  ✓ status ${res.status} · body: ${JSON.stringify(body).slice(0, 100)}`);
  }

  // Step 10 — subscription.deleted flips status back
  log("### 10. POST /api/billing/webhook — synthetic customer.subscription.deleted");
  {
    const event = {
      id: `evt_smoke_deleted_${RUN_ID}`,
      type: "customer.subscription.deleted",
      livemode: true,
      created: now + 1,
      data: {
        object: {
          id: subId,
          customer: stripeCustomerId,
          status: "canceled",
          current_period_start: now,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          canceled_at: now + 1,
          trial_end: null,
          created: now,
          items: {
            data: [{ price: { id: "price_1ToAcpIuo9wd3dMdBaYJBVzP" } }],
          },
        },
      },
    };
    const status = await postSignedWebhook(event);
    if (status < 200 || status >= 300) fail(`webhook (delete) returned ${status}`);

    await new Promise((r) => setTimeout(r, 500));
    const res = await req("/api/farmer/me-with-farm");
    const body = await res.json().catch(() => ({}));
    if (body?.billing?.subscription_status !== "canceled") {
      fail(
        `expected canceled, got ${body?.billing?.subscription_status} — subscription.deleted didn't stick`,
      );
    }
    log(`  ✓ subscription_status = canceled`);
  }
}

log("");
log("**All in-scope steps green.**");
flushSummary();
process.exit(0);

// ---------------------------------------------------------------------------
// Signed webhook helper — HMAC-SHA256 with Stripe's t=<ts>,v1=<hex> format
// ---------------------------------------------------------------------------

async function postSignedWebhook(event) {
  const rawBody = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${rawBody}`;
  const sig = createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");
  const header = `t=${ts},v1=${sig}`;
  const res = await fetch(`${SITE_URL}/api/billing/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": header,
    },
    body: rawBody,
  });
  return res.status;
}
