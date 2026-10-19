"use client";

import { useEffect, useState } from "react";
import { allCharacters, teams } from "./characterData";
import { ownedCharacters } from "./storeApi";

export default function OwnedCharacters({ session }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    let live = true;
    const load = () => ownedCharacters(session).then((r) => live && setState(r));
    load();
    window.addEventListener("focus", load);
    return () => { live = false; window.removeEventListener("focus", load); };
  }, [session]);

  const list = state ? allCharacters.filter((ch) => (ch.exclusive ? state.supporter : state.ids.has(ch.id))) : [];

  return (
    <article className="kxAcctCard wide kxAcctIn kxOwnedCard" id="owned-characters" style={{ "--d": "200ms" }}>
      <header>
        <p className="tag">Character store</p>
        <h2>Owned Characters</h2>
      </header>
      {!state ? (
        <p role="status">Loading your characters...</p>
      ) : list.length ? (
        <ul className="kxOwnedGrid">
          {list.map((ch) => (
            <li key={ch.id} style={{ "--team": teams[ch.teams[0]].color }}>
              <a href={`/store/characters/${ch.id}/`}>
                <img src={ch.poster} alt="" loading="lazy" width="120" height="160" />
                <span>
                  <strong>{ch.name}</strong>
                  <small>{ch.exclusive ? "Supporter exclusive" : ch.teams.map((t) => teams[t].name).join(" · ")}</small>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No characters yet. Characters you buy, plus the Supporter Edition exclusives, show up here and in the game.</p>
      )}
      <a className="kxOwnedLink" href="/store/">Browse the character store &rarr;</a>
    </article>
  );
}
