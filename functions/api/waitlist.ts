// =============================================================================
// /api/waitlist — Turnstile-gated waitlist signup from /join
// =============================================================================
// Writes directly to the D1 `waitlist` table. The Supabase passthrough
// is gone — this is the last public-facing route to drop it.
//
// Gates:
//   1. Cloudflare Turnstile token (the form widget mints one)
//   2. Per-IP rate limit (5 / hour) belt-and-suspenders
//   3. Duplicate-email guard via `INSERT OR IGNORE` on the unique index
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { verifyTurnstile } from "../_lib/turnstile";
import { rateLimit, ipBucket } from "../_lib/ratelimit";
import { run } from "../_lib/db";

type Env = {
  DB?: D1Database;
  RATELIMIT?: KVNamespace;
  TURNSTILE_SECRET?: string;
};

const VALID_KINDS = new Set([
  "vegetable_csa", "raw_milk_herd_share", "pastured_meat",
  "pastured_eggs", "mixed_farm", "market_garden",
  "orchard_fruit", "flower_farm",
]);

type RequestBody = {
  email?: string;
  name?: string;
  farm_name?: string;
  location?: string;
  farm_kind?: string;
  current_tool?: string;
  note?: string;
  source?: string;
  turnstileToken?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.DB) {
    return json({ error: "Database not configured on this deploy." }, 500);
  }

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) {
    return json({ error: "Valid email required." }, 400);
  }

  // Gate 1: Turnstile (catches scripted submissions)
  const ts = await verifyTurnstile(
    body.turnstileToken,
    ctx.env.TURNSTILE_SECRET,
    ctx.request.headers.get("cf-connecting-ip") ?? undefined,
  );
  if (!ts.ok) {
    return json({ error: `Captcha failed: ${ts.reason}` }, 403);
  }

  // Gate 2: per-IP rate limit (catches a real visitor mashing submit)
  const ipGate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "waitlist"),
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!ipGate.ok) return ipGate.response;

  // Validate the optional enum so a bad value doesn't violate the
  // table's CHECK constraint and surface a 500.
  const farmKind = body.farm_kind && VALID_KINDS.has(body.farm_kind)
    ? body.farm_kind
    : null;

  // INSERT OR IGNORE — the unique index on email makes duplicates a
  // silent no-op rather than an error. The user sees the same success
  // message whether they're new or already on the list.
  await run(
    ctx.env.DB,
    `insert or ignore into waitlist
       (email, name, farm_name, location, farm_kind,
        current_tool, note, source)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      email,
      body.name?.toString().slice(0, 200) || null,
      body.farm_name?.toString().slice(0, 200) || null,
      body.location?.toString().slice(0, 200) || null,
      farmKind,
      body.current_tool?.toString().slice(0, 200) || null,
      body.note?.toString().slice(0, 4000) || null,
      body.source?.toString().slice(0, 50) || "landing",
    ],
  );

  return json({ ok: true });
};
