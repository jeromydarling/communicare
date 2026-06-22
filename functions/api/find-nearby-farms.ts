// =============================================================================
// /api/find-nearby-farms — Workers-native Perplexity + Mapbox search
// =============================================================================
// Powers /find. Accepts a US ZIP, asks Perplexity for real CSAs, herd
// shares, and meat shares with pickup within `radiusMiles` of the ZIP,
// geocodes any farms / drop sites missing coordinates via Mapbox, filters
// by the nearest pickup distance, and upserts into discovered_farms so
// the next visitor searching the same ZIP pays no API cost.
//
// Two cache layers, kept independent on purpose:
//   - KV CACHE (sub-10ms) keyed by (zip, radius). Returns the assembled
//     response shape directly. 7-day TTL. `force: true` bypasses.
//   - D1 discovery_searches row (analytics + cache hint). Read alongside
//     discovered_farms when KV is cold but a recent search exists.
//
// Filter rule: a farm two hours away that runs a weekly drop site four
// miles from the searcher is in; a farm with no resolvable pickup near
// the searcher is out. We carry both the primary farm coords and every
// drop site through the geocoder and distance math.
//
// Voice rule: results are presented as "we list them anyway." The
// send-a-note flow runs through /api/record-farm-inquiry once the
// visitor decides to reach out.
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { rateLimit, ipBucket } from "../_lib/ratelimit";
import { many, run, uuid, nowIso } from "../_lib/db";

type Env = {
  DB?: D1Database;
  CACHE?: KVNamespace;
  RATELIMIT?: KVNamespace;
  PERPLEXITY_API_KEY?: string;
  MAPBOX_TOKEN?: string;
};

type RequestBody = {
  zip?: string;
  radiusMiles?: number;
  force?: boolean;
};

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const CACHE_VERSION = "v2"; // bumped from v1 — response shape moved native
const CACHE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// -----------------------------------------------------------------------------
// Geocoding — Mapbox forward geocode
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
  const data = (await res.json()) as {
    features?: Array<{
      center?: [number, number];
      context?: Array<{ id?: string; text?: string; short_code?: string }>;
    }>;
  };
  const feature = data?.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  let city: string | undefined;
  let state: string | undefined;
  for (const c of feature.context ?? []) {
    if (typeof c.id !== "string") continue;
    if (c.id.startsWith("place.")) city = c.text;
    if (c.id.startsWith("region.")) {
      state = c.short_code?.replace("US-", "") ?? c.text;
    }
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
  const data = (await res.json()) as {
    features?: Array<{ center?: [number, number] }>;
  };
  const feature = data?.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  return { lat, lng };
}

// -----------------------------------------------------------------------------
// Haversine — miles between two lat/lngs
// -----------------------------------------------------------------------------

function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
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

