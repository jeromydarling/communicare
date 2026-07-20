-- =============================================================================
-- Bootstrap admin flag
-- =============================================================================
-- Idempotent — runs on every deploy alongside the d1_migrations
-- bootstrap. Flips is_admin=1 for the owner accounts so /admin is
-- reachable without terminal access. Add more emails here as the
-- team grows; the update is a no-op for rows that already match.
-- =============================================================================

update users set is_admin = 1 where email in (
  'jeromy.darling@gmail.com'
);
