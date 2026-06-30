-- =============================================================================
-- 0007_sms — the Tuesday text loop
-- =============================================================================
-- Four tables: farm_sms_config, member_sms_subscriptions, weekly_offers,
-- sms_messages. The first migration to hit a fresh D1 with these names —
-- if a prior attempt left partial state, DROP IF EXISTS resets cleanly
-- (no production data yet).
--
-- Design choices made specifically for D1's quirks:
--   - No partial indexes (D1 returns "no such column" on the index's
--     WHERE clause even when the column clearly exists). Plain indexes
--     instead; the cardinality is small enough that the optimizer
--     doesn't need partials.
--   - No FK `references` clauses between SMS tables. App code enforces
--     the relationships. SQLite doesn't enforce FKs unless
--     PRAGMA foreign_keys=ON is set per-connection — which D1 doesn't
--     do by default. So they were advisory anyway, and dropping them
--     also dodges the weekly_offers ↔ sms_messages forward-reference
--     that confused D1's per-statement parser.
--   - sms_messages declared BEFORE weekly_offers (sms_messages is the
--     more atomic table; nothing structurally depends on weekly_offers
--     being first).
-- =============================================================================

drop table if exists weekly_offers;
drop table if exists sms_messages;
drop table if exists member_sms_subscriptions;
drop table if exists farm_sms_config;

-- -----------------------------------------------------------------------------
-- farm_sms_config — per-farm SMS settings
-- -----------------------------------------------------------------------------
create table farm_sms_config (
  farm_id                       text primary key,
  twilio_phone_number           text,
  twilio_phone_number_sid       text,
  twilio_messaging_service_sid  text,
  send_day_of_week              integer not null default 2 check (send_day_of_week between 0 and 6),
  send_local_hour               integer not null default 10 check (send_local_hour between 0 and 23),
  send_timezone                 text not null default 'America/New_York',
  reply_window_hours            integer not null default 24 check (reply_window_hours between 1 and 168),
  auto_action_on_no_reply       text not null default 'confirm' check (auto_action_on_no_reply in ('confirm', 'skip')),
  is_active                     integer not null default 0,
  created_at                    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at                    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- -----------------------------------------------------------------------------
-- member_sms_subscriptions — opt-in record per (farm, phone)
-- -----------------------------------------------------------------------------
create table member_sms_subscriptions (
  id                       text primary key,
  farm_id                  text not null,
  member_user_id           text,
  member_profile_id        text,
  phone_e164               text not null,
  display_name             text,
  locale                   text not null default 'en' check (locale in ('en','es')),
  consent_status           text not null default 'pending' check (consent_status in ('pending', 'opted_in', 'opted_out')),
  consent_text_sent_at     text,
  opted_in_at              text,
  opted_in_message_sid     text,
  opted_out_at             text,
  opted_out_reason         text,
  outbound_number          text,
  created_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create unique index member_sms_subscriptions_farm_phone_idx
  on member_sms_subscriptions (farm_id, phone_e164);
create index member_sms_subscriptions_phone_idx
  on member_sms_subscriptions (phone_e164);
create index member_sms_subscriptions_farm_consent_idx
  on member_sms_subscriptions (farm_id, consent_status);

-- -----------------------------------------------------------------------------
-- sms_messages — full inbound + outbound log
-- -----------------------------------------------------------------------------
create table sms_messages (
  id                       text primary key,
  farm_id                  text,
  subscription_id          text,
  related_offer_id         text,
  direction                text not null check (direction in ('outbound', 'inbound')),
  from_number              text not null,
  to_number                text not null,
  body                     text not null,
  twilio_message_sid       text,
  twilio_status            text,
  twilio_error_code        text,
  twilio_price_usd         real,
  kind                     text not null default 'other' check (kind in (
    'consent_request', 'consent_confirmation',
    'weekly_offer', 'weekly_reply', 'weekly_confirmation',
    'farmer_broadcast', 'stop_ack', 'help_ack',
    'other'
  )),
  created_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create unique index sms_messages_twilio_sid_idx
  on sms_messages (twilio_message_sid);
create index sms_messages_subscription_idx
  on sms_messages (subscription_id, created_at desc);
create index sms_messages_farm_idx
  on sms_messages (farm_id, created_at desc);
create index sms_messages_inbound_idx
  on sms_messages (direction, from_number, created_at desc);

-- -----------------------------------------------------------------------------
-- weekly_offers — one row per (subscription, week)
-- -----------------------------------------------------------------------------
create table weekly_offers (
  id                       text primary key,
  farm_id                  text not null,
  subscription_id          text not null,
  week_starting            text not null,
  outbound_body            text not null,
  share_contents           text not null default '[]',
  outbound_message_id      text,
  state                    text not null default 'queued' check (state in (
    'queued', 'sent',
    'confirmed', 'skipped', 'swapped', 'gifted', 'paused',
    'expired', 'failed'
  )),
  reply_received_at        text,
  reply_intent             text check (reply_intent in (
    'confirm', 'skip', 'swap', 'gift', 'pause', 'resume', 'stop', 'help', 'unknown'
  )),
  reply_body               text,
  reply_message_id         text,
  swap_details             text,
  gift_recipient_name      text,
  gift_recipient_phone     text,
  resolved_at              text,
  resolved_by              text check (resolved_by in ('member_reply', 'auto', 'farmer')),
  created_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create unique index weekly_offers_subscription_week_idx
  on weekly_offers (subscription_id, week_starting);
create index weekly_offers_farm_week_idx
  on weekly_offers (farm_id, week_starting desc);
create index weekly_offers_state_idx
  on weekly_offers (farm_id, state);
