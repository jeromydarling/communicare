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

  // Twilio (secrets — set via `wrangler secret put`)
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;

  // Public-by-design tokens, served to the browser via /api/public-env.js.
  // Set with `wrangler secret put MAPBOX_TOKEN` etc.
  MAPBOX_TOKEN?: string;
  TURNSTILE_SITE_KEY?: string;

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
import * as meWithFarm from "../functions/api/farmer/me-with-farm";
import * as createFarm from "../functions/api/farmer/onboarding/create-farm";
import * as shares from "../functions/api/farmer/shares";
import * as pickupSites from "../functions/api/farmer/pickup-sites";
import * as completeOnboarding from "../functions/api/farmer/complete-onboarding";
import * as importMembersWorker from "../functions/api/farmer/import-members";
import * as aiParseWorker from "../functions/api/farmer/ai-parse-csv";
import * as inviteMembersWorker from "../functions/api/farmer/invite-members";
import * as generateHomepage from "../functions/api/generate-homepage";
import * as translate from "../functions/api/translate";
import * as discoveredBySlug from "../functions/api/discovered/[slug]";
import * as smsConfig from "../functions/api/farmer/sms/config";
import * as smsSubscriptions from "../functions/api/farmer/sms/subscriptions";
import * as smsSendTest from "../functions/api/farmer/sms/send-test";
import * as smsInbound from "../functions/api/sms/inbound";
import * as publicEnv from "../functions/api/public-env";

// -----------------------------------------------------------------------------
// Route table
// -----------------------------------------------------------------------------

type Route = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
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

  // Farmer dashboard data (D1)
  { method: "GET",     pattern: P("/api/farmer/me-with-farm"), handler: adapt(meWithFarm.onRequestGet) },
  { method: "OPTIONS", pattern: P("/api/farmer/me-with-farm"), handler: adapt(meWithFarm.onRequestOptions) },
  { method: "POST",    pattern: P("/api/farmer/onboarding/create-farm"), handler: adapt(createFarm.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/onboarding/create-farm"), handler: adapt(createFarm.onRequestOptions) },
  { method: "GET",     pattern: P("/api/farmer/shares"), handler: adapt(shares.onRequestGet) },
  { method: "POST",    pattern: P("/api/farmer/shares"), handler: adapt(shares.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/shares"), handler: adapt(shares.onRequestOptions) },
  { method: "GET",     pattern: P("/api/farmer/pickup-sites"), handler: adapt(pickupSites.onRequestGet) },
  { method: "POST",    pattern: P("/api/farmer/pickup-sites"), handler: adapt(pickupSites.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/pickup-sites"), handler: adapt(pickupSites.onRequestOptions) },
  { method: "POST",    pattern: P("/api/farmer/complete-onboarding"), handler: adapt(completeOnboarding.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/complete-onboarding"), handler: adapt(completeOnboarding.onRequestOptions) },
  { method: "POST",    pattern: P("/api/farmer/import-members"), handler: adapt(importMembersWorker.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/import-members"), handler: adapt(importMembersWorker.onRequestOptions) },
  { method: "POST",    pattern: P("/api/farmer/ai-parse-csv"),   handler: adapt(aiParseWorker.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/ai-parse-csv"),   handler: adapt(aiParseWorker.onRequestOptions) },
  { method: "POST",    pattern: P("/api/farmer/invite-members"), handler: adapt(inviteMembersWorker.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/invite-members"), handler: adapt(inviteMembersWorker.onRequestOptions) },

  // Homepage drafter (Anthropic Claude, public + rate-limited)
  { method: "POST",    pattern: P("/api/generate-homepage"), handler: adapt(generateHomepage.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/generate-homepage"), handler: adapt(generateHomepage.onRequestOptions) },

  // Llama-powered, KV-cached EN ↔ ES translation
  { method: "POST",    pattern: P("/api/translate"), handler: adapt(translate.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/translate"), handler: adapt(translate.onRequestOptions) },

  // Public discovered-farm read for /claim
  { method: "GET",     pattern: P("/api/discovered/:slug"), handler: adapt(discoveredBySlug.onRequestGet) },
  { method: "OPTIONS", pattern: P("/api/discovered/:slug"), handler: adapt(discoveredBySlug.onRequestOptions) },

  // SMS — farmer-facing config + roster + test send (PR 2 of the
  // Tuesday text loop). The Twilio webhook lives at /api/sms/inbound
  // and lands in PR 3.
  { method: "GET",     pattern: P("/api/farmer/sms/config"), handler: adapt(smsConfig.onRequestGet) },
  { method: "PUT",     pattern: P("/api/farmer/sms/config"), handler: adapt(smsConfig.onRequestPut) },
  { method: "OPTIONS", pattern: P("/api/farmer/sms/config"), handler: adapt(smsConfig.onRequestOptions) },
  { method: "GET",     pattern: P("/api/farmer/sms/subscriptions"), handler: adapt(smsSubscriptions.onRequestGet) },
  { method: "POST",    pattern: P("/api/farmer/sms/subscriptions"), handler: adapt(smsSubscriptions.onRequestPost) },
  { method: "DELETE",  pattern: P("/api/farmer/sms/subscriptions"), handler: adapt(smsSubscriptions.onRequestDelete) },
  { method: "OPTIONS", pattern: P("/api/farmer/sms/subscriptions"), handler: adapt(smsSubscriptions.onRequestOptions) },
  { method: "POST",    pattern: P("/api/farmer/sms/send-test"), handler: adapt(smsSendTest.onRequestPost) },
  { method: "OPTIONS", pattern: P("/api/farmer/sms/send-test"), handler: adapt(smsSendTest.onRequestOptions) },

  // Public env shim — root layout loads /api/public-env.js to set
  // window.__COMMUNICARE_PUBLIC_ENV__ at runtime (Mapbox + Turnstile).
  { method: "GET", pattern: P("/api/public-env.js"), handler: adapt(publicEnv.onRequestGet) },

  // Twilio inbound webhook — HMAC-verified at the handler boundary.
  // Twilio's console points each Twilio number's "messaging webhook"
  // at https://communicare.farm/api/sms/inbound (POST). The handler
  // routes by To-number to the right farm.
  { method: "POST",    pattern: P("/api/sms/inbound"), handler: adapt(smsInbound.onRequestPost) },
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
