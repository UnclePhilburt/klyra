import { supabaseKey, supabaseUrl } from "../site-data";

const API = process.env.NEXT_PUBLIC_COMMERCE_URL;

async function timed(url, options = {}, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function storeConfig() {
  if (!API) return { enabled: false, bundles: false };
  try {
    const r = await timed(`${API}/characters/config`);
    if (!r.ok) return { enabled: false, bundles: false };
    const data = await r.json().catch(() => ({}));
    return { enabled: data.enabled === true && Number(data.amount) === 199, bundles: data.enabled === true && data.bundles === true };
  } catch {
    return { enabled: false, bundles: false };
  }
}

export async function catalogReady() {
  try {
    const r = await timed(`${supabaseUrl}/rest/v1/cosmetic_catalog?select=id,price_cents,active,supporter_exclusive`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: "application/json" },
    });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => null);
    if (!Array.isArray(rows) || !rows.length) return null;
    return Object.fromEntries(rows.map((row) => [row.id, row]));
  } catch {
    return null;
  }
}

async function paidSupporterFromStatus(session) {
  if (!API) return false;
  try {
    const r = await timed(`${API}/status`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!r.ok) return false;
    const data = await r.json().catch(() => ({}));
    return (data.purchases || []).some(
      (p) => p.status === "COMPLETED" && p.currency === "USD" && Number(p.amount) >= 499 && Number(p.refunded || 0) === 0
    );
  } catch {
    return false;
  }
}

// Ownership comes only from Supabase (and paid Supporter Edition status). URL parameters never count.
export async function ownedCharacters(session) {
  if (!session?.access_token) return { ids: new Set(), supporter: false, ok: true };
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${session.access_token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  try {
    const r = await timed(`${supabaseUrl}/rest/v1/rpc/my_characters`, { method: "POST", headers, body: "{}" });
    if (r.ok) {
      const rows = await r.json().catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      return {
        ids: new Set(list.map((row) => row.cosmetic_id)),
        supporter: list.some((row) => row.source === "supporter"),
        ok: true,
      };
    }
  } catch {}
  try {
    const r = await timed(`${supabaseUrl}/rest/v1/player_cosmetics?select=cosmetic_id&revoked_at=is.null`, { headers });
    if (r.ok) {
      const rows = await r.json().catch(() => []);
      const ids = new Set((Array.isArray(rows) ? rows : []).map((row) => row.cosmetic_id));
      return { ids, supporter: await paidSupporterFromStatus(session), ok: true, partial: true };
    }
  } catch {}
  return { ids: new Set(), supporter: await paidSupporterFromStatus(session), ok: false };
}

export async function startCharacterCheckout(session, cosmeticId) {
  if (!API) throw new Error("The character store is opening soon.");
  const r = await timed(`${API}/characters/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cosmeticId }),
  }, 20000);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.url) throw new Error(data.message || "Could not start checkout. Try again.");
  if (!/^https:\/\/([a-z0-9-]+\.)*(square\.link|square\.site|squareup\.com|squareupsandbox\.com)\//i.test(data.url)) {
    throw new Error("Checkout returned an unexpected address.");
  }
  return data.url;
}

async function rpc(name, session) {
  const token = session?.access_token || supabaseKey;
  const r = await timed(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: "{}",
  });
  if (!r.ok) throw new Error(`rpc ${name} ${r.status}`);
  return r.json();
}

// Packs and the Weekly Drop come from Supabase. Prices here are display only; the worker recomputes them at checkout.
export async function storeBundles(session) {
  try {
    const [quotes, weekly] = await Promise.all([rpc("my_bundle_quotes", session), rpc("current_weekly_drop", session)]);
    if (!Array.isArray(quotes) || !quotes.length) return null;
    const rows = Array.isArray(weekly) ? weekly : [];
    const head = rows[0];
    const week = head
      ? {
          weekDate: head.week_date,
          endsAt: Date.parse(head.ends_at),
          serverNow: Date.parse(head.server_now),
          picks: rows.map((row) => ({ team: row.team, id: row.cosmetic_id })),
        }
      : null;
    return { quotes, week, fetchedAt: typeof performance !== "undefined" ? performance.now() : 0 };
  } catch {
    return null;
  }
}

export async function startBundleCheckout(session, bundleId) {
  if (!API) throw new Error("Packs are opening soon.");
  const r = await timed(`${API}/bundles/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bundleId }),
  }, 20000);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.url) throw new Error(data.message || "Could not start checkout. Try again.");
  if (!/^https:\/\/([a-z0-9-]+\.)*(square\.link|square\.site|squareup\.com|squareupsandbox\.com)\//i.test(data.url)) {
    throw new Error("Checkout returned an unexpected address.");
  }
  return data.url;
}
