// Challenge links: build + track + lap time + a compact lap recording, all in the URL hash (never sent to the server).
// Format: "#ch=" + base64url( [version=1][flags] + body ), flags bit0 = body is deflate-raw (CompressionStream), else raw.
// body = u16 header length + UTF-8 JSON header {t,c,p,k,ms,n} + n samples as zigzag varints:
//   sample 0 absolute, then deltas; x/z in 5 cm units, heading in 1/1024 turn (wrapped).
const VER = 1, POS = 0.05, HQ = 1024, TAU = Math.PI * 2;
export const CH_LIMITS = { minMs: 5000, maxMs: 600000, maxN: 6000, maxHash: 16000, maxCoord: 3000, maxStep: 10 };
const zz = (v) => (v << 1) ^ (v >> 31), unzz = (u) => (u >>> 1) ^ -(u & 1);
function putVar(out, v) { let u = zz(v) >>> 0; while (u > 0x7f) { out.push((u & 0x7f) | 0x80); u >>>= 7; } out.push(u); }
function getVar(b, o) { let u = 0, s = 0, c; do { if (o.i >= b.length || s > 28) throw new Error("trunc"); c = b[o.i++]; u |= (c & 0x7f) << s; s += 7; } while (c & 0x80); return unzz(u >>> 0); }
const b64u = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = (str) => { if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new Error("charset"); const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4)); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
async function pipe(bytes, Stream, fmt) { const r = new Response(new Blob([bytes]).stream().pipeThrough(new Stream(fmt))); return new Uint8Array(await r.arrayBuffer()); }
const canZip = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

export async function encodeChallenge({ track, car, parts, paint, ms, samples }) {
  const hdr = new TextEncoder().encode(JSON.stringify({ t: track, c: car, p: parts || "", k: paint || "", ms: Math.round(ms), n: samples.length }));
  const out = [hdr.length & 255, hdr.length >> 8, ...hdr];
  let px = 0, pz = 0, ph = 0;
  samples.forEach(([x, z, h], i) => { const qx = Math.round(x / POS), qz = Math.round(z / POS), qh = ((Math.round((h / TAU) * HQ) % HQ) + HQ) % HQ;
    if (i === 0) { putVar(out, qx); putVar(out, qz); putVar(out, qh); } else { putVar(out, qx - px); putVar(out, qz - pz); let dh = qh - ph; if (dh > HQ / 2) dh -= HQ; if (dh < -HQ / 2) dh += HQ; putVar(out, dh); }
    px = qx; pz = qz; ph = qh; });
  let body = new Uint8Array(out), flags = 0;
  if (canZip()) { try { body = await pipe(body, CompressionStream, "deflate-raw"); flags = 1; } catch { body = new Uint8Array(out); } }
  const all = new Uint8Array(body.length + 2); all[0] = VER; all[1] = flags; all.set(body, 2);
  return b64u(all);
}

// Returns a validated, clamped challenge or throws Error(reason). `known` = { tracks:Set, cars:Set }.
export async function decodeChallenge(str, known) {
  const L = CH_LIMITS;
  if (typeof str !== "string" || !str || str.length > L.maxHash) throw new Error("size");
  const all = unb64u(str); if (all.length < 4 || all[0] !== VER) throw new Error("version");
  let body = all.subarray(2);
  if (all[1] & 1) { if (!canZip()) throw new Error("This browser can't open compressed challenge links."); body = await pipe(body, DecompressionStream, "deflate-raw"); }
  if (body.length > 200000) throw new Error("size");
  const hl = body[0] | (body[1] << 8); if (hl < 2 || hl > 2000 || hl + 2 > body.length) throw new Error("header");
  const h = JSON.parse(new TextDecoder().decode(body.subarray(2, 2 + hl)));
  const track = String(h.t || ""), car = String(h.c || ""), parts = String(h.p || ""), paint = String(h.k || "");
  if (!known.tracks.has(track)) throw new Error("track"); if (!known.cars.has(car)) throw new Error("car");
  if (!/^[A-Za-z0-9_.\-]{0,600}$/.test(parts) || !/^[a-z0-9-]{0,64}$/.test(paint)) throw new Error("build");
  const ms = Number(h.ms), n = Number(h.n);
  if (!Number.isFinite(ms) || ms < L.minMs || ms > L.maxMs) throw new Error("time");
  if (!Number.isInteger(n) || n < 10 || n > L.maxN || n > ms / 100 * 2 + 20) throw new Error("samples");
  const o = { i: 2 + hl }, s = []; let qx = 0, qz = 0, qh = 0; const step = L.maxStep / POS, lim = L.maxCoord / POS;
  for (let i = 0; i < n; i++) {
    const a = getVar(body, o), b = getVar(body, o), c = getVar(body, o);
    if (i === 0) { qx = a; qz = b; qh = c; } else { qx += Math.max(-step, Math.min(step, a)); qz += Math.max(-step, Math.min(step, b)); qh += Math.max(-HQ / 2, Math.min(HQ / 2, c)); }
    qx = Math.max(-lim, Math.min(lim, qx)); qz = Math.max(-lim, Math.min(lim, qz)); qh = ((qh % HQ) + HQ) % HQ;
    s.push([qx * POS, qz * POS, (qh / HQ) * TAU]);
  }
  return { track, car, parts, paint, ms, samples: s };
}
