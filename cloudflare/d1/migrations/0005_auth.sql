-- =============================================================================
-- Auth tables — custom auth on Workers (Phase 3)
-- =============================================================================
-- Replaces Supabase Auth. The `users` table from 0001_initial_schema.sql
-- already has the columns custom auth needs (email, password_hash,
-- email_verified_at, display_name, phone, metadata). This migration adds
-- the supporting tables for sessions, OAuth links, and time-limited
-- tokens (magic-link signin, email confirmation, password reset).
--
-- Session strategy:
--   * Session IDs are 32 bytes of CSPRNG, base64url-encoded, never
--     stored in plaintext — only a SHA-256 hash lands in the DB so a
--     leaked DB doesn't grant access to anyone.
--   * Cookies use the __Host- prefix so they're path=/, Secure, no
--     Domain. SameSite=Lax. HttpOnly always.
--   * Sliding 30-day expiry. Each request that uses a session bumps
--     expires_at if it's within the last 7 days of its life.
--
-- Token strategy:
--   * Same hashed shape — the token in the email/URL is plaintext,
--     only the hash is stored. One-shot: each token has a `used_at`
--     timestamp set on first use; subsequent attempts are rejected.
-- =============================================================================

create table if not exists sessions (
  -- SHA-256 of the cookie-side session id (never the plaintext id)
  id_hash       text primary key,
  user_id       text not null references users (id) on delete cascade,
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at    text not null,
  -- For "sign me out of every device" + audit trails
  ip            text,
  user_agent    text
);
create index sessions_user_idx on sessions (user_id);
create index sessions_expiry_idx on sessions (expires_at);

create table if not exists oauth_accounts (
  id              integer primary key autoincrement,
  user_id         text not null references users (id) on delete cascade,
  provider        text not null check (provider in ('google')),
  provider_user_id text not null,
  email           text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unique (provider, provider_user_id),
  unique (user_id, provider)
);
create index oauth_accounts_user_idx on oauth_accounts (user_id);

-- Magic-link signin AND invite-imported-members tokens (same shape,
-- different purposes — disambiguate with the `purpose` column).
create table if not exists magic_link_tokens (
  token_hash    text primary key,
  email         text not null collate nocase,
  user_id       text references users (id) on delete cascade,
  purpose       text not null check (purpose in ('signin', 'invite', 'confirm')),
  -- redirect_to lets the caller send the user back where they came from
  -- after the link is clicked. Stored so the click-handler doesn't need
  -- to trust the URL it lands on.
  redirect_to   text,
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at    text not null,
  used_at       text
);
create index magic_link_tokens_email_idx on magic_link_tokens (email, expires_at);

create table if not exists password_reset_tokens (
  token_hash    text primary key,
  user_id       text not null references users (id) on delete cascade,
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at    text not null,
  used_at       text
);
create index password_reset_tokens_user_idx on password_reset_tokens (user_id);
