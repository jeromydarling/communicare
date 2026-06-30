-- =============================================================================
-- 0008_stripe — platform subscription + Connect onboarding
-- =============================================================================
-- The $9/month platform gate (paid at signup, no trial) plus the optional
-- Stripe Connect account each farm can open to run Managed Payments
-- through us at 1% on processed volume.
--
-- Two surfaces, both anchored to existing tables:
--   - users.stripe_customer_id, users.subscription_status, etc. — every
--     account has at most one Customer + one platform Subscription. The
--     Subscription's lifecycle drives the access gate.
--   - farms.connect_account_id, farms.connect_charges_enabled,
--     farms.connect_payouts_enabled — per-farm Connect account, opened
--     only if the farmer chooses Managed Payments.
--
-- Plus two log/event tables:
--   - stripe_events — every webhook we receive, dedup'd by Stripe's
--     event id. Source of truth for "did this customer.subscription.deleted
--     actually land?"
--   - stripe_subscriptions — every Subscription, current + historical
--     (we keep canceled ones for the audit trail; the active gate reads
--     users.subscription_status which is updated by the webhook).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users: add Stripe customer + subscription snapshot
-- -----------------------------------------------------------------------------
alter table users add column stripe_customer_id text;
alter table users add column subscription_status text not null default 'unpaid'
  check (subscription_status in (
    'unpaid', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired'
  ));
alter table users add column subscription_id text;
alter table users add column subscription_current_period_end text;

create index users_stripe_customer_idx on users (stripe_customer_id)
  where stripe_customer_id is not null;

-- -----------------------------------------------------------------------------
-- farms: add Stripe Connect account fields
-- -----------------------------------------------------------------------------
alter table farms add column connect_account_id text;
alter table farms add column connect_charges_enabled integer not null default 0;
alter table farms add column connect_payouts_enabled integer not null default 0;
alter table farms add column connect_details_submitted integer not null default 0;

create index farms_connect_account_idx on farms (connect_account_id)
  where connect_account_id is not null;

-- -----------------------------------------------------------------------------
-- stripe_subscriptions — full history of platform subscriptions
-- -----------------------------------------------------------------------------
-- One row per Subscription object. user_id is the owner. The webhook
-- writes here on every customer.subscription.* event; the active state
-- on users is denormalized for the gate query path.
-- -----------------------------------------------------------------------------
create table if not exists stripe_subscriptions (
  id                       text primary key,            -- Stripe sub id (sub_...)
  user_id                  text not null,
  stripe_customer_id       text not null,
  status                   text not null,
  price_id                 text,
  current_period_start     text,
  current_period_end       text,
  cancel_at_period_end     integer not null default 0,
  canceled_at              text,
  trial_end                text,
  created                  text not null,
  raw_json                 text not null default '{}',
  inserted_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index stripe_subscriptions_user_idx
  on stripe_subscriptions (user_id, created desc);
create index stripe_subscriptions_status_idx
  on stripe_subscriptions (status);

-- -----------------------------------------------------------------------------
-- stripe_events — every webhook event we received, dedup'd
-- -----------------------------------------------------------------------------
-- The webhook handler INSERT OR IGNOREs on every receipt; if the row
-- already exists we skip processing (Stripe retries on 2xx delays). The
-- raw payload is kept for forensics when a payment goes sideways.
-- -----------------------------------------------------------------------------
create table if not exists stripe_events (
  id            text primary key,    -- Stripe event id (evt_...)
  type          text not null,
  account       text,                -- for Connect events, the connected account
  livemode      integer not null default 0,
  raw_json      text not null,
  received_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  processed_at  text
);
create index stripe_events_type_idx on stripe_events (type, received_at desc);
