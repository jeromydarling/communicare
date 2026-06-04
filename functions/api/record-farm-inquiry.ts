// =============================================================================
// /api/record-farm-inquiry — anti-spam wrapper around the Supabase function
// =============================================================================
// "Send them a note" gets sent by anyone visiting /find — including bots.
// The upstream Supabase function inserts into farm_inquiries and fires a
// one-time outreach email, both of which are abuse vectors.
//
// This Pages Function fronts the upstream with:
//   1. A per-IP rate limit (5 inquiries / hour) in KV. Bots blowing
//      through this get 429s; honest neighbors never hit it.
//   2. A per-(IP, discoveredFarmId) limit (1 inquiry / hour) so the same
//      visitor can't re-spam the same listing.
//
// On pass, we forward the request to the existing Supabase function with
// the visitor's bearer token (if any). The upstream still handles the
// real validation, the discovered_farms update, and the outreach email —
// this layer is purely a gate.
//
// When Phase 4 ports the logic to a Worker, this file becomes the
// implementation rather than the gate.
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { rateLimit, ipBucket } from "../_lib/ratelimit";

type Env = {
  RATELIMIT?: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = {
  discoveredFarmId?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = ctx.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Upstream Supabase config missing on this deploy." }, 500);
  }

  // Peek at the body without consuming the stream — we need the farm id
  // for the per-(ip, farm) bucket, but we also need to forward the body
  // intact to the upstream. Read as text once, then parse + re-send.
  const bodyText = await ctx.request.text();
  let parsed: RequestBody;
  try {
    parsed = JSON.parse(bodyText) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // Gate 1: per-IP (covers spammy clients hitting many listings)
  const ipKey = ipBucket(ctx.request, "inquiry-ip");
  const ipGate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipKey,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!ipGate.ok) return ipGate.response;

  // Gate 2: per-(IP, farm) (covers repeated sends to the same listing)
  if (parsed.discoveredFarmId) {
    const farmKey = `${ipKey}:${parsed.discoveredFarmId}`;
    const farmGate = await rateLimit(ctx.env.RATELIMIT, {
      bucket: farmKey,
      limit: 1,
      windowSeconds: 60 * 60,
    });
    if (!farmGate.ok) return farmGate.response;
  }

  // Forward upstream. Preserve the caller's Authorization (if any) so the
  // Supabase function can tag member_user_id on the inquiry row.
  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
  const auth = ctx.request.headers.get("Authorization");
  upstreamHeaders.Authorization = auth ?? `Bearer ${SUPABASE_ANON_KEY}`;

  const upstream = await fetch(
    `${SUPABASE_URL}/functions/v1/record-farm-inquiry`,
    {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyText,
    },
  );

  // Pass the upstream response through verbatim — status, body, content
  // type. Drop the upstream's CORS headers in favor of ours.
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
