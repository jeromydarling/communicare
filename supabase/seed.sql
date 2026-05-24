-- =============================================================================
-- Communicare — local development seed data
-- =============================================================================
-- Loaded automatically by `supabase db reset`. Mirrors the four sample farms
-- in lib/sample-farms.ts so local dev has data to render.

-- NOTE: Real users come through Supabase Auth (auth.users). To seed users
-- locally, create them via the local Studio at http://127.0.0.1:54323 (Auth
-- tab → Add user) or via `supabase auth admin invite`. This file seeds only
-- the public.* tables that don't require an auth.users FK.

-- Sample farms (public-readable, published)
insert into public.farms (id, slug, name, location, kind, tagline, founder_name, founder_bio, story, is_published)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'elmwood',
    'Elmwood Farm',
    'Athens County, Ohio',
    'vegetable_csa',
    'Six acres of vegetables, two beds of cut flowers, a creek that floods every March.',
    'Rosa & Jakub Sandoval',
    'We bought the farm with no farming experience and a baby in October of 2018. We are still learning.',
    'Elmwood is six acres on the southern slope above Federal Creek. We grow about forty crops over the season — heavy on the alliums and the brassicas, light on the things deer prefer. We have one paid hand, our daughter Lucia, and her wage is split between cash and the right to choose what we plant in the corner field. We do not till. We mulch with leaves the township drops off in November.',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'three-forks',
    'Three Forks Dairy',
    'Park County, Colorado',
    'raw_milk_herd_share',
    'Twelve Jersey cows, grass-fed at 9,000 feet, milked by hand twice a day.',
    'Mary Hoffmeier',
    'Third-generation rancher. I came home in 2014 after a decade in Denver. The cows convinced me to stay.',
    'Three Forks sits in the South Park basin, where the South, Middle, and North forks of the South Platte come together. We keep a small herd of Jersey cows — Daisy, Pearl, Maggie, Buttercup, Ada, Vera, Hazel, Iris, Lucy, Annie, Wren, and June — on rotated pasture from May through October, and on local grass hay through the winter.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'low-creek',
    'Low Creek Ranch',
    'Lewis County, Tennessee',
    'pastured_meat',
    'Grass-fed beef, pastured pork, woodland chicken — raised the way our grandparents would recognize.',
    'Daniel & Naomi Walker',
    'Quit teaching to come home to my grandfather''s land. Naomi runs the kitchen, the books, and most of the chickens.',
    'Two hundred and twelve acres on a quiet bend of Low Creek, half in pasture, half in hardwood. We rotate cattle daily across the open ground, follow them with laying hens to scratch the manure into the field, and run the hogs through the woods to clear understory and finish on acorns in the fall.',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'morning-glory',
    'Morning Glory Gardens',
    'Western Sonoma, California',
    'market_garden',
    'A market garden tended by two women and a borrowed mule.',
    'Lila Tanaka & Frances Park',
    'Met at horticulture school in 2019. Lease the land from an elderly neighbor in exchange for half the lettuce.',
    'Two acres, no-till, hand-worked. We grow forty crops for fifty members, and we sell the surplus at the Saturday market in Sebastopol.',
    true
  );

-- Update Three Forks with herdshare state
update public.farms set herdshare_state = 'CO' where slug = 'three-forks';

-- Pickup sites
insert into public.pickup_sites (farm_id, name, address, day_of_week, window_start, window_end, fee_cents)
values
  ('11111111-1111-1111-1111-111111111111', 'The farm', 'Athens, OH', 2, '15:00', '19:00', 0),
  ('11111111-1111-1111-1111-111111111111', 'Donkey Coffee', 'Court St., Athens OH', 3, '08:00', '12:00', 0),
  ('11111111-1111-1111-1111-111111111111', 'Nelsonville library', 'Nelsonville OH', 3, '16:00', '18:30', 0),
  ('22222222-2222-2222-2222-222222222222', 'The dairy', 'Fairplay CO', 6, '08:00', '11:00', 0),
  ('22222222-2222-2222-2222-222222222222', 'Bailey Library', 'Bailey CO', 3, '16:00', '18:00', 500),
  ('33333333-3333-3333-3333-333333333333', 'The ranch', 'Hohenwald TN', 6, '09:00', '13:00', 0),
  ('33333333-3333-3333-3333-333333333333', 'East Nashville', 'Five Points, Nashville TN', 0, '11:00', '13:00', 1000),
  ('44444444-4444-4444-4444-444444444444', 'Farm gate', 'Sebastopol CA', 5, '14:00', '18:00', 0),
  ('44444444-4444-4444-4444-444444444444', 'Pongo''s Kitchen', 'Petaluma CA', 6, '09:00', '12:00', 0);

-- Share definitions
insert into public.share_definitions
  (farm_id, name, description, cadence, billing_model, price_per_pickup_cents, season_price_cents, season_starts_on, season_ends_on)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'The standard share',
    '7–10 items each week, plus pick-your-own herbs and cherry tomatoes through August.',
    'weekly', 'season_upfront', 3600, 62000,
    '2026-05-19', '2026-10-13'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Quarter Beef',
    'Approximately 90–110 lbs of cut meat, your choice of cuts on the butcher form.',
    'on_demand', 'season_upfront', null, 100000,
    null, null
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Half share',
    '5–7 items each week for 28 weeks, with Friday pick-your-own flowers.',
    'weekly', 'season_upfront', null, 42000,
    '2026-05-01', '2026-11-15'
  );

-- Three Forks: herd-share share definition with boarding fee
insert into public.share_definitions
  (farm_id, name, description, cadence, billing_model, monthly_price_cents, share_purchase_cents, allotment_per_period)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '1/30th cow share',
    'A 1/30th share entitles you to two gallons of raw milk per week, year-round.',
    'monthly', 'monthly_boarding_fee', 11500, 22000, '2 gallons per week'
  );

-- A handful of products
insert into public.products (farm_id, name, description, kind, price_cents, unit_label, inventory_cap, inventory_now)
values
  ('11111111-1111-1111-1111-111111111111', 'Lacinato kale', 'Bunch, ~3/4 lb', 'fixed', 400, 'bunch', 80, 80),
  ('11111111-1111-1111-1111-111111111111', 'Pastured eggs', 'One dozen', 'fixed', 800, 'dozen', 40, 28),
  ('22222222-2222-2222-2222-222222222222', 'Raw cream', '1/2 gallon (members only)', 'fixed', 1800, 'half-gallon', 10, 10),
  ('33333333-3333-3333-3333-333333333333', 'Half hog', 'By hanging weight', 'catch_weight', 595, 'lb', 6, 6),
  ('33333333-3333-3333-3333-333333333333', 'Dozen eggs', null, 'fixed', 700, 'dozen', 40, 40),
  ('44444444-4444-4444-4444-444444444444', 'Mixed bouquet', 'Field-cut, seasonal', 'fixed', 1500, 'bouquet', 30, 30);

-- Default farm_homepages (the AI-generated content stub)
insert into public.farm_homepages (farm_id, version, content, is_published, published_at, generated_by)
values
  (
    '11111111-1111-1111-1111-111111111111',
    1,
    '{"heroHeadline": "Six acres of vegetables, kept by hand.", "tagline": "Twenty-two weeks of greens, roots, and tomatoes from a small farm on the south slope above the creek.", "about": "We grow about forty crops over the season — heavy on the alliums and the brassicas, light on the things deer prefer."}'::jsonb,
    true,
    now(),
    'manual-seed'
  );
