// =============================================================================
// /api/farms — list published farms from D1
// =============================================================================
// Read-only public endpoint that powers the (eventual) live farm directory
// on /find and the unblocking of the static-export staleness from the
// audit (docs/SUPABASE_SETUP.md → "Open architectural items"). When the
// page renderer at app/(public)/farm/[slug]/page.tsx switches to pulling
// from this API at build time (or render time, post-static-export), new
// farms published via /farmer/onboarding stop being invisible.
//
// Cached at the edge for 5 minutes — a freshly-published farm appears
// within the window, no manual deploy needed.
//
// Query parameters:
//   ?limit=20        cap rows (1–100, default 20)
//   ?kind=raw_milk_herd_share   filter to a single farm_kind enum value
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { many } from "../../_lib/db";

type Env = { DB?: D1Database };

type FarmRow = {
  id: string;
  slug: string;
  name: string;
  location: string;
  kind: string;
  tagline: string | null;
  founder_name: string | null;
};

const ALLOWED_KINDS = new Set([
  "vegetable_csa", "raw_milk_herd_share", "pastured_meat",
  "pastured_eggs", "mixed_farm", "market_garden",
  "orchard_fruit", "flower_farm",
]);

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "D1 binding missing on this deploy." }, 500);
  }
  const url = new URL(ctx.request.url);
  const limit = clampInt(Number(url.searchParams.get("limit") ?? "20"), 1, 100);
  const kindParam = url.searchParams.get("kind");
  const kind = kindParam && ALLOWED_KINDS.has(kindParam) ? kindParam : null;

  const sql = kind
    ? `select id, slug, name, location, kind, tagline, founder_name
         from farms
        where is_published = 1 and archived_at is null and kind = ?
        order by created_at desc
        limit ?`
    : `select id, slug, name, location, kind, tagline, founder_name
         from farms
        where is_published = 1 and archived_at is null
        order by created_at desc
        limit ?`;
  const params = kind ? [kind, limit] : [limit];

  const rows = await many<FarmRow>(ctx.env.DB, sql, params);

  const res = json({ ok: true, farms: rows });
  // 5-minute edge cache; fresh deploys override on push.
  res.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return res;
};

function clampInt(n: number, lo: number, hi: number): number {
  const i = Math.round(n);
  if (!Number.isFinite(i)) return lo;
  return Math.max(lo, Math.min(hi, i));
}
