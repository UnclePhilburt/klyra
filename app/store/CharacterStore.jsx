"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../useSession";
import EmbeddedCheckout from "../components/EmbeddedCheckout";
import { CHARACTER_PRICE_CENTS, CHARACTER_PRICE_LABEL, characterById, shopCharacters, teams } from "./characterData";
import { loreFor } from "./characterLore";
import { catalogReady, ownedCharacters, storeBundles, storeConfig } from "./storeApi";

const TEAM_ORDER = ["blue", "red", "green"];
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

let mvLoader = null;
function loadModelViewer() {
  if (typeof window === "undefined" || window.customElements?.get("model-viewer")) return Promise.resolve();
  if (!mvLoader) {
    mvLoader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "/vendor/model-viewer.min.js";
      s.onload = () => customElements.whenDefined("model-viewer").then((El) => {
        try { El.dracoDecoderLocation = "/vendor/draco/"; } catch {}
        resolve();
      });
      s.onerror = () => { mvLoader = null; reject(new Error("3D unavailable")); };
      document.head.appendChild(s);
    });
  }
  return mvLoader;
}

// The only 3D model on the page. Thumbnails are lazy webp posters.
function HeroStage({ character, live3d }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!live3d) return;
    let alive = true;
    loadModelViewer().then(() => alive && setReady(true)).catch(() => {});
    return () => { alive = false; };
  }, [live3d]);
  useEffect(() => {
    setLoaded(false);
    const mv = ref.current?.querySelector("model-viewer");
    if (!mv) return;
    const done = () => {
      setLoaded(true);
      if (mv.availableAnimations?.length) {
        mv.animationName = mv.availableAnimations[0];
        mv.play({ repetitions: Infinity });
      }
    };
    mv.addEventListener("load", done);
    return () => mv.removeEventListener("load", done);
  }, [ready, character.id]);
  return (
    <div ref={ref} className={`kgStage ${loaded ? "isLoaded" : ""}`} onContextMenu={(e) => e.preventDefault()}>
      <img className="kgStagePoster" src={character.poster} alt="" width="480" height="640" decoding="async" fetchPriority="high" />
      {ready ? (
        <model-viewer
          key={character.id}
          src={character.model}
          alt={`${character.name}, drag to spin`}
          camera-controls=""
          touch-action="pan-y"
          disable-zoom=""
          disable-pan=""
          auto-rotate=""
          auto-rotate-delay="1500"
          rotation-per-second="14deg"
          interaction-prompt="none"
          camera-orbit="20deg 82deg auto"
          camera-target="auto auto auto"
          field-of-view="auto"
          bounds="tight"
          min-camera-orbit="auto 60deg auto"
          max-camera-orbit="auto 100deg auto"
          shadow-intensity="1"
          shadow-softness="0.9"
          environment-image="neutral"
          style={{ width: "100%", height: "100%", background: "transparent", "--poster-color": "transparent" }}
        />
      ) : null}
    </div>
  );
}

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
      if (ms === 0 && !fired.current) { fired.current = true; onExpire?.(); }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [week, onExpire]);
  return left;
}

function Clock({ ms }) {
  if (ms === null) return <div className="kgClock" aria-hidden="true" />;
  const s = Math.floor(ms / 1000);
  const parts = [[Math.floor(s / 86400), "d"], [Math.floor((s % 86400) / 3600), "h"], [Math.floor((s % 3600) / 60), "m"], [s % 60, "s"]];
  return (
    <div className="kgClock" role="timer" aria-live="off" aria-label="Time until the next Weekly Drop">
      {parts.map(([v, u]) => <b key={u}>{String(v).padStart(2, "0")}<small>{u}</small></b>)}
    </div>
  );
}

// Horizontal row: wheel scrolls sideways, mouse drag scrolls (a drag never selects), arrows page it, touch flicks natively.
function ThumbRow({ children }) {
  const track = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);
  const [edges, setEdges] = useState({ left: false, right: true });
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * (e.deltaMode === 1 ? 32 : 1) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("wheel", onWheel); window.removeEventListener("resize", update); };
  }, [update]);
  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, id: e.pointerId };
    moved.current = false;
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!moved.current && Math.abs(dx) > 6) {
      moved.current = true;
      track.current.setPointerCapture?.(d.id);
      track.current.classList.add("isDragging");
    }
    if (moved.current) track.current.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    track.current?.classList.remove("isDragging");
  };
  const onClickCapture = (e) => {
    if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; }
  };
  const page = (dir) => {
    const el = track.current;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };
  return (
    <div className={`kgRow ${edges.left ? "fadeL" : ""} ${edges.right ? "fadeR" : ""}`}>
      <button type="button" className="kgArrow left" aria-label="Scroll characters left" onClick={() => page(-1)} disabled={!edges.left}>&#8249;</button>
      <div ref={track} className="kgRowTrack" onScroll={update} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onClickCapture={onClickCapture} onDragStart={(e) => e.preventDefault()}>
        {children}
      </div>
      <button type="button" className="kgArrow right" aria-label="Scroll characters right" onClick={() => page(1)} disabled={!edges.right}>&#8250;</button>
    </div>
  );
}

