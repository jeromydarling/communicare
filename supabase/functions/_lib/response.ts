// =============================================================================
// JSON response helper — shared across every edge function
// =============================================================================
// Replaces 7 identical copies of `function json(body, status=200): Response`
// scattered across the function directories.
// =============================================================================

import { CORS_HEADERS } from "./cors.ts";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
