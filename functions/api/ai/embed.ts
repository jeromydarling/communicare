// =============================================================================
// /api/ai/embed — generate (and optionally store) a 384-dim text embedding
// =============================================================================
// Uses @cf/baai/bge-small-en-v1.5 via the AI binding. 384 dimensions,
// cosine-similarity friendly, fast enough that we can do it inline on a
// page save.
//
// Two modes:
//
//   POST { "text": "..." }
//     → returns { vector: number[] }, doesn't store anything
//
//   POST { "text": "...", "id": "...", "namespace": "farms", "metadata": {} }
//     → generates the embedding AND upserts it into Vectorize for later
//       semantic search. `namespace` partitions the index so a query can
//       scope to "just farm descriptions" or "just share notes."
//
// Storage strategy:
//   * D1 doesn't have a vector column type — we use Vectorize, CF's
//     dedicated vector DB. The binding is declared as EMBEDDINGS in
//     wrangler.jsonc.
//   * For tiny use cases (< 1000 rows) you could JSON-encode the vector
//     into a D1 text column and brute-force cosine in app code; we don't
//     bother because Vectorize is free at our scale and the right tool.
//
// Auth-gated (Supabase JWT during transition). When auth moves to
// Workers in Phase 3, this swaps to the KV session check.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";

type Env = {
  AI?: Ai;
  AI_GATEWAY_NAME?: string;
  EMBEDDINGS?: VectorizeIndex;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type RequestBody = {
  text?: string;
  id?: string;
  namespace?: string;
  metadata?: Record<string, unknown>;
};

const MODEL = "@cf/baai/bge-small-en-v1.5";
const MAX_INPUT_LEN = 8_000;

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.AI) {
    return json({ error: "Workers AI binding missing on this deploy." }, 500);
  }

  const auth = await verifyAuth(ctx.request, ctx.env);
  if (!auth.ok) return auth.response;

  let body: RequestBody;
  try {
    body = (await ctx.request.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return json({ error: "Missing text." }, 400);
  }
  if (text.length > MAX_INPUT_LEN) {
    return json(
      { error: `text too long (${text.length} chars; max ${MAX_INPUT_LEN}).` },
      413,
    );
  }

  const gatewayOpts = ctx.env.AI_GATEWAY_NAME
    ? { gateway: { id: ctx.env.AI_GATEWAY_NAME } }
    : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await ctx.env.AI.run(
    MODEL as never,
    { text } as never,
    gatewayOpts as never,
  )) as { data?: number[][]; shape?: number[] };
  const vector = result?.data?.[0];
  if (!vector || vector.length === 0) {
    return json({ error: "Model returned no embedding." }, 502);
  }

  // Optional upsert into Vectorize. Vectorize indexes are
  // namespace-aware: pass `namespace` to scope future queries.
  if (body.id && ctx.env.EMBEDDINGS) {
    await ctx.env.EMBEDDINGS.upsert([
      {
        id: body.id,
        values: vector,
        namespace: body.namespace,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (body.metadata ?? {}) as any,
      },
    ]);
  }

  return json({
    ok: true,
    vector,
    dimensions: vector.length,
    model: MODEL,
    stored: Boolean(body.id && ctx.env.EMBEDDINGS),
  });
};
