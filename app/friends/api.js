// Friends + presence client for the static site.
//
// Talks straight to the existing Supabase project (same URL/key and same
// signed-in session as the rest of the site: app/session.js). No extra SDK and
// no second session store: every call uses the player's current access token,
// so Row Level Security decides what each player can see and change.
//
// Schema contract (supabase/migrations/20261016_friends.sql):
//   profiles(id, username, display_name, last_seen_at, created_at)
//   friends(id, requester_id, recipient_id, status pending|accepted|blocked, blocked_by, ...)
//   view my_friends(friendship_id, status, created_at, direction, friend_id,
//                   username, display_name, last_seen_at, is_online)
//   rpc touch_presence()
import { readSession, restoreSession, updateCallsign } from "../session";
import { supabaseKey, supabaseUrl } from "../site-data";

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const PRESENCE_INTERVAL_MS = 60 * 1000;

const CALLSIGN_RULE = /^[A-Za-z0-9][A-Za-z0-9 ._-]*[A-Za-z0-9]$/;

export function cleanCallsign(raw) {
  return String(raw || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validCallsign(name) {
  return name.length >= 3 && name.length <= 24 && !name.includes("@") && CALLSIGN_RULE.test(name);
}

function friendlyError(status, payload) {
  const code = payload?.code || "";
  if (code === "42P01" || code === "PGRST205" || code === "PGRST202" || code === "42883") {
    return "Friends are not switched on yet. Check back soon.";
  }
  if (payload?.hint === "friend_requests_off" || /not accepting friend requests/i.test(payload?.message || "")) {
    return "That player is not taking friend requests right now.";
  }
  if (code === "23505") return "You already have a request or friendship with that player.";
  if (code === "23514") return "That request is not allowed.";
  if (code === "42501" || status === 403) return "That action is not allowed.";
  if (status === 401) return "Your sign-in expired. Sign in again.";
  return payload?.message || payload?.msg || "Could not reach the friends service.";
}

async function token() {
  let session = null;
  try {
    session = await restoreSession();
  } catch {
    session = null;
  }
  session = session || readSession();
  if (!session?.access_token || !session?.user?.id) {
    const error = new Error("Sign in to use friends.");
    error.status = 401;
    throw error;
  }
  return session;
}

async function rest(path, { method = "GET", body, prefer, session } = {}) {
  const active = session || (await token());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(`${supabaseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${active.access_token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(error?.name === "AbortError" ? "The friends service took too long. Try again." : "Could not reach the friends service.");
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }
  if (!response.ok) {
    const error = new Error(friendlyError(response.status, payload));
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

// ---- profile -------------------------------------------------------------

export async function loadMyProfile() {
  const session = await token();
  const rows = await rest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,username,display_name,last_seen_at`,
    { session }
  );
  return { session, profile: Array.isArray(rows) && rows[0] ? rows[0] : null };
}

// First login without a profile row (or without a username): create/repair the
// row, then reuse the site's own callsign save so auth metadata and the
// callsign sign-in lookup stay in sync.
export async function claimCallsign(raw) {
  const name = cleanCallsign(raw);
  if (!validCallsign(name)) throw new Error("Use 3 to 24 letters or numbers, with no @ sign.");
  const session = await token();
  try {
    await rest("/rest/v1/profiles?on_conflict=id", {
      method: "POST",
      session,
      prefer: "resolution=merge-duplicates,return=minimal",
      body: { id: session.user.id, username: name, display_name: name },
    });
  } catch (error) {
    if (error.code === "23505") throw new Error("That callsign is already taken.");
    throw error;
  }
  try {
    await updateCallsign(session, name);
  } catch {
    // The profile row is what friends need; metadata sync can retry later.
  }
  return name;
}

// ---- presence ------------------------------------------------------------

export async function touchPresence() {
  await rest("/rest/v1/rpc/touch_presence", { method: "POST", body: {}, prefer: "return=minimal" });
}

export function isOnline(row, now = Date.now()) {
  if (typeof row?.is_online === "boolean") return row.is_online;
  const seen = row?.last_seen_at ? Date.parse(row.last_seen_at) : NaN;
  return Number.isFinite(seen) && now - seen < ONLINE_WINDOW_MS;
}

// ---- friends -------------------------------------------------------------

// Returns { friends, incoming, outgoing, blocked } from the my_friends view.
export async function loadFriends() {
  const session = await token();
  const rows = (await rest("/rest/v1/my_friends?select=*&order=created_at.desc", { session })) || [];
  let blockedByMe = new Set();
  if (rows.some((row) => row.status === "blocked")) {
    const blocks = await rest(
      `/rest/v1/friends?status=eq.blocked&blocked_by=eq.${encodeURIComponent(session.user.id)}&select=id`,
      { session }
    );
    blockedByMe = new Set((blocks || []).map((row) => row.id));
  }
  const now = Date.now();
  const byName = (a, b) => (a.username || a.display_name || "").localeCompare(b.username || b.display_name || "");
  const friends = rows
    .filter((row) => row.status === "accepted")
    .map((row) => ({ ...row, online: isOnline(row, now) }))
    .sort((a, b) => Number(b.online) - Number(a.online) || byName(a, b));
  return {
    friends,
    incoming: rows.filter((row) => row.status === "pending" && row.direction === "incoming"),
    outgoing: rows.filter((row) => row.status === "pending" && row.direction === "outgoing"),
    // Blocks placed by the other player stay invisible to this player.
    blocked: rows.filter((row) => row.status === "blocked" && blockedByMe.has(row.friendship_id)).sort(byName),
  };
}

function likeExact(value) {
  // Case-insensitive exact match: escape LIKE wildcards in the callsign.
  return value.replace(/[\\%_*]/g, (c) => `\\${c}`);
}

export async function findPlayer(raw) {
  const name = cleanCallsign(raw);
  if (!validCallsign(name)) throw new Error("Enter a callsign: 3 to 24 letters or numbers.");
  const query = `?select=id,username,display_name&username=ilike.${encodeURIComponent(likeExact(name))}&limit=5`;
  let rows;
  try {
    // Preferred: the narrow directory view (safe columns only).
    rows = await rest(`/rest/v1/player_directory${query}`);
  } catch (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") throw error;
    // Fallback for a schema where profiles itself is readable by every player.
    rows = await rest(`/rest/v1/profiles${query}`);
  }
  const lower = name.toLowerCase();
  return (rows || []).find((row) => String(row.username || "").toLowerCase() === lower) || null;
}

// Send a request by callsign. If that player already asked us, accept instead.
export async function sendRequest(raw, current) {
  const session = await token();
  const player = await findPlayer(raw);
  if (!player) throw new Error("No player uses that callsign.");
  if (player.id === session.user.id) throw new Error("That is you.");
  const all = [...(current?.friends || []), ...(current?.incoming || []), ...(current?.outgoing || []), ...(current?.blocked || [])];
  const existing = all.find((row) => row.friend_id === player.id);
  if (existing?.status === "accepted") throw new Error(`You and ${player.username || player.display_name} are already friends.`);
  if (existing?.status === "blocked") throw new Error("Unblock that player first.");
  if (existing?.direction === "outgoing") throw new Error("Request already sent.");
  if (existing?.direction === "incoming") {
    await acceptRequest(existing.friendship_id);
    return { player, accepted: true };
  }
  await rest("/rest/v1/friends", {
    method: "POST",
    session,
    prefer: "return=minimal",
    body: { requester_id: session.user.id, recipient_id: player.id, status: "pending" },
  });
  return { player, accepted: false };
}

export async function acceptRequest(friendshipId) {
  await rest(`/rest/v1/friends?id=eq.${encodeURIComponent(friendshipId)}&status=eq.pending`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { status: "accepted" },
  });
}

// Decline (incoming), cancel (outgoing), remove (accepted) and unblock (my block)
// are all the same thing: the row goes away.
export async function deleteFriendship(friendshipId) {
  await rest(`/rest/v1/friends?id=eq.${encodeURIComponent(friendshipId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

export async function blockFriendship(friendshipId) {
  const session = await token();
  await rest(`/rest/v1/friends?id=eq.${encodeURIComponent(friendshipId)}`, {
    method: "PATCH",
    session,
    prefer: "return=minimal",
    body: { status: "blocked", blocked_by: session.user.id },
  });
}

// ---- v2: settings, player cards, suggestions, counts ----------------------
// Every call below degrades gracefully: before klyra-friends-v2.sql is applied
// the RPCs do not exist (PGRST202 / 404) and callers get `null` / [] back.

function missingRpc(error) {
  return error?.status === 404 || ["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(error?.code);
}

async function anonRest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: supabaseKey,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (!response.ok) {
    const error = new Error(friendlyError(response.status, payload));
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

export async function loadSettings() {
  try {
    const value = await rest("/rest/v1/rpc/friend_settings", { method: "POST", body: {} });
    if (!value || typeof value !== "object") return { available: true, hide_presence: false, allow_friend_requests: true };
    return { available: true, hide_presence: !!value.hide_presence, allow_friend_requests: value.allow_friend_requests !== false };
  } catch (error) {
    if (missingRpc(error)) return { available: false, hide_presence: false, allow_friend_requests: true };
    throw error;
  }
}

export async function saveSettings(changes) {
  try {
    const value = await rest("/rest/v1/rpc/set_friend_settings", {
      method: "POST",
      body: {
        p_hide_presence: changes.hide_presence ?? null,
        p_allow_friend_requests: changes.allow_friend_requests ?? null,
      },
    });
    return { available: true, hide_presence: !!value?.hide_presence, allow_friend_requests: value?.allow_friend_requests !== false };
  } catch (error) {
    if (missingRpc(error)) throw new Error("Privacy settings switch on soon.");
    throw error;
  }
}

// Player card by callsign. Signed in: uses the player's token (adds relationship
// info). Signed out: uses the public key (card only). Returns
// { card, available } where card is null when nobody uses that callsign.
export async function loadPlayerCard(raw, { signedIn = true } = {}) {
  const name = cleanCallsign(raw);
  if (!name) return { card: null, available: true };
  try {
    const body = { p_username: name };
    const card = signedIn
      ? await rest("/rest/v1/rpc/player_card", { method: "POST", body })
      : await anonRest("/rest/v1/rpc/player_card", { method: "POST", body });
    return { card: card && typeof card === "object" ? card : null, available: true };
  } catch (error) {
    if (!missingRpc(error) && error?.status !== 401) throw error;
    // Before the SQL runs: fall back to the directory (signed-in only).
    if (signedIn && validCallsign(name)) {
      try {
        const player = await findPlayer(name);
        if (player) return { card: { username: player.username, display_name: player.display_name, id: player.id }, available: false };
        return { card: null, available: false };
      } catch {
        // fall through
      }
    }
    return { card: validCallsign(name) ? { username: name, display_name: name, unverified: true } : null, available: false };
  }
}

export async function loadRecentlyPlayed() {
  try {
    const rows = await rest("/rest/v1/rpc/recently_played_with", { method: "POST", body: { p_limit: 8 } });
    return { available: true, rows: Array.isArray(rows) ? rows : [] };
  } catch (error) {
    if (missingRpc(error)) return { available: false, rows: [] };
    throw error;
  }
}

export function inviteLink(callsign) {
  return `https://klyra.lol/add/?u=${encodeURIComponent(callsign || "")}`;
}

// Nav badge: let the site-wide script know the pending count changed.
export function announceRequests(count) {
  if (typeof window === "undefined") return;
  window.__klyraFriendRequests = Math.max(0, Number(count) || 0);
  window.dispatchEvent(new Event("klyra-friend-requests"));
}

// Editable player card (favorite faction + bio). Before the SQL runs the
// columns and set_player_card() do not exist: { available: false }.
export function cleanBio(raw) {
  return String(raw || "").replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim().slice(0, 160);
}

export async function loadMyCard(username) {
  if (!username) return { available: false, card: null };
  try {
    const card = await rest("/rest/v1/rpc/player_card", { method: "POST", body: { p_username: username } });
    if (!card || typeof card !== "object" || !("bio" in card) || !("favorite_faction" in card)) return { available: false, card: card || null };
    return { available: true, card };
  } catch (error) {
    if (missingRpc(error)) return { available: false, card: null };
    throw error;
  }
}

export async function saveMyCard({ favorite_faction, bio }) {
  try {
    const value = await rest("/rest/v1/rpc/set_player_card", {
      method: "POST",
      body: { p_favorite_faction: favorite_faction || "none", p_bio: cleanBio(bio) || null },
    });
    return { favorite_faction: value?.favorite_faction || null, bio: value?.bio || null };
  } catch (error) {
    if (missingRpc(error)) throw new Error("Editing your card switches on soon.");
    throw error;
  }
}

// Nav badge + /account card: small summary of the caller's my_friends rows.
export async function loadFriendSummary() {
  const rows = (await rest("/rest/v1/my_friends?select=status,direction,is_online")) || [];
  const friends = rows.filter((row) => row.status === "accepted");
  return {
    friends: friends.length,
    online: friends.filter((row) => row.is_online === true).length,
    requests: rows.filter((row) => row.status === "pending" && row.direction === "incoming").length,
  };
}
