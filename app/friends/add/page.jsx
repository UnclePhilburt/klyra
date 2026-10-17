"use client";

import { useEffect, useState } from "react";
import { useSession } from "../../useSession";
import { acceptRequest, cleanCallsign, loadPlayerCard, sendRequest } from "../api";
import { CardBody } from "../PlayerCard";
import styles from "../friends.module.css";

export default function AddFriendPage() {
  const { session, ready } = useSession();
  const [name, setName] = useState(null);
  const [state, setState] = useState({ loading: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [bad, setBad] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setName(cleanCallsign(params.get("u") || params.get("callsign") || ""));
  }, []);

  const load = async (signedIn) => {
    if (!name) {
      setState({ loading: false, card: null });
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    try {
      const { card, available } = await loadPlayerCard(name, { signedIn });
      setState({ loading: false, card, available });
    } catch (error) {
      setState({ loading: false, error: error.message || "Could not load that player." });
    }
  };

  useEffect(() => {
    if (!ready || name === null) return;
    load(!!session);
  }, [ready, name, session?.user?.id]);

  const say = (text, isBad = false) => {
    setMessage(text);
    setBad(isBad);
  };

  const act = async (work, done) => {
    setBusy(true);
    say("");
    try {
      const result = await work();
      say(typeof done === "function" ? done(result) : done);
      await load(true);
    } catch (error) {
      say(error.message || "Something went wrong.", true);
    } finally {
      setBusy(false);
    }
  };

  const card = state.card;
  const who = card ? card.username || card.display_name : name;
  const mine = session && card && (card.relationship === "self" || (session.user?.id && card.id === session.user.id));

  let actions = null;
  if (card && ready) {
    if (!session) {
      actions = (
        <>
          <a className="button" href="/account/">Sign in to add {who}</a>
          <span className={styles.muted}>Then open this link again.</span>
        </>
      );
    } else if (mine) {
      actions = <a className="button ghost" href="/friends/">This is your invite link. Open friends</a>;
    } else if (card.relationship === "accepted") {
      actions = <a className="button ghost" href="/friends/">You are already friends. Open friends</a>;
    } else if (card.relationship === "blocked") {
      actions = <span className={styles.muted}>You blocked this player. Unblock them on the friends page first.</span>;
    } else if (card.relationship === "pending" && card.direction === "outgoing") {
      actions = <a className="button ghost" href="/friends/">Request sent. Open friends</a>;
    } else if (card.relationship === "pending" && card.direction === "incoming" && card.friendship_id) {
      actions = (
        <button className="button" type="button" disabled={busy}
          onClick={() => act(() => acceptRequest(card.friendship_id), `You and ${who} are now friends.`)}>
          Accept {who}'s request
        </button>
      );
    } else if (card.accepts_requests === false) {
      actions = <span className={styles.muted}>{who} is not taking friend requests right now.</span>;
    } else {
      actions = (
        <button className="button" type="button" disabled={busy}
          onClick={() => act(() => sendRequest(card.username || name), ({ player, accepted }) => {
            const label = player.username || player.display_name;
            return accepted ? `${label} had already asked. You are now friends.` : `Request sent to ${label}.`;
          })}>
          Send friend request
        </button>
      );
    }
  }

  return (
    <main className="kxAcctPage">
      <section className="kxIntro kxAcctBanner" style={{ "--kx-bg": "url(/shots/trailer/squad.jpg)" }}>
        <div className={`kxAcctIn ${styles.addPage}`}>
          <p className="tag">KLYRA Friends · Invite</p>
          <h1>Add a friend.</h1>
          {!ready || name === null || state.loading ? (
            <p className="lead">Loading player...</p>
          ) : !name ? (
            <p className="lead">This invite link is missing a callsign. Ask your friend to copy it again from their friends page.</p>
          ) : state.error ? (
            <p className="formMessage error">{state.error}</p>
          ) : card ? (
            <div className={styles.dialog} style={{ position: "static", maxHeight: "none" }}>
              <CardBody card={card} available={state.available}>{actions}</CardBody>
            </div>
          ) : (
            <p className="lead">No player uses the callsign “{name}”. Check the link and try again.</p>
          )}
          <p className={bad ? "formMessage error" : "formMessage"} role="status">{message}</p>
          <p><a className="textLink" href="/friends/">Go to your friends</a></p>
        </div>
      </section>
    </main>
  );
}
