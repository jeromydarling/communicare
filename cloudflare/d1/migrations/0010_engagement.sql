-- =============================================================================
-- 0010 — engagement columns for onboarding drip + dormant nudge + digest
-- =============================================================================
-- Every automated email we send tracks a sent_at stamp on the user row
-- so we can prove idempotency ("did we already send day-3?") without a
-- separate table. The cron only fires the next drip when both:
--   - the elapsed time is past the drip threshold
--   - the corresponding *_sent_at is NULL
-- =============================================================================

alter table users add column welcome_email_sent_at        text;
alter table users add column onboarding_day1_sent_at      text;
alter table users add column onboarding_day3_sent_at      text;
alter table users add column onboarding_day7_sent_at      text;
alter table users add column dormant_nudge_sent_at        text;
alter table users add column weekly_digest_last_sent_at   text;

-- Last-login timestamp fuels the dormant-nudge cron.
alter table users add column last_login_at                text;

create index users_engagement_drip_idx
  on users (created_at, welcome_email_sent_at, onboarding_day1_sent_at,
            onboarding_day3_sent_at, onboarding_day7_sent_at);
