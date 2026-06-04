// =============================================================================
// Image variants — canonical URL builder for R2-backed images
// =============================================================================
// Every farm/product photo we serve flows through /i/<bucket>/<key> (see
// functions/i/[bucket]/[[key]].ts). The variant param is interpreted by
// Cloudflare's image transformations layer if it's enabled on the zone;
// when it isn't, the original is served and the param is harmless.
//
// Variant defaults are tuned for the layouts they're used in:
//   thumb   80px square, used in roster/list rows
//   card    240px square, used on the /find side list and farm cards
//   detail  720px wide, used on /farm/[slug]
//   hero    1600px wide, used in the homepage watercolor band
//   og      1200×630, used for social sharing meta tags
//
// To use:
//   imageUrl({ bucket: "farm-photos", key: "abc/2026/06/uuid.jpg", variant: "card" })
//   → "https://mycommuni.care/i/farm-photos/abc/2026/06/uuid.jpg?w=240&h=240&fit=cover&q=80&fm=auto"
// =============================================================================

import { SITE_URL } from "./site";

export type ImageBucket = "farm-photos" | "product-photos";

export type ImageVariant = "thumb" | "card" | "detail" | "hero" | "og";

const VARIANT_PARAMS: Record<ImageVariant, Record<string, string>> = {
  thumb: { w: "80", h: "80", fit: "cover", q: "80", fm: "auto" },
  card: { w: "240", h: "240", fit: "cover", q: "80", fm: "auto" },
  detail: { w: "720", q: "85", fm: "auto" },
  hero: { w: "1600", q: "90", fm: "auto" },
  og: { w: "1200", h: "630", fit: "cover", q: "88", fm: "jpg" },
};

export function imageUrl(opts: {
  bucket: ImageBucket;
  key: string;
  variant?: ImageVariant;
}): string {
  const base = `${SITE_URL.replace(/\/+$/, "")}/i/${opts.bucket}/${opts.key}`;
  if (!opts.variant) return base;
  const params = new URLSearchParams(VARIANT_PARAMS[opts.variant]).toString();
  return `${base}?${params}`;
}

// Convenience: turn an upload response into the canonical card URL.
export function cardUrl(uploadResp: { bucket: ImageBucket; key: string }): string {
  return imageUrl({ ...uploadResp, variant: "card" });
}
