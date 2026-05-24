-- =============================================================================
-- Communicare — Initial schema
-- =============================================================================
-- Multi-tenant Postgres schema for a farm-share / CSA / herd-share /
-- pastured-meat platform. Every public table is RLS-enabled. Policies follow
-- the Supabase agent-skill guidance:
--
--   * `TO authenticated` + ownership predicate (not just role check)
--   * UPDATE policies always include both `USING` and `WITH CHECK`
--   * `auth.role()` is never used (deprecated)
--   * `app_metadata` only for authorization, never `user_metadata`
--   * Append-only ledgers protected by trigger
--
-- Multi-tenancy is by `farm_id`. A `farm_members` row binds a user to a farm
-- with a role (owner / staff / member). The helper `is_farm_member(...)` and
-- `is_farm_staff(...)` SECURITY INVOKER functions are used in policies.
--
-- IDs:
--   * top-level / public entities → `uuid` (avoid enumeration)
--   * child rows scoped under a parent → `bigint generated always as identity`
--   * money is always `bigint` (cents)
--   * timestamps are always `timestamptz`, default `now()`
--
-- Reviewed against:
--   .claude/skills/supabase/SKILL.md
--   .claude/skills/supabase-postgres-best-practices/references/security-rls-basics.md
--   .claude/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md
--   .claude/skills/supabase-postgres-best-practices/references/schema-primary-keys.md
--   .claude/skills/supabase-postgres-best-practices/references/security-privileges.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;   -- gen_random_uuid
create extension if not exists "citext" with schema extensions;     -- case-insensitive text

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.farm_kind as enum (
  'vegetable_csa',
  'raw_milk_herd_share',
  'pastured_meat',
  'pastured_eggs',
  'mixed_farm',
  'market_garden',
  'orchard_fruit',
  'flower_farm'
);

create type public.farm_role as enum ('owner', 'staff', 'member');

create type public.payment_mode as enum (
  'byo_stripe',     -- farm uses its own Stripe account
  'byo_square',     -- farm uses Square
  'byo_paypal',     -- farm's own PayPal
  'byo_venmo',      -- farm's Venmo handle
  'byo_zelle',      -- Zelle email/phone
  'byo_ach',        -- bank ACH details
  'cash_at_pickup',
  'check_by_mail',
  'managed_stripe'  -- our Stripe Connect; we take 1% platform fee
);

create type public.product_kind as enum (
  'fixed',          -- e.g. dozen eggs, $8
  'catch_weight',   -- e.g. quarter beef, $5.95/lb hanging weight
  'share'           -- a subscription share (CSA box, herd-share allotment)
);

create type public.share_cadence as enum (
  'weekly',
  'biweekly',
  'monthly',
  'season_long',   -- one share for the whole season
  'on_demand'      -- e.g. meat shares ordered when an animal finishes
);

create type public.billing_model as enum (
  'pay_per_pickup',     -- credit account, debited each pickup
  'monthly_installment',
  'season_upfront',
  'monthly_boarding_fee'  -- herd-share specific
);

create type public.subscription_status as enum (
  'active',
  'paused',
  'cancelled'
);

create type public.order_status as enum (
  'draft',          -- generated for upcoming pickup, not yet finalized
  'confirmed',      -- member confirmed (or default-confirmed at cutoff)
  'packed',         -- farm staff has packed it
  'picked_up',
  'no_show',
  'donated',        -- forwarded to a food pantry per member request
  'cancelled'
);

create type public.credit_reason as enum (
  'top_up',                  -- member added money to credit balance
  'top_up_bonus',            -- bonus on a top-up
  'order_charge',            -- debited for an order
  'refund_skip_week',        -- credited for a skipped week
  'refund_damaged_item',     -- credited for a damaged or missing item
  'refund_no_show_donation', -- credited when donated box was their pickup
  'refund_gift_received',    -- credited when a gifted share lands in their account
  'admin_adjustment',        -- manual adjustment by farm staff
  'season_rollover'          -- end-of-season balance carried forward
);

create type public.sms_direction as enum ('inbound', 'outbound');

create type public.sms_intent as enum (
  'swap',
  'skip',
  'pause',
  'resume',
  'donate',
  'gift',
  'confirm',
  'opt_out',
  'unknown'
);

