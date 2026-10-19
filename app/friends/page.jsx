"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { callsignOf } from "../session";
import { useSession } from "../useSession";
import {
  acceptRequest,
  blockFriendship,
  claimCallsign,
  deleteFriendship,
  loadFriends,
  loadMyProfile,
  sendRequest,
  loadSettings,
  saveSettings,
  loadPlayerCard,
  loadMyCard,
  saveMyCard,
  cleanBio,
  loadRecentlyPlayed,
  inviteLink,
  announceRequests,
} from "./api";
import PlayerCardModal, { CardBody, FACTION_CHOICES, BIO_MAX } from "./PlayerCard";
import styles from "./friends.module.css";
import SupporterBadge from "../components/SupporterBadge";

const EMPTY = { friends: [], incoming: [], outgoing: [], blocked: [] };
const REFRESH_MS = 30 * 1000;

function nameOf(row) {
  return row.username || row.display_name || "Player";
}

function lastSeen(value) {
  const at = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(at)) return "Offline";
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `Seen ${minutes || 1} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Seen ${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `Seen ${days} day${days === 1 ? "" : "s"} ago`;
  return "Offline";
}

function Row({ row, children, status, onOpen }) {
  return (
    <li className={styles.row}>
      <span className={`${styles.dot}${row.online ? ` ${styles.on}` : ""}`} aria-hidden="true" />
      <span className={styles.who}>
        {onOpen && row.username ? (
          <button type="button" className={`kxCallsign ${styles.nameBtn}`} onClick={() => onOpen(row.username)} aria-label={`View ${nameOf(row)}'s player card`}>
            {nameOf(row)}
          </button>
        ) : (
          <strong className="kxCallsign">{nameOf(row)}</strong>
        )}
        {status ? <small>{status}<SupporterBadge row={row} size="sm" /></small> : <SupporterBadge row={row} size="sm" />}
      </span>
      <span className={styles.actions}>{children}</span>
    </li>
  );
}

function Section({ tag, title, count, empty, children, delay }) {
  return (
    <article className="kxAcctCard wide kxAcctIn" style={{ "--d": delay }}>
      <header>
        <p className="tag">{tag}</p>
        <h2>
          {title}
          {count ? <span className={styles.count}>{count}</span> : null}
        </h2>
      </header>
      {count ? <ul className={styles.list}>{children}</ul> : <p>{empty}</p>}
    </article>
  );
}

