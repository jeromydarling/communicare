-- Limited-quantity / flash-sale drops for products.
--
-- A "drop" is just a product with is_limited = true and inventory_cap set.
-- FCFS locking happens via an atomic decrement of inventory_now in the SMS
-- claim handler — Postgres serializes the UPDATE so no two members ever
-- claim the same last unit.

alter table public.products
  add column is_limited       boolean     not null default false,
  add column available_through timestamptz;

-- Index that targets the only query the member-facing surfaces care about:
-- "what limited items does this farm currently have on offer?"
create index if not exists products_limited_live_idx
  on public.products (farm_id)
  where is_active and is_limited and not is_sold_out;

-- Case-insensitive name lookup for SMS keyword claims (e.g. "EGGS" matches
-- "Pasture-raised eggs"). We don't introduce a separate keyword column —
-- the product name is the keyword surface, and the SMS reply disambiguates
-- on collision.
create index if not exists products_name_lower_idx
  on public.products (farm_id, lower(name))
  where is_active and is_limited;

comment on column public.products.is_limited is
  'When true, this is a one-shot or seasonal drop: hard inventory_cap, FCFS via SMS, hidden from members once sold out or past available_through.';
comment on column public.products.available_through is
  'Optional season end. After this timestamp the item is hidden from members and shown greyed-out ("out of season") to the farmer.';
