// =============================================================================
// CORS — shared across every edge function in this directory
// =============================================================================
// The `_lib` prefix is a Supabase convention: directories starting with `_`
// are NOT deployed as their own functions. We import from `../_lib/...` in
// each function's index.ts to dedupe what used to be 7 copies of the same
// constants + helpers.
// =============================================================================

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
} as const;

export function preflightResponse(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}
