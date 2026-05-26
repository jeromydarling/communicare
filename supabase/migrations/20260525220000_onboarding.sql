-- =============================================================================
-- onboarding — track when a farm operator finished the first-run wizard
-- =============================================================================
-- The /farmer/onboarding wizard walks a new operator through: create the
-- farm row, define one share, add one pickup site, import their members.
-- This timestamp marks "done" so the dashboard stops auto-redirecting back
-- into the wizard. It's also a useful retention signal — we can tell how
-- many farms that signed up actually finished the five-minute setup.
-- =============================================================================

alter table public.farms
  add column if not exists onboarded_at timestamptz;

comment on column public.farms.onboarded_at is
  'Set when the operator completes (or explicitly skips) the /farmer/onboarding wizard. Null = never finished, the dashboard will redirect them back into setup.';

-- Soft index — most queries are "is this farm onboarded?" by farm_id (already
-- the primary key), but a partial index on the null case helps the rare
-- analytics query "how many farms started but never finished?"
create index if not exists farms_unonboarded_idx
  on public.farms (created_at desc)
  where onboarded_at is null and archived_at is null;
