# D1 migrations

These run against the Cloudflare D1 database declared as `DB` in
`wrangler.jsonc`. They mirror the Supabase Postgres migrations at
`supabase/migrations/`, but with the SQLite translation choices documented
in `0001_initial_schema.sql`.

## What's here vs. there

| Postgres concept | D1 / SQLite equivalent |
|---|---|
| `auth.users` | Our own `users` table (in `0001`) |
| RLS policies | Authorization in Worker route code |
| `plpgsql` functions | Worker route code |
| Triggers (e.g. `touch_updated_at`) | Worker sets `updated_at` on every UPDATE |
| Ledger immutability triggers | Gated single Worker route, no direct DB access |
| `pg_net` webhook trigger | Worker fires webhook inline on the publish route |
| `gen_random_uuid()` | `crypto.randomUUID()` in the Worker |
| `bigint generated as identity` | `integer primary key autoincrement` |
| `citext` | `text collate nocase` |
| `jsonb` | `text` (use `json_extract` / `json_set` from json1 when querying) |
| Postgres enums | `text check (col in (...))` |
| `timestamptz default now()` | `text default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` |

Stored generated columns aren't supported by SQLite — `line_total_cents`
on `order_items` is VIRTUAL (computed at read time).

## Migration numbering

D1 migrations use `wrangler`'s convention (`NNNN_name.sql`, 1-indexed).
The Postgres-side timestamps don't map; equivalence is by intent, not file
name.

| D1 | Postgres source |
|---|---|
| `0001_initial_schema.sql` | `20260524180000_initial_schema.sql` + `20260525120000_limited_quantity.sql` + `20260525220000_onboarding.sql` + `20260525240000_perf_indexes.sql` (all folded together since they're additive to the base schema) |
| `0002_farm_discovery.sql` | `20260525130000_farm_discovery.sql` + `20260525200000_drop_sites.sql` |
| `0003_import_runs.sql` | `20260525215000_import_runs.sql` |
| `0004_hortus_integration.sql` | `20260525210000_hortus_integration.sql` |

The Postgres `20260525230000_onboarding_rls_fixes.sql` migration has no D1
equivalent — it solved an RLS chicken-and-egg specific to Postgres and is
unnecessary in D1.

## Running

```bash
# Create the database (once, from the dashboard or CLI)
wrangler d1 create communicare-db

# Paste the printed database_id into wrangler.jsonc

# Apply all pending migrations
wrangler d1 migrations apply communicare-db --remote

# Inspect
wrangler d1 execute communicare-db --remote \
  --command "select name from sqlite_master where type='table'"
```

## Seed data

There is no seed migration. Local dev populates D1 from a seed script in
`scripts/d1-seed.ts` (TBD). The one-time migration from Postgres
production data uses `scripts/migrate-pg-to-d1.ts` (also TBD).
