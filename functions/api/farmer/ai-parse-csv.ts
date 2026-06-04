// =============================================================================
// POST /api/farmer/ai-parse-csv — Workers port of the Anthropic CSV mapper
// =============================================================================
// Receives the CSV headers + first ~30 rows + the farm's defined shares /
// pickups; asks Claude to produce column_map / share_map / pickup_map for
// the import wizard's mapping step. Same prompt + zod-validated output
// shape as the Supabase function it replaces.
//
// Anthropic Claude stays as the model — Workers AI's open-source vision
// models don't match Claude on structured-output instruction-following.
// See docs/CLOUDFLARE_MIGRATION.md Phase 7.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { preflight, json } from "../../_lib/cors";
import { verifyAuth } from "../../_lib/auth";
import { parseCsv } from "../../../lib/csv-utils";

type Env = {
  ANTHROPIC_API_KEY?: string;
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type ShareDefInput = {
  id: string;
  name: string;
  description?: string | null;
};
type PickupSiteInput = {
  id: number;
  name: string;
  address?: string | null;
};
type RequestBody = {
  csv_text?: string;
  preview?: { headers: string[]; rows: string[][] };
  share_definitions: ShareDefInput[];
  pickup_sites: PickupSiteInput[];
  source_hint?: string;
};

type AiOutput = {
  column_map: Record<string, string>;
  share_map: Record<string, string | null>;
  pickup_map: Record<string, number | null>;
  notes: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const apiKey = ctx.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY missing on this deploy." }, 500);
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

  const userPrompt = `You are helping a small farm migrate from another tool to Communicare.

I will give you a CSV of their members and their existing share types and pickup sites. Your job is to map the CSV to our schema so the import can proceed without the farmer having to hand-map every column.${sourceHint}

CSV headers:
${headers.map((h) => `  - "${h}"`).join("\n")}

First ${rows.length} rows of the CSV (one row per line, "header: value" pairs separated by " · "):
${sample}

Their defined shares:
${shareCatalog}

Their defined pickup sites:
${pickupCatalog}

Canonical fields you can map columns to:
  - name      — member's full name
  - email     — primary email
  - phone     — phone number (any format)
  - share     — the share type / subscription / product the member is signed up for
  - pickup    — the location they pick up at (drop site, market day, etc)
  - credit    — opening account balance (any currency notation OK)
  - started   — when they joined / first ordered
  - note      — free-form notes
  - skip      — internal IDs, billing notes, anything we don't need

For share_map and pickup_map: extract the DISTINCT values seen in the share/pickup columns and match each one to the closest defined share/pickup site. Use null if no good match exists. Match semantically, not just by string equality — "Standard CSA Box" matches "Standard share" if that's the closest.

Return ONLY a JSON object with this exact shape:
{
  "column_map": { "<header>": "<canonical_field>", ... },
  "share_map":  { "<csv label>": "<share_definition_id_or_null>", ... },
  "pickup_map": { "<csv label>": <pickup_site_id_or_null>, ... },
  "notes":      "<one warm short sentence for the operator>"
}`;

  let aiOut: AiOutput;
  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: userPrompt }],
      system:
        "You are a careful data-mapping assistant. Respond with strict JSON only — no prose before or after, no code fences. If you're not sure about a mapping, prefer null over a wrong guess.",
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim();

    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    aiOut = JSON.parse(stripped) as AiOutput;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("anthropic call failed", msg);
    return json({ error: `AI parse failed: ${msg}` }, 502);
  }

  // Sanity-check the returned share/pickup IDs belong to this farm.
  const validShareIds = new Set(body.share_definitions.map((s) => s.id));
  const validPickupIds = new Set(body.pickup_sites.map((p) => p.id));
  const cleanShareMap: Record<string, string | null> = {};
  for (const [label, id] of Object.entries(aiOut.share_map ?? {})) {
    cleanShareMap[label] = id && validShareIds.has(id) ? id : null;
  }
  const cleanPickupMap: Record<string, number | null> = {};
  for (const [label, id] of Object.entries(aiOut.pickup_map ?? {})) {
    cleanPickupMap[label] = typeof id === "number" && validPickupIds.has(id) ? id : null;
  }

  return json({
    ok: true,
    column_map: aiOut.column_map ?? {},
    share_map: cleanShareMap,
    pickup_map: cleanPickupMap,
    notes: typeof aiOut.notes === "string" ? aiOut.notes : "",
  });
};
