// =============================================================================
// /api/_health — operational smoke test
// =============================================================================
// Returns the binding state of the Pages project so we can curl this from
// monitoring and assert that every Cloudflare resource we depend on is
// actually wired up. Doesn't touch any binding (no DB queries, no R2
// reads) — just reports presence.
//
// Public on purpose; no secrets in the response.
// =============================================================================

import { json, preflight } from "../_lib/cors";
import type { EmailSendBinding } from "../_lib/email";

type Env = {
  DB?: D1Database;
  CACHE?: KVNamespace;
  SESSIONS?: KVNamespace;
  RATELIMIT?: KVNamespace;
  FARM_PHOTOS?: R2Bucket;
  PRODUCT_PHOTOS?: R2Bucket;
  IMPORTS?: R2Bucket;
  AI?: Ai;
  EMBEDDINGS?: VectorizeIndex;
  EMAIL?: EmailSendBinding;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_URL?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = (ctx) => {
  const e = ctx.env;
  return json({
    ok: true,
    site_url: e.SITE_URL ?? null,
    bindings: {
      d1: Boolean(e.DB),
      kv: {
        cache: Boolean(e.CACHE),
        sessions: Boolean(e.SESSIONS),
        ratelimit: Boolean(e.RATELIMIT),
      },
      r2: {
        farm_photos: Boolean(e.FARM_PHOTOS),
        product_photos: Boolean(e.PRODUCT_PHOTOS),
        imports: Boolean(e.IMPORTS),
      },
      ai: Boolean(e.AI),
      vectorize: Boolean(e.EMBEDDINGS),
      email: Boolean(e.EMAIL),
      supabase_passthrough: Boolean(e.SUPABASE_URL && e.SUPABASE_ANON_KEY),
    },
    timestamp: new Date().toISOString(),
  });
};