export default function FriendsPage() {
  const { session, ready } = useSession();
  const userId = session?.user?.id || "";
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = missing
  const [lists, setLists] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState("");
  const [claim, setClaim] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [bad, setBad] = useState(false);
  const listsRef = useRef(EMPTY);
  const [settings, setSettings] = useState(null);
  const [recent, setRecent] = useState(null);
  const [cardState, setCardState] = useState({ open: false });
  const [copied, setCopied] = useState(false);
  const [myCard, setMyCard] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ favorite_faction: "", bio: "" });
  const [cardBusy, setCardBusy] = useState(false);

  const say = (text, isBad = false) => {
    setMessage(text);
    setBad(isBad);
  };

  const refresh = useCallback(async (quiet = false) => {
    try {
      const next = await loadFriends();
      listsRef.current = next;
      setLists(next);
      setLoaded(true);
      announceRequests(next.incoming.length);
    } catch (error) {
      if (!quiet) say(error.message, true);
    }
  }, []);

  useEffect(() => {
    if (!ready || !userId) return undefined;
    let live = true;
    setProfile(undefined);
    loadMyProfile()
      .then(({ profile: row }) => {
        if (!live) return;
        setProfile(row && row.username ? row : null);
        if (row && row.username) {
          refresh();
          loadSettings().then((value) => live && setSettings(value)).catch(() => live && setSettings({ available: false }));
          loadRecentlyPlayed().then((value) => live && setRecent(value)).catch(() => live && setRecent({ available: false, rows: [] }));
          loadMyCard(row.username).then((value) => live && setMyCard(value)).catch(() => live && setMyCard({ available: false, card: null }));
        }
      })
      .catch((error) => {
        if (!live) return;
        setProfile({ username: "", broken: true });
        say(error.message, true);
      });
    return () => {
      live = false;
    };
  }, [ready, userId, refresh]);

  useEffect(() => {
    if (!profile?.username) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh(true);
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [profile, refresh]);

  const run = async (work, done) => {
    setBusy(true);
    say("");
    try {
      const result = await work();
      if (done) say(typeof done === "function" ? done(result) : done);
      await refresh();
    } catch (error) {
      say(error.message || "Something went wrong.", true);
    } finally {
      setBusy(false);
    }
  };

  const onSend = (event) => {
    event.preventDefault();
    const name = target;
    run(
      () => sendRequest(name, listsRef.current),
      ({ player, accepted }) => {
        setTarget("");
        const who = player.username || player.display_name;
        return accepted ? `${who} had already asked. You are now friends.` : `Request sent to ${who}.`;
      }
    );
  };

  const onClaim = async (event) => {
    event.preventDefault();
    setBusy(true);
    say("");
    try {
      const name = await claimCallsign(claim);
      setClaim("");
      setProfile({ username: name, display_name: name });
      await refresh();
    } catch (error) {
      say(error.message || "Could not save that callsign.", true);
    } finally {
      setBusy(false);
    }
  };

  const openCard = useCallback(async (username) => {
    setCardState({ open: true, loading: true, name: username });
    try {
      const { card, available } = await loadPlayerCard(username, { signedIn: true });
      setCardState({ open: true, loading: false, card, available, name: username });
    } catch (error) {
      setCardState({ open: true, loading: false, error: error.message || "Could not load that player.", name: username });
    }
  }, []);
  const closeCard = useCallback(() => setCardState({ open: false }), []);

  const sendFromCard = (username) => {
    run(
      () => sendRequest(username, listsRef.current),
      ({ player, accepted }) => {
        const who = player.username || player.display_name;
        openCard(username);
        return accepted ? `${who} had already asked. You are now friends.` : `Request sent to ${who}.`;
      }
    );
  };

  const onLookup = () => {
    if (target.trim()) openCard(target.trim());
  };

  const toggleSetting = async (key, value) => {
    const before = settings;
    setSettings({ ...settings, [key]: value });
    try {
      const next = await saveSettings({ [key]: value });
      setSettings(next);
      say(key === "hide_presence"
        ? value ? "Your online status is now hidden from friends." : "Friends can see when you are online."
        : value ? "Players can send you friend requests." : "New friend requests are turned off.");
    } catch (error) {
      setSettings(before);
      say(error.message || "Could not save that setting.", true);
    }
  };

  const startEdit = () => {
    const card = myCard?.card || {};
    setDraft({ favorite_faction: card.favorite_faction || "", bio: card.bio || "" });
    setEditing(true);
  };
  const saveCard = async (event) => {
    event.preventDefault();
    setCardBusy(true);
    say("");
    try {
      const saved = await saveMyCard(draft);
      setMyCard((current) => ({ ...current, card: { ...(current?.card || {}), ...saved } }));
      setEditing(false);
      say("Your player card is saved.");
    } catch (error) {
      say(error.message || "Could not save your card.", true);
    } finally {
      setCardBusy(false);
    }
  };

  const myInvite = inviteLink(profile?.username || "");
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(myInvite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your invite link:", myInvite);
    }
  };

  const cardActions = (card) => {
    if (!card || card.unverified) return null;
    const who = card.username || card.display_name;
    const all = [...lists.friends, ...lists.incoming, ...lists.outgoing, ...lists.blocked];
    const existing = all.find((row) => (card.id && row.friend_id === card.id) || (row.username || "").toLowerCase() === (card.username || "").toLowerCase());
    const relation = card.relationship || (existing ? (existing.status === "pending" ? existing.direction : existing.status) : "none");
    if (relation === "self" || (profile?.username || "").toLowerCase() === (card.username || "").toLowerCase()) return <span className={styles.muted}>This is you.</span>;
    if (relation === "accepted") return <span className={styles.muted}>You and {who} are friends.</span>;
    if (relation === "blocked") return <span className={styles.muted}>You blocked this player.</span>;
    if (relation === "outgoing" || (relation === "pending" && card.direction === "outgoing")) return <span className={styles.muted}>Request sent.</span>;
    if (relation === "incoming" || (relation === "pending" && card.direction === "incoming")) {
      const row = existing || { friendship_id: card.friendship_id };
      return (
        <button className="button small" type="button" disabled={busy}
          onClick={() => run(() => acceptRequest(row.friendship_id), `You and ${who} are now friends.`).then(() => openCard(card.username))}>
          Accept request
        </button>
      );
    }
    if (card.accepts_requests === false) return <span className={styles.muted}>Not taking friend requests.</span>;
    return (
      <button className="button small" type="button" disabled={busy} onClick={() => sendFromCard(card.username)}>
        Send friend request
      </button>
    );
  };

  const confirmThen = (text, work, done) => {
    if (typeof window !== "undefined" && !window.confirm(text)) return;
    run(work, done);
  };

  const status = <p className={bad ? "formMessage error" : "formMessage"} role="status">{message}</p>;

  if (!ready) {
    return <main className="kxAcctPage"><section className="kxIntro" /></main>;
  }

  if (!session) {
    return (
      <main className="kxAcctPage">
        <section className="kxIntro" style={{ "--kx-bg": "url(/shots/trailer/heli-cabin.jpg)" }}>
          <p className="tag">KLYRA Account</p>
          <h1>Friends.</h1>
          <p className="lead">Sign in to add friends by callsign, answer requests, and see who is online.</p>
          <div className="actions">
            <a className="button" href="/account/">Sign in</a>
          </div>
        </section>
      </main>
    );
  }

  const online = lists.friends.filter((row) => row.online).length;

  return (
    <main className="kxAcctPage">
      <section className="kxIntro kxAcctBanner" style={{ "--kx-bg": "url(/shots/trailer/heli-cabin.jpg)" }}>
        <div className="kxAcctIn">
          <p className="tag">KLYRA Account · <span className="kxCallsign">{profile?.username || callsignOf(session)}</span></p>
          <h1>Friends.</h1>
          <p className="lead">
            {profile?.username
              ? loaded
                ? `${lists.friends.length} friend${lists.friends.length === 1 ? "" : "s"}, ${online} online now.`
                : "Loading your squad..."
              : "Add friends by callsign and see who is online. The game will use this same list."}
          </p>
        </div>

        {profile === null ? (
          <form className={`${styles.add} kxAcctIn`} style={{ "--d": "80ms" }} onSubmit={onClaim}>
            <label>
              Pick your callsign first
              <input
                value={claim}
                onChange={(event) => setClaim(event.target.value)}
                autoComplete="nickname"
                minLength={3}
                maxLength={24}
                required
              />
            </label>
            <button className="button" type="submit" disabled={busy}>Save callsign</button>
          </form>
        ) : profile?.username ? (
          <form className={`${styles.add} kxAcctIn`} style={{ "--d": "80ms" }} onSubmit={onSend}>
            <label>
              Add a friend by callsign
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={24}
                placeholder="Callsign"
                required
              />
            </label>
            <span className={styles.cardActions}>
              <button className="button" type="submit" disabled={busy}>Send request</button>
              <button className="button ghost" type="button" disabled={busy || !target.trim()} onClick={onLookup}>View card</button>
            </span>
          </form>
        ) : null}
        {status}
      </section>
      <div className="kxHazard" aria-hidden="true" />

      {profile?.username ? (
        <section className="kxAcctBody">
          <div className="kxAcctGrid">
            {lists.incoming.length ? (
              <Section tag="Waiting on you" title="Requests" count={lists.incoming.length} delay="100ms">
                {lists.incoming.map((row) => (
                  <Row key={row.friendship_id} row={row} status="Wants to be friends" onOpen={openCard}>
                    <button className="button small" type="button" disabled={busy}
                      onClick={() => run(() => acceptRequest(row.friendship_id), `You and ${nameOf(row)} are now friends.`)}>
                      Accept
                    </button>
                    <button className="button small ghost" type="button" disabled={busy}
                      onClick={() => run(() => deleteFriendship(row.friendship_id), "Request declined.")}>
                      Decline
                    </button>
                    <button className={`textLink ${styles.danger}`} type="button" disabled={busy}
                      onClick={() => confirmThen(`Block ${nameOf(row)}? They will not be able to send you requests.`, () => blockFriendship(row.friendship_id), `${nameOf(row)} blocked.`)}>
                      Block
                    </button>
                  </Row>
                ))}
              </Section>
            ) : null}

            <Section
              tag={loaded ? `${online} online` : "Squad"}
              title="Friends"
              count={lists.friends.length}
              empty={loaded ? "No friends yet. Add one by callsign above." : "Loading..."}
              delay="160ms"
            >
              {lists.friends.map((row) => (
                <Row key={row.friendship_id} row={row} status={row.online ? "Online" : row.last_seen_at ? lastSeen(row.last_seen_at) : "Offline"} onOpen={openCard}>
                  <button className="textLink" type="button" disabled={busy}
                    onClick={() => confirmThen(`Remove ${nameOf(row)} from your friends?`, () => deleteFriendship(row.friendship_id), `${nameOf(row)} removed.`)}>
                    Remove
                  </button>
                  <button className={`textLink ${styles.danger}`} type="button" disabled={busy}
                    onClick={() => confirmThen(`Block ${nameOf(row)}? This also removes them as a friend.`, () => blockFriendship(row.friendship_id), `${nameOf(row)} blocked.`)}>
                    Block
                  </button>
                </Row>
              ))}
            </Section>

            {lists.outgoing.length ? (
              <Section tag="Waiting on them" title="Sent" count={lists.outgoing.length} delay="220ms">
                {lists.outgoing.map((row) => (
                  <Row key={row.friendship_id} row={row} status="Request sent" onOpen={openCard}>
                    <button className="textLink" type="button" disabled={busy}
                      onClick={() => run(() => deleteFriendship(row.friendship_id), "Request cancelled.")}>
                      Cancel
                    </button>
                  </Row>
                ))}
              </Section>
            ) : null}

            {lists.blocked.length ? (
              <Section tag="Hidden" title="Blocked" count={lists.blocked.length} delay="280ms">
                {lists.blocked.map((row) => (
                  <Row key={row.friendship_id} row={row}>
                    <button className="textLink" type="button" disabled={busy}
                      onClick={() => run(() => deleteFriendship(row.friendship_id), `${nameOf(row)} unblocked.`)}>
                      Unblock
                    </button>
                  </Row>
                ))}
              </Section>
            ) : null}

            <Section
              tag="Suggestions"
              title="Recently played with"
              count={recent?.rows?.length || 0}
              empty={recent === null ? "Loading..." : "Play a match and the players you fought alongside show up here."}
              delay="300ms"
            >
              {(recent?.rows || []).map((row) => (
                <Row key={row.username} row={row} status={row.matches_together ? `${row.matches_together} match${row.matches_together === 1 ? "" : "es"} together` : "Played together"} onOpen={openCard}>
                  <button className="button small" type="button" disabled={busy}
                    onClick={() => run(() => sendRequest(row.username, listsRef.current), ({ player, accepted }) => {
                      setRecent((current) => ({ ...current, rows: (current?.rows || []).filter((item) => item.username !== row.username) }));
                      const who = player.username || player.display_name;
                      return accepted ? `${who} had already asked. You are now friends.` : `Request sent to ${who}.`;
                    })}>
                    Add
                  </button>
                </Row>
              ))}
            </Section>

            <article className="kxAcctCard kxAcctIn" id="my-card" style={{ "--d": "320ms" }}>
              <header>
                <p className="tag">Your card</p>
                <h2>How players see you</h2>
              </header>
              {myCard === null ? <p>Loading...</p> : editing ? (
                <form className={styles.cardForm} onSubmit={saveCard}>
                  <label>
                    <span>Favorite faction</span>
                    <select value={draft.favorite_faction} onChange={(event) => setDraft({ ...draft, favorite_faction: event.target.value })} disabled={cardBusy}>
                      {FACTION_CHOICES.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Bio</span>
                    <textarea rows={3} maxLength={BIO_MAX} value={draft.bio} disabled={cardBusy}
                      placeholder="A line about how you play."
                      onChange={(event) => setDraft({ ...draft, bio: event.target.value.slice(0, BIO_MAX) })} />
                    <small className={styles.counter} aria-live="polite">{cleanBio(draft.bio).length}/{BIO_MAX}</small>
                  </label>
                  <p className={styles.muted}>Your card name is always your callsign.</p>
                  <div className={styles.cardActions}>
                    <button className="button small" type="submit" disabled={cardBusy}>{cardBusy ? "Saving..." : "Save"}</button>
                    <button className="button small ghost" type="button" disabled={cardBusy} onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <CardBody card={{ ...(myCard.card || {}), username: profile.username, relationship: "self", is_online: null }} available={myCard.available}>
                    {myCard.available ? (
                      <button className="button small" type="button" onClick={startEdit}>Edit card</button>
                    ) : (
                      <span className={styles.muted}>Editing your card switches on soon.</span>
                    )}
                  </CardBody>
                </>
              )}
            </article>

            <article className="kxAcctCard kxAcctIn" style={{ "--d": "340ms" }}>
              <header>
                <p className="tag">Privacy</p>
                <h2>Settings</h2>
              </header>
              {settings === null ? <p>Loading...</p> : (
                <div className={styles.toggles}>
                  <label className={styles.toggle}>
                    <input type="checkbox" disabled={!settings.available} checked={!!settings.hide_presence}
                      onChange={(event) => toggleSetting("hide_presence", event.target.checked)} />
                    <span><strong>Hide my online status</strong><small>Friends will not see when you are online or when you were last seen.</small></span>
                  </label>
                  <label className={styles.toggle}>
                    <input type="checkbox" disabled={!settings.available} checked={settings.allow_friend_requests !== false}
                      onChange={(event) => toggleSetting("allow_friend_requests", event.target.checked)} />
                    <span><strong>Allow friend requests</strong><small>Turn off to stop new requests. Existing friends stay.</small></span>
                  </label>
                  {settings.available ? null : <p className={styles.muted}>Privacy settings switch on soon.</p>}
                </div>
              )}
            </article>

            <article className="kxAcctCard kxAcctIn" style={{ "--d": "380ms" }}>
              <header>
                <p className="tag">Invite</p>
                <h2>Your invite link</h2>
              </header>
              <p>Send this link to a friend. It opens your player card with a button to add you.</p>
              <div className={styles.invite}>
                <code>{myInvite}</code>
                <button className="button small" type="button" onClick={copyInvite}>{copied ? "Copied" : "Copy my invite link"}</button>
              </div>
            </article>
          </div>
        </section>
      ) : null}
      <PlayerCardModal
        open={cardState.open}
        loading={cardState.loading}
        card={cardState.card}
        available={cardState.available}
        error={cardState.error}
        onClose={closeCard}
      >
        {cardState.card ? cardActions(cardState.card) : null}
      </PlayerCardModal>
    </main>
  );
}
