"use client";

import CharacterPreview from "../store/CharacterPreview";
import { supporterExclusives, teams } from "../store/characterData";

// Supporter Edition exclusives, shown on the Support page with the same live 3D previews the store uses.
export default function SupporterShowcase() {
  return (
    <div className="kxCharGrid exclusives">
      {supporterExclusives.map((ch) => (
        <article key={ch.id} id={ch.id} className="kxCharCard exclusive" style={{ "--team": ch.accent || teams[ch.teams[0]].color }} data-kind={ch.kind || "character"}>
          <CharacterPreview character={ch} />
          <div className="kxCharInfo">
            <p className="kxCharFlag">SUPPORTER EXCLUSIVE{ch.kind === "weapon" ? " · WEAPON" : ""}</p>
            <h3>{ch.name}</h3>
            {ch.blurb ? <p className="kxCharBlurb">{ch.blurb}</p> : null}
            <ul className="kxCharTeams" aria-label={ch.kind === "weapon" ? "Usable by" : "Compatible factions"}>
              {ch.teams.map((key) => (
                <li key={key} style={{ "--team": teams[key].color }}>
                  <img src={teams[key].logo} alt="" width="16" height="16" loading="lazy" decoding="async" />
                  {teams[key].name}
                </li>
              ))}
            </ul>
            <div className="kxCharBuy">
              <span className="kxCharPrice">Included with Supporter Edition</span>
              <a className="kxCharBtn ghost" href="#buy">Get Supporter Edition</a>
            </div>
            <p className="kxCharNote">Only for verified Supporter Edition owners. Not sold separately.</p>
          </div>
        </article>
      ))}
    </div>
  );
}
