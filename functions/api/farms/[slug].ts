// =============================================================================
// /api/farms/[slug] — single farm by slug, plus its published homepage
// =============================================================================
// Powers the eventual D1-driven render of /farm/<slug>/. Returns the farm
// row joined with whichever farm_homepages row is currently flagged
// is_published. Shape is intentionally lean — the page renderer is the
// one place that knows how to lay this out.
//
// 404 on:
//   - no farm with that slug
//   - farm exists but is_published=0 (treat unpublished as not-existent
//     for anonymous callers — staff can still see drafts via the
//     dashboard, which uses a different endpoint)
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { one } from "../../_lib/db";

type Env = { DB?: D1Database };

type FarmRow = {
  id: string;
  slug: string;
  name: string;
  location: string;
  kind: string;
  tagline: string | null;
  founder_name: string | null;
  founder_bio: string | null;
  story: string | null;
  herdshare_state: string | null;
};

type HomepageRow = {
  content: string;
  version: number;
  published_at: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "D1 binding missing on this deploy." }, 500);
  }
  const slug = String(ctx.params.slug ?? "").trim();
  if (!slug) return json({ error: "Missing slug." }, 400);

  const farm = await one<FarmRow>(
    ctx.env.DB,
    `select id, slug, name, location, kind, tagline, founder_name,
            founder_bio, story, herdshare_state
       from farms
      where slug = ? and is_published = 1 and archived_at is null`,
    [slug],
  );
  if (!farm) {
    return json({ error: "Not found." }, 404);
  }

  const homepage = await one<HomepageRow>(
    ctx.env.DB,
    `select content, version, published_at
       from farm_homepages
      where farm_id = ? and is_published = 1
      order by version desc
      limit 1`,
    [farm.id],
  );

  // content is stored as a json string; parse here so the caller doesn't
  // have to remember to.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let content: any = null;
  if (homepage?.content) {
    try {
      content = JSON.parse(homepage.content);
    } catch {
      content = null;
    }
  }

  const res = json({
    ok: true,
    farm,
    homepage: homepage
      ? { content, version: homepage.version, published_at: homepage.published_at }
      : null,
  });
  // 5-minute edge cache, same as the list endpoint.
  res.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return res;
};