-- -----------------------------------------------------------------------------
-- profiles — public-readable user info, mirrors auth.users via trigger
-- -----------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           citext not null,
  display_name    text,
  phone           text,
  avatar_url      text,
  preferred_sms   boolean not null default true,
  preferred_email boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

-- keep profiles.email in sync with auth.users.email on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- farms — top-level tenants
-- -----------------------------------------------------------------------------
create table public.farms (
  id              uuid primary key default gen_random_uuid(),
  slug            citext not null unique,                  -- elmwood, three-forks
  name            text not null,
  location        text not null,                           -- "Athens County, Ohio"
  kind            farm_kind not null,
  tagline         text,
  founder_name    text,
  founder_bio     text,
  story           text,
  is_published    boolean not null default false,          -- whether public homepage is live
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- forward-compat catch-all (state filing numbers, custom flags, etc.)
  metadata        jsonb not null default '{}'::jsonb,
  -- A herd-share dairy may store state regulatory info here
  -- e.g. {"state": "CO", "herd_id": "12345", "milk_test_lab": "CSU"}
  herdshare_state text                                     -- two-letter state code, nullable
);

create index farms_kind_idx on public.farms (kind) where archived_at is null;
create index farms_published_idx on public.farms (is_published) where archived_at is null;

-- -----------------------------------------------------------------------------
-- farm_members — user × farm × role (the multi-tenant boundary)
-- -----------------------------------------------------------------------------
create table public.farm_members (
  id              bigint generated always as identity primary key,
  farm_id         uuid not null references public.farms (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            farm_role not null,
  invited_at      timestamptz,
  joined_at       timestamptz not null default now(),
  archived_at     timestamptz,
  unique (farm_id, user_id)
);

create index farm_members_user_idx on public.farm_members (user_id) where archived_at is null;
create index farm_members_farm_idx on public.farm_members (farm_id) where archived_at is null;

-- Helper: is the calling user a member of this farm (any role)?
create function public.is_farm_member(target_farm_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = target_farm_id
      and user_id = (select auth.uid())
      and archived_at is null
  );
$$;

-- Helper: is the calling user staff/owner of this farm (write access)?
create function public.is_farm_staff(target_farm_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = target_farm_id
      and user_id = (select auth.uid())
      and role in ('owner', 'staff')
      and archived_at is null
  );
$$;

-- -----------------------------------------------------------------------------
-- farm_homepages — AI-generated and editable one-page site per farm
-- (the output of the homepage generator)
-- -----------------------------------------------------------------------------
create table public.farm_homepages (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid not null references public.farms (id) on delete cascade,
  -- The structured generated content (mirrors GeneratedHomepage in
  -- lib/homepage-schema.ts: heroHeadline, tagline, about, callouts[],
  -- shareName, shareDescription, pickupSummary, faq[], closingBlessing)
  content           jsonb not null,
  version           int not null,                          -- monotonic per farm
  is_published      boolean not null default false,
  published_at      timestamptz,
  generated_by      text not null default 'claude-opus-4-7',
  generation_input  jsonb,                                 -- the form inputs used
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null,
  unique (farm_id, version)
);

create index farm_homepages_farm_idx on public.farm_homepages (farm_id, version desc);
create unique index farm_homepages_published_idx
  on public.farm_homepages (farm_id) where is_published = true;

-- -----------------------------------------------------------------------------
-- pickup_sites — where members can collect their share
-- -----------------------------------------------------------------------------
create table public.pickup_sites (
  id              bigint generated always as identity primary key,
  farm_id         uuid not null references public.farms (id) on delete cascade,
  name            text not null,
  address         text,
  day_of_week     smallint check (day_of_week between 0 and 6),  -- 0=Sunday
  window_start    time,
  window_end      time,
  cutoff_hours    int not null default 24,                 -- order cutoff before pickup
  fee_cents       bigint not null default 0,
  is_active       boolean not null default true,
  display_order   int not null default 0,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index pickup_sites_farm_idx on public.pickup_sites (farm_id) where is_active;

-- -----------------------------------------------------------------------------
-- share_definitions — what a farm offers as a subscription
-- -----------------------------------------------------------------------------
create table public.share_definitions (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references public.farms (id) on delete cascade,
  name                text not null,                        -- "Standard share", "1/30th cow share"
  description         text,
  cadence             share_cadence not null,
  billing_model       billing_model not null,
  -- Pricing — only the relevant field is populated per billing_model
  price_per_pickup_cents bigint,                            -- pay_per_pickup
  monthly_price_cents    bigint,                            -- monthly_installment or monthly_boarding_fee
  season_price_cents     bigint,                            -- season_upfront
  -- Herd-share specific
  share_purchase_cents   bigint,                            -- one-time buy-in
  allotment_per_period   text,                              -- "2 gallons/week"
  -- Season bounds (nullable for year-round)
  season_starts_on    date,
  season_ends_on      date,
  -- Capacity
  max_subscribers     int,
  current_subscribers int not null default 0,
  is_active           boolean not null default true,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index share_definitions_farm_idx
  on public.share_definitions (farm_id) where is_active;

-- -----------------------------------------------------------------------------
-- products — individual SKUs the farm sells
-- -----------------------------------------------------------------------------
create table public.products (
  id              bigint generated always as identity primary key,
  farm_id         uuid not null references public.farms (id) on delete cascade,
  sku             text,
  name            text not null,
  description     text,
  kind            product_kind not null default 'fixed',
  -- Pricing — for catch_weight, price_cents is per pound
  price_cents     bigint not null,
  unit_label      text not null default 'each',           -- "dozen", "lb", "bunch"
  -- Inventory with hard cap (null = no cap, unlimited)
  inventory_cap   int,
  inventory_now   int,
  is_sold_out     boolean not null default false,
  is_active       boolean not null default true,
  photo_url       text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index products_farm_idx on public.products (farm_id) where is_active;
create index products_sold_out_idx on public.products (farm_id, is_sold_out) where is_active;

-- -----------------------------------------------------------------------------
-- subscriptions — user × share_definition (the "I'm a CSA member" record)
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references public.farms (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  share_definition_id uuid not null references public.share_definitions (id),
  default_pickup_site_id bigint references public.pickup_sites (id),
  status              subscription_status not null default 'active',
  started_on          date not null default current_date,
  cancelled_on        date,
  -- For pay_per_pickup: link to credit balance is via credit_ledger
  -- For monthly: track which months have been billed via metadata
  paused_until        date,                                -- if status=paused
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index subscriptions_farm_idx on public.subscriptions (farm_id, status);
create index subscriptions_user_idx on public.subscriptions (user_id, status);

-- -----------------------------------------------------------------------------
-- orders — one per pickup-week per member
-- -----------------------------------------------------------------------------
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references public.farms (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  subscription_id     uuid references public.subscriptions (id) on delete set null,
  pickup_site_id      bigint references public.pickup_sites (id),
  pickup_date         date not null,
  status              order_status not null default 'draft',
  total_cents         bigint not null default 0,           -- precomputed by trigger
  tip_cents           bigint not null default 0,
  delivery_fee_cents  bigint not null default 0,
  notes               text,                                 -- member's note to farmer
  confirmed_at        timestamptz,
  picked_up_at        timestamptz,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index orders_farm_pickup_idx on public.orders (farm_id, pickup_date);
create index orders_user_idx on public.orders (user_id, pickup_date desc);
create index orders_status_idx on public.orders (farm_id, status, pickup_date);

-- -----------------------------------------------------------------------------
-- order_items — line items per order
-- -----------------------------------------------------------------------------
create table public.order_items (
  id                bigint generated always as identity primary key,
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        bigint not null references public.products (id),
  qty               numeric(10, 3) not null default 1,     -- supports lb, kg, etc.
  unit_price_cents  bigint not null,                       -- snapshot at order time
  -- For catch_weight items: actual_weight is filled in after butchering;
  -- balance_charged_cents = (actual_weight × unit_price_cents) - deposit_cents
  actual_weight     numeric(10, 3),
  deposit_cents     bigint,
  line_total_cents  bigint generated always as (
    case
      when actual_weight is not null then (actual_weight * unit_price_cents)::bigint
      else (qty * unit_price_cents)::bigint
    end
  ) stored,
  created_at        timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- -----------------------------------------------------------------------------
-- credit_ledger — append-only money log per user × farm
-- -----------------------------------------------------------------------------
create table public.credit_ledger (
  id                bigint generated always as identity primary key,
  farm_id           uuid not null references public.farms (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  -- delta_cents: positive = credit added, negative = debit
  delta_cents       bigint not null,
  balance_after_cents bigint not null,                     -- running balance, computed by trigger
  reason            credit_reason not null,
  reference_order_id uuid references public.orders (id) on delete set null,
  note              text,
  recorded_by       uuid references auth.users (id) on delete set null,  -- null for system-generated
  created_at        timestamptz not null default now()
);

create index credit_ledger_user_farm_idx on public.credit_ledger (user_id, farm_id, created_at desc);
create index credit_ledger_farm_idx on public.credit_ledger (farm_id, created_at desc);

-- Append-only enforcement: forbid UPDATE and DELETE on credit_ledger
create function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credit_ledger is append-only (% not allowed)', tg_op;
end;
$$;

create trigger credit_ledger_no_update
  before update on public.credit_ledger
  for each row execute function public.prevent_ledger_mutation();
create trigger credit_ledger_no_delete
  before delete on public.credit_ledger
  for each row execute function public.prevent_ledger_mutation();

-- -----------------------------------------------------------------------------
-- payment_config — per-farm BYO processor settings (encrypted via Supabase Vault
-- in production; columns here are placeholders)
-- -----------------------------------------------------------------------------
create table public.payment_config (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null unique references public.farms (id) on delete cascade,
  mode            payment_mode not null default 'cash_at_pickup',
  -- Encrypted secret references (use Supabase Vault for actual secrets;
  -- store secret_id reference here, not the secret itself)
  stripe_account_id     text,                              -- pk_/acct_
  stripe_secret_ref     text,                              -- vault secret name
  square_oauth_ref      text,
  paypal_email          citext,
  venmo_handle          text,
  zelle_handle          text,
  ach_routing_last4     text,
  ach_account_last4     text,
  -- Managed Payments: our 1% platform fee
  platform_fee_bps      int not null default 100,          -- 100 bps = 1%
  applies_to_managed_mode_only boolean not null default true,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- herd_share_contracts — for raw-milk dairies
-- -----------------------------------------------------------------------------
create table public.herd_share_contracts (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references public.farms (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  share_fraction      text not null,                       -- "1/30"
  state_template      text not null,                       -- "CO_2026_v1"
  signed_pdf_url      text,                                -- in private storage bucket
  signed_at           timestamptz,
  buy_in_cents        bigint not null,                     -- one-time share purchase
  monthly_boarding_cents bigint not null,
  allotment_per_week  text,                                -- "2 gallons"
  is_active           boolean not null default true,
  -- 3-year retention required in CO/ID/CT — never hard-delete
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  unique (farm_id, user_id)
);

create index herd_share_contracts_farm_idx
  on public.herd_share_contracts (farm_id) where is_active;

-- -----------------------------------------------------------------------------
-- milk_test_results — required by CO law (monthly); broadcast to shareholders
-- -----------------------------------------------------------------------------
create table public.milk_test_results (
  id              bigint generated always as identity primary key,
  farm_id         uuid not null references public.farms (id) on delete cascade,
  test_date       date not null,
  pdf_url         text not null,
  lab_name        text,
  standard_plate_count int,                               -- CFU/mL
  coliform_count       int,
  notes           text,
  published_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index milk_test_results_farm_idx on public.milk_test_results (farm_id, test_date desc);

-- -----------------------------------------------------------------------------
-- sms_messages — Twilio inbox/outbox per user × farm
-- -----------------------------------------------------------------------------
create table public.sms_messages (
  id              bigint generated always as identity primary key,
  farm_id         uuid not null references public.farms (id) on delete cascade,
  user_id         uuid references auth.users (id) on delete set null,
  phone           text not null,
  direction       sms_direction not null,
  body            text not null,
  intent          sms_intent,                              -- parsed for inbound
  intent_payload  jsonb,                                   -- {"swap_from": "kale", "swap_to": "spinach"}
  reference_order_id uuid references public.orders (id) on delete set null,
  twilio_sid      text,                                    -- Twilio message SID
  sent_at         timestamptz,
  delivered_at    timestamptz,
  failed_at       timestamptz,
  failure_reason  text,
  created_at      timestamptz not null default now()
);

create index sms_messages_user_idx on public.sms_messages (user_id, created_at desc);
create index sms_messages_farm_idx on public.sms_messages (farm_id, created_at desc);
create index sms_messages_phone_idx on public.sms_messages (phone, created_at desc);

-- -----------------------------------------------------------------------------
-- waitlist — for the /join form (no auth required; rate-limited at app layer)
-- -----------------------------------------------------------------------------
create table public.waitlist (
  id              bigint generated always as identity primary key,
  email           citext not null,
  name            text,
  farm_name       text,
  location        text,
  farm_kind       farm_kind,
  current_tool    text,                                    -- "Barn2Door", "spreadsheets", etc.
  note            text,
  source          text,                                    -- "landing", "manifesto", etc.
  is_invited      boolean not null default false,
  invited_at      timestamptz,
  created_at      timestamptz not null default now()
);

create unique index waitlist_email_idx on public.waitlist (email);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger farms_touch before update on public.farms
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger payment_config_touch before update on public.payment_config
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Enable RLS on every public table — non-negotiable per the supabase skill.
-- Each table then gets explicit policies; default-deny if no policy matches.

alter table public.profiles               enable row level security;
alter table public.farms                  enable row level security;
alter table public.farm_members           enable row level security;
alter table public.farm_homepages         enable row level security;
alter table public.pickup_sites           enable row level security;
alter table public.share_definitions      enable row level security;
alter table public.products               enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.credit_ledger          enable row level security;
alter table public.payment_config         enable row level security;
alter table public.herd_share_contracts   enable row level security;
alter table public.milk_test_results      enable row level security;
alter table public.sms_messages           enable row level security;
alter table public.waitlist               enable row level security;

-- ─── profiles ──────────────────────────────────────────────────────────────
-- Users may read and update their own profile; nothing else.
create policy "profiles: self read" on public.profiles for select
  to authenticated using ( (select auth.uid()) = id );
create policy "profiles: self update" on public.profiles for update
  to authenticated using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );
-- Public can read minimal profile info (display_name only) of users they
-- transact with via a view (see below).

-- ─── farms ─────────────────────────────────────────────────────────────────
-- Anyone can SELECT published farms; only owners/staff can UPDATE; only the
-- creator (via service role or signup flow) can INSERT initially.
create policy "farms: public read published" on public.farms for select
  to anon, authenticated
  using ( is_published and archived_at is null );
create policy "farms: members read own" on public.farms for select
  to authenticated
  using ( public.is_farm_member(id) );
create policy "farms: staff update" on public.farms for update
  to authenticated
  using ( public.is_farm_staff(id) )
  with check ( public.is_farm_staff(id) );
-- INSERT is handled by a service-role function during farm signup
-- (not exposed to anon/authenticated).

-- ─── farm_members ──────────────────────────────────────────────────────────
create policy "farm_members: self read" on public.farm_members for select
  to authenticated using ( user_id = (select auth.uid()) );
create policy "farm_members: staff read all in farm" on public.farm_members for select
  to authenticated using ( public.is_farm_staff(farm_id) );
create policy "farm_members: staff invite" on public.farm_members for insert
  to authenticated with check ( public.is_farm_staff(farm_id) );
create policy "farm_members: staff update" on public.farm_members for update
  to authenticated using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── farm_homepages ────────────────────────────────────────────────────────
create policy "farm_homepages: public read published" on public.farm_homepages for select
  to anon, authenticated
  using ( is_published );
create policy "farm_homepages: staff full read" on public.farm_homepages for select
  to authenticated
  using ( public.is_farm_staff(farm_id) );
create policy "farm_homepages: staff insert" on public.farm_homepages for insert
  to authenticated with check ( public.is_farm_staff(farm_id) );
create policy "farm_homepages: staff update" on public.farm_homepages for update
  to authenticated using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── pickup_sites ──────────────────────────────────────────────────────────
create policy "pickup_sites: public read active" on public.pickup_sites for select
  to anon, authenticated using ( is_active );
create policy "pickup_sites: staff manage" on public.pickup_sites for all
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── share_definitions ─────────────────────────────────────────────────────
create policy "share_definitions: public read active" on public.share_definitions for select
  to anon, authenticated using ( is_active );
create policy "share_definitions: staff manage" on public.share_definitions for all
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── products ──────────────────────────────────────────────────────────────
create policy "products: public read active" on public.products for select
  to anon, authenticated using ( is_active );
create policy "products: staff manage" on public.products for all
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── subscriptions ─────────────────────────────────────────────────────────
create policy "subscriptions: self read" on public.subscriptions for select
  to authenticated using ( user_id = (select auth.uid()) );
create policy "subscriptions: staff read" on public.subscriptions for select
  to authenticated using ( public.is_farm_staff(farm_id) );
create policy "subscriptions: self insert" on public.subscriptions for insert
  to authenticated with check ( user_id = (select auth.uid()) );
create policy "subscriptions: self update" on public.subscriptions for update
  to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );
create policy "subscriptions: staff update" on public.subscriptions for update
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── orders ────────────────────────────────────────────────────────────────
create policy "orders: self read" on public.orders for select
  to authenticated using ( user_id = (select auth.uid()) );
create policy "orders: staff read" on public.orders for select
  to authenticated using ( public.is_farm_staff(farm_id) );
create policy "orders: self insert" on public.orders for insert
  to authenticated with check ( user_id = (select auth.uid()) );
create policy "orders: self update draft" on public.orders for update
  to authenticated
  using ( user_id = (select auth.uid()) and status in ('draft', 'confirmed') )
  with check ( user_id = (select auth.uid()) );
create policy "orders: staff update" on public.orders for update
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── order_items ───────────────────────────────────────────────────────────
-- Inherits via join to orders; we still write explicit policies for clarity.
create policy "order_items: read via order" on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_farm_staff(o.farm_id))
    )
  );
create policy "order_items: write via order" on public.order_items for all
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_farm_staff(o.farm_id))
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_farm_staff(o.farm_id))
    )
  );

-- ─── credit_ledger (read-only to clients) ─────────────────────────────────
-- Members read their own balance history; staff read the whole farm.
-- INSERTs come from server-side functions (service role); UPDATE/DELETE
-- are blocked by triggers regardless of RLS.
create policy "credit_ledger: self read" on public.credit_ledger for select
  to authenticated using ( user_id = (select auth.uid()) );
create policy "credit_ledger: staff read" on public.credit_ledger for select
  to authenticated using ( public.is_farm_staff(farm_id) );
-- Staff may record manual adjustments
create policy "credit_ledger: staff insert" on public.credit_ledger for insert
  to authenticated with check ( public.is_farm_staff(farm_id) );

-- ─── payment_config (owner-only) ──────────────────────────────────────────
create policy "payment_config: owner read" on public.payment_config for select
  to authenticated
  using (
    exists (
      select 1 from public.farm_members
      where farm_id = payment_config.farm_id
        and user_id = (select auth.uid())
        and role = 'owner'
        and archived_at is null
    )
  );
create policy "payment_config: owner write" on public.payment_config for all
  to authenticated
  using (
    exists (
      select 1 from public.farm_members
      where farm_id = payment_config.farm_id
        and user_id = (select auth.uid())
        and role = 'owner'
        and archived_at is null
    )
  )
  with check (
    exists (
      select 1 from public.farm_members
      where farm_id = payment_config.farm_id
        and user_id = (select auth.uid())
        and role = 'owner'
        and archived_at is null
    )
  );

-- ─── herd_share_contracts ─────────────────────────────────────────────────
create policy "herd_share_contracts: self read" on public.herd_share_contracts for select
  to authenticated using ( user_id = (select auth.uid()) );
create policy "herd_share_contracts: staff read" on public.herd_share_contracts for select
  to authenticated using ( public.is_farm_staff(farm_id) );
create policy "herd_share_contracts: self sign" on public.herd_share_contracts for insert
  to authenticated with check ( user_id = (select auth.uid()) );
create policy "herd_share_contracts: staff manage" on public.herd_share_contracts for update
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── milk_test_results ────────────────────────────────────────────────────
-- Public to shareholders (any farm member); staff manage
create policy "milk_test_results: members read" on public.milk_test_results for select
  to authenticated using ( public.is_farm_member(farm_id) );
create policy "milk_test_results: staff manage" on public.milk_test_results for all
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

-- ─── sms_messages ─────────────────────────────────────────────────────────
-- Self read; staff read; INSERTs from Twilio webhook via service role only.
create policy "sms_messages: self read" on public.sms_messages for select
  to authenticated using ( user_id = (select auth.uid()) );
create policy "sms_messages: staff read" on public.sms_messages for select
  to authenticated using ( public.is_farm_staff(farm_id) );

-- ─── waitlist ─────────────────────────────────────────────────────────────
-- Anyone may INSERT (the /join form). No one may SELECT (no info leakage).
-- Admin reads use service role (Supabase dashboard or our own admin tool).
create policy "waitlist: public insert" on public.waitlist for insert
  to anon, authenticated with check ( true );
-- No SELECT policy = no rows visible via the Data API. Intentional.

-- =============================================================================
-- Data API grants
-- =============================================================================
-- Supabase exposes the `public` schema by default. Grant the minimal set of
-- privileges to anon and authenticated. RLS does the row-level work; these
-- grants gate table-level access.

grant usage on schema public to anon, authenticated;

-- Public-readable tables (RLS still filters rows):
grant select on public.farms              to anon, authenticated;
grant select on public.farm_homepages     to anon, authenticated;
grant select on public.pickup_sites       to anon, authenticated;
grant select on public.share_definitions  to anon, authenticated;
grant select on public.products           to anon, authenticated;
grant select on public.milk_test_results  to authenticated;

-- Authenticated CRUD:
grant select, insert, update on public.profiles               to authenticated;
grant select, insert, update on public.farm_members           to authenticated;
grant select, insert, update on public.farm_homepages         to authenticated;
grant insert, update, delete on public.pickup_sites           to authenticated;
grant insert, update, delete on public.share_definitions      to authenticated;
grant insert, update, delete on public.products               to authenticated;
grant select, insert, update on public.subscriptions          to authenticated;
grant select, insert, update on public.orders                 to authenticated;
grant select, insert, update, delete on public.order_items    to authenticated;
grant select, insert on public.credit_ledger                  to authenticated;
grant select, insert, update on public.payment_config         to authenticated;
grant select, insert, update on public.herd_share_contracts   to authenticated;
grant insert, update, delete on public.milk_test_results      to authenticated;
grant select on public.sms_messages                           to authenticated;
-- Waitlist: anon and authenticated may insert; no one selects
grant insert on public.waitlist                               to anon, authenticated;

-- Sequences (needed for identity columns on insert)
grant usage on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant usage on sequences to anon, authenticated;

-- =============================================================================
-- Views (security_invoker for safety on Postgres 15+)
-- =============================================================================

-- v_public_farms — exactly what the discovery map needs, nothing more
create view public.v_public_farms
with (security_invoker = true)
as
  select
    f.id,
    f.slug,
    f.name,
    f.location,
    f.kind,
    f.tagline,
    f.founder_name
  from public.farms f
  where f.is_published = true
    and f.archived_at is null;

grant select on public.v_public_farms to anon, authenticated;

-- =============================================================================
-- Comments (visible in Supabase Studio + docs)
-- =============================================================================
comment on table public.farms is
  'Top-level tenant. One row per farm operator. is_published gates public visibility.';
comment on table public.farm_members is
  'Multi-tenant boundary. Every farm-scoped policy joins through this table.';
comment on table public.credit_ledger is
  'Append-only money log. UPDATE and DELETE are blocked by trigger. Never edit history.';
comment on table public.herd_share_contracts is
  '3-year retention required in CO/ID/CT. Never hard-delete; archive only.';
comment on table public.waitlist is
  'Open INSERT for the /join form. No SELECT policy = invisible to all clients. Read via service role only.';
