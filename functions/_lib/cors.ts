// =============================================================================
// CORS — shared across every Pages Function on mycommuni.care
// =============================================================================
// Same shape as supabase/functions/_lib/cors.ts. Kept separate because the
// runtimes are different (Workers vs Deno) and importing across that line
// isn't worth the toolchain pain for ~20 lines.
// =============================================================================

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-upload-name",
  "Access-Control-Max-Age": "86400",
} as const;

export function preflight(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
