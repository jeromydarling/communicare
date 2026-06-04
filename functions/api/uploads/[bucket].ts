// =============================================================================
// /api/uploads/[bucket] — POST a file, get a stable R2 key back
// =============================================================================
// Browser direct-upload pattern: the client posts a multipart form with the
// file, we verify the caller is signed in, hash + namespace the key, write
// to the named R2 bucket, and return the canonical URL the variant builder
// (lib/images.ts) can resolve.
//
// Bucket is a path parameter so the same handler covers farm-photos,
// product-photos, and the imports CSV cold storage:
//   POST /api/uploads/farm-photos
//   POST /api/uploads/product-photos
//   POST /api/uploads/imports
//
// Why route through the Worker instead of presigned-URL direct-to-R2:
//   * No need to bundle aws4fetch / sign S3 requests in the browser
//   * Server-side namespacing on auth.user.id keeps a malicious caller
//     from overwriting another user's keys
//   * Centralizes the per-bucket size + MIME limits
// The trade-off is a 100MB Pages Functions request-body cap, which is well
// above any farm photo or CSV we expect.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";

type Env = {
  FARM_PHOTOS?: R2Bucket;
  PRODUCT_PHOTOS?: R2Bucket;
  IMPORTS?: R2Bucket;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_URL?: string;
};

const BUCKET_BINDINGS: Record<string, keyof Env> = {
  "farm-photos": "FARM_PHOTOS",
  "product-photos": "PRODUCT_PHOTOS",
  "imports": "IMPORTS",
};

const SIZE_LIMITS: Record<string, number> = {
  "farm-photos": 25 * 1024 * 1024,
  "product-photos": 15 * 1024 * 1024,
  "imports": 5 * 1024 * 1024,
};

const ALLOWED_MIME: Record<string, RegExp> = {
  "farm-photos": /^image\/(jpe?g|png|webp|avif)$/i,
  "product-photos": /^image\/(jpe?g|png|webp|avif)$/i,
  "imports": /^(text\/csv|application\/vnd\.ms-excel|application\/octet-stream)$/i,
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const bucket = String(ctx.params.bucket ?? "");
  const bindingKey = BUCKET_BINDINGS[bucket];
  if (!bindingKey) {
    return json({ error: `Unknown bucket "${bucket}".` }, 404);
  }
  const r2 = ctx.env[bindingKey] as R2Bucket | undefined;
  if (!r2) {
    return json({ error: `Bucket ${bucket} isn't bound on this deploy.` }, 500);
  }

  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: FormData;
  try {
    body = await ctx.request.formData();
  } catch {
    return json({ error: "Expected multipart/form-data with a file field." }, 400);
  }
  const file = body.get("file") as unknown as File | null;
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return json({ error: "Missing file field." }, 400);
  }

  const sizeLimit = SIZE_LIMITS[bucket];
  if (file.size > sizeLimit) {
    return json(
      { error: `File too large (${file.size} bytes; max ${sizeLimit}).` },
      413,
    );
  }
  const mimeRegex = ALLOWED_MIME[bucket];
  if (!mimeRegex.test(file.type)) {
    return json(
      { error: `Unsupported file type "${file.type}" for ${bucket}.` },
      415,
    );
  }

  // Key shape: <userId>/<yyyy>/<mm>/<uuid>.<ext>. Namespacing on userId
  // means a request can't ever overwrite another user's key.
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extFromMime(file.type) ?? "bin";
  const id = crypto.randomUUID();
  const key = `${auth.user.id}/${yyyy}/${mm}/${id}.${ext}`;

  await r2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: bucket === "imports" ? "no-store" : "public, max-age=31536000, immutable",
    },
    customMetadata: {
      uploaded_by: auth.user.id,
      original_name: trim200(body.get("name")?.toString() ?? file.name),
    },
  });

  // The variant URL builder (lib/images.ts) constructs serve URLs from
  // (bucket, key). We return both so the caller can store whichever shape
  // is cleanest for its use case.
  const siteUrl = ctx.env.SITE_URL ?? "https://mycommuni.care";
  const canonicalUrl = `${siteUrl.replace(/\/+$/, "")}/i/${bucket}/${key}`;

  return json({
    ok: true,
    bucket,
    key,
    size: file.size,
    contentType: file.type,
    url: canonicalUrl,
  });
};

function extFromMime(mime: string): string | null {
  const m = mime.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/avif") return "avif";
  if (m === "text/csv") return "csv";
  return null;
}

function trim200(s: string): string {
  return s.length > 200 ? s.slice(0, 200) : s;
}
