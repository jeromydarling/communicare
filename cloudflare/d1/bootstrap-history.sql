-- =============================================================================
-- bootstrap-history — populate d1_migrations for an already-applied schema
-- =============================================================================
-- The first six migrations were applied via raw `d1 execute` during MCP-
-- driven provisioning, so wrangler's d1_migrations tracking table never
-- got populated. Without this, `wrangler d1 migrations apply` thinks
-- nothing's applied and re-runs 0001 from scratch — which errors on the
-- already-existing users_email_idx.
--
-- This file is idempotent (INSERT OR IGNORE) and safe to apply on every
-- deploy. It runs from the deploy workflow's "Bootstrap d1_migrations
-- history" step.
-- =============================================================================

CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO d1_migrations (name) VALUES
  ('0001_initial_schema.sql'),
  ('0002_farm_discovery.sql'),
  ('0003_import_runs.sql'),
  ('0004_hortus_integration.sql'),
  ('0005_auth.sql'),
  ('0006_locale.sql');
