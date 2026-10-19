begin;
create table if not exists public.cosmetic_bundles (
 id text primary key,
 display_name text not null,
 price_cents int not null check (price_cents > 0),
 kind text not null default 'pack' check (kind in ('pack', 'weekly')),
 active boolean not null default true,
 sort int not null default 0
);
create table if not exists public.cosmetic_bundle_items (
 bundle_id text not null references public.cosmetic_bundles(id) on delete cascade,
 cosmetic_id text not null references public.cosmetic_catalog(id),
 primary key (bundle_id, cosmetic_id)
);
create table if not exists public.weekly_drops (
 week_date date not null,
 team text not null check (team in ('blue', 'red', 'green')),
 cosmetic_id text not null references public.cosmetic_catalog(id),
 created_at timestamptz not null default now(),
 primary key (week_date, team),
 unique (week_date, cosmetic_id)
);
create table if not exists public.store_orders (
 ref text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 bundle_id text not null references public.cosmetic_bundles(id),
 week_date date,
 items text[] not null,
 expected_cents int not null check (expected_cents > 0),
 currency text not null default 'USD',
 square_order_id text unique,
 square_payment_id text unique,
 status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 refunded_at timestamptz
);
create table if not exists public.payment_grants (
 square_payment_id text not null,
 cosmetic_id text not null references public.cosmetic_catalog(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 grant_ref text not null unique,
 granted_at timestamptz not null default now(),
 primary key (square_payment_id, cosmetic_id)
);
alter table public.cosmetic_bundles enable row level security;
alter table public.cosmetic_bundle_items enable row level security;
alter table public.weekly_drops enable row level security;
alter table public.store_orders enable row level security;
alter table public.payment_grants enable row level security;
revoke all on public.cosmetic_bundles, public.cosmetic_bundle_items, public.weekly_drops, public.store_orders, public.payment_grants from public, anon, authenticated;
grant select on public.cosmetic_bundles, public.cosmetic_bundle_items, public.weekly_drops to anon, authenticated;
grant all on public.cosmetic_bundles, public.cosmetic_bundle_items, public.weekly_drops, public.store_orders, public.payment_grants to service_role;
drop policy if exists cosmetic_bundles_public_read on public.cosmetic_bundles;
create policy cosmetic_bundles_public_read on public.cosmetic_bundles for select to anon, authenticated using (true);
drop policy if exists cosmetic_bundle_items_public_read on public.cosmetic_bundle_items;
create policy cosmetic_bundle_items_public_read on public.cosmetic_bundle_items for select to anon, authenticated using (true);
drop policy if exists weekly_drops_public_read on public.weekly_drops;
create policy weekly_drops_public_read on public.weekly_drops for select to anon, authenticated using (true);
create or replace function public.bundle_item_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
 if exists(select 1 from public.cosmetic_catalog c where c.id = new.cosmetic_id and (c.supporter_exclusive or c.price_cents is null)) then
  raise exception 'supporter exclusives cannot be bundled';
 end if;
 return new;
end;
$$;
revoke all on function public.bundle_item_guard() from public, anon, authenticated;
drop trigger if exists cosmetic_bundle_items_guard on public.cosmetic_bundle_items;
create trigger cosmetic_bundle_items_guard before insert or update on public.cosmetic_bundle_items for each row execute function public.bundle_item_guard();
drop trigger if exists weekly_drops_guard on public.weekly_drops;
create trigger weekly_drops_guard before insert or update on public.weekly_drops for each row execute function public.bundle_item_guard();
create or replace function public.store_week_date(p_at timestamptz default now())
returns date language sql stable set search_path = public as $$
 select (date_trunc('week', (p_at at time zone 'America/Chicago') - interval '12 hours'))::date;
$$;
create or replace function public.store_week_start(p_week date)
returns timestamptz language sql stable set search_path = public as $$
 select (p_week + time '12:00') at time zone 'America/Chicago';
$$;
grant execute on function public.store_week_date(timestamptz), public.store_week_start(date) to anon, authenticated, service_role;
create or replace function public.weekly_pick(p_week date)
returns void language plpgsql security definer set search_path = public as $$
declare
 t text;
 picked text[] := '{}';
 recent text[];
 choice text;
begin
 if exists(select 1 from public.weekly_drops where week_date = p_week) then return; end if;
 select coalesce(array_agg(cosmetic_id), '{}') into recent from public.weekly_drops where week_date in (p_week - 7, p_week - 14);
 foreach t in array array['blue', 'red', 'green'] loop
  select c.id into choice from public.cosmetic_catalog c
  where c.active and not c.supporter_exclusive and c.price_cents is not null and t = any(c.allowed_teams) and not (c.id = any(picked))
  order by (c.id = any(recent)), md5(p_week::text || ':' || t || ':' || c.id)
  limit 1;
  if choice is null then return; end if;
  picked := picked || choice;
 end loop;
 insert into public.weekly_drops (week_date, team, cosmetic_id)
 select p_week, x.team, x.cosmetic_id from unnest(array['blue', 'red', 'green'], picked) as x(team, cosmetic_id)
 on conflict do nothing;
end;
$$;
revoke all on function public.weekly_pick(date) from public, anon, authenticated;
grant execute on function public.weekly_pick(date) to service_role;
create or replace function public.current_weekly_drop()
returns table (week_date date, starts_at timestamptz, ends_at timestamptz, server_now timestamptz, team text, cosmetic_id text)
language plpgsql security definer set search_path = public as $$
declare w date := public.store_week_date(now());
begin
 perform public.weekly_pick(w - 14);
 perform public.weekly_pick(w - 7);
 perform public.weekly_pick(w);
 return query
 select w, public.store_week_start(w), public.store_week_start(w + 7), now(), d.team, d.cosmetic_id
 from public.weekly_drops d where d.week_date = w
 order by array_position(array['blue', 'red', 'green'], d.team);
end;
$$;
revoke all on function public.current_weekly_drop() from public;
grant execute on function public.current_weekly_drop() to anon, authenticated, service_role;
create or replace function public.bundle_items_now(p_bundle text)
returns text[] language plpgsql security definer set search_path = public as $$
declare
 b public.cosmetic_bundles%rowtype;
 result text[];
begin
 select * into b from public.cosmetic_bundles where id = p_bundle;
 if not found then return null; end if;
 if b.kind = 'weekly' then
  select array_agg(x.cosmetic_id order by array_position(array['blue', 'red', 'green'], x.team)) into result from public.current_weekly_drop() x;
 else
  select array_agg(i.cosmetic_id order by i.cosmetic_id) into result
  from public.cosmetic_bundle_items i join public.cosmetic_catalog c on c.id = i.cosmetic_id
  where i.bundle_id = p_bundle and c.active and not c.supporter_exclusive and c.price_cents is not null;
 end if;
 return coalesce(result, '{}');
end;
$$;
revoke all on function public.bundle_items_now(text) from public, anon, authenticated;
grant execute on function public.bundle_items_now(text) to service_role;
create or replace function public.bundle_quote(p_user uuid, p_bundle text)
returns table (bundle_id text, display_name text, kind text, base_cents int, price_cents int, items text[], owned text[], purchasable boolean, week_date date)
language plpgsql security definer set search_path = public as $$
declare
 b public.cosmetic_bundles%rowtype;
 its text[];
 own text[];
 n_own int;
 n_new int;
begin
 select * into b from public.cosmetic_bundles where id = p_bundle;
 if not found then return; end if;
 its := public.bundle_items_now(p_bundle);
 select coalesce(array_agg(pc.cosmetic_id), '{}') into own from public.player_cosmetics pc
 where p_user is not null and pc.user_id = p_user and pc.revoked_at is null and pc.cosmetic_id = any(its);
 n_own := coalesce(array_length(own, 1), 0);
 n_new := coalesce(array_length(its, 1), 0) - n_own;
 return query select b.id, b.display_name, b.kind, b.price_cents,
  case when n_new > 0 then least(b.price_cents, greatest(b.price_cents - 199 * n_own, 199 * n_new)) else null end,
  its, own, b.active and n_new > 0,
  case when b.kind = 'weekly' then public.store_week_date(now()) else null end;
end;
$$;
revoke all on function public.bundle_quote(uuid, text) from public, anon, authenticated;
grant execute on function public.bundle_quote(uuid, text) to service_role;
create or replace function public.my_bundle_quotes()
returns table (bundle_id text, display_name text, kind text, base_cents int, price_cents int, items text[], owned text[], purchasable boolean, week_date date)
language sql security definer set search_path = public as $$
 select q.* from public.cosmetic_bundles b cross join lateral public.bundle_quote(auth.uid(), b.id) q
 where b.active order by b.sort, b.id;
$$;
revoke all on function public.my_bundle_quotes() from public;
grant execute on function public.my_bundle_quotes() to anon, authenticated, service_role;
create or replace function public.create_bundle_order(p_user uuid, p_bundle text, p_ref text)
returns table (ok boolean, reason text, expected_cents int, items text[], display_name text, week_date date)
language plpgsql security definer set search_path = public as $$
declare q record;
begin
 if p_user is null or coalesce(p_ref, '') = '' then return query select false, 'invalid', null::int, null::text[], null::text, null::date; return; end if;
 select * into q from public.bundle_quote(p_user, p_bundle);
 if not found then return query select false, 'not_found', null::int, null::text[], null::text, null::date; return; end if;
 if not q.purchasable then return query select false, case when coalesce(array_length(q.items, 1), 0) = 0 then 'empty' else 'all_owned' end, null::int, q.items, q.display_name, q.week_date; return; end if;
 insert into public.store_orders (ref, user_id, bundle_id, week_date, items, expected_cents, currency)
 values (p_ref, p_user, q.bundle_id, q.week_date, array(select x from unnest(q.items) x where not (x = any(q.owned))), q.price_cents, 'USD');
 return query select true, 'ok', q.price_cents, array(select x from unnest(q.items) x where not (x = any(q.owned))), q.display_name, q.week_date;
end;
$$;
revoke all on function public.create_bundle_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_bundle_order(uuid, text, text) to service_role;
create or replace function public.grant_bundle_payment(p_ref text, p_user uuid, p_payment text, p_order text, p_amount int, p_currency text)
returns text language plpgsql security definer set search_path = public as $$
declare
 o public.store_orders%rowtype;
 item text;
 g text;
 n int;
 added int := 0;
begin
 if coalesce(p_ref, '') = '' or p_user is null or coalesce(p_payment, '') = '' or coalesce(p_order, '') = '' then return 'invalid'; end if;
 select * into o from public.store_orders where ref = p_ref for update;
 if not found then return 'unknown_order'; end if;
 if o.user_id <> p_user then return 'user_mismatch'; end if;
 if o.square_order_id is not null and o.square_order_id <> p_order then return 'order_mismatch'; end if;
 if p_amount is distinct from o.expected_cents or p_currency is distinct from o.currency then return 'amount_mismatch'; end if;
 if o.status = 'paid' then
  if o.square_payment_id = p_payment then return 'already_granted'; end if;
  return 'payment_mismatch';
 end if;
 if o.status = 'refunded' then return 'refunded'; end if;
 if exists(select 1 from public.payment_grants where square_payment_id = p_payment) then return 'already_granted'; end if;
 foreach item in array o.items loop
  if exists(select 1 from public.cosmetic_catalog c where c.id = item and (c.supporter_exclusive or c.price_cents is null)) then continue; end if;
  g := p_payment || ':' || item;
  insert into public.player_cosmetics (user_id, cosmetic_id, square_payment_id, granted_at, revoked_at)
  values (p_user, item, g, now(), null)
  on conflict (user_id, cosmetic_id) do update
  set square_payment_id = excluded.square_payment_id, granted_at = now(), revoked_at = null
  where public.player_cosmetics.revoked_at is not null;
  get diagnostics n = row_count;
  if n > 0 then
   insert into public.payment_grants (square_payment_id, cosmetic_id, user_id, grant_ref) values (p_payment, item, p_user, g) on conflict do nothing;
   added := added + 1;
  end if;
 end loop;
 update public.store_orders set status = 'paid', square_payment_id = p_payment, square_order_id = coalesce(square_order_id, p_order), paid_at = now() where ref = p_ref;
 return 'granted:' || added;
end;
$$;
revoke all on function public.grant_bundle_payment(text, uuid, text, text, int, text) from public, anon, authenticated;
grant execute on function public.grant_bundle_payment(text, uuid, text, text, int, text) to service_role;
create or replace function public.revoke_bundle_payment(p_payment text)
returns text language plpgsql security definer set search_path = public as $$
declare n int;
begin
 if coalesce(p_payment, '') = '' then return 'invalid'; end if;
 update public.player_cosmetics pc set revoked_at = now()
 from public.payment_grants g
 where g.square_payment_id = p_payment and pc.user_id = g.user_id and pc.cosmetic_id = g.cosmetic_id and pc.square_payment_id = g.grant_ref and pc.revoked_at is null;
 get diagnostics n = row_count;
 update public.store_orders set status = 'refunded', refunded_at = now() where square_payment_id = p_payment and status <> 'refunded';
 if n > 0 then return 'revoked:' || n; end if;
 return 'no_change';
end;
$$;
revoke all on function public.revoke_bundle_payment(text) from public, anon, authenticated;
grant execute on function public.revoke_bundle_payment(text) to service_role;
insert into public.cosmetic_bundles (id, display_name, price_cents, kind, active, sort) values
 ('pack_police_station', 'Police Station Pack', 799, 'pack', true, 10),
 ('pack_palm_city', 'Palm City Pack', 999, 'pack', true, 20),
 ('pack_fantasy', 'Fantasy Pack', 899, 'pack', true, 30),
 ('pack_everything', 'Everything Pack', 1999, 'pack', true, 40),
 ('weekly_drop', 'Weekly Drop', 399, 'weekly', true, 0)
on conflict (id) do update set display_name = excluded.display_name, price_cents = excluded.price_cents, kind = excluded.kind, active = excluded.active, sort = excluded.sort;
insert into public.cosmetic_bundle_items (bundle_id, cosmetic_id)
select 'pack_police_station', id from public.cosmetic_catalog where id like 'police\_%' and not supporter_exclusive and price_cents is not null
union all
select 'pack_palm_city', id from public.cosmetic_catalog where id like 'palm\_%' and not supporter_exclusive and price_cents is not null
union all
select 'pack_fantasy', id from public.cosmetic_catalog where id like 'fantasy\_%' and not supporter_exclusive and price_cents is not null
union all
select 'pack_everything', id from public.cosmetic_catalog where not supporter_exclusive and price_cents is not null
on conflict do nothing;
commit;
