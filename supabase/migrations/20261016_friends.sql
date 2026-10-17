-- KLYRA friends + presence. Run once in the Supabase SQL Editor (project xmmjygblrinaqtqtcrin).
-- Re-runnable. Works on top of the existing profiles table (game repo:
-- supabase/migrations/20261009113000_player_accounts.sql).
--
-- IMPORTANT: profiles keeps its own-row-only SELECT policy on purpose.
-- api.klyra.lol desktop-access.js reads `profiles?select=*` with the player's
-- token and grants desktop access if ANY returned row has
-- supporter_complimentary = true. A "select all profiles" policy would hand
-- every signed-in player free desktop access. Other players are found through
-- the narrow player_directory view instead (id, username, display_name only).
begin;

-- 1. Presence column + case-insensitive unique callsigns -------------------
alter table public.profiles add column if not exists last_seen_at timestamptz;
-- Fails if two callsigns differ only by case. Check first with:
--   select lower(username), count(*) from public.profiles where username is not null group by 1 having count(*) > 1;
create unique index if not exists profiles_username_ci on public.profiles (lower(username));

-- First login without a profile row: let a player insert their own row.
-- (The existing on_auth_user_created trigger normally creates it already.)
drop policy if exists "Players can insert their profile" on public.profiles;
create policy "Players can insert their profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- 2. Public directory: only safe columns of every profile -------------------
-- Plain (owner-rights) view, so it can see every row while exposing 3 columns.
create or replace view public.player_directory as
  select id, username, display_name from public.profiles where username is not null;
revoke all on public.player_directory from anon, authenticated;
grant select on public.player_directory to authenticated;

-- 3. Friendships -------------------------------------------------------------
do $$ begin
  create type public.friend_status as enum ('pending', 'accepted', 'blocked');
exception when duplicate_object then null; end $$;

create table if not exists public.friends (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status public.friend_status not null default 'pending',
  blocked_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friends_no_self check (requester_id <> recipient_id),
  constraint friends_block_owner check (
    (status = 'blocked' and blocked_by in (requester_id, recipient_id))
    or (status <> 'blocked' and blocked_by is null))
);
-- One row per pair, whichever direction it was sent.
create unique index if not exists friends_pair_unique
  on public.friends (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists friends_recipient_idx on public.friends (recipient_id);

-- Ids never change; only pending->accepted, pending->blocked, accepted->blocked.
create or replace function public.friends_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.requester_id <> old.requester_id or new.recipient_id <> old.recipient_id or new.id <> old.id then
    raise exception 'Friendship participants cannot change';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status in ('accepted', 'blocked'))
    or (old.status = 'accepted' and new.status = 'blocked')) then
    raise exception 'Invalid friendship change: % -> %', old.status, new.status using errcode = '23514';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists friends_guard on public.friends;
create trigger friends_guard before update on public.friends
  for each row execute function public.friends_guard();

alter table public.friends enable row level security;
revoke all on public.friends from anon, authenticated;
grant select, insert, update, delete on public.friends to authenticated;
grant all on public.friends to service_role;

drop policy if exists friends_select on public.friends;
create policy friends_select on public.friends for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));

drop policy if exists friends_insert on public.friends;
create policy friends_insert on public.friends for insert to authenticated
  with check (requester_id = auth.uid() and (
    (status = 'pending' and blocked_by is null) or (status = 'blocked' and blocked_by = auth.uid())));

drop policy if exists friends_recipient_answer on public.friends;
create policy friends_recipient_answer on public.friends for update to authenticated
  using (recipient_id = auth.uid() and status = 'pending')
  with check (recipient_id = auth.uid() and (
    (status = 'accepted' and blocked_by is null) or (status = 'blocked' and blocked_by = auth.uid())));

drop policy if exists friends_block_friend on public.friends;
create policy friends_block_friend on public.friends for update to authenticated
  using (auth.uid() in (requester_id, recipient_id) and status = 'accepted')
  with check (auth.uid() in (requester_id, recipient_id) and status = 'blocked' and blocked_by = auth.uid());

drop policy if exists friends_delete on public.friends;
create policy friends_delete on public.friends for delete to authenticated
  using (auth.uid() in (requester_id, recipient_id) and (status <> 'blocked' or blocked_by = auth.uid()));

-- 4. Presence heartbeat (website every 60 s; the game can call it too) ------
create or replace function public.touch_presence()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
revoke all on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

-- 5. The caller's friendships, with the other player's name and presence -----
-- Owner-rights view filtered to auth.uid(): it must read other players'
-- last_seen_at, which profiles RLS hides. Presence only shows for accepted friends.
create or replace view public.my_friends as
  select f.id as friendship_id,
         f.status,
         f.created_at,
         case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction,
         p.id as friend_id,
         p.username,
         p.display_name,
         case when f.status = 'accepted' then p.last_seen_at end as last_seen_at,
         coalesce(f.status = 'accepted' and p.last_seen_at > now() - interval '2 minutes', false) as is_online
  from public.friends f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where auth.uid() is not null and auth.uid() in (f.requester_id, f.recipient_id);
revoke all on public.my_friends from anon, authenticated;
grant select on public.my_friends to authenticated;

commit;
