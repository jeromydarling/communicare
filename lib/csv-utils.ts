// =============================================================================
// CSV utils — tiny but correct for the standard case
// =============================================================================
// Handles quoted fields, escaped quotes ("" → "), commas inside quotes, and
// CRLF or LF line endings. That covers every export I've seen from
// Barn2Door / Local Line / Harvie / Shopify / Square / a Google Sheet. If
// real-world exports start using semicolons or pipe delimiters we'll add
// the delimiter as a parameter.
//
// The Deno-side edge function (supabase/functions/ai-parse-csv) carries a
// mirrored copy of these helpers — sharing TS modules across the Node and
// Deno bundling worlds isn't worth the toolchain pain for ~50 lines of
// leaf code. If you change one side, change the other.
// =============================================================================

export function parseCsv(text: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines
    .slice(1)
    .map(parseCsvLine)
    .filter((r) => r.some((c) => c));
  return { headers, rows };
}

export function splitCsvLines(text: string): string[] {
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

export function parseCsvLine(line: string): string[] {
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
