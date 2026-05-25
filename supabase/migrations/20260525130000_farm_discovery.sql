-- =============================================================================
-- Farm discovery — Perplexity-powered directory of unclaimed farms
-- =============================================================================
-- The "we list them anyway" half of the find experience. When a visitor
-- types a ZIP into /find we ask Perplexity for farm shares, CSAs, herd
-- shares, and meat shares within ~20 miles, cache the results in
-- discovered_farms, and surface them on the map alongside the operations
-- already on Communicare.
--
-- Each row carries enough to do four things:
--   1. Plot a pin (lat/lng + name + kind)
--   2. Let a member send a note ("Send them a note") — stored in
--      farm_inquiries so the loop is closed
--   3. Let the operator claim the listing (claimed_at + claimed_by_farm_id)
--   4. Honor an opt-out forever (opted_out_at — even if Perplexity surfaces
--      them again next month we suppress)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- discovered_farms — the unclaimed directory
-- -----------------------------------------------------------------------------
create table public.discovered_farms (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique,                                     -- /claim/[slug]
  name            text not null,
  kind            text,                                            -- free-form for now
                                                                   -- ("Vegetable CSA", "Raw milk herd share", etc.)
  description     text,
  location        text,                                            -- "Floyd County, Virginia"
  city            text,
  state           text,
  zip             text,
  lat             double precision,
  lng             double precision,
  website         text,
  email           text,                                            -- where we route inquiries
  phone           text,
  pickup_info     text,                                            -- free-form: "Saturdays, Sebastopol farmers market"
  share_price     text,                                            -- "$620/season", "$115/month boarding"
  citations       jsonb not null default '[]'::jsonb,              -- Perplexity citations
  source          text not null default 'perplexity',              -- 'perplexity' | 'usda' | 'state-directory' | 'member-submission'

  -- Lifecycle
  claimed_at      timestamptz,
  claimed_by_farm_id uuid references public.farms (id) on delete set null,
  opted_out_at    timestamptz,
  opt_out_reason  text,

  -- Inquiry tracking — feeds the "neighbors are asking about you" footer
  -- on the claim page and the one-time outreach email to the farm.
  inquiry_count   int not null default 0,
  last_inquiry_at timestamptz,
  first_inquiry_email_sent_at timestamptz,

  -- Bookkeeping
  discovered_via_zip text,                                         -- the ZIP that first surfaced them
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_refreshed_at timestamptz not null default now()
);

create index discovered_farms_zip_idx
  on public.discovered_farms (discovered_via_zip);
create index discovered_farms_coords_idx
  on public.discovered_farms (lat, lng)
  where opted_out_at is null;
create index discovered_farms_unclaimed_idx
  on public.discovered_farms (created_at desc)
  where claimed_at is null and opted_out_at is null;
create unique index discovered_farms_name_location_idx
  on public.discovered_farms (lower(name), lower(coalesce(location, '')));

comment on table public.discovered_farms is
  'Unclaimed farm directory populated by Perplexity-powered ZIP searches and open-data ingest. Claimed entries link back to public.farms via claimed_by_farm_id.';

-- -----------------------------------------------------------------------------
-- farm_inquiries — every "Send them a note" send
-- -----------------------------------------------------------------------------
create table public.farm_inquiries (
  id                 uuid primary key default gen_random_uuid(),
  discovered_farm_id uuid not null references public.discovered_farms (id) on delete cascade,
  member_user_id     uuid references auth.users (id) on delete set null,

  -- Captured at send time for anonymous senders (or as a snapshot for logged-in ones)
  sender_name        text not null,
  sender_email       text not null,
  sender_zip         text,

  subject            text,
  body               text not null,
  channel            text not null default 'email',  -- 'email' | 'sms' | 'mailto'
  status             text not null default 'sent',   -- 'sent' | 'delivered' | 'bounced' | 'replied'

  sent_at            timestamptz not null default now(),
  response_received_at timestamptz
);

create index farm_inquiries_farm_idx
  on public.farm_inquiries (discovered_farm_id, sent_at desc);

comment on table public.farm_inquiries is
  'A log of every note a member sends to a discovered farm. Used to show neighbor-asked-about-you evidence on the claim page and to throttle the one-time farm outreach email to first contact only.';

-- -----------------------------------------------------------------------------
-- discovery_searches — cache layer so a second visitor searching the same
-- ZIP within 7 days reads from the database, not Perplexity.
-- -----------------------------------------------------------------------------
create table public.discovery_searches (
  id              bigint generated always as identity primary key,
  zip             text not null,
  lat             double precision,
  lng             double precision,
  city            text,
  state           text,
  results_count   int not null default 0,
  searched_at     timestamptz not null default now()
);

create index discovery_searches_zip_idx
  on public.discovery_searches (zip, searched_at desc);

-- Trigger to bump inquiry counters atomically when a farm_inquiries row is
-- inserted. Keeps the discovered_farms row's last_inquiry_at + count fresh
-- without a separate background job.
create or replace function public.bump_discovered_farm_inquiry_count()
returns trigger
language plpgsql
as $$
begin
  update public.discovered_farms
     set inquiry_count = inquiry_count + 1,
         last_inquiry_at = new.sent_at,
         updated_at = now()
   where id = new.discovered_farm_id;
  return new;
end;
$$;

create trigger farm_inquiries_bump_count
  after insert on public.farm_inquiries
  for each row execute function public.bump_discovered_farm_inquiry_count();

-- -----------------------------------------------------------------------------
-- RLS — the directory is public, but writes go through service-role only
-- -----------------------------------------------------------------------------
alter table public.discovered_farms enable row level security;
alter table public.farm_inquiries enable row level security;
alter table public.discovery_searches enable row level security;

-- discovered_farms — anyone (anon + authenticated) can read non-opted-out rows
create policy "Discovered farms are public" on public.discovered_farms
  for select to anon, authenticated
  using (opted_out_at is null);

-- A farmer who claimed a listing can read everything about their own row
create policy "Claimed farm can read their listing" on public.discovered_farms
  for select to authenticated
  using (
    claimed_by_farm_id is not null
    and public.is_farm_member(claimed_by_farm_id)
  );

-- farm_inquiries — members can read their own sent inquiries
create policy "Members read their own inquiries" on public.farm_inquiries
  for select to authenticated
  using (member_user_id = (select auth.uid()));

-- A claimed farm can read inquiries that landed before they joined
create policy "Claimed farm reads inquiries" on public.farm_inquiries
  for select to authenticated
  using (
    discovered_farm_id in (
      select id from public.discovered_farms
       where claimed_by_farm_id is not null
         and public.is_farm_member(claimed_by_farm_id)
    )
  );

-- Anyone (including anon) can insert an inquiry — the edge function rate-
-- limits and validates. We still need the row so the discovered_farms
-- trigger can fire.
create policy "Anyone can send an inquiry" on public.farm_inquiries
  for insert to anon, authenticated
  with check (true);

-- discovery_searches — public cache, anyone reads, only service role writes
-- (no INSERT policy → blocked for anon/authenticated by default)
create policy "Discovery searches are public" on public.discovery_searches
  for select to anon, authenticated
  using (true);
