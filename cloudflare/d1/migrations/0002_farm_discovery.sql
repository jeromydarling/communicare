-- =============================================================================
-- Farm discovery — port of supabase/migrations/20260525130000_farm_discovery.sql
-- =============================================================================
-- "We list them anyway" — the Perplexity-powered directory of unclaimed
-- farms behind /find. drop_sites jsonb from the later Postgres migration is
-- folded in here as a single column from the start (D1 doesn't need a
-- separate ALTER).
-- =============================================================================

create table if not exists discovered_farms (
  id              text primary key,
  slug            text unique,
  name            text not null,
  kind            text,
  description     text,
  location        text,
  city            text,
  state           text,
  zip             text,
  lat             real,
  lng             real,
  website         text,
  email           text,
  phone           text,
  pickup_info     text,
  share_price     text,
  citations       text not null default '[]',    -- json
  source          text not null default 'perplexity',

  -- drop_sites (was a separate Postgres ALTER; folded in here)
  -- Array of { name, address, city, state, zip, lat, lng, day_time }.
  drop_sites      text not null default '[]',    -- json

  -- Lifecycle
  claimed_at      text,
  claimed_by_farm_id text references farms (id) on delete set null,
  opted_out_at    text,
  opt_out_reason  text,

  -- Inquiry counters (bumped by the Worker route that creates inquiries,
  -- since SQLite triggers can't trivially mutate other tables atomically).
  inquiry_count   integer not null default 0,
  last_inquiry_at text,
  first_inquiry_email_sent_at text,

  discovered_via_zip text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_refreshed_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index discovered_farms_zip_idx on discovered_farms (discovered_via_zip);
create index discovered_farms_coords_idx
  on discovered_farms (lat, lng) where opted_out_at is null;
create index discovered_farms_unclaimed_idx
  on discovered_farms (created_at desc)
  where claimed_at is null and opted_out_at is null;
-- The Postgres unique index used lower(name)+lower(coalesce(location,'')).
-- D1's NOCASE collation does the same job at compare time.
create unique index discovered_farms_name_location_idx
  on discovered_farms (name collate nocase, coalesce(location, '') collate nocase);

create table if not exists farm_inquiries (
  id                 text primary key,
  discovered_farm_id text not null references discovered_farms (id) on delete cascade,
  member_user_id     text references users (id) on delete set null,
  sender_name        text not null,
  sender_email       text not null,
  sender_zip         text,
  subject            text,
  body               text not null,
  channel            text not null default 'email' check (channel in ('email', 'sms', 'mailto')),
  status             text not null default 'sent' check (status in ('sent', 'delivered', 'bounced', 'replied')),
  sent_at            text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  response_received_at text
);
create index farm_inquiries_farm_idx
  on farm_inquiries (discovered_farm_id, sent_at desc);
create index farm_inquiries_member_idx
  on farm_inquiries (member_user_id, sent_at desc) where member_user_id is not null;

-- Cache layer for the Perplexity search results. The Worker can also use
-- KV for the same job (faster reads); this table persists for analytics.
create table if not exists discovery_searches (
  id              integer primary key autoincrement,
  zip             text not null,
  lat             real,
  lng             real,
  city            text,
  state           text,
  results_count   integer not null default 0,
  searched_at     text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index discovery_searches_zip_idx on discovery_searches (zip, searched_at desc);
