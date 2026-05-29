-- =============================================================================
-- Performance indexes — supports the import-members fallback lookup
-- =============================================================================
-- import-members falls back to a phone-based profile lookup when the email
-- column is empty or unmatched (see supabase/functions/import-members
-- step 4a). Without an index, every fallback row does a sequential scan of
-- the entire profiles table. On a 5k-profile farm running a 2k-row import
-- with a 20% phone-fallback rate, that's 400 seq-scans per import — easily
-- the dominant cost of the whole flow.
--
-- A partial index on (phone) where phone is not null keeps the index lean
-- — most rows don't have a phone — while still serving the lookup.
-- =============================================================================

create index if not exists profiles_phone_idx
  on public.profiles (phone)
  where phone is not null;
