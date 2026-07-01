-- =============================================================================
-- Cleanup smoke-test artifacts
-- =============================================================================
-- Runs after every smoke-billing workflow, regardless of pass/fail, so
-- the DB doesn't accumulate junk from the automated runs.
--
-- Order matters — stripe_subscriptions doesn't cascade from users; the
-- other child tables (profiles, farm_members via signup) do.
-- =============================================================================

delete from stripe_events
  where id like 'evt_smoke_%';

delete from stripe_subscriptions
  where id like 'sub_smoke_%'
     or user_id in (select id from users where email like 'smoketest-%@thecros.app');

delete from users
  where email like 'smoketest-%@thecros.app';
