// =============================================================================
// Router — URLPattern table → handler dispatch
// =============================================================================
// Imports every Pages Function handler from functions/ and wires it to a
// URL pattern + HTTP method. URLPattern is a Workers-native API; no
// router library needed.
//
// To add a route:
//   1. Write the handler in functions/<path>.ts as a Pages Function
//      (export const onRequestGet / Post / Options).
//   2. Add the import + adapt() call below.
//   3. Add an entry to ROUTES with the right URLPattern.
// =============================================================================

import { adapt, type AdaptedHandler } from "./adapter";

// -----------------------------------------------------------------------------
// Env type — every binding the handlers might use. Optional so the
// Worker still deploys before resources are provisioned.
// -----------------------------------------------------------------------------

export type Env = {
  ASSETS: Fetcher;

  // String vars (deploy-time)
  SITE_URL?: string;
  ENVIRONMENT?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TURNSTILE_SECRET?: string;

  // Optional bindings — added in wrangler.jsonc after provisioning
  DB?: D1Database;
  CACHE?: KVNamespace;
  SESSIONS?: KVNamespace;
  RATELIMIT?: KVNamespace;
  FARM_PHOTOS?: R2Bucket;
  PRODUCT_PHOTOS?: R2Bucket;
  IMPORTS?: R2Bucket;
  AI?: Ai;
  EMBEDDINGS?: VectorizeIndex;
};

// -----------------------------------------------------------------------------
// Handler imports — one per route
// -----------------------------------------------------------------------------

import * as health from "../functions/api/_health";
import * as findNearbyFarms from "../functions/api/find-nearby-farms";
import * as recordFarmInquiry from "../functions/api/record-farm-inquiry";
import * as waitlist from "../functions/api/waitlist";
import * as farmsList from "../functions/api/farms/index";
import * as farmsBySlug from "../functions/api/farms/[slug]";
import * as uploads from "../functions/api/uploads/[bucket]";
import * as altText from "../functions/api/ai/alt-text";
import * as embed from "../functions/api/ai/embed";
import * as imageServe from "../functions/i/[bucket]/[[key]]";
import * as authSignup from "../functions/api/auth/signup";
import * as authSignin from "../functions/api/auth/signin";
import * as authSignout from "../functions/api/auth/signout";
import * as authMe from "../functions/api/auth/me";
import * as authMagic from "../functions/api/auth/magic";
import * as authMagicCallback from "../functions/api/auth/magic-callback";
import * as authForgot from "../functions/api/auth/forgot";
import * as authReset from "../functions/api/auth/reset";

// -----------------------------------------------------------------------------
// Route table
// -----------------------------------------------------------------------------

type Route = {
  method: "GET" | "POST" | "OPTIONS";
  pattern: URLPattern;
  handler: AdaptedHandler<Env>;
};

function P(pathname: string): URLPattern {
  return new URLPattern({ pathname });
}

const ROUTES: Route[] = [
  // Health (smoke test)
  { method: "GET",     pattern: P("/api/_health"), handler: adapt(health.onRequestGet) },
  { method: "OPTIONS", pattern: P("/api/_health"), handler: adapt(health.onRequestOptions) },

  // Find-nearby-farms (KV-cached Perplexity)
  { method: "POST",    pattern: P("/api/find-nearby-farms"), handler: adapt(findNearbyFarms.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/find-nearby-farms"), handler: adapt(findNearbyFarms.onRequestOptions) },

  // Record farm inquiry (rate-limited)
  { method: "POST",    pattern: P("/api/record-farm-inquiry"), handler: adapt(recordFarmInquiry.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/record-farm-inquiry"), handler: adapt(recordFarmInquiry.onRequestOptions) },

  // Waitlist (Turnstile-gated)
  { method: "POST",    pattern: P("/api/waitlist"), handler: adapt(waitlist.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/waitlist"), handler: adapt(waitlist.onRequestOptions) },

  // Farms read API (D1)
  { method: "GET",     pattern: P("/api/farms"), handler: adapt(farmsList.onRequestGet) },
  { method: "OPTIONS", pattern: P("/api/farms"), handler: adapt(farmsList.onRequestOptions) },
  { method: "GET",     pattern: P("/api/farms/:slug"), handler: adapt(farmsBySlug.onRequestGet) },
  { method: "OPTIONS", pattern: P("/api/farms/:slug"), handler: adapt(farmsBySlug.onRequestOptions) },

  // Uploads (R2)
  { method: "POST",    pattern: P("/api/uploads/:bucket"), handler: adapt(uploads.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/uploads/:bucket"), handler: adapt(uploads.onRequestOptions) },

  // Workers AI
  { method: "POST",    pattern: P("/api/ai/alt-text"), handler: adapt(altText.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/ai/alt-text"), handler: adapt(altText.onRequestOptions) },
  { method: "POST",    pattern: P("/api/ai/embed"),    handler: adapt(embed.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/ai/embed"),    handler: adapt(embed.onRequestOptions) },

  // Image serve (R2 → CDN, public buckets only)
  { method: "GET", pattern: P("/i/:bucket/:key+"), handler: adapt(imageServe.onRequestGet) },

  // Auth — custom Workers auth (Phase 3)
  { method: "POST",    pattern: P("/api/auth/signup"),  handler: adapt(authSignup.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/auth/signup"),  handler: adapt(authSignup.onRequestOptions) },
  { method: "POST",    pattern: P("/api/auth/signin"),  handler: adapt(authSignin.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/auth/signin"),  handler: adapt(authSignin.onRequestOptions) },
  { method: "POST",    pattern: P("/api/auth/signout"), handler: adapt(authSignout.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/auth/signout"), handler: adapt(authSignout.onRequestOptions) },
  { method: "GET",     pattern: P("/api/auth/me"),      handler: adapt(authMe.onRequestGet) },
  { method: "OPTIONS", pattern: P("/api/auth/me"),      handler: adapt(authMe.onRequestOptions) },
  { method: "POST",    pattern: P("/api/auth/magic"),   handler: adapt(authMagic.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/auth/magic"),   handler: adapt(authMagic.onRequestOptions) },
  { method: "GET",     pattern: P("/api/auth/magic-callback"), handler: adapt(authMagicCallback.onRequestGet) },
  { method: "POST",    pattern: P("/api/auth/forgot"),  handler: adapt(authForgot.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/auth/forgot"),  handler: adapt(authForgot.onRequestOptions) },
  { method: "POST",    pattern: P("/api/auth/reset"),   handler: adapt(authReset.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/auth/reset"),   handler: adapt(authReset.onRequestOptions) },
];

// -----------------------------------------------------------------------------
// route() — match a request against the table, return the response or null
// -----------------------------------------------------------------------------

export async function route(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const method = req.method as Route["method"];
  for (const r of ROUTES) {
    if (r.method !== method) continue;
    const match = r.pattern.exec(req.url);
    if (!match) continue;

    // URLPattern returns groups as { name: string | undefined }.
    // For catch-all (`:key+`) the value can be a slash-joined string.
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(match.pathname.groups)) {
      if (typeof v === "string") params[k] = v;
    }
    return r.handler(req, env, ctx, params);
  }
  return null;
}
