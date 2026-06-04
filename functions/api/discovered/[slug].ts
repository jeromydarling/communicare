// =============================================================================
// GET /api/discovered/[slug] — public read of a discovered farm
// =============================================================================
// Powers the /claim page, which an operator lands on when they click the
// outreach email's link. We return:
//   - The discovered_farms row (sans internal-only columns)
//   - The current inquiry count (for the "N neighbors asked about you"
//     footer that anchors the claim CTA)
//
// 404 on opted-out. 5-minute edge cache; the inquiry count refreshes
// the next time the page is fetched.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { one } from "../../_lib/db";

type Env = { DB?: D1Database };

type FarmRow = {
  id: string;
  slug: string | null;
  name: string;
  kind: string | null;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  pickup_info: string | null;
  share_price: string | null;
  drop_sites: string; // json
  inquiry_count: number;
  last_inquiry_at: string | null;
  claimed_at: string | null;
  opted_out_at: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) return json({ error: "Database not configured." }, 500);
  const slug = String(ctx.params.slug ?? "").trim();
  if (!slug) return json({ error: "Missing slug." }, 400);

  const farm = await one<FarmRow>(
    ctx.env.DB,
    `select id, slug, name, kind, description, location, city, state,
            lat, lng, website, pickup_info, share_price, drop_sites,
            inquiry_count, last_inquiry_at, claimed_at, opted_out_at
       from discovered_farms
      where slug = ?`,
    [slug],
  );
  if (!farm || farm.opted_out_at) {
    return json({ error: "Not found." }, 404);
  }

  let dropSites: unknown = [];
  try {
    dropSites = JSON.parse(farm.drop_sites);
  } catch {
    dropSites = [];
  }

  const res = json({
    ok: true,
    farm: {
      id: farm.id,
      slug: farm.slug,
      name: farm.name,
      kind: farm.kind,
      description: farm.description,
      location: farm.location,
      city: farm.city,
      state: farm.state,
      lat: farm.lat,
      lng: farm.lng,
      website: farm.website,
      pickup_info: farm.pickup_info,
      share_price: farm.share_price,
      drop_sites: dropSites,
      inquiry_count: farm.inquiry_count,
      last_inquiry_at: farm.last_inquiry_at,
      claimed: Boolean(farm.claimed_at),
    },
  });
  res.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return res;
};
