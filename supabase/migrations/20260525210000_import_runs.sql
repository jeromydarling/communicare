-- =============================================================================
-- import_runs — audit trail for the farmer onboarding CSV import
-- =============================================================================
-- Every time a farm operator runs /farmer/import, we record the source they
-- claimed (barn2door, local-line, etc), the raw row count, what we
-- successfully inserted, what was skipped, and the per-row warnings. This
-- lets us answer "why is Linda missing from my roster?" three weeks later,
-- and gives us the dataset to improve the column-detection heuristics on
-- real CSVs over time.
-- =============================================================================

create type public.import_source as enum (
  'barn2door',
  'local-line',
  'harvie',
  'grazecart',
  'csaware',
  'shopify',
  'spreadsheet',
  'paper',
  'other'
);

create type public.import_status as enum (
  'pending',
  'previewed',
  'committed',
  'failed',
  'cancelled'
);

create table public.import_runs (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references public.farms (id) on delete cascade,
  initiated_by    uuid not null references auth.users (id) on delete set null,
  source          public.import_source not null,
  status          public.import_status not null default 'pending',

  -- Counts
  rows_total      int not null default 0,
  rows_imported   int not null default 0,
  rows_skipped    int not null default 0,
  rows_warned     int not null default 0,

  -- Mapping the operator chose. Stored as jsonb so the column scheme can
  -- evolve without a migration. Shape:
  --   {
  --     "column_map":   { "Email": "email", "Share Type": "share_definition_id", ... },
  --     "share_map":    { "Standard share": "<share_definition_uuid>", ... },
  --     "pickup_map":   { "Wednesday — Bailey library": "<pickup_site_id>", ... }
  --   }
  mapping         jsonb not null default '{}'::jsonb,

  -- Per-row results — used to show "12 imported, 3 skipped, 1 needs review"
  -- on the import-done screen and to surface "row X had warning Y" later.
  results         jsonb not null default '[]'::jsonb,

  -- Bookkeeping
  filename        text,
  created_at      timestamptz not null default now(),
  committed_at    timestamptz
);

create index import_runs_farm_idx on public.import_runs (farm_id, created_at desc);
create index import_runs_status_idx on public.import_runs (status) where status != 'committed';

comment on table public.import_runs is
  'Audit trail for every CSV-import attempt at /farmer/import. Stores source, mapping the operator chose, and per-row outcomes so we can debug "why is Linda missing" weeks later. Powers the import-members edge function''s idempotency check.';

-- -----------------------------------------------------------------------------
-- RLS — only the farm''s own staff can read or insert their import runs
-- -----------------------------------------------------------------------------
alter table public.import_runs enable row level security;

create policy "Farm staff read their import runs" on public.import_runs
  for select to authenticated
  using (public.is_farm_staff(farm_id));

create policy "Farm staff create import runs" on public.import_runs
  for insert to authenticated
  with check (
    public.is_farm_staff(farm_id)
    and initiated_by = (select auth.uid())
  );

create policy "Farm staff update their import runs" on public.import_runs
  for update to authenticated
  using (public.is_farm_staff(farm_id))
  with check (public.is_farm_staff(farm_id));
