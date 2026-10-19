"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../useSession";
import CharacterPreview from "./CharacterPreview";
import { CHARACTER_PRICE_LABEL, characterById, shopCharacters, supporterExclusives, teams } from "./characterData";
import { catalogReady, ownedCharacters, startBundleCheckout, startCharacterCheckout, storeBundles, storeConfig } from "./storeApi";
import { WeeklyDrop } from "./BundleShop";

export const RETURN_MESSAGE = "Payment received. Your character will unlock after Square confirms the payment.";
export const RETURN_MESSAGE_PACK = "Payment received. Your characters will unlock after Square confirms the payment.";

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
  } else if (exclusive) {
    action = <a className="kxCharBtn ghost" href="/support/#buy">Get Supporter Edition</a>;
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
        {exclusive ? <p className="kxCharFlag">SUPPORTER EXCLUSIVE{character.kind === "weapon" ? " · WEAPON" : ""}</p> : null}
        <h3>{character.name}</h3>
        {character.blurb ? <p className="kxCharBlurb">{character.blurb}</p> : null}
        <TeamTags character={character} />
        <div className="kxCharBuy">
          <span className="kxCharPrice">{exclusive ? "Included with Supporter Edition" : CHARACTER_PRICE_LABEL}</span>
          {action}
        </div>
        {!exclusive && ready && !owned && !signedIn ? <p className="kxCharNote">Sign-in required. Characters are linked to your KLYRA account.</p> : null}
        {exclusive && ready && !owned ? <p className="kxCharNote">Only for verified Supporter Edition owners. Not sold separately.</p> : null}
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

  const onBuy = async (character) => {
    if (!session || character.exclusive) return;
    setBusyId(character.id);
    setMessage("");
    try {
      const url = await startCharacterCheckout(session, character.id);
      window.location.assign(url);
    } catch (error) {
      setMessage(error.message || "Could not start checkout. Try again.");
      setBusyId(null);
    }
  };

  const onBuyBundle = async (quote) => {
    if (!session) return;
    setBusyId(quote.bundle_id);
    setMessage("");
    try {
      const url = await startBundleCheckout(session, quote.bundle_id);
      window.location.assign(url);
    } catch (error) {
      setMessage(error.message || "Could not start checkout. Try again.");
      setBusyId(null);
      refreshBundles();
    }
  };

  const signedIn = Boolean(session);
  const ready = sessionReady && checked && ownedReady;
  const isOwned = (ch) => (ch.exclusive ? owned.supporter : owned.ids.has(ch.id));
  const focus = focusId ? characterById(focusId) : null;
  const ownedCount = [...supporterExclusives, ...shopCharacters].filter((ch) => ch.kind !== "weapon" && isOwned(ch)).length;

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

      <section className="kxStoreGroup" id="supporter-exclusives" aria-labelledby="sup-chars">
        <header className="kxStoreGroupHead">
          <p className="tag">Supporter Edition &middot; $4.99</p>
          <h2 id="sup-chars">Supporter exclusives</h2>
          <p>Three characters, one per faction, plus the gold Midas AK-47 and Sunfire RPG-7 for every faction. All five come with the Supporter Edition and are never sold on their own.</p>
        </header>
        <div className="kxCharGrid exclusives">
          {supporterExclusives.map((ch) => <CharacterCard key={ch.id} {...cardProps(ch)} />)}
        </div>
      </section>

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