function Thumb({ character, active, owned, onPick, team }) {
  return (
    <button type="button" className={`kgThumb ${active ? "isActive" : ""} ${owned ? "isOwned" : ""}`} style={{ "--team": teams[team || character.teams[0]].color }} onClick={() => onPick(character)} aria-pressed={active} aria-label={character.name}>
      <img src={character.poster} alt="" width="240" height="320" loading="lazy" decoding="async" />
      <span>{character.name}</span>
      {owned ? <em>Owned</em> : null}
    </button>
  );
}

export default function CharacterStore({ focusId = null }) {
  const { session, ready: sessionReady } = useSession();
  const [open, setOpen] = useState(false);
  const [bundlesOpen, setBundlesOpen] = useState(false);
  const [bundles, setBundles] = useState(null);
  const [bundlesTried, setBundlesTried] = useState(false);
  const [checked, setChecked] = useState(false);
  const [owned, setOwned] = useState(new Set());
  const [ownedReady, setOwnedReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(null);
  const focusChar = focusId ? characterById(focusId) : null;
  const [selected, setSelected] = useState(focusChar && !focusChar.exclusive ? focusChar : null);
  const [loreOpen, setLoreOpen] = useState(false);
  const live = useRef(true);
  const weekSeen = useRef(null);

  useEffect(() => {
    live.current = true;
    Promise.all([storeConfig(), catalogReady()]).then(([config, catalog]) => {
      if (!live.current) return;
      setOpen(Boolean(config.enabled && catalog));
      setBundlesOpen(Boolean(config.enabled && config.bundles && catalog));
      setChecked(true);
    });
    return () => { live.current = false; };
  }, []);

  const refreshBundles = useCallback(async () => {
    const data = await storeBundles(session);
    if (live.current) { setBundles(data); setBundlesTried(true); }
  }, [session]);

  const refreshOwned = useCallback(async () => {
    refreshBundles();
    if (!session) { setOwned(new Set()); setOwnedReady(true); return; }
    const result = await ownedCharacters(session);
    if (!live.current) return;
    setOwned(result.ids);
    setOwnedReady(true);
  }, [session, refreshBundles]);

  useEffect(() => {
    if (!sessionReady) return;
    refreshOwned();
    const onFocus = () => refreshOwned();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [sessionReady, refreshOwned]);

  const quote = bundles?.quotes?.find((q) => q.kind === "weekly") || null;
  const week = bundles?.week || null;
  const dropPicks = useMemo(() => {
    if (!week) return [];
    return TEAM_ORDER.map((t) => week.picks.find((p) => p.team === t)).filter(Boolean)
      .map((p) => ({ team: p.team, ch: characterById(p.id) })).filter((p) => p.ch && !p.ch.exclusive);
  }, [week]);

  // When a new week arrives, the hero swaps to the new drop.
  useEffect(() => {
    if (!week) return;
    if (weekSeen.current && weekSeen.current !== week.weekDate) setSelected(null);
    weekSeen.current = week.weekDate;
  }, [week]);

  const left = useCountdown(week, refreshBundles);
  const hero = selected || dropPicks[0]?.ch || shopCharacters[0];
  const signedIn = Boolean(session);
  const ready = sessionReady && checked && ownedReady;

  const pick = (ch) => {
    setSelected(ch);
    setLoreOpen(false);
    setNotice("");
    const heroEl = document.getElementById("kg-hero");
    if (heroEl && heroEl.getBoundingClientRect().top < 0) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buyCharacter = (ch) => {
    if (!session || ch.exclusive) return;
    setNotice("");
    setPending({ id: ch.id, pack: false, endpoint: "/characters/pay", payload: { cosmeticId: ch.id }, amountCents: CHARACTER_PRICE_CENTS, title: ch.name, subtitle: "Character \u00b7 one time" });
  };
  const buyDrop = () => {
    if (!session || quote?.price_cents == null) return;
    setNotice("");
    setPending({ id: quote.bundle_id, pack: true, endpoint: "/bundles/pay", payload: { bundleId: quote.bundle_id, expectedCents: quote.price_cents }, amountCents: quote.price_cents, title: quote.display_name || "Weekly Drop", subtitle: "3 characters \u00b7 one time" });
  };
  const onComplete = () => {
    setNotice(pending?.pack ? "Payment confirmed. Your characters are unlocked." : "Payment confirmed. Your character is unlocked.");
    setPending(null);
    refreshOwned();
  };

  let action = null;
  if (selected) {
    const has = owned.has(selected.id);
    if (!ready) action = <span className="kgState">Checking...</span>;
    else if (has) action = <span className="kgState owned">Owned</span>;
    else if (!signedIn) action = <a className="kgBuy ghost" href="/account/">Sign in to buy</a>;
    else if (!open) action = <button className="kgBuy" type="button" disabled>Opening soon</button>;
    else action = <button className="kgBuy" type="button" onClick={() => buyCharacter(selected)}>Buy</button>;
  }

  let dropAction;
  const dropAllOwned = quote && !quote.purchasable && (quote.owned?.length || 0) > 0;
  if (!ready) dropAction = <span className="kgState">Checking...</span>;
  else if (dropAllOwned) dropAction = <span className="kgState owned">All owned</span>;
  else if (!signedIn) dropAction = <a className="kgBuy ghost" href="/account/">Sign in to buy</a>;
  else if (!bundlesOpen) dropAction = <button className="kgBuy" type="button" disabled>Opening soon</button>;
  else dropAction = <button className="kgBuy loud" type="button" onClick={buyDrop}>Buy all 3</button>;

  const others = shopCharacters.filter((ch) => ch.id !== hero.id);

  return (
    <div className="kgStore">
      {pending ? (
        <div className="kxCheckoutModal" role="dialog" aria-modal="true" aria-label="Secure checkout" onClick={(e) => { if (e.target === e.currentTarget) setPending(null); }}>
          <div className="kxCheckoutPanel">
            <button className="kxCheckoutClose" type="button" aria-label="Close checkout" onClick={() => setPending(null)}>&times;</button>
            <EmbeddedCheckout key={pending.id} endpoint={pending.endpoint} payload={pending.payload} amountCents={pending.amountCents} title={pending.title} subtitle={pending.subtitle} note="One-time purchase linked to your KLYRA account. Card details are handled securely by Square." onComplete={onComplete} />
          </div>
        </div>
      ) : null}

      <section id="kg-hero" className="kgHero" style={{ "--team": teams[hero.teams[0]].color }} aria-label={hero.name}>
        <div className="kgHeroStage" key={hero.id}>
          <HeroStage character={hero} live3d={bundlesTried || Boolean(selected)} />
        </div>
        <div className="kgHeroInfo">
          {!selected && dropPicks.length ? <p className="kgKicker">This week&apos;s drop</p> : null}
          <h2>{hero.name}</h2>
          <button type="button" className={`kgLore ${loreOpen ? "isOpen" : ""}`} onClick={() => setLoreOpen((v) => !v)} aria-expanded={loreOpen}>
            <span>{loreFor(hero.id)}</span>
          </button>
          {selected ? (
            <div className="kgPriceRow">
              <span className="kgPrice">{CHARACTER_PRICE_LABEL}</span>
              {action}
            </div>
          ) : null}
          {notice ? <p className="kgNotice" role="status">{notice}</p> : null}
        </div>
      </section>

      <section aria-label="Characters">
        <ThumbRow>
          {others.map((ch) => <Thumb key={ch.id} character={ch} owned={owned.has(ch.id)} onPick={pick} />)}
        </ThumbRow>
      </section>

      {quote && dropPicks.length ? (
        <section className="kgDrop" id="weekly-drop" aria-labelledby="kg-drop-title">
          <div className="kgDropHead">
            <p className="kgDropTag">Weekly Drop</p>
            <h2 id="kg-drop-title">Three soldiers. One week.</h2>
            <Clock ms={left} />
          </div>
          <div className="kgDropPicks">
            {dropPicks.map(({ team, ch }) => (
              <Thumb key={team} character={ch} team={team} active={selected?.id === ch.id} owned={owned.has(ch.id)} onPick={pick} />
            ))}
          </div>
          <div className="kgDropBuy">
            <span className="kgPrice">
              {quote.price_cents != null && quote.price_cents < quote.base_cents ? <s>{money(quote.base_cents)}</s> : null}
              {money(quote.price_cents ?? quote.base_cents)}
            </span>
            {dropAction}
          </div>
        </section>
      ) : null}
    </div>
  );
}
