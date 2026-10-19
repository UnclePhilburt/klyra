begin;
create table if not exists public.cosmetic_catalog (
 id text primary key,
 display_name text not null,
 unity_resource text not null,
 price_cents int,
 supporter_exclusive boolean not null default false,
 active boolean not null default true,
 square_catalog_id text,
 allowed_teams text[] not null default '{}',
 constraint cosmetic_catalog_price_rule check ((supporter_exclusive and price_cents is null) or (not supporter_exclusive and price_cents is not null and price_cents > 0)),
 constraint cosmetic_catalog_teams_rule check (allowed_teams <@ array['red','green','blue']::text[])
);
create table if not exists public.player_cosmetics (
 user_id uuid not null references auth.users(id) on delete cascade,
 cosmetic_id text not null references public.cosmetic_catalog(id),
 square_payment_id text unique,
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key (user_id, cosmetic_id)
);
alter table public.cosmetic_catalog enable row level security;
alter table public.player_cosmetics enable row level security;
revoke all on public.cosmetic_catalog from public, anon, authenticated;
revoke all on public.player_cosmetics from public, anon, authenticated;
grant select on public.cosmetic_catalog to anon, authenticated;
grant select on public.player_cosmetics to authenticated;
grant all on public.cosmetic_catalog, public.player_cosmetics to service_role;
drop policy if exists cosmetic_catalog_public_read on public.cosmetic_catalog;
create policy cosmetic_catalog_public_read on public.cosmetic_catalog for select to anon, authenticated using (true);
drop policy if exists player_cosmetics_own_read on public.player_cosmetics;
create policy player_cosmetics_own_read on public.player_cosmetics for select to authenticated using (user_id = auth.uid());
create or replace function public.is_paid_supporter(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.supporter_orders o join public.supporter_payments pay on pay.order_id = o.id
 where o.user_id = p_user and o.environment = 'production' and pay.status = 'COMPLETED'
 and pay.currency = 'USD' and pay.amount >= 499 and pay.refunded = 0);
$$;
revoke all on function public.is_paid_supporter(uuid) from public, anon, authenticated;
grant execute on function public.is_paid_supporter(uuid) to service_role;
create or replace function public.grant_player_cosmetic(p_user uuid, p_cosmetic text, p_payment text)
returns text language plpgsql security definer set search_path = public as $$
declare
 c public.cosmetic_catalog%rowtype;
 r public.player_cosmetics%rowtype;
 n int;
begin
 if p_user is null or p_cosmetic is null or coalesce(p_payment, '') = '' then return 'invalid'; end if;
 select * into c from public.cosmetic_catalog where id = p_cosmetic;
 if not found or not c.active or c.supporter_exclusive then return 'not_purchasable'; end if;
 select * into r from public.player_cosmetics where square_payment_id = p_payment;
 if found then
  if r.user_id <> p_user or r.cosmetic_id <> p_cosmetic then return 'payment_mismatch'; end if;
  if r.revoked_at is null then return 'already_granted'; end if;
  return 'revoked';
 end if;
 insert into public.player_cosmetics (user_id, cosmetic_id, square_payment_id, granted_at, revoked_at)
 values (p_user, p_cosmetic, p_payment, now(), null)
 on conflict (user_id, cosmetic_id) do update
 set square_payment_id = excluded.square_payment_id, granted_at = now(), revoked_at = null
 where public.player_cosmetics.revoked_at is not null;
 get diagnostics n = row_count;
 if n > 0 then return 'granted'; end if;
 return 'already_owned';
end;
$$;
revoke all on function public.grant_player_cosmetic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_player_cosmetic(uuid, text, text) to service_role;
create or replace function public.revoke_player_cosmetic_by_payment(p_payment text)
returns text language plpgsql security definer set search_path = public as $$
declare n int;
begin
 if coalesce(p_payment, '') = '' then return 'invalid'; end if;
 update public.player_cosmetics set revoked_at = now() where square_payment_id = p_payment and revoked_at is null;
 get diagnostics n = row_count;
 if n > 0 then return 'revoked'; end if;
 return 'no_change';
end;
$$;
revoke all on function public.revoke_player_cosmetic_by_payment(text) from public, anon, authenticated;
grant execute on function public.revoke_player_cosmetic_by_payment(text) to service_role;
create or replace function public.my_characters()
returns table (cosmetic_id text, source text, granted_at timestamptz)
language sql stable security definer set search_path = public as $$
 select pc.cosmetic_id, 'purchase'::text, pc.granted_at
 from public.player_cosmetics pc
 where auth.uid() is not null and pc.user_id = auth.uid() and pc.revoked_at is null
 union all
 select c.id, 'supporter'::text, null::timestamptz
 from public.cosmetic_catalog c
 where auth.uid() is not null and c.supporter_exclusive and c.active and public.is_paid_supporter(auth.uid());
