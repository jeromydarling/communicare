// =============================================================================
// /api/find-nearby-farms — KV-cached front for the Perplexity search
// =============================================================================
// During the migration, the upstream logic still lives on Supabase
// (supabase/functions/find-nearby-farms — ~700 lines: Perplexity prompt,
// Mapbox geocoding, drop-site distance math, discovered_farms upsert).
// Porting all of that to a Worker is a real chunk of work and belongs in
// Phase 4. This thin layer lands the *KV cache* win independently:
//
//   - First request for a given (zip, radius) → call Supabase upstream,
//     write the response into the CACHE KV namespace with a 7-day TTL.
//   - Subsequent requests → KV hit, sub-10ms read, no Supabase round-trip.
//   - `force: true` in the body bypasses the cache (used by the dashboard
//     "refresh" affordance).
//
// The Supabase function also writes to discovered_farms / discovery_searches
// — those side effects only happen on cache miss, which is fine: by design
// we don't want to re-write the same rows on every request.
//
// When Phase 4 ports the Perplexity logic to a Worker, the upstream call
// here gets replaced with a local function call. The cache shape stays
// the same — clients see no change.
// =============================================================================

import { preflight, json } from "../_lib/cors";

type Env = {
  CACHE?: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = {
  zip?: string;
  radiusMiles?: number;
  force?: boolean;
};

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const CACHE_VERSION = "v1"; // bump when the upstream response shape changes

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

  const zip = (body.zip ?? "").trim();
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    return json({ error: "Use a 5-digit US ZIP (e.g. 24091)." }, 400);
  }
  const radiusMiles = clampInt(body.radiusMiles ?? 20, 5, 200);
  const force = body.force === true;

  const cacheKey = `find-nearby-farms:${CACHE_VERSION}:${zip}:${radiusMiles}`;

  if (!force && ctx.env.CACHE) {
    const cached = await ctx.env.CACHE.get(cacheKey, "json");
    if (cached) {
      return json({ ...(cached as object), _cache: "hit" });
    }
  }

  // Forward to the upstream Supabase function. We pass the anon key as the
  // apikey header so its auth gate (configured `--no-verify-jwt`) accepts
  // the request.
  const upstream = await fetch(
    `${SUPABASE_URL}/functions/v1/find-nearby-farms`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ zip, radiusMiles, force }),
    },
  );

  const text = await upstream.text();
  if (!upstream.ok) {
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ error: "Upstream returned non-JSON." }, 502);
  }

  // Cache the payload behind the same key. waitUntil lets us return the
  // response without blocking on the KV write.
  if (ctx.env.CACHE) {
    ctx.waitUntil(
      ctx.env.CACHE.put(cacheKey, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SECONDS,
      }),
    );
  }

  return json({ ...(payload as object), _cache: "miss" });
};

function clampInt(n: number, lo: number, hi: number): number {
  const i = Math.round(n);
  if (!Number.isFinite(i)) return lo;
  return Math.max(lo, Math.min(hi, i));
}
