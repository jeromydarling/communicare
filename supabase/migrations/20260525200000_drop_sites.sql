-- =============================================================================
-- Discovered farms: drop sites
-- =============================================================================
-- A farm two hours from the searcher may have a CSA drop site four miles from
-- them. The discovery search should match on the closest pickup point, not
-- just the farm's main address. This column stores an array of pickup
-- locations Perplexity surfaces for each farm.
--
-- Shape (each entry):
--   {
--     "name":      "Donkey Coffee",
--     "address":   "17 W Washington St, Athens OH 45701",
--     "city":      "Athens",
--     "state":     "OH",
--     "zip":       "45701",
--     "lat":       39.327,
--     "lng":      -82.103,
--     "day_time":  "Wednesday 8am–12pm"
--   }
-- =============================================================================

alter table public.discovered_farms
  add column if not exists drop_sites jsonb not null default '[]'::jsonb;

comment on column public.discovered_farms.drop_sites is
  'Array of {name, address, city, state, zip, lat, lng, day_time} for each pickup point the farm uses. The find-nearby-farms edge function matches a ZIP search against the minimum distance over (primary location, any drop site) so a farm with a drop site near you surfaces even if its main address is far.';

-- Generated column for the "nearest pickup distance" we'll eventually want
-- to ORDER BY when serving the side list. For now the edge function
-- computes this at query time and returns it on each row; we add the index
-- prep here so a future migration can swap to server-side sorting without
-- changing the consumer.
create index if not exists discovered_farms_has_drop_sites_idx
  on public.discovered_farms ((jsonb_array_length(drop_sites)))
  where opted_out_at is null;
