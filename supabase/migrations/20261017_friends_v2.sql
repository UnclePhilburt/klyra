-- KLYRA friends v2: privacy toggles (hide_presence, allow_friend_requests), player cards
-- (favorite_faction + bio), updated my_friends / player lookup. Run after 20261016_friends.sql.
-- profiles stays own-row-only for SELECT (see 20261016_friends.sql).
 begin;
 alter table public.profiles add column if not exists hide_presence boolean not null default false;
 alter table public.profiles add column if not exists allow_friend_requests boolean not null default true;
 alter table public.profiles add column if not exists favorite_faction text;
 alter table public.profiles add column if not exists bio text;
 alter table public.profiles drop constraint if exists profiles_favorite_faction_check;
 alter table public.profiles add constraint profiles_favorite_faction_check check (favorite_faction is null or favorite_faction in ('the-regiment', 'kin-of-the-hollow', 'blackline-group'));
 alter table public.profiles drop constraint if exists profiles_bio_check;
 alter table public.profiles add constraint profiles_bio_check check (bio is null or (char_length(bio) between 1 and 160 and bio = btrim(bio) and bio !~ '[[:cntrl:]]'));
 grant update (favorite_faction, bio) on public.profiles to authenticated;
 create or replace function public.profiles_sync_display_name()
 returns trigger language plpgsql set search_path = public as $$
 begin
  if new.username is not null then
    new.display_name := new.username;
  end if;
  return new;
 end $$;
 revoke all on function public.profiles_sync_display_name() from public, anon, authenticated;
 drop trigger if exists profiles_sync_display_name on public.profiles;
 create trigger profiles_sync_display_name before insert or update of username, display_name on public.profiles
  for each row execute function public.profiles_sync_display_name();
 update public.profiles set display_name = username where username is not null and display_name is distinct from username;
 create or replace view public.my_friends as
  select f.id as friendship_id,
         f.status,
         f.created_at,
         case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction,
         p.id as friend_id,
         p.username,
         p.display_name,
         case when f.status = 'accepted' and not coalesce(p.hide_presence, false) then p.last_seen_at end as last_seen_at,
         coalesce(f.status = 'accepted' and not coalesce(p.hide_presence, false) and p.last_seen_at > now() - interval '2 minutes', false) as is_online
  from public.friends f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where auth.uid() is not null and auth.uid() in (f.requester_id, f.recipient_id);
 revoke all on public.my_friends from anon, authenticated;
 grant select on public.my_friends to authenticated;
 create or replace function public.friends_respect_privacy()
 returns trigger language plpgsql security definer set search_path = public as $$
 begin
  if new.status = 'pending' and exists (
    select 1 from public.profiles r where r.id = new.recipient_id and r.allow_friend_requests = false
  ) then
    raise exception 'This player is not accepting friend requests' using errcode = 'P0001', hint = 'friend_requests_off';
  end if;
  return new;
 end $$;
 revoke all on function public.friends_respect_privacy() from public, anon, authenticated;
 drop trigger if exists friends_respect_privacy on public.friends;
 create trigger friends_respect_privacy before insert on public.friends
  for each row execute function public.friends_respect_privacy();
 drop function if exists public.friend_settings();
 create function public.friend_settings()
 returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'hide_presence', coalesce(p.hide_presence, false),
    'allow_friend_requests', coalesce(p.allow_friend_requests, true))
  from public.profiles p where p.id = auth.uid();
 $$;
 revoke all on function public.friend_settings() from public, anon;
 grant execute on function public.friend_settings() to authenticated;
 drop function if exists public.set_friend_settings(boolean, boolean);
 create function public.set_friend_settings(p_hide_presence boolean default null, p_allow_friend_requests boolean default null)
 returns jsonb language plpgsql security definer set search_path = public as $$
 begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  update public.profiles
     set hide_presence = coalesce(p_hide_presence, hide_presence),
         allow_friend_requests = coalesce(p_allow_friend_requests, allow_friend_requests)
   where id = auth.uid();
  return public.friend_settings();
 end $$;
 revoke all on function public.set_friend_settings(boolean, boolean) from public, anon;
 grant execute on function public.set_friend_settings(boolean, boolean) to authenticated;
 drop function if exists public.player_card(text);
 create function public.player_card(p_username text)
 returns jsonb language plpgsql stable security definer set search_path = public as $$
 declare
  me uuid := auth.uid();
  pj jsonb;
  sj jsonb;
  pid uuid;
  rel text := 'none';
  dir text;
  fid bigint;
  blocker uuid;
  hidden boolean;
  open_requests boolean;
  show_presence boolean := false;
  shut_out boolean := false;
 begin
  if p_username is null or length(btrim(p_username)) < 1 then
    return null;
  end if;
  select to_jsonb(x) into pj from public.profiles x
   where x.username is not null and lower(x.username) = lower(btrim(p_username)) limit 1;
  if pj is null then
    return null;
  end if;
  pid := (pj->>'id')::uuid;
  select to_jsonb(s) into sj from public.player_stats s where s.player_id = pid;
  hidden := coalesce((pj->>'hide_presence')::boolean, false);
  open_requests := coalesce((pj->>'allow_friend_requests')::boolean, true);
  if me is not null then
    if me = pid then
      rel := 'self';
      show_presence := true;
    else
      select f.id, f.status::text, case when f.requester_id = me then 'outgoing' else 'incoming' end, f.blocked_by
        into fid, rel, dir, blocker
        from public.friends f
       where (f.requester_id = me and f.recipient_id = pid) or (f.recipient_id = me and f.requester_id = pid)
       limit 1;
      if not found then
        rel := 'none';
        fid := null;
        dir := null;
      elsif rel = 'blocked' and blocker is distinct from me then
        rel := 'none';
        fid := null;
        dir := null;
        open_requests := false;
        shut_out := true;
      end if;
      show_presence := rel = 'accepted' and not hidden;
    end if;
  end if;
  return jsonb_build_object(
    'id', case when me is not null then pid end,
    'username', pj->>'username',
    'display_name', pj->>'username',
    'faction', pj->>'favorite_faction',
    'favorite_faction', pj->>'favorite_faction',
    'bio', case when shut_out then null else pj->>'bio' end,
    'member_since', pj->>'created_at',
    'relationship', rel,
    'direction', dir,
    'friendship_id', fid,
    'accepts_requests', open_requests,
    'last_seen_at', case when show_presence then pj->>'last_seen_at' end,
    'is_online', case when show_presence then coalesce((pj->>'last_seen_at')::timestamptz > now() - interval '2 minutes', false) end,
    'stats', case when sj is null then null else jsonb_build_object(
      'kills', coalesce((sj->>'kills')::bigint, 0),
      'deaths', coalesce((sj->>'deaths')::bigint, 0),
      'revives', coalesce((sj->>'revives')::bigint, 0),
      'wins', coalesce((sj->>'wins')::bigint, 0),
      'losses', coalesce((sj->>'losses')::bigint, 0),
      'matches', coalesce((sj->>'matches')::bigint, coalesce((sj->>'wins')::bigint, 0) + coalesce((sj->>'losses')::bigint, 0)),
      'cash_earned', coalesce((sj->>'cash_earned')::bigint, 0)) end);
 end $$;
 revoke all on function public.player_card(text) from public;
 grant execute on function public.player_card(text) to anon, authenticated;
 drop function if exists public.recently_played_with(integer);
 create function public.recently_played_with(p_limit integer default 8)
 returns jsonb language plpgsql stable security definer set search_path = public as $$
 declare
  me uuid := auth.uid();
  result jsonb := '[]'::jsonb;
 begin
  if me is null or to_regclass('public.match_participants') is null then
    return result;
  end if;
  begin
    execute $q$
      select coalesce(jsonb_agg(to_jsonb(t) order by t.matches_together desc, t.username), '[]'::jsonb)
      from (
        select p.username, p.display_name, count(distinct other.match_id)::integer as matches_together
        from public.match_participants mine
        join public.match_participants other
          on other.match_id = mine.match_id and other.player_id::text <> mine.player_id::text
        join public.profiles p on p.id::text = other.player_id::text
        where mine.player_id::text = $1::text
          and p.username is not null
          and coalesce(p.allow_friend_requests, true)
          and not exists (
            select 1 from public.friends f
             where (f.requester_id = $1 and f.recipient_id = p.id) or (f.recipient_id = $1 and f.requester_id = p.id))
        group by p.username, p.display_name
        order by count(distinct other.match_id) desc, p.username
        limit greatest(1, least(coalesce($2, 8), 20))
      ) t
    $q$ into result using me, p_limit;
  exception when others then
    result := '[]'::jsonb;
  end;
  return coalesce(result, '[]'::jsonb);
 end $$;
 revoke all on function public.recently_played_with(integer) from public, anon;
 grant execute on function public.recently_played_with(integer) to authenticated;
 drop function if exists public.set_player_card(text, text);
 create function public.set_player_card(p_favorite_faction text default null, p_bio text default null)
 returns jsonb language plpgsql security definer set search_path = public as $$
 declare
  me uuid := auth.uid();
  f text := nullif(lower(btrim(coalesce(p_favorite_faction, ''))), '');
  b text := nullif(btrim(regexp_replace(coalesce(p_bio, ''), '[[:cntrl:][:space:]]+', ' ', 'g')), '');
  r jsonb;
 begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if f = 'none' then
    f := null;
  end if;
  if f is not null and f not in ('the-regiment', 'kin-of-the-hollow', 'blackline-group') then
    raise exception 'Pick The Regiment, Kin of the Hollow, Blackline Group or none' using errcode = '22023', hint = 'bad_faction';
  end if;
  if char_length(b) > 160 then
    raise exception 'Keep your bio to 160 characters' using errcode = '22001', hint = 'bio_too_long';
  end if;
  update public.profiles set favorite_faction = f, bio = b where id = me
   returning jsonb_build_object('favorite_faction', favorite_faction, 'bio', bio) into r;
  if r is null then
    raise exception 'Pick a callsign first' using errcode = 'P0002';
  end if;
  return r;
 end $$;
 revoke all on function public.set_player_card(text, text) from public, anon;
 grant execute on function public.set_player_card(text, text) to authenticated;
 commit;
