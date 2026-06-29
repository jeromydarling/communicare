// =============================================================================
// /api/ai/alt-text — generate alt text for an uploaded farm or product photo
// =============================================================================
// Uses Workers AI (Llama 3.2 11B Vision) on the AI binding declared in
// wrangler.jsonc. This is a "low-stakes" AI task per the migration plan —
// Workers AI's open-source vision models do fine on "describe a farm
// photo in 12-25 plain words." Claude isn't worth the cost for it.
//
// POST body:
//   { "url": "https://communicare.farm/i/farm-photos/abc/..." }
// or:
//   { "bucket": "farm-photos", "key": "abc/..." }
//
// Response:
//   { ok: true, alt: "..." }
//
// We deliberately limit the prompt — 12-25 words, no marketing flourish —
// so the output respects the editorial voice. The component using this
// should still let the operator edit before saving.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";

type Env = {
  AI?: Ai;
  AI_GATEWAY_NAME?: string;
  FARM_PHOTOS?: R2Bucket;
  PRODUCT_PHOTOS?: R2Bucket;
  SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.AI) {
    return json({ error: "Workers AI binding missing on this deploy." }, 500);
  }

  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: { url?: string; bucket?: string; key?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // Resolve the image bytes — either from the supplied URL (fetched
  // through the CDN cache, which is cheap) or directly out of R2 by key.
  let bytes: Uint8Array | null = null;
  if (body.bucket && body.key) {
    const bindings: Record<string, R2Bucket | undefined> = {
      "farm-photos": ctx.env.FARM_PHOTOS,
      "product-photos": ctx.env.PRODUCT_PHOTOS,
    };
    const r2 = bindings[body.bucket];
    if (!r2) return json({ error: `Unknown bucket "${body.bucket}".` }, 400);
    const obj = await r2.get(body.key);
    if (!obj) return json({ error: "Object not found." }, 404);
    bytes = new Uint8Array(await obj.arrayBuffer());
  } else if (body.url) {
    // SSRF guard: only allow image URLs on our own origin (the
    // /i/<bucket>/<key> serve route). Without this an authenticated
    // attacker could use the Worker as a proxy to probe internal
    // services or fetch arbitrary HTTPS resources.
    const siteOrigin = new URL(
      ctx.env.SITE_URL ?? "https://communicare.farm",
    ).origin;
    let parsed: URL;
    try {
      parsed = new URL(body.url);
    } catch {
      return json({ error: "Invalid url." }, 400);
    }
    if (parsed.origin !== siteOrigin) {
      return json(
        { error: "url must be on the same origin as the site." },
        400,
      );
    }
    const res = await fetch(parsed.toString());
    if (!res.ok) return json({ error: `Couldn't fetch image (${res.status}).` }, 502);
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    return json({ error: "Send either url or (bucket, key)." }, 400);
  }

  const prompt = [
    "Write a short, plain alt-text description of this photo for a farm-share website.",
    "12 to 25 words. Concrete and visual.",
    "No marketing language. No 'image of' or 'photo of' preamble. End with a period.",
  ].join(" ");

  // Llama 3.2 11B Vision Instruct — the smallest of the vision-capable
  // models on Workers AI, plenty for this task.
  const gatewayOpts = ctx.env.AI_GATEWAY_NAME
    ? { gateway: { id: ctx.env.AI_GATEWAY_NAME } }
    : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = (await ctx.env.AI.run(
    "@cf/meta/llama-3.2-11b-vision-instruct" as never,
    {
      prompt,
      image: Array.from(bytes),
      max_tokens: 80,
    } as never,
    gatewayOpts as never,
  )) as { description?: string; response?: string };

  const text = (out?.description ?? out?.response ?? "").trim();
  if (!text) {
    return json({ error: "Model returned no text." }, 502);
  }

  return json({ ok: true, alt: trimToWords(text, 25) });
};

function trimToWords(text: string, maxWords: number): string {
  const cleaned = text.replace(/^[\s\-—:]+/, "").trim();
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) return cleaned;
  return words.slice(0, maxWords).join(" ").replace(/[,;:\s]*$/, "") + ".";
}
