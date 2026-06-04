// =============================================================================
// db — tiny ergonomics layer over the D1 binding
// =============================================================================
// D1's native API is fine (prepare → bind → first / all / run), but the
// same three patterns recur often enough that a helper makes the call
// sites readable. Nothing magical here — these are convenience wrappers,
// not an ORM. If a query needs anything beyond the helpers, drop down to
// the raw binding.
//
// Conventions:
//   - All queries return either a typed row or null/empty array.
//   - JSON columns are NOT auto-parsed; do `JSON.parse(row.metadata)` at
//     the call site so the shape is visible.
//   - SQLite booleans are 0/1 integers; we don't paper over that here.
//
// Usage:
//   const farm = await one<Farm>(env.DB, "select * from farms where id = ?", [id]);
//   const rows = await many<Farm>(env.DB, "select * from farms where is_published = 1");
//   const ok = await run(env.DB, "update farms set onboarded_at = ? where id = ?", [now, id]);
// =============================================================================

export async function one<T>(
  db: D1Database,
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = [],
): Promise<T | null> {
  const stmt = db.prepare(sql).bind(...params);
  const row = await stmt.first<T>();
  return row ?? null;
}

export async function many<T>(
  db: D1Database,
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = [],
): Promise<T[]> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all<T>();
  return result.results ?? [];
}

export async function run(
  db: D1Database,
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = [],
): Promise<{ changes: number; lastRowId: number | null }> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.run();
  return {
    changes: result.meta?.changes ?? 0,
    lastRowId: result.meta?.last_row_id ?? null,
  };
}

// Convenience: ISO timestamp in the same shape the schema uses as a default.
export function nowIso(): string {
  return new Date().toISOString();
}

// Convenience: server-side UUID generation.
export function uuid(): string {
  return crypto.randomUUID();
}
