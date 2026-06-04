// =============================================================================
// /api/waitlist — Turnstile-gated waitlist signup from /join
// =============================================================================
// The /join form writes a row to `waitlist`. Without a gate, it's a
// trivial form to spam. This endpoint:
//
//   1. Verifies the Cloudflare Turnstile token submitted with the form.
//   2. Applies a per-IP rate limit (5 / hour) as belt-and-suspenders.
//   3. Forwards the validated insert to the Supabase upstream (until
//      Phase 8 cuts data over to D1, when this writes to env.DB
//      directly).
//
// Transitional shape: the client can keep submitting the same fields it
// already does for the direct-Supabase insert. The only new field is
// `turnstileToken`, attached after the widget runs.
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { verifyTurnstile } from "../_lib/turnstile";
import { rateLimit, ipBucket } from "../_lib/ratelimit";

type Env = {
  RATELIMIT?: KVNamespace;
  TURNSTILE_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = {
  email?: string;
  name?: string;
  farm_name?: string;
  location?: string;
  farm_kind?: string;
  current_tool?: string;
  note?: string;
  source?: string;
  turnstileToken?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = ctx.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Upstream Supabase config missing on this deploy." }, 500);
  }

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const email = (body.email ?? "").trim();
  if (!/.+@.+\..+/.test(email)) {
    return json({ error: "Valid email required." }, 400);
  }

  // Gate 1: Turnstile (catches scripted submissions)
  const ts = await verifyTurnstile(
    body.turnstileToken,
    ctx.env.TURNSTILE_SECRET,
    ctx.request.headers.get("cf-connecting-ip") ?? undefined,
  );
  if (!ts.ok) {
    return json({ error: `Captcha failed: ${ts.reason}` }, 403);
  }

  // Gate 2: per-IP rate limit (catches a real visitor mashing submit)
  const ipGate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "waitlist"),
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!ipGate.ok) return ipGate.response;

  // Forward the row to Supabase via the REST endpoint (PostgREST).
  // We strip turnstileToken — only the form data goes into the table.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { turnstileToken: _t, ...row } = body;

  const upstream = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify([row]),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return json(
      { error: "Couldn't save you to the list. Try again, or write us." },
      upstream.status,
    );
  }

  return json({ ok: true });
};
