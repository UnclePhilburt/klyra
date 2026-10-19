"use client";

import { useEffect, useRef, useState } from "react";
import CharacterPreview from "./CharacterPreview";
import { characterById, teams } from "./characterData";

const TEAM_ORDER = ["blue", "red", "green"];
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

function useCountdown(week, onExpire) {
  const [left, setLeft] = useState(null);
  const fired = useRef(false);
  useEffect(() => {
    if (!week) return;
    fired.current = false;
    const base = week.endsAt - week.serverNow;
    const start = performance.now();
    const tick = () => {
      const ms = Math.max(0, base - (performance.now() - start));
      setLeft(ms);
      if (ms === 0 && !fired.current) {
        fired.current = true;
        onExpire?.();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [week, onExpire]);
  return left;
}

function Countdown({ ms }) {
  if (ms === null) return null;
  const s = Math.floor(ms / 1000);
  const parts = [
    [Math.floor(s / 86400), "d"],
    [Math.floor((s % 86400) / 3600), "h"],
    [Math.floor((s % 3600) / 60), "m"],
    [s % 60, "s"],
  ];
  return (
    <div className="kxDropTimer" role="timer" aria-live="off" aria-label="Time until the next Weekly Drop">
      <span className="kxDropTimerLabel">Next drop in</span>
      <span className="kxDropTimerDigits">
        {parts.map(([v, u]) => (
          <b key={u}>{String(v).padStart(2, "0")}<small>{u}</small></b>
        ))}
      </span>
      <span className="kxDropTimerNote">Mondays 12:00 PM CT</span>
    </div>
  );
}

function BuyBlock({ quote, base, signedIn, ready, open, busy, onBuy, label = "BUY PACK" }) {
  const discounted = quote?.price_cents != null && quote.price_cents < base;
  let action;
  if (!ready) action = <span className="kxCharState muted">Checking...</span>;
  else if (quote && !quote.purchasable && (quote.owned?.length || 0) > 0) action = <span className="kxCharState owned">ALL OWNED</span>;
  else if (!signedIn) action = <a className="kxCharBtn ghost" href="/account/">Sign in to buy</a>;
  else if (!open) action = <button className="kxCharBtn" type="button" disabled>Store opening soon</button>;
  else action = <button className="kxCharBtn" type="button" disabled={busy} onClick={onBuy}>{busy ? "Opening checkout..." : label}</button>;
  return (
    <div className="kxPackBuy">
      <span className="kxCharPrice">
        {discounted ? <s>{money(base)}</s> : null}
        {quote?.price_cents != null ? money(quote.price_cents) : money(base)}
      </span>
      {action}
    </div>
  );
}

export function WeeklyDrop({ data, owned, signedIn, ready, open, busyId, onBuy, onExpire }) {
  const week = data?.week;
  const left = useCountdown(week, onExpire);
  const quote = data?.quotes.find((q) => q.kind === "weekly");
  if (!week || !quote || !week.picks.length) return null;
  const picks = TEAM_ORDER.map((t) => week.picks.find((p) => p.team === t)).filter(Boolean);
  const ownedHere = picks.filter((p) => owned.has(p.id)).length;
  return (
    <section className="kxStoreGroup kxDrop" id="weekly-drop" aria-labelledby="weekly-drop-title">
      <header className="kxDropHead">
        <div className="kxStoreGroupHead">
          <p className="tag">Weekly Drop &middot; 3 characters &middot; {money(quote.base_cents)}</p>
          <h2 id="weekly-drop-title">This week&apos;s drop</h2>
          <p>One character for each faction, picked fresh every Monday at noon Central. Grab all three together for less than buying them one by one.</p>
        </div>
        <Countdown ms={left} />
      </header>
      <div className="kxDropGrid">
        {picks.map((p) => {
          const ch = characterById(p.id);
          if (!ch) return null;
          const team = teams[p.team];
          const has = owned.has(ch.id);
          return (
            <article key={p.team} className={`kxDropCard ${has ? "isOwned" : ""}`} style={{ "--team": team.color }}>
              <CharacterPreview character={ch} />
              <div className="kxDropInfo">
                <p className="kxDropFor"><img src={team.logo} alt="" width="18" height="18" loading="lazy" decoding="async" />For {team.name}</p>
                <h3>{ch.name}</h3>
                {has ? <span className="kxDropOwned">OWNED</span> : null}
                <a className="kxDropLink" href={`/store/characters/${ch.id}/`}>Details &rarr;</a>
              </div>
            </article>
          );
        })}
      </div>
      <div className="kxDropFoot">
        <p>
          {ownedHere
            ? `You own ${ownedHere} of these. You never pay more than $1.99 for each one you are missing.`
            : "All three are permanent unlocks on your KLYRA account."}
        </p>
        <BuyBlock quote={quote} base={quote.base_cents} signedIn={signedIn} ready={ready} open={open} busy={busyId === quote.bundle_id} onBuy={() => onBuy(quote)} label="BUY ALL 3" />
      </div>
    </section>
  );
}

export function PackShop({ data, signedIn, ready, open, busyId, onBuy }) {
  const packs = (data?.quotes || []).filter((q) => q.kind === "pack");
  if (!packs.length) return null;
  return (
    <section className="kxStoreGroup" id="packs" aria-labelledby="packs-title">
      <header className="kxStoreGroupHead">
        <p className="tag">Packs &middot; Permanent</p>
        <h2 id="packs-title">Character packs</h2>
        <p>Whole sets at a lower price. Already own some? You never pay more than $1.99 for each character you are missing. Supporter exclusives are never in packs.</p>
      </header>
      <div className="kxPackGrid">
        {packs.map((q) => {
          const items = (q.items || []).map(characterById).filter(Boolean);
          const ownedN = q.owned?.length || 0;
          return (
            <article key={q.bundle_id} className={`kxPackCard ${q.bundle_id === "pack_everything" ? "isBig" : ""}`}>
              <div className="kxPackStrip" aria-hidden="true">
                {items.slice(0, q.bundle_id === "pack_everything" ? 14 : 11).map((ch) => (
                  <img key={ch.id} src={ch.poster} alt="" loading="lazy" decoding="async" width="60" height="80" style={{ "--team": teams[ch.teams[0]].color }} />
                ))}
              </div>
              <div className="kxPackInfo">
                <h3>{q.display_name}</h3>
                <p className="kxPackCount">
                  {items.length} characters{ownedN ? ` · you own ${ownedN}` : ""}
                </p>
                <p className="kxPackNames">{items.map((ch) => ch.name).join(" · ")}</p>
                <BuyBlock quote={q} base={q.base_cents} signedIn={signedIn} ready={ready} open={open} busy={busyId === q.bundle_id} onBuy={() => onBuy(q)} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
