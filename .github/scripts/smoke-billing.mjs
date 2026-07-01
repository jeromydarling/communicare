// =============================================================================
// smoke-billing — end-to-end smoke against the live billing surface
// =============================================================================
// Node 22+, plain fetch, no dependencies. See the workflow file for what
// this tests and doesn't.
//
// Emits GitHub Actions step-summary blocks so the run's summary page has
// the full trail without digging through logs.
// =============================================================================

import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";

const SITE_URL = process.env.SITE_URL ?? "https://communicare.farm";
const RUN_ID = process.env.GITHUB_RUN_ID ?? String(Date.now());
const EMAIL = `smoketest-${RUN_ID}@thecros.app`;
const PASSWORD = `Sm0ke-${RUN_ID}-passphrase!`; // meets 12-char + mixed reqs

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
    /* ignore — best effort */
  }
}

// Session cookie holder — parsed from the signup response, threaded
// through every subsequent request.
let cookie = "";

function parseSetCookie(res) {
  // Workers respond with a single Set-Cookie for __Host-cmcr_session.
  // Fetch normalizes headers, and res.headers.get('set-cookie') returns
  // a comma-joined string. We want the raw name=value; strip attrs.
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  // Find __Host-cmcr_session=<value>
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
// Steps
// ---------------------------------------------------------------------------

log(`Site:  ${SITE_URL}`);
log(`Email: ${EMAIL}`);

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
  if (body?.user?.email !== EMAIL) {
    fail(`me returned wrong user: ${JSON.stringify(body)}`);
  }
  log(`  ✓ me.user.email matches`);
}

// Step 3 — billing snapshot before payment
log("### 3. GET /api/farmer/me-with-farm (pre-payment billing snapshot)");
{
  const res = await req("/api/farmer/me-with-farm");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`me-with-farm HTTP ${res.status}`);
  const billing = body?.billing;
  if (!billing) fail("no billing block on me-with-farm");
  if (billing.subscription_status !== "unpaid") {
    fail(`expected subscription_status=unpaid, got ${billing.subscription_status}`);
  }
  if (billing.has_stripe_customer !== false) {
    fail(`expected has_stripe_customer=false, got ${billing.has_stripe_customer}`);
  }
  log(`  ✓ billing = unpaid, no customer yet`);
}

// Step 4 — Checkout session creation
log("### 4. POST /api/billing/create-checkout-session");
let checkoutUrl = "";
{
  const res = await req("/api/billing/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail(`create-checkout-session HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  checkoutUrl = body?.url ?? "";
  if (!/^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl)) {
    fail(`checkout URL not from Stripe: ${checkoutUrl}`);
  }
  log(`  ✓ Stripe Checkout URL returned`);
  log(`  session_id: ${body?.sessionId ?? "?"}`);
}

// Step 5 — Confirm Stripe accepts the session URL
log("### 5. HEAD Stripe Checkout URL");
{
  const res = await fetch(checkoutUrl, { method: "HEAD", redirect: "manual" });
  // Stripe often 302s to a localized URL — anything 2xx/3xx is fine.
  if (res.status < 200 || res.status >= 400) {
    fail(`Stripe HEAD returned ${res.status}`);
  }
  log(`  ✓ Stripe returned ${res.status}`);
}

// Step 6 — Confirm Customer is now on the user row
log("### 6. GET /api/farmer/me-with-farm (post-checkout-open snapshot)");
{
  const res = await req("/api/farmer/me-with-farm");
  const body = await res.json().catch(() => ({}));
  const billing = body?.billing;
  if (!billing) fail("no billing block after checkout open");
  if (billing.has_stripe_customer !== true) {
    fail(`expected has_stripe_customer=true after checkout open, got ${billing.has_stripe_customer}`);
  }
  log(`  ✓ Stripe Customer id landed on the user row`);
}

log("");
log("**All 6 steps green.**");
log("");
log("_Not covered by this smoke_: webhook signature verification, subscription_status transitioning to 'active', gate release on previously-402 routes. Verify manually once by paying $9 and refunding via MCP.");

flushSummary();
process.exit(0);
