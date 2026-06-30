// =============================================================================
// stripe — small Workers-native client for the Stripe REST API
// =============================================================================
// We hit a few endpoints (customers, checkout.sessions, billing_portal,
// accounts, accountLinks, webhookEndpoints/verify). Each is form-encoded
// over Basic auth with the secret key. No SDK; the SDK bundles fetch
// adapters that fight Workers' fetch and inflates the bundle by ~600KB.
//
// The webhook signature verifier is HMAC-SHA256 of the timestamp + raw
// body, per Stripe's signing scheme. We use SubtleCrypto and compare in
// constant time.
//
// What this module does NOT do:
//   - Idempotency keys at the Stripe layer. Our callers are already
//     idempotent at the D1 layer (insert-or-ignore on customer_id, etc.).
//     If we ever do retried bulk operations we'll add it.
//   - Subscription proration math, invoice introspection, etc. — those
//     live in the route handlers that need them.
// =============================================================================

export type StripeEnv = {
  STRIPE_SECRET_KEY?: string;
};

const STRIPE_API = "https://api.stripe.com/v1";

// -----------------------------------------------------------------------------
// Generic REST call — form-urlencoded body, JSON response
// -----------------------------------------------------------------------------

export async function stripeRequest<T = unknown>(
  env: StripeEnv,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string | undefined>,
  extraHeaders?: Record<string, string>,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; code?: string }> {
  if (!env.STRIPE_SECRET_KEY) {
    return { ok: false, status: 500, error: "STRIPE_SECRET_KEY missing" };
  }
  const url = `${STRIPE_API}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
      ...(extraHeaders ?? {}),
    },
  };
  if (method === "POST" && params) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) usp.set(k, v);
    }
    init.body = usp.toString();
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, error: `Stripe ${res.status}: non-JSON response` };
  }

  if (!res.ok) {
    const b = body as { error?: { message?: string; code?: string } };
    return {
      ok: false,
      status: res.status,
      error: b.error?.message ?? `Stripe ${res.status}`,
      code: b.error?.code,
    };
  }
  return { ok: true, data: body as T };
}

// -----------------------------------------------------------------------------
// Webhook signature verification
// -----------------------------------------------------------------------------
// Stripe's `Stripe-Signature` header is `t=<unix>,v1=<hex_hmac>,v0=...`
// where the signed payload is `${t}.${raw_body}` HMAC-SHA256'd with the
// webhook secret. We accept v1 only (v0 is deprecated). Tolerance window
// is 5 minutes — the docs' recommendation.
// -----------------------------------------------------------------------------

export async function verifyStripeSignature(args: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!args.signatureHeader || !args.secret) {
    return { ok: false, reason: "missing signature or secret" };
  }
  const parts = args.signatureHeader.split(",").reduce<Record<string, string[]>>(
    (acc, p) => {
      const [k, v] = p.split("=", 2);
      if (!k || !v) return acc;
      (acc[k] ??= []).push(v);
      return acc;
    },
    {},
  );
  const ts = parts["t"]?.[0];
  const sigs = parts["v1"] ?? [];
  if (!ts || sigs.length === 0) {
    return { ok: false, reason: "malformed signature header" };
  }
  const tolerance = args.toleranceSeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > tolerance) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const payload = `${ts}.${args.rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(args.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const expectedHex = bytesToHex(new Uint8Array(digest));

  for (const sig of sigs) {
    if (constantTimeEqualHex(sig, expectedHex)) return { ok: true };
  }
  return { ok: false, reason: "no matching signature" };
}

function bytesToHex(b: Uint8Array): string {
  let out = "";
  for (let i = 0; i < b.length; i++) {
    out += b[i].toString(16).padStart(2, "0");
  }
  return out;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// -----------------------------------------------------------------------------
// Typed shapes — only the fields we actually read. Stripe ships many more.
// -----------------------------------------------------------------------------

export type StripeCustomer = {
  id: string;
  email: string | null;
  metadata?: Record<string, string>;
};

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | null;
  payment_status: string;
  status: string;
};

export type StripeBillingPortalSession = {
  id: string;
  url: string;
};

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_end: number | null;
  created: number;
  items: { data: Array<{ price: { id: string } }> };
};

export type StripeAccount = {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

export type StripeAccountLink = {
  object: "account_link";
  url: string;
  expires_at: number;
};

export type StripeEvent = {
  id: string;
  type: string;
  account?: string;
  livemode: boolean;
  data: { object: unknown };
  created: number;
};
