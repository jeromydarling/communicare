// =============================================================================
// /i/[bucket]/[...key] — serve images from R2 with on-the-fly transforms
// =============================================================================
// Pulls an object out of the right R2 bucket and serves it to the browser
// with long cache headers. Cloudflare's image transformations layer can
// resize/format/quality via URL params:
//
//   /i/farm-photos/<key>?w=640&q=80&fm=webp
//
// Variants we use in the UI (see lib/images.ts):
//   card    240×240, quality 80, format auto
//   detail  720 wide, quality 85
//   hero    1600 wide, quality 90
//   og      1200×630, quality 88
//
// Transformations are handled by Cloudflare automatically when "Image
// Transformations" is enabled for the zone — this Worker just serves the
// origin. If transformations are off the original is returned unchanged,
// which is still correct (browsers render it; just larger).
// =============================================================================

type Env = {
  FARM_PHOTOS?: R2Bucket;
  PRODUCT_PHOTOS?: R2Bucket;
  IMPORTS?: R2Bucket;
};

const PUBLIC_BUCKETS: Record<string, keyof Env> = {
  "farm-photos": "FARM_PHOTOS",
  "product-photos": "PRODUCT_PHOTOS",
  // imports is intentionally absent — that bucket is private (audit CSVs).
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const bucket = String(ctx.params.bucket ?? "");
  const bindingKey = PUBLIC_BUCKETS[bucket];
  if (!bindingKey) {
    return new Response("Not found", { status: 404 });
  }
  const r2 = ctx.env[bindingKey] as R2Bucket | undefined;
  if (!r2) {
    return new Response("Bucket not bound", { status: 500 });
  }

  const keyParts = ctx.params.key;
  const key = Array.isArray(keyParts) ? keyParts.join("/") : String(keyParts ?? "");
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const object = await r2.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Mark as cacheable at the CDN for a long time — keys include a UUID so
  // they're effectively immutable; updates upload to a new key.
  if (!headers.get("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  // CDN will respect this even if origin isn't set
  headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
};
