-- =============================================================================
-- 0007_sms — the Tuesday text loop
-- =============================================================================
-- The defining product feature: members get one text on their farm's
-- send day with this week's share; they reply to confirm, skip, pause,
-- swap, or gift. No passwords. The first SMS work this codebase has
-- ever held.
--
-- Four tables:
--   - farm_sms_config         per-farm number + schedule
--   - member_sms_subscriptions per-member opt-in state + phone
--   - weekly_offers           one row per (member, week); carries the
--                             outbound body + the reply intent + final
--                             state
--   - sms_messages            full inbound/outbound log; the audit
--                             trail for 10DLC compliance, billing
--                             reconciliation against Twilio, and
--                             "what did you actually send" questions
--                             when something goes sideways
--
-- Why E.164 throughout: Twilio's API rejects anything else, and the
-- two-way matching from inbound webhooks needs an exact key match. We
-- normalize at the boundary (functions/_lib/phone.ts) and never store
-- a presentation-formatted number.
--
-- Why no member_user_id required on member_sms_subscriptions:
-- farmers import their existing roster before those members ever sign
-- in. The subscription anchors on phone; user_id gets backfilled if
-- they later create an account.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- farm_sms_config — per-farm SMS settings
-- -----------------------------------------------------------------------------
-- Allocated lazily: a farm only gets a row here once they turn the
-- feature on. is_active=0 means provisioned-but-paused (e.g. the farm
-- bought a number but isn't running shares this season).
-- -----------------------------------------------------------------------------
create table if not exists farm_sms_config (
  farm_id                  text primary key references farms (id) on delete cascade,

  -- Twilio-side identifiers
  twilio_phone_number      text,             -- E.164, e.g. "+15551234567"
  twilio_phone_number_sid  text,             -- "PNxxxxxxxxxxxx"
  twilio_messaging_service_sid text,         -- optional Twilio Messaging Service for 10DLC routing

  -- Schedule (each farm sends on its own cadence in its own tz)
  -- send_day_of_week: 0=Sun, 1=Mon, ..., 6=Sat. CSAs typically text
  -- the day before pickup; default Tuesday for Wednesday/Thursday pickup.
  send_day_of_week         integer not null default 2 check (send_day_of_week between 0 and 6),
  send_local_hour          integer not null default 10 check (send_local_hour between 0 and 23),
  send_timezone            text not null default 'America/New_York',

  -- Reply window: how long after the send is the offer still "open."
  -- After this, the offer auto-confirms (or auto-skips, per farmer
  -- preference). Default 24h: text Tuesday 10am, lock Wednesday 10am.
  reply_window_hours       integer not null default 24 check (reply_window_hours between 1 and 168),
  auto_action_on_no_reply  text not null default 'confirm'
    check (auto_action_on_no_reply in ('confirm', 'skip')),

  -- Master switch — false until the farmer has both opted-in members
  -- and an active Twilio number.
  is_active                integer not null default 0,

  created_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- -----------------------------------------------------------------------------
-- member_sms_subscriptions — opt-in record per (farm, phone)
-- -----------------------------------------------------------------------------
-- The federal compliance backbone. Every outbound A2P SMS in the US
-- needs documented prior express consent. consent_status='opted_in'
-- plus opted_in_at + the consent_text_sid (the inbound YES we received)
-- IS that documentation. STOP and START handling federally required.
-- -----------------------------------------------------------------------------
create table if not exists member_sms_subscriptions (
  id                      text primary key,
  farm_id                 text not null references farms (id) on delete cascade,

  -- Either anchor: a user row (if they signed in), a profile (if the
  -- farmer added them but they haven't claimed the account), or just
  -- a phone (typed in directly during import). At least one of the
  -- first two is set once the farmer associates them.
  member_user_id          text references users (id) on delete set null,
  member_profile_id       text references profiles (id) on delete set null,

  -- The actual messaging identity
  phone_e164              text not null,
  display_name            text,                 -- snapshot at opt-in time
  locale                  text not null default 'en' check (locale in ('en','es')),

  -- Consent lifecycle
  consent_status          text not null default 'pending'
    check (consent_status in ('pending', 'opted_in', 'opted_out')),
  consent_text_sent_at    text,                -- when we asked for YES
  opted_in_at             text,                -- when YES came back
  opted_in_message_sid    text,                -- Twilio sid of the inbound YES
  opted_out_at            text,
  opted_out_reason        text,                -- 'stop_keyword', 'farmer_removed', etc.

  -- Snapshot of which Twilio number this subscription was opted into.
  -- If the farm switches numbers, existing subs keep their original
  -- contact number for compliance (we'd start a new consent loop).
  outbound_number         text,

  created_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- A phone can subscribe to multiple farms (a neighbor on two CSAs)
-- but only once per farm.
create unique index member_sms_subscriptions_farm_phone_idx
  on member_sms_subscriptions (farm_id, phone_e164);
create index member_sms_subscriptions_phone_idx
  on member_sms_subscriptions (phone_e164);
create index member_sms_subscriptions_farm_active_idx
  on member_sms_subscriptions (farm_id, consent_status)
  where consent_status = 'opted_in';

-- -----------------------------------------------------------------------------
-- weekly_offers — one row per (subscription, week)
-- -----------------------------------------------------------------------------
-- The state machine for a single Tuesday text and its reply. State
-- transitions are linear: queued → sent → (confirmed | skipped |
-- swapped | gifted | paused | expired | failed). The reply parser
-- writes reply_intent + reply_body raw; the resolver maps that into
-- the final state and any associated order side-effects.
-- -----------------------------------------------------------------------------
create table if not exists weekly_offers (
  id                      text primary key,
  farm_id                 text not null references farms (id) on delete cascade,
  subscription_id         text not null references member_sms_subscriptions (id) on delete cascade,

  -- Week the offer is for. Anchored to the Monday of that week so all
  -- members in a farm share a single date key.
  week_starting           text not null,             -- 'YYYY-MM-DD'

  -- The body the member actually saw + a structured snapshot of what
  -- they're being offered (the share contents, the swap/skip
  -- affordances).
  outbound_body           text not null,
  share_contents          text not null default '[]', -- JSON
  outbound_message_id     text,                       -- → sms_messages.id

  -- State machine
  state                   text not null default 'queued'
    check (state in (
      'queued', 'sent',
      'confirmed', 'skipped', 'swapped', 'gifted', 'paused',
      'expired', 'failed'
    )),

  -- Reply tracking
  reply_received_at       text,
  reply_intent            text check (reply_intent in (
    'confirm', 'skip', 'swap', 'gift', 'pause', 'resume', 'stop', 'help', 'unknown'
  )),
  reply_body              text,
  reply_message_id        text references sms_messages (id) on delete set null,
  swap_details            text,                       -- JSON: {"out":"broccoli","in":"lettuce"}
  gift_recipient_name     text,
  gift_recipient_phone    text,

  resolved_at             text,                       -- when state went to a terminal value
  resolved_by             text check (resolved_by in ('member_reply', 'auto', 'farmer')),

  created_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create unique index weekly_offers_subscription_week_idx
  on weekly_offers (subscription_id, week_starting);
create index weekly_offers_farm_week_idx
  on weekly_offers (farm_id, week_starting desc);
create index weekly_offers_open_idx
  on weekly_offers (farm_id, state)
  where state in ('queued', 'sent');

-- -----------------------------------------------------------------------------
-- sms_messages — full inbound + outbound log
-- -----------------------------------------------------------------------------
-- Independent of weekly_offers because:
--   - Consent texts (opt-in, opt-out) live here without an offer
--   - Farmer manual sends ("see you Saturday — heads up the lettuce is
--     looking rough") live here
--   - Twilio status callbacks update the SAME row by twilio_message_sid
--     to land delivery/failure events
-- -----------------------------------------------------------------------------
create table if not exists sms_messages (
  id                      text primary key,
  farm_id                 text references farms (id) on delete set null,
  subscription_id         text references member_sms_subscriptions (id) on delete set null,
  related_offer_id        text references weekly_offers (id) on delete set null,

  direction               text not null check (direction in ('outbound', 'inbound')),
  from_number             text not null,
  to_number               text not null,
  body                    text not null,

  -- Twilio identifiers
  twilio_message_sid      text,
  twilio_status           text,                       -- queued, sending, sent, delivered, undelivered, failed
  twilio_error_code       text,
  twilio_price_usd        real,                       -- post-delivery cost

  -- Categorization
  kind                    text not null default 'other' check (kind in (
    'consent_request', 'consent_confirmation',
    'weekly_offer', 'weekly_reply', 'weekly_confirmation',
    'farmer_broadcast', 'stop_ack', 'help_ack',
    'other'
  )),

  created_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create unique index sms_messages_twilio_sid_idx
  on sms_messages (twilio_message_sid) where twilio_message_sid is not null;
create index sms_messages_subscription_idx
  on sms_messages (subscription_id, created_at desc);
create index sms_messages_farm_idx
  on sms_messages (farm_id, created_at desc);
create index sms_messages_inbound_unmatched_idx
  on sms_messages (from_number, created_at desc)
  where direction = 'inbound';
