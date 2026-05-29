// =============================================================================
// find-nearby-farms — Supabase Edge Function (Deno runtime)
// =============================================================================
// Powers the ZIP search on /find. Accepts a US ZIP, asks Perplexity for
// real CSAs, herd shares, and meat shares within ~20 miles, geocodes any
// missing coordinates, and writes the results back to discovered_farms so
// the second visitor searching the same area pays no API cost.
//
// Deploy:   supabase functions deploy find-nearby-farms --no-verify-jwt
// Secrets:  supabase secrets set PERPLEXITY_API_KEY=pplx-...
//           supabase secrets set MAPBOX_TOKEN=pk....
//           (uses the function's built-in SUPABASE_URL +
//            SUPABASE_SERVICE_ROLE_KEY for cache writes)
// Local:    supabase functions serve find-nearby-farms --no-verify-jwt
//
// Voice rule: results we surface here are presented as "we list them
// anyway" — not leads, not customers. The send-a-note flow runs through
// record-farm-inquiry once the visitor decides to reach out.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.50.0";
import { z } from "npm:zod@^3.24.0";
import { preflightResponse } from "../_lib/cors.ts";
import { json } from "../_lib/response.ts";

// -----------------------------------------------------------------------------
// Request + result schemas
// -----------------------------------------------------------------------------

const RequestInput = z.object({
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Use a 5-digit US ZIP (e.g. 24091)."),
  radiusMiles: z.number().int().min(5).max(50).default(20),
  force: z.boolean().default(false), // bypass cache
});

const DropSite = z.object({
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  day_time: z.string().nullable().optional(),
});

const PerplexityFarm = z.object({
  name: z.string(),
  kind: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  website: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  pickup_info: z.string().nullable().optional(),
  share_price: z.string().nullable().optional(),
  drop_sites: z.array(DropSite).nullable().optional(),
});

const PerplexityResults = z.object({
  farms: z.array(PerplexityFarm).max(30),
});

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Geocoding — Mapbox forward geocode for ZIP → lat/lng + city/state
// -----------------------------------------------------------------------------

type GeocodeResult = {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
};

async function geocodeZip(
  zip: string,
  token: string,
): Promise<GeocodeResult | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(zip)}.json?` +
    `country=us&types=postcode&limit=1&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data?.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.center;
  let city: string | undefined;
  let state: string | undefined;
  for (const c of feature.context ?? []) {
    if (typeof c.id !== "string") continue;
    if (c.id.startsWith("place.")) city = c.text;
    if (c.id.startsWith("region.")) state = c.short_code?.replace("US-", "") ?? c.text;
  }
  return { lat, lng, city, state };
}

async function geocodeAddress(
  query: string,
  token: string,
): Promise<{ lat: number; lng: number } | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
    `country=us&limit=1&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data?.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  return { lat, lng };
}

// -----------------------------------------------------------------------------
// Haversine — distance in miles between two lat/lngs, for the radius filter
// -----------------------------------------------------------------------------

function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// -----------------------------------------------------------------------------
// Slugify — used for /claim/[slug] URLs
// -----------------------------------------------------------------------------

function slugify(name: string, zip: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "farm"}-${zip}`;
}

// -----------------------------------------------------------------------------
// Perplexity call — sonar with JSON-mode structured output
// -----------------------------------------------------------------------------

const PERPLEXITY_SYSTEM = `You are a careful directory of real small farms in the United States. You return only farms that currently sell directly to consumers through a CSA, farm share, herd share, or meat share — not grocery stores, food hubs, or restaurants. Do not invent farms. Do not include farms that have closed. Every farm must be currently active in the season at hand.

When you don't know exact coordinates, leave lat/lng null — the caller will geocode.
When you don't know a field, leave it null. Never make one up.`;

function perplexityPrompt(
  zip: string,
  city: string | undefined,
  state: string | undefined,
  radius: number,
): string {
  const location = [city, state].filter(Boolean).join(", ") || `ZIP ${zip}`;
  return `Find real, currently-active small farms with at least one pickup or drop site within about ${radius} miles of ${location} (ZIP ${zip}). The farm itself may be much farther away — for example, a farm two hours from this ZIP that runs a weekly CSA drop in a coffee shop four miles from the searcher must be included. We're searching by pickup proximity, not farm-address proximity.

Include any of:
- Vegetable CSA (community supported agriculture)
- Raw milk herd share or cow share
- Pastured meat share (beef, pork, chicken)
- Pastured egg share
- Mixed farm offering several of the above

For each farm return:
- name
- kind (one of: "Vegetable CSA", "Raw milk herd share", "Pastured meat", "Pastured eggs", "Mixed farm")
- a one-sentence description in plain editorial English (no marketing copy)
- address, city, state, zip — the FARM ITSELF
- lat, lng (only if you are sure; otherwise null)
- website (the canonical farm URL, not a directory listing)
- email (if publicly listed)
- phone (if publicly listed)
- pickup_info (free-form summary: "Saturdays at the farm, 9am–noon, plus Wednesday drops in Athens and Nelsonville")
- share_price (free-form: "$620/season", "$115/month boarding")
- drop_sites: an array of every public pickup location the farm uses besides the main farm address — CSA pickup points, farmers' markets they attend, drop sites for meat shares. For each: name, address, city, state, zip, lat, lng (if known), day_time ("Wednesday 4–6pm"). Use an empty array if there are no drop sites.

Return up to 20 farms. Quality over quantity — do not pad the list. Do not invent farms or drop sites that you can't verify.`;
}

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
};

