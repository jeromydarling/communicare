#!/usr/bin/env -S node --experimental-strip-types
// =============================================================================
// migrate-pg-to-d1 — one-shot Postgres → D1 data export
// =============================================================================
// Reads every table from the live Supabase Postgres instance and emits a
// SQLite dump file (`d1-import.sql`) that `wrangler d1 execute` can play
// back into the target D1 database.
//
// This is the cutover script for Phase 8 of the Cloudflare migration. It
// runs against a stable snapshot — pause writes in the Supabase dashboard
// before invoking, or accept that any rows written between export and
// import are lost.
//
// Usage:
//   SUPABASE_URL=https://abc.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/migrate-pg-to-d1.ts > d1-import.sql
//
//   wrangler d1 execute communicare-db --remote --file d1-import.sql
//
// What it handles:
//   * Postgres uuid columns → D1 text (stringified as-is)
//   * Postgres jsonb columns → D1 text (JSON.stringify, no whitespace)
//   * Postgres timestamptz → D1 text ISO 8601 (Supabase already returns ISO)
//   * Postgres boolean → D1 integer (1/0)
//   * Single-quote escaping for SQL string literals
//   * FK-correct table ordering
//
// What it does NOT handle:
//   * Renaming or restructuring (the D1 schema mirrors Postgres 1:1 in
//     content, see cloudflare/d1/migrations/0001_initial_schema.sql)
//   * auth.users — the destination users table is populated by the auth
//     migration step (Phase 3), not this script. We map each profile.id
//     to a users(id) by inserting a placeholder users row first.
//   * Audit-log preservation of created_at on identity-PK tables (D1
//     auto-assigns the integer PK; we keep the columns including
//     created_at, but the integer id is reassigned).
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// FK-correct order. users first (parent of everything else via FK), then
// profiles (FK on users), then farms (no FK to users), then everything
// that references farms.
const EXPORT_ORDER = [
  // The destination users table is filled by the auth migration step. We
  // still emit users rows here from profiles, so the FK from
  // profiles → users resolves.
  "users_from_profiles",
  "profiles",
  "farms",
  "farm_members",
  "farm_homepages",
  "pickup_sites",
  "share_definitions",
  "products",
  "subscriptions",
  "orders",
  "order_items",
  "credit_ledger",
  "payment_config",
  "herd_share_contracts",
  "milk_test_results",
  "sms_messages",
  "waitlist",
  "discovered_farms",
  "farm_inquiries",
  "discovery_searches",
  "import_runs",
  "farm_integrations",
  "pending_crop_mappings",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function sqlEscape(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function emitInsert(table: string, row: Row): string {
  const columns = Object.keys(row);
  const values = columns.map((c) => sqlEscape(row[c]));
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
}

async function exportTable(table: string): Promise<void> {
  console.log(`\n-- ${table}`);
  let from = 0;
  const PAGE = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`-- ERROR on ${table}: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) break;
    for (const row of data as Row[]) {
      console.log(emitInsert(table, row));
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
}

async function exportUsersFromProfiles(): Promise<void> {
  console.log("\n-- users (synthesized from profiles)");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, phone, avatar_url, created_at, updated_at");
  if (error) {
    console.error(`-- ERROR on users_from_profiles: ${error.message}`);
    return;
  }
  for (const row of (data ?? []) as Row[]) {
    const userRow: Row = {
      id: row.id,
      email: row.email,
      email_verified_at: row.created_at,
      password_hash: null,
      display_name: row.display_name,
      phone: row.phone,
      avatar_url: row.avatar_url,
      metadata: "{}",
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    console.log(emitInsert("users", userRow));
  }
}

async function main(): Promise<void> {
  console.log("-- Generated by scripts/migrate-pg-to-d1.ts");
  console.log(`-- ${new Date().toISOString()}`);
  console.log("PRAGMA foreign_keys = OFF;");
  console.log("BEGIN TRANSACTION;");

  for (const table of EXPORT_ORDER) {
    if (table === "users_from_profiles") {
      await exportUsersFromProfiles();
    } else {
      await exportTable(table);
    }
  }

  console.log("\nCOMMIT;");
  console.log("PRAGMA foreign_keys = ON;");
}

main().catch((err) => {
  console.error(`-- FATAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
