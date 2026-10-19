"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../useSession";
import CharacterPreview from "./CharacterPreview";
import { CHARACTER_PRICE_CENTS, CHARACTER_PRICE_LABEL, characterById, shopCharacters, teams } from "./characterData";
import { catalogReady, ownedCharacters, storeBundles, storeConfig } from "./storeApi";
import EmbeddedCheckout from "../components/EmbeddedCheckout";
import { WeeklyDrop } from "./BundleShop";

export const RETURN_MESSAGE = "Payment confirmed. Your character is unlocked on your account.";
export const RETURN_MESSAGE_PACK = "Payment confirmed. Your characters are unlocked on your account.";

function TeamTags({ character }) {
  return (
    <ul className="kxCharTeams" aria-label={character.kind === "weapon" ? "Usable by" : "Compatible factions"}>
      {character.teams.map((key) => (
        <li key={key} style={{ "--team": teams[key].color }}>
          <img src={teams[key].logo} alt="" width="16" height="16" loading="lazy" decoding="async" />
          {teams[key].name}
        </li>
      ))}
    </ul>
  );
}

function CharacterCard({ character, owned, signedIn, ready, open, busy, onBuy, focus }) {
  const exclusive = character.exclusive;
  let action;
  if (!ready) {
    action = <span className="kxCharState muted">Checking...</span>;
  } else if (owned) {
    action = <span className="kxCharState owned">OWNED</span>;
  } else if (!signedIn) {
    action = <a className="kxCharBtn ghost" href="/account/">Sign in to buy</a>;
  } else if (!open) {
    action = <button className="kxCharBtn" type="button" disabled>Store opening soon</button>;
  } else {
    action = (
      <button className="kxCharBtn" type="button" disabled={busy} onClick={() => onBuy(character)}>
        {busy ? "Opening checkout..." : "BUY CHARACTER"}
      </button>
    );
  }
  return (
    <article
      id={character.id}
      className={`kxCharCard ${exclusive ? "exclusive" : ""} ${owned ? "isOwned" : ""} ${focus ? "isFocus" : ""}`}
      style={{ "--team": character.accent || teams[character.teams[0]].color }}
      data-kind={character.kind || "character"}
    >
      <CharacterPreview character={character} large={focus} />
      <div className="kxCharInfo">
                <h3>{character.name}</h3>
        {character.blurb ? <p className="kxCharBlurb">{character.blurb}</p> : null}
        <TeamTags character={character} />
        <div className="kxCharBuy">
          <span className="kxCharPrice">{CHARACTER_PRICE_LABEL}</span>
          {action}
        </div>
        {!exclusive && ready && !owned && !signedIn ? <p className="kxCharNote">Sign-in required. Characters are linked to your KLYRA account.</p> : null}
      </div>
    </article>
  );
}

