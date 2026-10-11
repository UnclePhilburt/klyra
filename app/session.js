import { supabaseKey, supabaseUrl } from "./site-data";

const STORAGE_KEY = "klyra.account";

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!session || !session.refresh_token) return null;
    return session;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("klyra-session"));
  return session;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("klyra-session"));
}

export function callsignOf(session) {
  const profile = session?.profile;
  const meta = session?.user?.user_metadata || {};
  return (
    profile?.display_name ||
    profile?.username ||
    meta.display_name ||
    meta.username ||
    (session?.user?.email ? session.user.email.split("@")[0] : "Player")
  );
}

export function memberSince(session) {
  const raw = session?.profile?.created_at || session?.user?.created_at;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function errorMessage(payload) {
  const code = payload?.error_code || "";
  if (code === "invalid_credentials") {
    return "That callsign or email and password did not match.";
  }
  if (code === "email_not_confirmed") {
    return "Confirm the account from your email, then sign in.";
  }
  if (code === "user_already_exists" || code === "email_exists") {
    return "That email already has an account. Sign in instead.";
  }
  return (
    payload?.msg ||
    payload?.message ||
    payload?.error_description ||
    payload?.error ||
    "Could not reach the account service."
  );
}

async function authFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token || supabaseKey}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(errorMessage(payload));
    error.status = response.status;
    throw error;
  }

  return payload;
}

function packAuth(auth, previous = {}) {
  const expiresIn = Number(auth.expires_in || 3600);
  const user = auth.user || previous.user || null;
  return {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token || previous.refresh_token,
    expires_at: nowSeconds() + Math.max(60, expiresIn),
    user: user
      ? {
          id: user.id,
          email: user.email || "",
          created_at: user.created_at || "",
          user_metadata: user.user_metadata || {},
        }
      : null,
    profile: previous.profile || null,
    stats: previous.stats || null,
    stashCount: previous.stashCount ?? null,
    recovery: Boolean(previous.recovery),
  };
}

async function stashCount(token, id) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/player_stash?player_id=eq.${encodeURIComponent(id)}&select=id`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Prefer: "count=exact",
        Range: "0-0",
      },
    }
  );
  if (!response.ok) throw new Error("stash");
  const range = response.headers.get("content-range") || "";
  const total = range.split("/")[1];
  if (total && total !== "*") return Number(total);
  return null;
}

async function hydrate(session) {
  const me = await authFetch("/auth/v1/user", { token: session.access_token });
  const next = {
    ...session,
    user: {
      id: me.id,
      email: me.email || "",
      created_at: me.created_at || "",
      user_metadata: me.user_metadata || {},
    },
  };

  try {
    const rows = await authFetch(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(me.id)}&select=username,display_name,created_at`,
      { token: session.access_token }
    );
    next.profile = Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    next.profile = session.profile || null;
  }

  try {
    const rows = await authFetch(
      `/rest/v1/player_stats?player_id=eq.${encodeURIComponent(me.id)}&select=kills,deaths,revives,wins,losses,cash_earned`,
      { token: session.access_token }
    );
    next.stats = Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    next.stats = null;
  }

  try {
    next.stashCount = await stashCount(session.access_token, me.id);
  } catch {
    next.stashCount = null;
  }

  return next;
}

async function refresh(session) {
  const auth = await authFetch("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: session.refresh_token },
  });
  return packAuth(auth, session);
}

export function captureAuthHash() {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw || !raw.includes("access_token")) return null;
  const params = new URLSearchParams(raw);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: nowSeconds() + Number(params.get("expires_in") || 3600),
    user: null,
    profile: null,
    stats: null,
    stashCount: null,
    recovery: params.get("type") === "recovery",
  };
  writeSession(session);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return session;
}

let restoring = null;

async function restoreFresh() {
  let session = readSession();
  if (!session) return null;
  try {
    if (!session.access_token || session.expires_at < nowSeconds() + 90) {
      session = await refresh(session);
    }
    session = await hydrate(session);
    return writeSession(session);
  } catch {
    clearSession();
    return null;
  }
}

export function restoreSession() {
  captureAuthHash();
  if (!readSession()) return Promise.resolve(null);
  if (!restoring) {
    restoring = restoreFresh().finally(() => {
      restoring = null;
    });
  }
  return restoring;
}

async function lookupCallsign(name) {
  const response = await fetch("https://api.klyra.lol/v1/login-name", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.email) {
    throw new Error(payload.message || "No account uses that callsign.");
  }
  return payload.email;
}

async function loginEmail(identifier) {
  const value = identifier.trim();
  if (value.includes("@")) return value;
  return lookupCallsign(value);
}

async function rememberCallsign(session) {
  if (!session?.access_token) return;
  await fetch("https://api.klyra.lol/v1/login-name/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: "{}",
  });
}

export async function signIn(identifier, password) {
  const email = await loginEmail(identifier);
  const auth = await authFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  const session = await hydrate(packAuth(auth));
  writeSession(session);
  rememberCallsign(session).catch(() => {});
  return session;
}

export async function signUp(callsign, email, password) {
  const result = await authFetch("/auth/v1/signup", {
    method: "POST",
    body: {
      email,
      password,
      data: { username: callsign, display_name: callsign },
      email_redirect_to: "https://klyra.lol",
    },
  });

  if (result.access_token && result.refresh_token) {
    const session = await hydrate(packAuth(result));
    writeSession(session);
    rememberCallsign(session).catch(() => {});
    return { session, pending: false };
  }

  return { session: null, pending: true };
}

export async function requestReset(identifier) {
  const email = await loginEmail(identifier);
  await authFetch("/auth/v1/recover", {
    method: "POST",
    body: { email, redirect_to: "https://klyra.lol" },
  });
}

export async function updatePassword(session, password) {
  await authFetch("/auth/v1/user", {
    method: "PUT",
    token: session.access_token,
    body: { password },
  });
  return writeSession({ ...session, recovery: false });
}

export async function signOut(session) {
  if (session?.access_token) {
    try {
      await authFetch("/auth/v1/logout", {
        method: "POST",
        token: session.access_token,
      });
    } catch {
      // The local sign-out still stands if the network call fails.
    }
  }
  clearSession();
}
