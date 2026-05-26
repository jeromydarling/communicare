// =============================================================================
// ai-parse-csv — Supabase Edge Function (Deno runtime)
// =============================================================================
// Takes a raw CSV (or a parsed preview) plus the operator's defined shares
// and pickup sites, asks Claude to figure out which CSV column is which,
// match share-type labels to defined shares, and match pickup labels to
// defined pickup sites. Returns a complete mapping + a preview of how each
// row will land — so the wizard can show "we already mapped 6 of 7 columns
// for you, take a look" instead of making the operator do it by hand.
//
// Why an AI: real-world CSVs from Barn2Door, Local Line, Harvie, Square,
// Shopify, and binder-typed spreadsheets all use wildly different column
// names ("First Name + Last Name", "Customer Name", "Member", "Full Name")
// and share labels ("Standard CSA", "Veg Box - Weekly", "Box A"). Regex
// patterns can't cover the long tail. The AI gets the operator's defined
// shares as context and can do fuzzy semantic matching in one shot.
//
// We send only the first 30 rows + the column headers — enough for the
// model to detect patterns without paying tokens for the whole import.
//
// Deploy:   supabase functions deploy ai-parse-csv --no-verify-jwt
// Secrets:  ANTHROPIC_API_KEY (already set for generate-homepage)
// =============================================================================

import Anthropic from "npm:@anthropic-ai/sdk@^0.88.0";
import { z } from "npm:zod@^3.24.0";

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------

const ShareDef = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
});
const PickupSite = z.object({
  id: z.number().int(),
  name: z.string(),
  address: z.string().nullable().optional(),
});

const RequestInput = z.object({
  // The raw CSV text (we'll parse it server-side) — or a pre-parsed preview.
  csv_text: z.string().max(500_000).optional(),
  preview: z
    .object({
      headers: z.array(z.string()).max(60),
      rows: z.array(z.array(z.string())).max(60),
    })
    .optional(),
  share_definitions: z.array(ShareDef).max(40),
  pickup_sites: z.array(PickupSite).max(40),
  // What kind of CSV is this (Barn2Door, Local Line, etc) — gives the model
  // a useful prior.
  source_hint: z.string().max(40).optional(),
});

// -----------------------------------------------------------------------------
// Output schema (what we ask the model to fill in)
// -----------------------------------------------------------------------------

const CanonField = z.enum([
  "name",
  "email",
  "phone",
  "share",
  "pickup",
  "credit",
  "started",
  "note",
  "skip",
]);

const AiOutput = z.object({
  column_map: z
    .record(z.string(), CanonField)
    .describe(
      "For every header in the input, the canonical field it maps to. Use 'skip' for columns we don't need (internal IDs, billing notes, etc).",
    ),
  share_map: z
    .record(z.string(), z.string().uuid().nullable())
    .describe(
      "For every distinct share-type label found in the share column, the share_definition.id it should map to. Use null if no good match exists — the operator will pick.",
    ),
  pickup_map: z
    .record(z.string(), z.number().int().nullable())
    .describe(
      "For every distinct pickup-site label found in the pickup column, the pickup_sites.id (integer) it should map to. Use null if no good match exists.",
    ),
  notes: z
    .string()
    .max(400)
    .describe(
      "One short sentence the wizard can show: 'Mapped 6 of 7 columns; please confirm the credit column matches what you expect.' Keep it warm and concrete.",
    ),
});

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// -----------------------------------------------------------------------------
// Tiny CSV parser — same logic as the client, mirrored here so callers can
// hand us either the raw text or the parsed preview.
// -----------------------------------------------------------------------------

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine).filter((r) => r.some((c) => c));
  return { headers, rows };
}

function splitCsvLines(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && text[i - 1] !== "\\") inQuote = !inQuote;
    if ((c === "\n" || c === "\r") && !inQuote) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (buf.length > 0) out.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === "," && !inQuote) {
      out.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  out.push(buf);
  return out.map((s) => s.trim());
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json(
      { error: "ANTHROPIC_API_KEY missing from edge-function secrets." },
      500,
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = RequestInput.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400,
    );
  }
  const input = parsed.data;

  // Resolve preview — either pre-parsed or from raw text
  let headers: string[] = [];
  let rows: string[][] = [];
  if (input.preview) {
    headers = input.preview.headers;
    rows = input.preview.rows;
  } else if (input.csv_text) {
    const out = parseCsv(input.csv_text);
    headers = out.headers;
    rows = out.rows.slice(0, 30);
  } else {
    return json({ error: "Send either csv_text or preview." }, 400);
  }
  if (headers.length === 0 || rows.length === 0) {
    return json({ error: "Couldn't see any rows in that CSV." }, 400);
  }

  // ---------------------------------------------------------------------------
  // Compose the prompt. We hand the model:
  //   - The first 30 rows + headers
  //   - The full list of the farm's defined shares (id + name + description)
  //   - The full list of pickup sites (id + name + address)
  //   - A hint about which export format this came from (when known)
  //
  // We ask it to return strict JSON matching our zod schema.
  // ---------------------------------------------------------------------------

  const sourceHint = input.source_hint
    ? `\nThe operator said this CSV came from: ${input.source_hint}.`
    : "";

  const shareCatalog = input.share_definitions.length
    ? input.share_definitions
        .map(
          (s) =>
            `  - id=${s.id} · "${s.name}"${s.description ? ` · ${s.description}` : ""}`,
        )
        .join("\n")
    : "  (none defined yet — every share label should map to null)";

  const pickupCatalog = input.pickup_sites.length
    ? input.pickup_sites
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

  const anthropic = new Anthropic({ apiKey });

  let aiOut: z.infer<typeof AiOutput>;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: userPrompt }],
      system:
        "You are a careful data-mapping assistant. Respond with strict JSON only — no prose before or after, no code fences. If you're not sure about a mapping, prefer null over a wrong guess.",
    });

    const text = msg.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Strip code fences if the model added them anyway
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const result = AiOutput.safeParse(JSON.parse(stripped));
    if (!result.success) {
      console.error("AiOutput parse error", result.error);
      return json(
        { error: "AI returned an unexpected shape.", details: result.error.flatten() },
        502,
      );
    }
    aiOut = result.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("anthropic call failed", msg);
    return json({ error: `AI parse failed: ${msg}` }, 502);
  }

  // Sanity-check the returned share/pickup IDs belong to this farm.
  const validShareIds = new Set(input.share_definitions.map((s) => s.id));
  const validPickupIds = new Set(input.pickup_sites.map((p) => p.id));
  const cleanShareMap: Record<string, string | null> = {};
  for (const [label, id] of Object.entries(aiOut.share_map)) {
    cleanShareMap[label] = id && validShareIds.has(id) ? id : null;
  }
  const cleanPickupMap: Record<string, number | null> = {};
  for (const [label, id] of Object.entries(aiOut.pickup_map)) {
    cleanPickupMap[label] = id && validPickupIds.has(id) ? id : null;
  }

  return json({
    ok: true,
    column_map: aiOut.column_map,
    share_map: cleanShareMap,
    pickup_map: cleanPickupMap,
    notes: aiOut.notes,
  });
});