async function callPerplexity(
  apiKey: string,
  zip: string,
  city: string | undefined,
  state: string | undefined,
  radius: number,
): Promise<{ farms: z.infer<typeof PerplexityFarm>[]; citations: string[] }> {
  const body = {
    model: "sonar-pro",
    messages: [
      { role: "system", content: PERPLEXITY_SYSTEM },
      { role: "user", content: perplexityPrompt(zip, city, state, radius) },
    ],
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        schema: {
          type: "object",
          properties: {
            farms: {
              type: "array",
              maxItems: 20,
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  kind: { type: ["string", "null"] },
                  description: { type: ["string", "null"] },
                  address: { type: ["string", "null"] },
                  city: { type: ["string", "null"] },
                  state: { type: ["string", "null"] },
                  zip: { type: ["string", "null"] },
                  lat: { type: ["number", "null"] },
                  lng: { type: ["number", "null"] },
                  website: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  phone: { type: ["string", "null"] },
                  pickup_info: { type: ["string", "null"] },
                  share_price: { type: ["string", "null"] },
                  drop_sites: {
                    type: ["array", "null"],
                    items: {
                      type: "object",
                      properties: {
                        name: { type: ["string", "null"] },
                        address: { type: ["string", "null"] },
                        city: { type: ["string", "null"] },
                        state: { type: ["string", "null"] },
                        zip: { type: ["string", "null"] },
                        lat: { type: ["number", "null"] },
                        lng: { type: ["number", "null"] },
                        day_time: { type: ["string", "null"] },
                      },
                    },
                  },
                },
                required: ["name"],
              },
            },
          },
          required: ["farms"],
        },
      },
    },
  };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as PerplexityResponse;
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const citations = Array.isArray(data?.citations) ? data.citations : [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Some responses wrap JSON in prose — try to fish it out
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { farms: [] };
  }

  const result = PerplexityResults.safeParse(parsed);
  return {
    farms: result.success ? result.data.farms : [],
    citations,
  };
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return preflightResponse();
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = RequestInput.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400,
    );
  }

  const { zip, radiusMiles, force } = parsed.data;

  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
  const mapboxToken = Deno.env.get("MAPBOX_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!perplexityKey) {
    return json(
      {
        error:
          "PERPLEXITY_API_KEY is not set. Run `supabase secrets set PERPLEXITY_API_KEY=...`.",
      },
      500,
    );
  }
  if (!mapboxToken) {
    return json(
      {
        error:
          "MAPBOX_TOKEN is not set. Run `supabase secrets set MAPBOX_TOKEN=pk....`.",
      },
      500,
    );
  }
  if (!supabaseUrl || !serviceKey) {
    return json(
      { error: "Supabase service-role config missing inside the function." },
      500,
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---------------------------------------------------------------------------
  // 1. Cache check — same ZIP, searched within the last 7 days, no force?
  // ---------------------------------------------------------------------------
  if (!force) {
    const { data: recent } = await admin
      .from("discovery_searches")
      .select("id, lat, lng, city, state, searched_at")
      .eq("zip", zip)
      .gt(
        "searched_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("searched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const { data: cached } = await admin
        .from("discovered_farms")
        .select("*")
        .eq("discovered_via_zip", zip)
        .is("opted_out_at", null);

      // Cache rows don't carry nearest-pickup distance (it's relative to
      // the searcher). Recompute it from the stored drop_sites + the
      // cached center coords so the client gets the same shape on cache
      // hits as on fresh searches.
      const centerLL = { lat: recent.lat as number, lng: recent.lng as number };
      const decorated = (cached ?? []).map((row: Record<string, unknown>) => {
        const candidates: Array<{ label: string; miles: number }> = [];
        const flat = row.lat as number | null;
        const flng = row.lng as number | null;
        if (flat != null && flng != null) {
          candidates.push({
            label: "farm",
            miles: distanceMiles({ lat: flat, lng: flng }, centerLL),
          });
        }
        const drops = (row.drop_sites as Array<{
          name?: string | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
        }> | null) ?? [];
        for (const ds of drops) {
          if (ds.lat != null && ds.lng != null) {
            candidates.push({
              label: `drop: ${ds.name ?? ds.city ?? "site"}`,
              miles: distanceMiles({ lat: ds.lat, lng: ds.lng }, centerLL),
            });
          }
        }
        candidates.sort((a, b) => a.miles - b.miles);
        const nearest = candidates[0];
        return {
          ...row,
          nearest_pickup_miles: nearest?.miles ?? null,
          nearest_pickup_label: nearest?.label ?? null,
        };
      });
      decorated.sort((a, b) => {
        const am = (a.nearest_pickup_miles as number | null) ?? 9999;
        const bm = (b.nearest_pickup_miles as number | null) ?? 9999;
        return am - bm;
      });

      return json({
        zip,
        center: centerLL,
        city: recent.city,
        state: recent.state,
        source: "cache",
        radius_miles: radiusMiles,
        farms: decorated,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Geocode the ZIP
  // ---------------------------------------------------------------------------
  const center = await geocodeZip(zip, mapboxToken);
  if (!center) {
    return json(
      { error: `Couldn't find ZIP ${zip}. Double-check it's a US ZIP.` },
      404,
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Ask Perplexity
  // ---------------------------------------------------------------------------
  let pplx: { farms: z.infer<typeof PerplexityFarm>[]; citations: string[] };
  try {
    pplx = await callPerplexity(
      perplexityKey,
      zip,
      center.city,
      center.state,
      radiusMiles,
    );
  } catch (err) {
    console.error("perplexity error", err);
    return json(
      {
        error:
          "We couldn't reach the discovery service just now. Try again in a moment.",
      },
      502,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Geocode missing coords (farm + every drop site), then filter by the
  //    closest pickup distance — primary location OR any drop site.
  //    A farm two hours away with a drop site near the searcher should
  //    surface; one with neither close shouldn't.
  // ---------------------------------------------------------------------------
  type DropSiteResolved = {
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    lat: number | null;
    lng: number | null;
    day_time: string | null;
    distance_miles: number | null;
  };
  type EnrichedFarm = z.infer<typeof PerplexityFarm> & {
    lat: number;
    lng: number;
    drop_sites_resolved: DropSiteResolved[];
    nearest_pickup_miles: number;
    nearest_pickup_label: string; // "farm" | "drop: <name>"
  };

  const enriched: EnrichedFarm[] = [];
  for (const farm of pplx.farms) {
    // Resolve the primary farm coords first
    let lat = farm.lat ?? null;
    let lng = farm.lng ?? null;
    if (lat == null || lng == null) {
      const query = [farm.address, farm.city, farm.state, farm.zip]
        .filter(Boolean)
        .join(", ");
      if (query.length >= 4) {
        const g = await geocodeAddress(query, mapboxToken);
        if (g) {
          lat = g.lat;
          lng = g.lng;
        }
      }
    }

    // Resolve every drop site's coords
    const dropSites: DropSiteResolved[] = [];
    for (const ds of farm.drop_sites ?? []) {
      let dlat = ds.lat ?? null;
      let dlng = ds.lng ?? null;
      if (dlat == null || dlng == null) {
        const dquery = [ds.address, ds.city, ds.state, ds.zip]
          .filter(Boolean)
          .join(", ");
        if (dquery.length >= 4) {
          const g = await geocodeAddress(dquery, mapboxToken);
          if (g) {
            dlat = g.lat;
            dlng = g.lng;
          }
        }
      }
      const dmiles =
        dlat != null && dlng != null
          ? distanceMiles({ lat: dlat, lng: dlng }, center)
          : null;
      dropSites.push({
        name: ds.name ?? null,
        address: ds.address ?? null,
        city: ds.city ?? null,
        state: ds.state ?? null,
        zip: ds.zip ?? null,
        lat: dlat,
        lng: dlng,
        day_time: ds.day_time ?? null,
        distance_miles: dmiles,
      });
    }

    // Compute the nearest pickup distance
    const candidates: Array<{ label: string; miles: number }> = [];
    if (lat != null && lng != null) {
      candidates.push({
        label: "farm",
        miles: distanceMiles({ lat, lng }, center),
      });
    }
    for (const ds of dropSites) {
      if (ds.distance_miles != null) {
        candidates.push({
          label: `drop: ${ds.name ?? ds.city ?? "site"}`,
          miles: ds.distance_miles,
        });
      }
    }
    if (candidates.length === 0) continue; // nothing geocoded — skip

    candidates.sort((a, b) => a.miles - b.miles);
    const nearest = candidates[0];

    // Within radius (with tolerance) on the CLOSEST pickup point.
    if (nearest.miles > radiusMiles + 5) continue;

    // If the primary farm itself didn't resolve, plant the pin on the
    // nearest drop site so the map still has something to show.
    if (lat == null || lng == null) {
      const firstResolved = dropSites.find(
        (ds) => ds.lat != null && ds.lng != null,
      );
      if (firstResolved) {
        lat = firstResolved.lat;
        lng = firstResolved.lng;
      }
    }
    if (lat == null || lng == null) continue;

    enriched.push({
      ...farm,
      lat,
      lng,
      drop_sites_resolved: dropSites,
      nearest_pickup_miles: nearest.miles,
      nearest_pickup_label: nearest.label,
    });
  }

  // Sort by nearest pickup distance so the side list reads sensibly.
  enriched.sort((a, b) => a.nearest_pickup_miles - b.nearest_pickup_miles);

  // ---------------------------------------------------------------------------
  // 5. Upsert into discovered_farms
  // ---------------------------------------------------------------------------
  type DiscoveredRow = {
    slug: string;
    name: string;
    kind: string | null;
    description: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    lat: number;
    lng: number;
    website: string | null;
    email: string | null;
    phone: string | null;
    pickup_info: string | null;
    share_price: string | null;
    drop_sites: DropSiteResolved[];
    citations: string[];
    source: string;
    discovered_via_zip: string;
    last_refreshed_at: string;
  };

  const rows: DiscoveredRow[] = enriched.map((f) => {
    const slug = slugify(f.name, zip);
    const location =
      [f.city, f.state].filter(Boolean).join(", ") ||
      f.address ||
      `${center.city ?? ""}, ${center.state ?? ""}`.replace(/^, |, $/g, "");
    return {
      slug,
      name: f.name,
      kind: f.kind ?? null,
      description: f.description ?? null,
      location,
      city: f.city ?? null,
      state: f.state ?? null,
      zip: f.zip ?? null,
      lat: f.lat,
      lng: f.lng,
      website: f.website ?? null,
      email: f.email ?? null,
      phone: f.phone ?? null,
      pickup_info: f.pickup_info ?? null,
      share_price: f.share_price ?? null,
      drop_sites: f.drop_sites_resolved,
      citations: pplx.citations,
      source: "perplexity",
      discovered_via_zip: zip,
      last_refreshed_at: new Date().toISOString(),
    };
  });

  if (rows.length > 0) {
    const { error: upsertErr } = await admin
      .from("discovered_farms")
      .upsert(rows as never, { onConflict: "slug", ignoreDuplicates: false });
    if (upsertErr) {
      console.error("upsert error", upsertErr);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Record the search for caching
  // ---------------------------------------------------------------------------
  await admin.from("discovery_searches").insert({
    zip,
    lat: center.lat,
    lng: center.lng,
    city: center.city ?? null,
    state: center.state ?? null,
    results_count: rows.length,
  } as never);

  // ---------------------------------------------------------------------------
  // 7. Return rows from the table (with their fresh ids) so the client can
  //    open inquiry modals + claim links keyed off discovered_farms.id.
  // ---------------------------------------------------------------------------
  const { data: persisted } = await admin
    .from("discovered_farms")
    .select("*")
    .eq("discovered_via_zip", zip)
    .is("opted_out_at", null);

  // Decorate persisted rows with the nearest-pickup info we computed in
  // step 4. The DB doesn't store it (it's relative to the searcher's
  // ZIP); we merge it back in by slug for the response.
  const decorated = (persisted ?? []).map((row: Record<string, unknown>) => {
    const slug = row.slug as string | null;
    const match = enriched.find((e) => slugify(e.name, zip) === slug);
    return {
      ...row,
      nearest_pickup_miles: match?.nearest_pickup_miles ?? null,
      nearest_pickup_label: match?.nearest_pickup_label ?? null,
    };
  });

  // Sort by distance so the client doesn't have to.
  decorated.sort((a, b) => {
    const am = (a.nearest_pickup_miles as number | null) ?? 9999;
    const bm = (b.nearest_pickup_miles as number | null) ?? 9999;
    return am - bm;
  });

  return json({
    zip,
    center: { lat: center.lat, lng: center.lng },
    city: center.city,
    state: center.state,
    source: "fresh",
    radius_miles: radiusMiles,
    farms: decorated,
    citations: pplx.citations,
  });
});