$$;
revoke all on function public.my_characters() from public, anon;
grant execute on function public.my_characters() to authenticated, service_role;
insert into public.cosmetic_catalog (id, display_name, unity_resource, price_cents, supporter_exclusive, active, square_catalog_id, allowed_teams) values
 ('police_officer_male', 'Officer', 'Police_Officer_Male_01', 199, false, true, null, array['green','blue']),
 ('police_officer_female', 'Officer (Female)', 'Police_Officer_Female_01', 199, false, true, null, array['green','blue']),
 ('police_detective_male', 'Detective', 'Police_Detective_Male_01', 199, false, true, null, array['blue']),
 ('police_detective_female', 'Detective (Female)', 'Police_Detective_Female_01', 199, false, true, null, array['blue']),
 ('police_forensic', 'Forensic Specialist', 'Police_Forensic_01', 199, false, true, null, array['blue']),
 ('police_criminal_male', 'Criminal', 'Police_Criminal_Male_01', 199, false, true, null, array['red']),
 ('police_criminal_female', 'Criminal (Female)', 'Police_Criminal_Female_01', 199, false, true, null, array['red','green']),
 ('palm_city_male', 'City Resident', 'Palm_City_Male_01', 199, false, true, null, array['green']),
 ('palm_city_female', 'City Resident (Female)', 'Palm_City_Female_01', 199, false, true, null, array['green']),
 ('palm_surfer_male', 'Surfer', 'Palm_Surfer_Male_01', 199, false, true, null, array['green']),
 ('palm_surfer_female', 'Surfer (Female)', 'Palm_Surfer_Female_01', 199, false, true, null, array['green']),
 ('palm_gang_male', 'Gang Member', 'Palm_Gang_Male_01', 199, false, true, null, array['red','green']),
 ('palm_gang_female', 'Gang Member (Female)', 'Palm_Gang_Female_01', 199, false, true, null, array['red']),
 ('palm_goon', 'Goon', 'Palm_Goon_01', 199, false, true, null, array['red']),
 ('palm_detective_male', 'Palm City Detective', 'Palm_Detective_Male_01', 199, false, true, null, array['red','blue']),
 ('palm_detective_female', 'Palm City Detective (Female)', 'Palm_Detective_Female_01', 199, false, true, null, array['blue']),
 ('palm_sea_captain_male', 'Sea Captain', 'Palm_SeaCaptain_Male_01', 199, false, true, null, array['blue']),
 ('palm_sea_captain_female', 'Sea Captain (Female)', 'Palm_SeaCaptain_Female_01', 199, false, true, null, array['blue']),
 ('fantasy_barbarian', 'Barbarian', 'Fantasy_Barbarian_01', 199, false, true, null, array['red']),
 ('fantasy_corpse', 'Corpse', 'Fantasy_Corpse_01', 199, false, true, null, array['red']),
 ('fantasy_inquisitor', 'Inquisitor', 'Fantasy_Inquisitor_01', 199, false, true, null, array['blue']),
 ('fantasy_necromancer', 'Necromancer', 'Fantasy_Necromancer_01', 199, false, true, null, array['green']),
 ('fantasy_plague_doctor', 'Plague Doctor', 'Fantasy_Plague_01', 199, false, true, null, array['green']),
 ('fantasy_plague_lord', 'Plague Lord', 'Fantasy_PlagueLord_01', 199, false, true, null, array['red']),
 ('fantasy_undead_01', 'Undead I', 'Fantasy_Undead_01', 199, false, true, null, array['red']),
 ('fantasy_undead_02', 'Undead II', 'Fantasy_Undead_02', 199, false, true, null, array['blue']),
 ('fantasy_apothecary', 'Apothecary', 'Fantasy_Apothecary_01', 199, false, true, null, array['green']),
 ('supporter_blue_knight', 'Knight', 'Fantasy_Knight_01', null, true, true, null, array['blue']),
 ('supporter_red_kingpin', 'Kingpin', 'Palm_Kingpin_01', null, true, true, null, array['red']),
 ('supporter_green_wraith', 'Wraith', 'Fantasy_Wraith_01', null, true, true, null, array['green'])
on conflict (id) do update set display_name = excluded.display_name, unity_resource = excluded.unity_resource,
 price_cents = excluded.price_cents, supporter_exclusive = excluded.supporter_exclusive, active = excluded.active,
 allowed_teams = excluded.allowed_teams;
commit;
