begin;
alter table public.cosmetic_catalog add column if not exists kind text not null default 'character';
alter table public.cosmetic_catalog drop constraint if exists cosmetic_catalog_kind_rule;
alter table public.cosmetic_catalog add constraint cosmetic_catalog_kind_rule check (kind in ('character', 'weapon'));
insert into public.cosmetic_catalog (id, display_name, unity_resource, price_cents, supporter_exclusive, active, square_catalog_id, allowed_teams, kind) values
 ('supporter_midas_ak47', 'Midas AK-47', 'Gold AK-47', null, true, true, null, array['red','green','blue'], 'weapon'),
 ('supporter_sunfire_rpg7', 'Sunfire RPG-7', 'Gold RPG', null, true, true, null, array['red','green','blue'], 'weapon')
on conflict (id) do update set display_name = excluded.display_name, unity_resource = excluded.unity_resource,
 price_cents = excluded.price_cents, supporter_exclusive = excluded.supporter_exclusive, active = excluded.active,
 square_catalog_id = excluded.square_catalog_id, allowed_teams = excluded.allowed_teams, kind = excluded.kind;
commit;