export default function CharacterStore({ focusId = null }) {
  const { session, ready: sessionReady } = useSession();
  const [open, setOpen] = useState(false);
  const [bundlesOpen, setBundlesOpen] = useState(false);
  const [bundles, setBundles] = useState(null);
  const [returnedPack, setReturnedPack] = useState(false);
  const [checked, setChecked] = useState(false);
  const [owned, setOwned] = useState({ ids: new Set(), supporter: false });
  const [ownedReady, setOwnedReady] = useState(false);
  const [returned, setReturned] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    const params = new URLSearchParams(window.location.search);
    setReturned(params.get("checkout") === "returned");
    setReturnedPack(params.get("checkout") === "returned" && params.has("bundle"));
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
    if (live.current) setBundles(data);
  }, [session]);

  const refreshOwned = useCallback(async () => {
    refreshBundles();
    if (!session) {
      setOwned({ ids: new Set(), supporter: false });
      setOwnedReady(true);
      return;
    }
    const result = await ownedCharacters(session);
    if (!live.current) return;
    setOwned({ ids: result.ids, supporter: result.supporter });
    setOwnedReady(true);
  }, [session, refreshBundles]);

  useEffect(() => {
    if (!sessionReady) return;
    refreshOwned();
    const onFocus = () => refreshOwned();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [sessionReady, refreshOwned]);

  useEffect(() => {
    if (!returned || !session) return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      refreshOwned();
      if (n >= 60) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [returned, session, refreshOwned]);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById("focus");
    if (el) el.scrollIntoView({ block: "start" });
  }, [focusId]);

  // Purchases use the shared on-site card form (EmbeddedCheckout). Price is set by the worker.
  const [pending, setPending] = useState(null);
  const onBuy = (character) => {
    if (!session || character.exclusive) return;
    setMessage("");
    setReturned(false);
    setPending({ id: character.id, pack: false, endpoint: "/characters/pay", payload: { cosmeticId: character.id }, amountCents: CHARACTER_PRICE_CENTS, title: character.name, subtitle: "Character skin \u00b7 one time" });
  };

  const onBuyBundle = (quote) => {
    if (!session || quote?.price_cents == null) return;
    setMessage("");
    setReturned(false);
    setPending({ id: quote.bundle_id, pack: true, endpoint: "/bundles/pay", payload: { bundleId: quote.bundle_id, expectedCents: quote.price_cents }, amountCents: quote.price_cents, title: quote.display_name || "Weekly Drop", subtitle: "Character pack \u00b7 one time" });
  };

  const closeCheckout = () => setPending(null);
  const onComplete = () => {
    setReturnedPack(Boolean(pending?.pack));
    setReturned(true);
    setPending(null);
    refreshOwned();
  };

  const signedIn = Boolean(session);
  const ready = sessionReady && checked && ownedReady;
  const isOwned = (ch) => (ch.exclusive ? owned.supporter : owned.ids.has(ch.id));
  const focusChar = focusId ? characterById(focusId) : null;
  const focus = focusChar && !focusChar.exclusive ? focusChar : null;
  const ownedCount = shopCharacters.filter((ch) => isOwned(ch)).length;

  const cardProps = (ch) => ({
    character: ch,
    owned: isOwned(ch),
    signedIn,
    ready,
    open,
    busy: busyId === ch.id,
    onBuy,
  });

  return (
    <div className="kxStore">
      {pending ? (
        <div className="kxCheckoutModal" role="dialog" aria-modal="true" aria-label="Secure checkout" onClick={(e) => { if (e.target === e.currentTarget) closeCheckout(); }}>
          <div className="kxCheckoutPanel">
            <button className="kxCheckoutClose" type="button" aria-label="Close checkout" onClick={closeCheckout}>&times;</button>
            <EmbeddedCheckout key={pending.id} endpoint={pending.endpoint} payload={pending.payload} amountCents={pending.amountCents} title={pending.title} subtitle={pending.subtitle} note="One-time purchase linked to your KLYRA account. Card details are handled securely by Square." onComplete={onComplete} />
          </div>
        </div>
      ) : null}
      {returned ? (
        <div className="kxStoreNotice" role="status">
          <span className="kxStoreNoticeTag">CHECKOUT</span>
          <p>{returnedPack ? RETURN_MESSAGE_PACK : RETURN_MESSAGE}</p>
        </div>
      ) : null}
      {message ? <p className="kxStoreError" role="alert">{message}</p> : null}
      <div className="kxStoreStatus">
        {!sessionReady ? (
          <span>Checking your account...</span>
        ) : signedIn ? (
          <span>Signed in. {ownedReady ? `${ownedCount} character${ownedCount === 1 ? "" : "s"} owned.` : "Loading your characters..."} <a href="/account/#owned-characters">Owned characters &rarr;</a></span>
        ) : (
          <span>Sign in with your KLYRA account to buy characters. <a href="/account/">Sign in &rarr;</a></span>
        )}
        {checked && !open ? <span className="kxStoreSoon">Store opening soon. Browse the lineup now.</span> : null}
      </div>

      {focus ? (
        <section className="kxStoreFocus" id="focus" aria-label={`${focus.name} character`}>
          <CharacterCard {...cardProps(focus)} focus />
          <a className="kxStoreBack" href="/store/#characters">All characters &rarr;</a>
        </section>
      ) : null}


      <WeeklyDrop data={bundles} owned={owned.ids} signedIn={signedIn} ready={ready} open={bundlesOpen} busyId={busyId} onBuy={onBuyBundle} onExpire={refreshBundles} />

      <section className="kxStoreGroup" id="characters" aria-labelledby="shop-chars">
        <header className="kxStoreGroupHead">
          <p className="tag">{shopCharacters.length} characters &middot; {CHARACTER_PRICE_LABEL} each</p>
          <h2 id="shop-chars">Character skins</h2>
          <p>Cosmetic only. Each one shows the factions it can deploy with. One-time purchase, linked to your account and usable in the game.</p>
        </header>
        <div className="kxCharGrid">
          {shopCharacters.map((ch) => <CharacterCard key={ch.id} {...cardProps(ch)} />)}
        </div>
      </section>
    </div>
  );
}
