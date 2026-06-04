-- =============================================================================
-- Communicare on D1 — Initial schema
-- =============================================================================
-- Direct port of supabase/migrations/20260524180000_initial_schema.sql to
-- Cloudflare D1 (SQLite). Translation choices, applied throughout:
--
--   Postgres                            →  SQLite / D1
--   ----------------------------------  →  --------------------------------
--   uuid primary key                    →  text primary key                 (app generates with crypto.randomUUID)
--   bigint generated always as identity →  integer primary key autoincrement
--   gen_random_uuid()                   →  (app side, see uuid7 / randomUUID in workers)
--   citext (case-insensitive)           →  text collate nocase
--   jsonb                               →  text                             (use json1 functions when reading)
--   timestamptz                         →  text                             (ISO 8601; default current_timestamp where needed)
--   `default now()`                     →  default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
--   `default current_date`              →  default (date('now'))
--   smallint                            →  integer
--   numeric(10,3)                       →  real
--   enums (e.g. farm_kind)              →  text check (col in (...))
--   generated columns (stored)          →  computed in app, written back    (D1 supports virtual generated, but not stored)
--   plpgsql functions                   →  application code in Workers
--   triggers (touch_updated_at)         →  application sets updated_at on every write
--   triggers (prevent_ledger_mutation)  →  enforced in Worker route
--   references auth.users(id)           →  references users(id)             (custom users table; see top of file)
--   row level security                  →  authorization in Workers (NOT in schema)
--
-- What is intentionally NOT here:
--   - RLS policies. Every Postgres policy becomes a check in the Worker
--     route that touches that table. The auth model + farm_members + role
--     checks all live in application code. The schema cares only about
--     shape and integrity.
--   - SECURITY DEFINER RPCs. `create_farm_for_self`, `handle_new_user`,
--     etc., move to Worker routes (atomicity comes from D1 batch
--     statements within a single fetch handler).
--   - Triggers other than what SQLite supports natively. `updated_at` is
--     set in the Worker on every UPDATE. Ledger immutability is enforced
--     by gating writes through one Worker route.
--
-- Run with:    wrangler d1 migrations apply communicare-db --remote
-- Inspect:     wrangler d1 execute communicare-db --remote --command "select name from sqlite_master where type='table'"
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users — our own auth table. The Postgres schema references auth.users
-- (Supabase-owned). In D1 we own the users table. The auth model (custom
-- on Workers vs Clerk) determines what populates it; this schema captures
-- only the columns every downstream FK needs.
-- -----------------------------------------------------------------------------
create table if not exists users (
  id            text primary key,
  email         text not null collate nocase,
  email_verified_at text,
  -- Hashed password is null for OAuth-only / magic-link users.
  password_hash text,
  display_name  text,
  phone         text,
  avatar_url    text,
  -- Catch-all for auth-provider metadata that doesn't deserve a column.
  metadata      text not null default '{}',
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create unique index users_email_idx on users (email);

-- -----------------------------------------------------------------------------
-- profiles — public-readable user info. In Postgres this was synced from
-- auth.users via a trigger. In D1 we either:
--   (a) merge profiles into users entirely (simpler, matches D1's
--       flatter style), or
--   (b) keep profiles as a separate row keyed on users.id (matches the
--       existing app-code expectations).
-- Going with (b) for portability — every page already reads from profiles.
-- The Worker that creates a user inserts both rows in one D1 batch.
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id              text primary key references users (id) on delete cascade,
  email           text not null collate nocase,
  display_name    text,
  phone           text,
  avatar_url      text,
  preferred_sms   integer not null default 1,  -- bool 0/1
  preferred_email integer not null default 1,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index profiles_email_idx on profiles (email);
create index profiles_phone_idx on profiles (phone) where phone is not null;

-- -----------------------------------------------------------------------------
-- farms — top-level tenants
-- -----------------------------------------------------------------------------
create table if not exists farms (
  id              text primary key,
  slug            text not null collate nocase,
  name            text not null,
  location        text not null,
  kind            text not null check (kind in (
    'vegetable_csa', 'raw_milk_herd_share', 'pastured_meat',
    'pastured_eggs', 'mixed_farm', 'market_garden',
    'orchard_fruit', 'flower_farm'
  )),
  tagline         text,
  founder_name    text,
  founder_bio     text,
  story           text,
  is_published    integer not null default 0,
  archived_at     text,
  -- Onboarding wizard completion (was a separate migration in PG)
  onboarded_at    text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  metadata        text not null default '{}',
  herdshare_state text
);
create unique index farms_slug_idx on farms (slug);
create index farms_kind_idx on farms (kind) where archived_at is null;
create index farms_published_idx on farms (is_published) where archived_at is null;
create index farms_unonboarded_idx
  on farms (created_at desc) where onboarded_at is null and archived_at is null;

-- -----------------------------------------------------------------------------
-- farm_members — user × farm × role (the multi-tenant boundary)
-- -----------------------------------------------------------------------------
create table if not exists farm_members (
  id              integer primary key autoincrement,
  farm_id         text not null references farms (id) on delete cascade,
  user_id         text not null references users (id) on delete cascade,
  role            text not null check (role in ('owner', 'staff', 'member')),
  invited_at      text,
  joined_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  archived_at     text,
  unique (farm_id, user_id)
);
create index farm_members_user_idx on farm_members (user_id) where archived_at is null;
create index farm_members_farm_idx on farm_members (farm_id) where archived_at is null;

-- -----------------------------------------------------------------------------
-- farm_homepages — generated and editable one-page site per farm
-- -----------------------------------------------------------------------------
create table if not exists farm_homepages (
  id                text primary key,
  farm_id           text not null references farms (id) on delete cascade,
  content           text not null,                 -- json
  version           integer not null,
  is_published      integer not null default 0,
  published_at      text,
  generated_by      text not null default 'claude-opus-4-7',
  generation_input  text,
  created_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_by        text references users (id) on delete set null,
  unique (farm_id, version)
);
create index farm_homepages_farm_idx on farm_homepages (farm_id, version desc);
create unique index farm_homepages_published_idx
  on farm_homepages (farm_id) where is_published = 1;

-- -----------------------------------------------------------------------------
-- pickup_sites
-- -----------------------------------------------------------------------------
create table if not exists pickup_sites (
  id              integer primary key autoincrement,
  farm_id         text not null references farms (id) on delete cascade,
  name            text not null,
  address         text,
  day_of_week     integer check (day_of_week between 0 and 6),
  window_start    text,                                 -- "HH:MM"
  window_end      text,
  cutoff_hours    integer not null default 24,
  fee_cents       integer not null default 0,
  is_active       integer not null default 1,
  display_order   integer not null default 0,
  metadata        text not null default '{}',
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index pickup_sites_farm_idx on pickup_sites (farm_id) where is_active = 1;

-- -----------------------------------------------------------------------------
-- share_definitions
-- -----------------------------------------------------------------------------
create table if not exists share_definitions (
  id                  text primary key,
  farm_id             text not null references farms (id) on delete cascade,
  name                text not null,
  description         text,
  cadence             text not null check (cadence in (
    'weekly', 'biweekly', 'monthly', 'season_long', 'on_demand'
  )),
  billing_model       text not null check (billing_model in (
    'pay_per_pickup', 'monthly_installment',
    'season_upfront', 'monthly_boarding_fee'
  )),
  price_per_pickup_cents integer,
  monthly_price_cents    integer,
  season_price_cents     integer,
  share_purchase_cents   integer,
  allotment_per_period   text,
  season_starts_on    text,                                 -- ISO date
  season_ends_on      text,
  max_subscribers     integer,
  current_subscribers integer not null default 0,
  is_active           integer not null default 1,
  metadata            text not null default '{}',
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index share_definitions_farm_idx
  on share_definitions (farm_id) where is_active = 1;

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table if not exists products (
  id              integer primary key autoincrement,
  farm_id         text not null references farms (id) on delete cascade,
  sku             text,
  name            text not null,
  description     text,
  kind            text not null default 'fixed' check (kind in (
    'fixed', 'catch_weight', 'preorder'
  )),
  price_cents     integer not null,
  unit_label      text not null default 'each',
  inventory_cap   integer,
  inventory_now   integer,
  is_sold_out     integer not null default 0,
  is_active       integer not null default 1,
  -- Limited-drop columns (was a separate Postgres migration)
  is_limited      integer not null default 0,
  available_through text,
  photo_url       text,
  metadata        text not null default '{}',
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index products_farm_idx on products (farm_id) where is_active = 1;
create index products_sold_out_idx on products (farm_id, is_sold_out) where is_active = 1;
create index products_live_drops_idx
  on products (farm_id, available_through)
  where is_limited = 1 and is_active = 1;

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------
create table if not exists subscriptions (
  id                  text primary key,
  farm_id             text not null references farms (id) on delete cascade,
  user_id             text not null references users (id) on delete cascade,
  share_definition_id text not null references share_definitions (id),
  default_pickup_site_id integer references pickup_sites (id),
  status              text not null default 'active' check (status in (
    'active', 'paused', 'cancelled', 'expired'
  )),
  started_on          text not null default (date('now')),
  cancelled_on        text,
  paused_until        text,
  metadata            text not null default '{}',
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index subscriptions_farm_idx on subscriptions (farm_id, status);
create index subscriptions_user_idx on subscriptions (user_id, status);

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table if not exists orders (
  id                  text primary key,
  farm_id             text not null references farms (id) on delete cascade,
  user_id             text not null references users (id) on delete cascade,
  subscription_id     text references subscriptions (id) on delete set null,
  pickup_site_id      integer references pickup_sites (id),
  pickup_date         text not null,
  status              text not null default 'draft' check (status in (
    'draft', 'confirmed', 'packed', 'picked_up', 'no_show', 'cancelled'
  )),
  total_cents         integer not null default 0,
  tip_cents           integer not null default 0,
  delivery_fee_cents  integer not null default 0,
  notes               text,
  confirmed_at        text,
  picked_up_at        text,
  metadata            text not null default '{}',
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index orders_farm_pickup_idx on orders (farm_id, pickup_date);
create index orders_user_idx on orders (user_id, pickup_date desc);
create index orders_status_idx on orders (farm_id, status, pickup_date);

-- -----------------------------------------------------------------------------
-- order_items — note: line_total_cents was a STORED generated column in
-- Postgres. SQLite supports generated columns as VIRTUAL only (computed at
-- read time, not stored). Keeping it VIRTUAL is fine — the math is cheap
-- and reading it stays free.
-- -----------------------------------------------------------------------------
create table if not exists order_items (
  id                integer primary key autoincrement,
  order_id          text not null references orders (id) on delete cascade,
  product_id        integer not null references products (id),
  qty               real not null default 1,
  unit_price_cents  integer not null,
  actual_weight     real,
  deposit_cents     integer,
  line_total_cents  integer generated always as (
    case
      when actual_weight is not null then cast(actual_weight * unit_price_cents as integer)
      else cast(qty * unit_price_cents as integer)
    end
  ) virtual,
  created_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);

-- -----------------------------------------------------------------------------
-- credit_ledger — append-only money log. The Postgres triggers that
-- prevented UPDATE/DELETE move to the Worker route. SQLite has no way to
-- enforce immutability declaratively, but we gate every write behind a
-- single ledger-write function in code.
-- -----------------------------------------------------------------------------
create table if not exists credit_ledger (
  id                  integer primary key autoincrement,
  farm_id             text not null references farms (id) on delete cascade,
  user_id             text not null references users (id) on delete cascade,
  delta_cents         integer not null,
  balance_after_cents integer not null,
  reason              text not null check (reason in (
    'top_up', 'top_up_bonus', 'order_charge',
    'refund_skip_week', 'refund_damaged_item',
    'refund_no_show_donation', 'refund_gift_received',
    'admin_adjustment', 'season_rollover',
    'import_opening_balance'
  )),
  reference_order_id  text references orders (id) on delete set null,
  note                text,
  recorded_by         text references users (id) on delete set null,
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index credit_ledger_user_farm_idx
  on credit_ledger (user_id, farm_id, created_at desc);
create index credit_ledger_farm_idx
  on credit_ledger (farm_id, created_at desc);

-- -----------------------------------------------------------------------------
-- payment_config
-- -----------------------------------------------------------------------------
create table if not exists payment_config (
  id              text primary key,
  farm_id         text not null unique references farms (id) on delete cascade,
  mode            text not null default 'cash_at_pickup' check (mode in (
    'byo_stripe', 'byo_square', 'byo_paypal',
    'venmo', 'zelle', 'ach',
    'cash_at_pickup', 'managed_payments'
  )),
  stripe_account_id    text,
  stripe_secret_ref    text,
  square_oauth_ref     text,
  paypal_email         text collate nocase,
  venmo_handle         text,
  zelle_handle         text,
  ach_routing_last4    text,
  ach_account_last4    text,
  platform_fee_bps     integer not null default 100,
  applies_to_managed_mode_only integer not null default 1,
  updated_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- -----------------------------------------------------------------------------
-- herd_share_contracts
-- -----------------------------------------------------------------------------
create table if not exists herd_share_contracts (
  id                  text primary key,
  farm_id             text not null references farms (id) on delete cascade,
  user_id             text not null references users (id) on delete cascade,
  share_fraction      text not null,
  state_template      text not null,
  signed_pdf_url      text,
  signed_at           text,
  buy_in_cents        integer not null,
  monthly_boarding_cents integer not null,
  allotment_per_week  text,
  is_active           integer not null default 1,
  archived_at         text,
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unique (farm_id, user_id)
);
create index herd_share_contracts_farm_idx
  on herd_share_contracts (farm_id) where is_active = 1;

-- -----------------------------------------------------------------------------
-- milk_test_results
-- -----------------------------------------------------------------------------
create table if not exists milk_test_results (
  id              integer primary key autoincrement,
  farm_id         text not null references farms (id) on delete cascade,
  test_date       text not null,
  pdf_url         text not null,
  lab_name        text,
  standard_plate_count integer,
  coliform_count       integer,
  notes           text,
  published_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index milk_test_results_farm_idx on milk_test_results (farm_id, test_date desc);

-- -----------------------------------------------------------------------------
-- sms_messages
-- -----------------------------------------------------------------------------
create table if not exists sms_messages (
  id              integer primary key autoincrement,
  farm_id         text not null references farms (id) on delete cascade,
  user_id         text references users (id) on delete set null,
  phone           text not null,
  direction       text not null check (direction in ('inbound', 'outbound')),
  body            text not null,
  intent          text check (intent in (
    'swap', 'skip', 'donate', 'gift', 'help',
    'stop', 'start', 'unknown', 'free_form'
  )),
  intent_payload  text,
  reference_order_id text references orders (id) on delete set null,
  twilio_sid      text,
  sent_at         text,
  delivered_at    text,
  failed_at       text,
  failure_reason  text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index sms_messages_user_idx on sms_messages (user_id, created_at desc);
create index sms_messages_farm_idx on sms_messages (farm_id, created_at desc);
create index sms_messages_phone_idx on sms_messages (phone, created_at desc);

-- -----------------------------------------------------------------------------
-- waitlist
-- -----------------------------------------------------------------------------
create table if not exists waitlist (
  id              integer primary key autoincrement,
  email           text not null collate nocase,
  name            text,
  farm_name       text,
  location        text,
  farm_kind       text check (farm_kind in (
    'vegetable_csa', 'raw_milk_herd_share', 'pastured_meat',
    'pastured_eggs', 'mixed_farm', 'market_garden',
    'orchard_fruit', 'flower_farm'
  )),
  current_tool    text,
  note            text,
  source          text,
  is_invited      integer not null default 0,
  invited_at      text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create unique index waitlist_email_idx on waitlist (email);
