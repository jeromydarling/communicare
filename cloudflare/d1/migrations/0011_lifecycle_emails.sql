-- =============================================================================
-- 0011 — lifecycle-email idempotency stamps
-- =============================================================================
-- Anniversary and end-of-season each need a per-user per-year stamp so
-- we don't re-send. A single `lifecycle_last_sent_key` column stores
-- the deduplication key of the last-sent lifecycle event
-- (e.g. "anniversary:1", "endofseason:2027"). Compare against the
-- prospective key each cron pass; skip when equal.
-- =============================================================================

alter table users
  add column lifecycle_last_sent_key text;
