-- =============================================================================
-- Communicare — Hortus Integration
-- =============================================================================
-- Adds the farm_integrations table (one row per linked Hortus community),
-- a pending_crop_mappings table for the fuzzy-match queue, and a pg_net
-- trigger that fires a webhook to Hortus whenever a farm is published.
--
-- Requires: pg_net extension (enabled by default on Supabase)
-- Secrets:  HORTUS_WEBHOOK_SECRET  (HMAC-SHA256 signing key, shared)
--           HORTUS_WEBHOOK_URL     (https://[hortus-project].supabase.co/functions/v1/communicare-webhook)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pg_net" with schema extensions;

-- -----------------------------------------------------------------------------
-- farm_integrations
-- One row per (farm, partner) link. Currently only partner = 'hortus'.
-- -----------------------------------------------------------------------------
create table public.farm_integrations (
  id                    uuid primary key default gen_random_uuid(),
  farm_id               uuid not null references public.farms (id) on delete cascade,
  partner               text not null default 'hortus',      -- extensible for future partners
  partner_community_id  uuid not null,                       -- Hortus community UUID
  partner_email         citext not null,                     -- email used in Hortus (for display)
  linked_at             timestamptz not null default now(),
  unlinked_at           timestamptz,                         -- soft unlink
  metadata              jsonb not null default '{}'::jsonb,
  unique (farm_id, partner)
);

alter table public.farm_integrations enable row level security;

create index farm_integrations_farm_idx on public.farm_integrations (farm_id)
  where unlinked_at is null;

-- Owners read and manage their own integrations
create policy "farm_integrations: owner read" on public.farm_integrations for select
  to authenticated
  using (
    exists (
      select 1 from public.farm_members
      where farm_id = farm_integrations.farm_id
        and user_id = (select auth.uid())
        and role = 'owner'
        and archived_at is null
    )
  );

create policy "farm_integrations: owner write" on public.farm_integrations for all
  to authenticated
  using (
    exists (
      select 1 from public.farm_members
      where farm_id = farm_integrations.farm_id
        and user_id = (select auth.uid())
        and role = 'owner'
        and archived_at is null
    )
  )
  with check (
    exists (
      select 1 from public.farm_members
      where farm_id = farm_integrations.farm_id
        and user_id = (select auth.uid())
        and role = 'owner'
        and archived_at is null
    )
  );

grant select, insert, update on public.farm_integrations to authenticated;

-- -----------------------------------------------------------------------------
-- pending_crop_mappings
-- When Hortus sends a harvest for a crop name we've never seen, we queue it
-- here so the farmer can link it to a Communicare product with one tap.
-- Resolved rows are soft-deleted (resolved_at set).
-- -----------------------------------------------------------------------------
create table public.pending_crop_mappings (
  id                  bigint generated always as identity primary key,
  farm_id             uuid not null references public.farms (id) on delete cascade,
  hortus_crop_name    text not null,
  hortus_variety      text,
  -- Gemini confidence + best guess (populated by hortus-webhook function)
  gemini_confidence   numeric(4,3),                          -- 0.000 – 1.000
  suggested_product_id bigint references public.products (id) on delete set null,
  -- Farmer's confirmed choice
  resolved_product_id bigint references public.products (id) on delete set null,
  resolved_at         timestamptz,
  -- Raw harvest payload stored so we can re-apply once the farmer maps it
  raw_payload         jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (farm_id, hortus_crop_name)  -- one pending row per unique crop name
);

alter table public.pending_crop_mappings enable row level security;

create index pending_crop_mappings_farm_idx
  on public.pending_crop_mappings (farm_id)
  where resolved_at is null;

create policy "pending_crop_mappings: staff read" on public.pending_crop_mappings for select
  to authenticated using ( public.is_farm_staff(farm_id) );

create policy "pending_crop_mappings: staff update" on public.pending_crop_mappings for update
  to authenticated
  using ( public.is_farm_staff(farm_id) )
  with check ( public.is_farm_staff(farm_id) );

grant select, update on public.pending_crop_mappings to authenticated;

-- -----------------------------------------------------------------------------
-- integration_webhook_log
-- Append-only record of every outbound and inbound webhook for debugging.
-- -----------------------------------------------------------------------------
create table public.integration_webhook_log (
  id          bigint generated always as identity primary key,
  direction   text not null check (direction in ('outbound', 'inbound')),
  partner     text not null default 'hortus',
  event       text not null,
  farm_id     uuid references public.farms (id) on delete set null,
  status_code int,
  payload     jsonb,
  error       text,
  created_at  timestamptz not null default now()
);

alter table public.integration_webhook_log enable row level security;

create index integration_webhook_log_farm_idx
  on public.integration_webhook_log (farm_id, created_at desc);

-- Staff can read their own farm's log
create policy "integration_webhook_log: staff read" on public.integration_webhook_log for select
  to authenticated using ( public.is_farm_staff(farm_id) );

grant select on public.integration_webhook_log to authenticated;

-- =============================================================================
-- pg_net trigger: fire webhook to Hortus when a farm is published
-- =============================================================================
-- This fires on UPDATE to farms where is_published flips true.
-- It calls the Hortus Edge Function `communicare-webhook` with a signed payload.
--
-- HMAC signing is done in the Edge Function (Deno runtime) not in Postgres —
-- pg_net doesn't have crypto primitives. Instead we pass a pre-shared secret
-- header that the receiver checks. For production, rotate to proper HMAC via
-- an intermediary Edge Function if needed.
-- =============================================================================

create or replace function public.notify_hortus_farm_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_webhook_url text;
  v_secret      text;
  v_payload     jsonb;
  v_request_id  bigint;
begin
  -- Only fire when is_published flips from false → true
  if (old.is_published = true) then
    return new;
  end if;
  if (new.is_published = false) then
    return new;
  end if;

  v_webhook_url := current_setting('app.hortus_webhook_url', true);
  v_secret      := current_setting('app.hortus_webhook_secret', true);

  if v_webhook_url is null or v_secret is null then
    -- Secrets not configured; skip silently (dev environment)
    return new;
  end if;

  v_payload := jsonb_build_object(
    'event',         'farm.published',
    'farm_id',       new.id,
    'name',          new.name,
    'slug',          new.slug,
    'kind',          new.kind,
    'location',      new.location,
    'tagline',       new.tagline,
    'subscribe_url', 'https://communicare.farm/farm/' || new.slug,
    'published_at',  now()
  );

  select extensions.http_post(
    url     := v_webhook_url,
    body    := v_payload::text,
    headers := jsonb_build_object(
      'Content-Type',            'application/json',
      'X-Communicare-Secret',    v_secret,
      'X-Communicare-Event',     'farm.published'
    )::extensions.http_header[]
  ) into v_request_id;

  -- Log the outbound attempt (non-blocking; ignore failure)
  insert into public.integration_webhook_log
    (direction, partner, event, farm_id, payload)
  values
    ('outbound', 'hortus', 'farm.published', new.id, v_payload);

  return new;
exception when others then
  -- Never block the farm update due to webhook failure
  return new;
end;
$$;

create trigger farms_notify_hortus_published
  after update of is_published on public.farms
  for each row
  execute function public.notify_hortus_farm_published();

-- Also fire when a published farm is archived (unpublish)
create or replace function public.notify_hortus_farm_unpublished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_webhook_url text;
  v_secret      text;
begin
  -- Only fire when archived_at is newly set on a published farm
  if (old.archived_at is not null) then return new; end if;
  if (new.archived_at is null) then return new; end if;
  if (new.is_published = false) then return new; end if;

  v_webhook_url := current_setting('app.hortus_webhook_url', true);
  v_secret      := current_setting('app.hortus_webhook_secret', true);

  if v_webhook_url is null or v_secret is null then return new; end if;

  perform extensions.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'event',   'farm.unpublished',
      'farm_id', new.id,
      'slug',    new.slug
    )::text,
    headers := jsonb_build_object(
      'Content-Type',         'application/json',
      'X-Communicare-Secret', v_secret,
      'X-Communicare-Event',  'farm.unpublished'
    )::extensions.http_header[]
  );

  return new;
exception when others then
  return new;
end;
$$;

create trigger farms_notify_hortus_unpublished
  after update of archived_at on public.farms
  for each row
  execute function public.notify_hortus_farm_unpublished();
