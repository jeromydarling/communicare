// =============================================================================
// /api/public-env.js — runtime-injected public env vars
// =============================================================================
// Returns a tiny JavaScript file that sets window.__COMMUNICARE_PUBLIC_ENV__
// from Worker-side env. The root layout loads this with a synchronous
// <script> in <head>, so the values are available by the time any client
// module evaluates.
//
// Why this exists: Next 15's NEXT_PUBLIC_* inliner stopped baking these
// into the client bundle during our CF static-export deploy, despite
// every layer of process.env being populated. Rather than keep chasing
// the inliner, we just ship them through the Worker — which already has
// reliable access to its own env. Tokens never live in repo source.
//
// To populate:
//   wrangler secret put MAPBOX_TOKEN
//   wrangler secret put TURNSTILE_SITE_KEY
// Both are public-by-design (Mapbox pk.* tokens and Turnstile site keys
// ship in browser code on every site that uses them); they're stored as
// secrets only so we don't accidentally commit them.
// =============================================================================

type Env = {
  MAPBOX_TOKEN?: string;
  TURNSTILE_SITE_KEY?: string;
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const payload = {
    MAPBOX_TOKEN: ctx.env.MAPBOX_TOKEN ?? "",
    TURNSTILE_SITE_KEY: ctx.env.TURNSTILE_SITE_KEY ?? "",
  };
  const body = `window.__COMMUNICARE_PUBLIC_ENV__=${JSON.stringify(payload)};`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Short edge cache — these change rarely but we want to invalidate
      // within minutes if a secret rotates. Browser revalidates per request.
      "Cache-Control": "public, max-age=0, s-maxage=300, must-revalidate",
    },
  });
};
