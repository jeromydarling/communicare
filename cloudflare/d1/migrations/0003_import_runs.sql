-- =============================================================================
-- import_runs — port of supabase/migrations/20260525215000_import_runs.sql
-- =============================================================================
-- Audit trail for every CSV-import attempt at /farmer/import.
-- =============================================================================

create table if not exists import_runs (
  id              text primary key,
  farm_id         text not null references farms (id) on delete cascade,
  initiated_by    text not null references users (id) on delete set null,
  source          text not null check (source in (
    'barn2door', 'local-line', 'harvie', 'grazecart',
    'csaware', 'shopify', 'spreadsheet', 'paper', 'other'
  )),
  status          text not null default 'pending' check (status in (
    'pending', 'previewed', 'committed', 'failed', 'cancelled'
  )),

  rows_total      integer not null default 0,
  rows_imported   integer not null default 0,
  rows_skipped    integer not null default 0,
  rows_warned     integer not null default 0,

  mapping         text not null default '{}',  -- json
  results         text not null default '[]',  -- json — per-row outcomes

  filename        text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  committed_at    text
);
create index import_runs_farm_idx on import_runs (farm_id, created_at desc);
create index import_runs_status_idx on import_runs (status) where status != 'committed';
