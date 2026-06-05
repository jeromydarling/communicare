// =============================================================================
// POST /api/translate — Llama-powered, KV-cached translation
// =============================================================================
// One general endpoint for any text → another language. Used by the
// dashboard when a Spanish-speaking visitor needs to see English-
// authored content (farm homepages, share descriptions, notes).
//
// Cache strategy: KV-keyed by content hash + (source, target). 90-day
// TTL — translations of human-authored content don't drift on a faster
// timescale than that. Cache hits return in <10ms; the only Llama call
// is on a miss.
//
// Body:
//   { text: string, target?: "en" | "es", source?: "en" | "es" }
//   Defaults: source="en", target="es".
//
// Returns:
//   { ok: true, translated: string, cached: boolean }
//
// Rate-limited per IP — Llama is paid usage even if cheap, and a
// runaway client iterating "translate" calls per character could rack
// up real costs.
// =============================================================================

import { preflight, json } from "../_lib/cors";
import { rateLimit, ipBucket } from "../_lib/ratelimit";
import { sha256Hex } from "../_lib/crypto";

type Env = {
  AI?: Ai;
  AI_GATEWAY_NAME?: string;
  CACHE?: KVNamespace;
  RATELIMIT?: KVNamespace;
};

type Locale = "en" | "es";
const LOCALES: Set<Locale> = new Set(["en", "es"]);
const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", es: "Spanish" };
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CACHE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const MAX_LEN = 8_000;

type RequestBody = {
  text?: string;
  target?: string;
  source?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.AI) {
    return json({ error: "Workers AI binding missing on this deploy." }, 500);
  }

  const gate = await rateLimit(ctx.env.RATELIMIT, {
    bucket: ipBucket(ctx.request, "translate"),
    limit: 200,
    windowSeconds: 60 * 60,
  });
  if (!gate.ok) return gate.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const text = (body.text ?? "").trim();
  if (!text) return json({ error: "Missing text." }, 400);
  if (text.length > MAX_LEN) {
    return json(
      { error: `text too long (${text.length} chars; max ${MAX_LEN}).` },
      413,
    );
  }
  const source = (body.source as Locale) || "en";
  const target = (body.target as Locale) || "es";
  if (!LOCALES.has(source) || !LOCALES.has(target)) {
    return json({ error: "Unsupported locale. Use 'en' or 'es'." }, 400);
  }
  if (source === target) {
    return json({ ok: true, translated: text, cached: false });
  }

  // Cache lookup
  const hash = await sha256Hex(`${source}|${target}|${text}`);
  const cacheKey = `tr:v1:${hash}`;
  if (ctx.env.CACHE) {
    const cached = await ctx.env.CACHE.get(cacheKey);
    if (cached) return json({ ok: true, translated: cached, cached: true });
  }

  // Llama call via AI Gateway
  const systemPrompt = [
    `You translate ${LANGUAGE_NAMES[source]} to ${LANGUAGE_NAMES[target]}.`,
    `Keep the editorial register and tone of the original.`,
    `Preserve formatting: line breaks, lists, code, URLs, email addresses, numbers, and proper nouns stay verbatim.`,
    `When the original uses warm, plain-spoken farm language, render it the same way in ${LANGUAGE_NAMES[target]} — not formal or stiff.`,
    `Do NOT add explanatory text. Do NOT wrap the output in quotes. Return ONLY the translated text.`,
  ].join(" ");

  try {
    const gatewayOpts = ctx.env.AI_GATEWAY_NAME
      ? { gateway: { id: ctx.env.AI_GATEWAY_NAME } }
      : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = await ctx.env.AI.run(
      MODEL as never,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: Math.min(4000, Math.ceil(text.length * 2)),
      } as never,
      gatewayOpts as never,
    );

    const candidate =
      typeof out === "object" && out !== null && "response" in out
        ? out.response
        : out;
    const translated = typeof candidate === "string" ? candidate.trim() : "";
    if (!translated) {
      return json({ error: "Model returned no translation." }, 502);
    }

    if (ctx.env.CACHE) {
      ctx.waitUntil(
        ctx.env.CACHE.put(cacheKey, translated, {
          expirationTtl: CACHE_TTL_SECONDS,
        }),
      );
    }

    return json({ ok: true, translated, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("translate failed:", msg);
    return json({ error: `Translate failed: ${msg}` }, 502);
  }
};
