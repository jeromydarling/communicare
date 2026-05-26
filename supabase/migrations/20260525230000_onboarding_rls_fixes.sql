-- =============================================================================
-- Onboarding RLS gap fixes
-- =============================================================================
-- Two surfaces of the onboarding + import flow that the initial schema
-- didn't anticipate:
--
--   1. create_farm_for_self RPC. The initial schema blocks farms INSERT
--      from authenticated users entirely (the comment says "service-role
--      flow during signup" but no such function exists). This adds a
--      narrow security-definer RPC that lets a signed-in user create
--      exactly one farm row and bind themselves as its owner, atomically.
--
--   2. import_opening_balance credit_reason. The import-members edge
--      function writes opening balances with reason='import_opening_balance'
--      so they show up as a distinct line in the ledger. The enum didn't
--      include that value — adding it now.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. credit_reason enum addition
-- -----------------------------------------------------------------------------

alter type public.credit_reason add value if not exists 'import_opening_balance';

-- -----------------------------------------------------------------------------
-- 2. create_farm_for_self — RPC for the /farmer/onboarding step 0
-- -----------------------------------------------------------------------------
-- The initial schema deliberately blocks INSERTs on public.farms and on
-- public.farm_members from the authenticated role — its design assumed a
-- service-role-only signup flow that never landed. That left the
-- onboarding wizard with a chicken-and-egg: the first farm_members row
-- can't be inserted by RLS (you have to already be staff to insert one),
-- and the farms row has no insert policy at all.
--
-- Rather than weakening either RLS surface, we expose ONE narrowly-scoped
-- security-definer function that does both inserts in a single
-- transaction, returns the new farm_id, and ONLY ever sets the calling
-- user as owner of the new farm. Authenticated users (and only them)
-- get execute. There is no way to use this to attach yourself to someone
-- else's farm — the user_id is forced to auth.uid() inside the function.
--
-- A user can call this multiple times — operators legitimately run more
-- than one farm. We don't try to limit that here.
-- =============================================================================

create or replace function public.create_farm_for_self(
  p_name      text,
  p_slug      text,
  p_kind      public.farm_kind,
  p_location  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_farm_id uuid;
begin
  -- Refuse anonymous callers explicitly. The function is granted to
  -- `authenticated` only, but defense-in-depth.
  if v_uid is null then
    raise exception 'must be signed in to create a farm'
      using errcode = '42501';
  end if;

  -- Validate the inputs we'll trust — keep this tight, since security
  -- definer bypasses RLS entirely.
  if p_name is null or btrim(p_name) = '' then
    raise exception 'farm name is required' using errcode = '22023';
  end if;
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'farm slug is required' using errcode = '22023';
  end if;
  if p_location is null or btrim(p_location) = '' then
    raise exception 'farm location is required' using errcode = '22023';
  end if;
  if length(p_slug) > 60 or p_slug !~ '^[a-z0-9-]+$' then
    raise exception 'farm slug must be lowercase letters, numbers, and dashes only'
      using errcode = '22023';
  end if;

  insert into public.farms (slug, name, kind, location)
  values (p_slug, btrim(p_name), p_kind, btrim(p_location))
  returning id into v_farm_id;

  insert into public.farm_members (farm_id, user_id, role)
  values (v_farm_id, v_uid, 'owner');

  return v_farm_id;
end;
$$;

comment on function public.create_farm_for_self(text, text, public.farm_kind, text) is
  'Self-service farm creation for the /farmer/onboarding wizard. Creates a public.farms row and binds the calling user (auth.uid()) as its owner in a single transaction. Security definer so it bypasses the RLS gap on farms INSERT — but it can only ever set auth.uid() as owner of the new farm, so it cannot be abused to attach to someone else''s farm.';

-- Only authenticated callers, never anon.
revoke all on function public.create_farm_for_self(text, text, public.farm_kind, text) from public;
grant execute on function public.create_farm_for_self(text, text, public.farm_kind, text)
  to authenticated;