function slugify(name: string, zip: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "farm"}-${zip}`;
}

// -----------------------------------------------------------------------------
// Perplexity — sonar-pro with JSON-schema structured output
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

type PerplexityDropSite = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  day_time?: string | null;
};

type PerplexityFarm = {
  name: string;
  kind?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  pickup_info?: string | null;
  share_price?: string | null;
  drop_sites?: PerplexityDropSite[] | null;
};

async function callPerplexity(
  apiKey: string,
  zip: string,
  city: string | undefined,
  state: string | undefined,
  radius: number,
): Promise<{ farms: PerplexityFarm[]; citations: string[] }> {
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

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
  };
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const citations = Array.isArray(data?.citations) ? data.citations : [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // sonar sometimes wraps JSON in prose; fish it out.
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { farms: [] };
  }

  const farms =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { farms?: unknown }).farms)
      ? ((parsed as { farms: PerplexityFarm[] }).farms.filter(
          (f): f is PerplexityFarm => typeof f?.name === "string" && f.name.length > 0,
        ))
      : [];

  return { farms, citations };
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

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

type EnrichedFarm = PerplexityFarm & {
  lat: number;
  lng: number;
  drop_sites_resolved: DropSiteResolved[];
  nearest_pickup_miles: number;
  nearest_pickup_label: string;
};

type DiscoveredFarmRow = {
  id: string;
  slug: string | null;
  name: string;
  kind: string | null;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  pickup_info: string | null;
  share_price: string | null;
  citations: string; // JSON text
  source: string;
  drop_sites: string; // JSON text
  claimed_at: string | null;
  opted_out_at: string | null;
  inquiry_count: number;
  discovered_via_zip: string | null;
  created_at: string;
  updated_at: string;
  last_refreshed_at: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }
  if (!ctx.env.PERPLEXITY_API_KEY) {
    return json(
      { error: "PERPLEXITY_API_KEY missing on this deploy." },
      500,
    );
  }
  if (!ctx.env.MAPBOX_TOKEN) {
    return json({ error: "MAPBOX_TOKEN missing on this deploy." }, 500);
  }

  // 20/hr/IP — Perplexity + Mapbox are paid; this is the real cost gate.
  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "find-nearby"),
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

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

  // ---------------------------------------------------------------------------
  // 1. KV cache (fast path)
  // ---------------------------------------------------------------------------
  if (!force && ctx.env.CACHE) {
    const cached = await ctx.env.CACHE.get(cacheKey, "json");
    if (cached) {
      return json({ ...(cached as object), _cache: "hit" });
    }
  }

  const db = ctx.env.DB;

  // ---------------------------------------------------------------------------
  // 2. D1 cache hint — a recent discovery_searches row for this ZIP lets us
  //    rehydrate the response without re-calling Perplexity. Skipped on
  //    force.
  // ---------------------------------------------------------------------------
  if (!force) {
    const cutoff = new Date(Date.now() - CACHE_WINDOW_MS).toISOString();
    const recent = await db
      .prepare(
        `select lat, lng, city, state, searched_at
           from discovery_searches
          where zip = ? and searched_at > ?
          order by searched_at desc
          limit 1`,
      )
      .bind(zip, cutoff)
      .first<{
        lat: number | null;
        lng: number | null;
        city: string | null;
        state: string | null;
        searched_at: string;
      }>();

    if (recent && recent.lat != null && recent.lng != null) {
      const rows = await many<DiscoveredFarmRow>(
        db,
        `select * from discovered_farms
          where discovered_via_zip = ? and opted_out_at is null`,
        [zip],
      );
      const centerLL = { lat: recent.lat, lng: recent.lng };
      const decorated = decorateFromStored(rows, centerLL);
      const payload = {
        zip,
        center: centerLL,
        city: recent.city,
        state: recent.state,
        source: "cache",
        radius_miles: radiusMiles,
        farms: decorated,
      };

      if (ctx.env.CACHE) {
        ctx.waitUntil(
          ctx.env.CACHE.put(cacheKey, JSON.stringify(payload), {
            expirationTtl: CACHE_TTL_SECONDS,
          }),
        );
      }
      return json({ ...payload, _cache: "miss" });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Geocode the ZIP
  // ---------------------------------------------------------------------------
  const center = await geocodeZip(zip, ctx.env.MAPBOX_TOKEN);
  if (!center) {
    return json(
      { error: `Couldn't find ZIP ${zip}. Double-check it's a US ZIP.` },
      404,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Perplexity
  // ---------------------------------------------------------------------------
  let pplx: { farms: PerplexityFarm[]; citations: string[] };
  try {
    pplx = await callPerplexity(
      ctx.env.PERPLEXITY_API_KEY,
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
  // 5. Geocode missing coords + filter by nearest pickup
  // ---------------------------------------------------------------------------
  const enriched: EnrichedFarm[] = [];
  for (const farm of pplx.farms) {
    let lat: number | null = farm.lat ?? null;
    let lng: number | null = farm.lng ?? null;
    if (lat == null || lng == null) {
      const query = [farm.address, farm.city, farm.state, farm.zip]
        .filter(Boolean)
        .join(", ");
      if (query.length >= 4) {
        const g = await geocodeAddress(query, ctx.env.MAPBOX_TOKEN);
        if (g) {
          lat = g.lat;
          lng = g.lng;
        }
      }
    }

    const dropSites: DropSiteResolved[] = [];
    for (const ds of farm.drop_sites ?? []) {
      let dlat: number | null = ds.lat ?? null;
      let dlng: number | null = ds.lng ?? null;
      if (dlat == null || dlng == null) {
        const dquery = [ds.address, ds.city, ds.state, ds.zip]
          .filter(Boolean)
          .join(", ");
        if (dquery.length >= 4) {
          const g = await geocodeAddress(dquery, ctx.env.MAPBOX_TOKEN);
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

    const candidates: Array<{ label: string; miles: number }> = [];
    if (lat != null && lng != null) {
      candidates.push({ label: "farm", miles: distanceMiles({ lat, lng }, center) });
    }
    for (const ds of dropSites) {
      if (ds.distance_miles != null) {
        candidates.push({
          label: `drop: ${ds.name ?? ds.city ?? "site"}`,
          miles: ds.distance_miles,
        });
      }
    }
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => a.miles - b.miles);
    const nearest = candidates[0];
    if (nearest.miles > radiusMiles + 5) continue;

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

  enriched.sort((a, b) => a.nearest_pickup_miles - b.nearest_pickup_miles);

  // ---------------------------------------------------------------------------
  // 6. Upsert into discovered_farms (D1). D1 supports
  //    `insert ... on conflict(slug) do update`. We collide on the
  //    `discovered_farms_name_location_idx` unique index too — but slug is
  //    deterministic from (name, zip), so the slug conflict path covers
  //    repeat finds. The name/location index protects against races we
  //    don't expect to see at this volume.
  // ---------------------------------------------------------------------------
  const now = nowIso();
  for (const f of enriched) {
    const slug = slugify(f.name, zip);
    const location =
      [f.city, f.state].filter(Boolean).join(", ") ||
      f.address ||
      `${center.city ?? ""}, ${center.state ?? ""}`.replace(/^, |, $/g, "") ||
      null;
    const dropSitesJson = JSON.stringify(f.drop_sites_resolved);
    const citationsJson = JSON.stringify(pplx.citations);

    try {
      await run(
        db,
        `insert into discovered_farms (
            id, slug, name, kind, description, location, city, state, zip,
            lat, lng, website, email, phone, pickup_info, share_price,
            citations, source, drop_sites, discovered_via_zip,
            created_at, updated_at, last_refreshed_at
          ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          on conflict(slug) do update set
            name = excluded.name,
            kind = coalesce(excluded.kind, discovered_farms.kind),
            description = coalesce(excluded.description, discovered_farms.description),
            location = coalesce(excluded.location, discovered_farms.location),
            city = coalesce(excluded.city, discovered_farms.city),
            state = coalesce(excluded.state, discovered_farms.state),
            zip = coalesce(excluded.zip, discovered_farms.zip),
            lat = excluded.lat,
            lng = excluded.lng,
            website = coalesce(excluded.website, discovered_farms.website),
            email = coalesce(excluded.email, discovered_farms.email),
            phone = coalesce(excluded.phone, discovered_farms.phone),
            pickup_info = coalesce(excluded.pickup_info, discovered_farms.pickup_info),
            share_price = coalesce(excluded.share_price, discovered_farms.share_price),
            citations = excluded.citations,
            drop_sites = excluded.drop_sites,
            updated_at = excluded.updated_at,
            last_refreshed_at = excluded.last_refreshed_at`,
        [
          uuid(),
          slug,
          f.name,
          f.kind ?? null,
          f.description ?? null,
          location,
          f.city ?? null,
          f.state ?? null,
          f.zip ?? null,
          f.lat,
          f.lng,
          f.website ?? null,
          f.email ?? null,
          f.phone ?? null,
          f.pickup_info ?? null,
          f.share_price ?? null,
          citationsJson,
          "perplexity",
          dropSitesJson,
          zip,
          now,
          now,
          now,
        ],
      );
    } catch (err) {
      // A duplicate against the (name, location) unique index can still
      // race a parallel writer for a different ZIP. Log and continue —
      // the existing row is already serviceable.
      console.warn("discovered_farms upsert race:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Record the search (analytics + cache hint for the next request)
  // ---------------------------------------------------------------------------
  await run(
    db,
    `insert into discovery_searches (zip, lat, lng, city, state, results_count)
       values (?, ?, ?, ?, ?, ?)`,
    [
      zip,
      center.lat,
      center.lng,
      center.city ?? null,
      center.state ?? null,
      enriched.length,
    ],
  );

  // ---------------------------------------------------------------------------
  // 8. Read back the persisted rows so the client gets stable ids for the
  //    inquiry modal + /claim links. Merge in the nearest-pickup numbers
  //    (which are relative to the searcher and not stored on the row).
  // ---------------------------------------------------------------------------
  const persisted = await many<DiscoveredFarmRow>(
    db,
    `select * from discovered_farms
      where discovered_via_zip = ? and opted_out_at is null`,
    [zip],
  );
  const enrichedBySlug = new Map<string, EnrichedFarm>();
  for (const e of enriched) enrichedBySlug.set(slugify(e.name, zip), e);

  const decorated = persisted
    .map((row) => {
      const parsed = parseStoredRow(row);
      const match = row.slug ? enrichedBySlug.get(row.slug) : undefined;
      return {
        ...parsed,
        nearest_pickup_miles: match?.nearest_pickup_miles ?? null,
        nearest_pickup_label: match?.nearest_pickup_label ?? null,
      };
    })
    .sort((a, b) => {
      const am = a.nearest_pickup_miles ?? 9999;
      const bm = b.nearest_pickup_miles ?? 9999;
      return am - bm;
    });

  const payload = {
    zip,
    center: { lat: center.lat, lng: center.lng },
    city: center.city,
    state: center.state,
    source: "fresh",
    radius_miles: radiusMiles,
    farms: decorated,
    citations: pplx.citations,
  };

  if (ctx.env.CACHE) {
    ctx.waitUntil(
      ctx.env.CACHE.put(cacheKey, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SECONDS,
      }),
    );
  }

  return json({ ...payload, _cache: "miss" });
};

// -----------------------------------------------------------------------------
// Helpers — turning stored D1 rows into the client-facing shape
// -----------------------------------------------------------------------------

function parseStoredRow(row: DiscoveredFarmRow): Record<string, unknown> {
  let dropSites: DropSiteResolved[] = [];
  try {
    const parsed = JSON.parse(row.drop_sites);
    if (Array.isArray(parsed)) dropSites = parsed as DropSiteResolved[];
  } catch {
    // ignore — empty array fallback
  }
  let citations: string[] = [];
  try {
    const parsed = JSON.parse(row.citations);
    if (Array.isArray(parsed)) citations = parsed as string[];
  } catch {
    // ignore
  }
  return { ...row, drop_sites: dropSites, citations };
}

function decorateFromStored(
  rows: DiscoveredFarmRow[],
  center: { lat: number; lng: number },
): Array<Record<string, unknown> & { nearest_pickup_miles: number | null }> {
  const out = rows.map((row) => {
    const parsed = parseStoredRow(row);
    const drops = (parsed.drop_sites as DropSiteResolved[]) ?? [];
    const candidates: Array<{ label: string; miles: number }> = [];
    if (row.lat != null && row.lng != null) {
      candidates.push({
        label: "farm",
        miles: distanceMiles({ lat: row.lat, lng: row.lng }, center),
      });
    }
    for (const ds of drops) {
      if (ds.lat != null && ds.lng != null) {
        candidates.push({
          label: `drop: ${ds.name ?? ds.city ?? "site"}`,
          miles: distanceMiles({ lat: ds.lat, lng: ds.lng }, center),
        });
      }
    }
    candidates.sort((a, b) => a.miles - b.miles);
    const nearest = candidates[0];
    return {
      ...parsed,
      nearest_pickup_miles: nearest?.miles ?? null,
      nearest_pickup_label: nearest?.label ?? null,
    };
  });
  out.sort((a, b) => {
    const am = (a.nearest_pickup_miles as number | null) ?? 9999;
    const bm = (b.nearest_pickup_miles as number | null) ?? 9999;
    return am - bm;
  });
  return out;
}

function clampInt(n: number, lo: number, hi: number): number {
  const i = Math.round(n);
  if (!Number.isFinite(i)) return lo;
  return Math.max(lo, Math.min(hi, i));
}
