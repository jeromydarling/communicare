-- =============================================================================
-- Hortus integration — port of supabase/migrations/20260525210000_hortus_integration.sql
-- =============================================================================
-- The Postgres version uses pg_net to fire a webhook to Hortus on
-- farms.is_published change. D1 has no pg_net equivalent — the same job
-- moves to a Worker that owns the farm-publish route and fires the webhook
-- inline. The schema below captures only the data shape, not the trigger.
-- =============================================================================

create table if not exists farm_integrations (
  id                    text primary key,
  farm_id               text not null references farms (id) on delete cascade,
  partner               text not null default 'hortus',
  partner_community_id  text not null,
  partner_email         text not null collate nocase,
  linked_at             text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unlinked_at           text,
  metadata              text not null default '{}',
  unique (farm_id, partner)
);
create index farm_integrations_farm_idx
  on farm_integrations (farm_id) where unlinked_at is null;

create table if not exists pending_crop_mappings (
  id                  integer primary key autoincrement,
  farm_id             text not null references farms (id) on delete cascade,
  hortus_crop_name    text not null,
  hortus_variety      text,
  -- Gemini confidence + best guess (0.000 – 1.000)
  gemini_confidence   real,
  suggested_product_id integer references products (id) on delete set null,
  resolved_product_id integer references products (id) on delete set null,
  resolved_at         text,
  raw_payload         text not null default '{}',  -- json
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unique (farm_id, hortus_crop_name)
);
create index pending_crop_mappings_farm_idx
  on pending_crop_mappings (farm_id) where resolved_at is null;
