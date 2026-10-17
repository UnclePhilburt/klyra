# Friends + presence

Website: `/friends/` (app/friends/). Uses the existing Supabase project and the
site's existing sign-in (app/session.js). No new backend, no new dependency.

## Turn it on
1. Run `supabase/migrations/20261016_friends.sql` in the Supabase SQL Editor.
   It keeps `profiles` readable only by its owner (desktop-access.js on
   api.klyra.lol relies on that) and adds a narrow `player_directory` view.
2. Build + deploy the site as usual.
Before step 1 the page shows "Friends are not switched on yet" and the presence
heartbeat fails silently.

## Data model
- `profiles.last_seen_at` (new column) + case-insensitive unique callsigns.
- `friends(id, requester_id, recipient_id, status pending|accepted|blocked, blocked_by, created_at, updated_at)`;
  one row per pair (either direction), no self-friending, RLS per participant.
- `player_directory` view: id, username, display_name for callsign lookup.
- `my_friends` view: the caller's rows with direction, name, presence, `is_online` (seen < 2 min).
- `touch_presence()` RPC: sets the caller's `last_seen_at = now()`.

## API (game or website). Every call sends
`apikey: <publishable key>` and `Authorization: Bearer <Supabase access token>`
to `https://xmmjygblrinaqtqtcrin.supabase.co`.

| Action | Request |
| --- | --- |
| Report presence (every ~60 s) | `POST /rest/v1/rpc/touch_presence` body `{}` |
| Friends list (+ online) | `GET /rest/v1/my_friends?select=*&status=eq.accepted` |
| Pending requests | `GET /rest/v1/my_friends?select=*&status=eq.pending` (`direction` incoming/outgoing) |
| Find player | `GET /rest/v1/player_directory?select=id,username,display_name&username=ilike.<callsign>` |
| Send request | `POST /rest/v1/friends` `{"requester_id":"<me>","recipient_id":"<them>","status":"pending"}` |
| Accept | `PATCH /rest/v1/friends?id=eq.<id>&status=eq.pending` `{"status":"accepted"}` |
| Decline / cancel / remove / unblock | `DELETE /rest/v1/friends?id=eq.<id>` |
| Block | `PATCH /rest/v1/friends?id=eq.<id>` `{"status":"blocked","blocked_by":"<me>"}` |

The Unity client already holds this token (`SupabaseAuthClient.AccessToken`,
`ProjectUrl`, `AnonKey`), so it can call these directly.
