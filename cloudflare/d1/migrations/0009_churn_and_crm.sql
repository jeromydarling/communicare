-- =============================================================================
-- 0009 — churn tools + CRM foundation
-- =============================================================================
-- Two features land in the same migration because the CRM's contact
-- timeline reads the churn-related lifecycle events (pause, resume,
-- cancel) as part of the same story.
--
-- Churn additions:
--   - users.subscription_status gains 'paused' state
--   - stripe_subscriptions.paused_at, .resume_at — snapshot of the
--     Stripe pause_collection state so the gate can act without an
--     extra Stripe roundtrip
--   - users.canceled_at — when the farmer initiated cancellation (may
--     precede the actual Stripe-side canceled state by a full billing
--     period when cancel_at_period_end=true)
--
-- CRM foundation:
--   - users.is_admin — flipped manually via wrangler d1 execute; no
--     admin-signup route. Owner-level access to /admin/*.
--   - crm_notes — markdown notes on any user, author-attributed,
--     internal-only. Rendered in the contact timeline.
--   - crm_action_items — assigned work with an optional snooze-until
--     date. Rendered on the admin's own todo view.
--   - crm_messages — outbound emails + SMS sent from /admin to a
--     user, threaded per user. Inbound SMS from the same user is
--     joined in via sms_messages at query time.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users: churn + admin identity + concierge trail
-- -----------------------------------------------------------------------------
alter table users add column is_admin integer not null default 0;
alter table users add column canceled_at text;
alter table users add column cancel_reason text;

-- Update subscription_status enum — SQLite doesn't support ALTER CHECK,
-- so we can't strictly add 'paused' to the constraint. That's fine:
-- the CHECK was advisory and the app writes 'paused' as needed. No
-- data-level rewrite required; existing rows are unaffected.
--
-- New status values in use going forward:
--   unpaid, active, past_due, canceled, incomplete, incomplete_expired, paused
--
-- The gate treats 'paused' as read-only (see functions/_lib/billing.ts).

-- -----------------------------------------------------------------------------
-- stripe_subscriptions: snapshot of pause_collection
-- -----------------------------------------------------------------------------
alter table stripe_subscriptions add column paused_at text;
alter table stripe_subscriptions add column resume_at text;

-- -----------------------------------------------------------------------------
-- crm_notes — internal, markdown, author-attributed
-- -----------------------------------------------------------------------------
create table if not exists crm_notes (
  id                  text primary key,
  subject_user_id     text not null,
  author_user_id      text not null,
  body                text not null,
  pinned              integer not null default 0,
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index crm_notes_subject_idx on crm_notes (subject_user_id, created_at desc);
create index crm_notes_pinned_idx on crm_notes (subject_user_id) where pinned = 1;

-- -----------------------------------------------------------------------------
-- crm_action_items — todo per admin, tied to a subject user
-- -----------------------------------------------------------------------------
create table if not exists crm_action_items (
  id                  text primary key,
  subject_user_id     text not null,
  assigned_to_user_id text not null,
  author_user_id      text not null,
  body                text not null,
  snooze_until        text,
  done_at             text,
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index crm_action_items_assigned_idx
  on crm_action_items (assigned_to_user_id, done_at, snooze_until);
create index crm_action_items_subject_idx
  on crm_action_items (subject_user_id, created_at desc);
create index crm_action_items_open_idx
  on crm_action_items (assigned_to_user_id)
  where done_at is null;

-- -----------------------------------------------------------------------------
-- crm_messages — outbound comms sent from /admin, unified thread
-- -----------------------------------------------------------------------------
-- Only outbound (admin → user). Inbound SMS still lives in sms_messages;
-- inbound email doesn't have an intake yet (comes later). The contact
-- timeline UNION ALLs these + sms_messages + stripe_events at query
-- time.
-- -----------------------------------------------------------------------------
create table if not exists crm_messages (
  id                  text primary key,
  subject_user_id     text not null,
  sender_user_id      text not null,           -- the admin
  channel             text not null check (channel in ('email', 'sms')),
  subject             text,                     -- email only
  body                text not null,
  external_message_id text,                     -- Twilio sid or email provider id
  status              text not null default 'sent'
    check (status in ('queued', 'sent', 'failed')),
  error               text,
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index crm_messages_subject_idx
  on crm_messages (subject_user_id, created_at desc);
