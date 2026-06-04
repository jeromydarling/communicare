// =============================================================================
// POST /api/farmer/ai-parse-csv — Workers AI port of the CSV column mapper
// =============================================================================
// Maps a CSV preview to our canonical fields + suggests share / pickup
// matches. Uses the AI binding with response_format: json_schema so the
// model returns a parsed object we can hand straight to the import
// wizard.
//
// Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast. The task is structured
// label matching — 70B handles it well, and at $0.29 / M input we can
// afford the bigger model for the quality.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { parseCsv } from "../../../lib/csv-utils";

type Env = {
  AI?: Ai;
  AI_GATEWAY_NAME?: string;
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

type ShareDefInput = { id: string; name: string; description?: string | null };
type PickupSiteInput = { id: number; name: string; address?: string | null };
type RequestBody = {
  csv_text?: string;
  preview?: { headers: string[]; rows: string[][] };
  share_definitions: ShareDefInput[];
  pickup_sites: PickupSiteInput[];
  source_hint?: string;
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    column_map: {
      type: "object",
      description:
        "For each CSV header, the canonical field it maps to: name, email, phone, share, pickup, credit, started, note, or skip.",
      additionalProperties: { type: "string" },
    },
    share_map: {
      type: "object",
      description:
        "For each distinct share label seen, the share_definition.id it maps to, or null if no good match.",
      additionalProperties: { type: ["string", "null"] },
    },
    pickup_map: {
      type: "object",
      description:
        "For each distinct pickup label seen, the pickup_sites.id (integer) it maps to, or null if no good match.",
      additionalProperties: { type: ["number", "null"] },
    },
    notes: {
      type: "string",
      description: "One warm short sentence for the operator about the mapping.",
    },
  },
  required: ["column_map", "share_map", "pickup_map", "notes"],
} as const;

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

  let headers: string[] = [];
  let rows: string[][] = [];
  if (body.preview) {
    headers = body.preview.headers ?? [];
    rows = body.preview.rows ?? [];
  } else if (body.csv_text) {
    const out = parseCsv(body.csv_text);
    headers = out.headers;
    rows = out.rows.slice(0, 30);
  } else {
    return json({ error: "Send either csv_text or preview." }, 400);
  }
  if (headers.length === 0 || rows.length === 0) {
    return json({ error: "Couldn't see any rows in that CSV." }, 400);
  }

  const sourceHint = body.source_hint
    ? `\nThe operator said this CSV came from: ${body.source_hint}.`
    : "";

  const shareCatalog = body.share_definitions.length
    ? body.share_definitions
        .map(
          (s) =>
            `  - id=${s.id} · "${s.name}"${s.description ? ` · ${s.description}` : ""}`,
        )
        .join("\n")
    : "  (none defined yet — every share label should map to null)";

  const pickupCatalog = body.pickup_sites.length
    ? body.pickup_sites
        .map(
          (p) =>
            `  - id=${p.id} · "${p.name}"${p.address ? ` · ${p.address}` : ""}`,
        )
        .join("\n")
    : "  (none defined yet — every pickup label should map to null)";

  const sample = rows
    .map((r) => headers.map((h, i) => `${h}: ${r[i] ?? ""}`).join("  ·  "))
    .slice(0, 12)
    .join("\n");

  const userMessage = `You are helping a small farm migrate from another tool to Communicare.

I will give you a CSV of their members and their existing share types and pickup sites. Your job is to map the CSV to our schema so the import can proceed without the farmer having to hand-map every column.${sourceHint}

CSV headers:
${headers.map((h) => `  - "${h}"`).join("\n")}

First ${rows.length} rows of the CSV (one row per line, "header: value" pairs separated by " · "):
${sample}

Their defined shares:
${shareCatalog}

Their defined pickup sites:
${pickupCatalog}

Canonical fields for column_map:
  - name, email, phone, share, pickup, credit, started, note, skip

For share_map and pickup_map: extract DISTINCT values seen in the share/pickup columns and match each to the closest defined share/pickup. Use null if no good match. Match semantically — "Standard CSA Box" matches "Standard share".

Return ONLY the JSON object that satisfies the schema.`;

  try {
    const gatewayOpts = ctx.env.AI_GATEWAY_NAME
      ? { gateway: { id: ctx.env.AI_GATEWAY_NAME } }
      : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResp: any = await ctx.env.AI.run(
      MODEL as never,
      {
        messages: [
          {
            role: "system",
            content:
              "You are a careful data-mapping assistant. Respond with strict JSON matching the schema. If you're not sure about a mapping, prefer null over a wrong guess.",
          },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          schema: RESPONSE_SCHEMA,
        },
        max_tokens: 4000,
      } as never,
      gatewayOpts as never,
    );

    const candidate =
      typeof aiResp === "object" && aiResp !== null && "response" in aiResp
        ? aiResp.response
        : aiResp;
    let parsed: {
      column_map?: Record<string, string>;
      share_map?: Record<string, string | null>;
      pickup_map?: Record<string, number | null>;
      notes?: string;
    };
    if (typeof candidate === "string") {
      const stripped = candidate
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(stripped);
    } else {
      parsed = candidate;
    }

    // Sanity-check the returned share/pickup IDs belong to this farm.
    const validShareIds = new Set(body.share_definitions.map((s) => s.id));
    const validPickupIds = new Set(body.pickup_sites.map((p) => p.id));
    const cleanShareMap: Record<string, string | null> = {};
    for (const [label, id] of Object.entries(parsed.share_map ?? {})) {
      cleanShareMap[label] = id && validShareIds.has(id) ? id : null;
    }
    const cleanPickupMap: Record<string, number | null> = {};
    for (const [label, id] of Object.entries(parsed.pickup_map ?? {})) {
      cleanPickupMap[label] =
        typeof id === "number" && validPickupIds.has(id) ? id : null;
    }

    return json({
      ok: true,
      column_map: parsed.column_map ?? {},
      share_map: cleanShareMap,
      pickup_map: cleanPickupMap,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ai-parse-csv failed:", msg);
    return json({ error: `AI parse failed: ${msg}` }, 502);
  }
};
