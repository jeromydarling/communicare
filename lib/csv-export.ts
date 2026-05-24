// Tiny CSV writer + browser download helper. No external deps; works in
// static export. Used by /farmer/settings for the export-everything button
// and by /farmer/members + /farmer/log when farmers want per-table dumps.

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Bundle several CSVs into a zip-like download (sequential downloads). We
// keep it simple — no jszip dependency. Browsers throttle rapid downloads
// so we space them out with a short delay.
export async function downloadBundle(
  bundles: { filename: string; rows: CsvRow[] }[],
): Promise<void> {
  for (const b of bundles) {
    downloadCsv(b.filename, b.rows);
    await new Promise((r) => setTimeout(r, 250));
  }
}
