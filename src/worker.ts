// =============================================================================
// Worker entry — routes /api/* and /i/* to handlers, falls through to ASSETS
// =============================================================================
// CF runs `wrangler deploy` which bundles this file + everything it imports
// and uploads ./out as the assets directory. Requests hit fetch() first,
// the router matches /api/* and /i/* against the route table, and anything
// else falls through to env.ASSETS.fetch(req) which serves the Next.js
// static export.
//
// The handler implementations still live in functions/ — they were written
// as Pages Functions originally, and a thin adapter in src/adapter.ts
// makes them work as Worker handlers without rewriting the bodies.
// =============================================================================

import { route, type Env } from "./router";

export default {
  async fetch(
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      const matched = await route(req, env, ctx);
      if (matched) return matched;
    } catch (err) {
      // Defense in depth — a handler that throws shouldn't take down the
      // whole site. Log + serve a clean 500.
      console.error("Worker route threw:", err);
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // For unrouted /api/* and /i/* paths, return a clean JSON 404
    // instead of falling through to the static asset handler. Without
    // this, a typo like /api/auth/sigin would serve the Next.js 404
    // page — confusing for clients and a hypothetical exposure if
    // anything ever shipped a static file under those prefixes.
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/i/")) {
      return new Response(
        JSON.stringify({ error: `Not found: ${req.method} ${url.pathname}` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Static-asset fallback. ASSETS.fetch handles content-type, etag,
    // cache headers, and the not_found_handling: "404-page" we
    // configured in wrangler.jsonc.
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
