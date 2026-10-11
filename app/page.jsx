"use client";

import { useState } from "react";

const teams = [
  {
    id: "ironclad",
    name: "Ironclad",
    logo: "/teams/ironclad.svg",
    color: "#f15a52",
    line: "You drop under the red shield. The front does not care which side you picked. Ironclad still has to take it.",
  },
  {
    id: "timberwolf",
    name: "Timberwolf",
    logo: "/teams/timberwolf.svg",
    color: "#61cf88",
    line: "You drop under the wolf. Same battle, same trucks, same race to 100. Timberwolf holds until the zone moves.",
  },
  {
    id: "vanguard",
    name: "Vanguard",
    logo: "/teams/vanguard.svg",
    color: "#4bb6ff",
    line: "You drop under the blue mark. Push the fight, keep the base supplied, and get your gear home for Vanguard.",
  },
];

export default function Home() {
  const [teamId, setTeamId] = useState("ironclad");
  const team = teams.find((item) => item.id === teamId) || teams[0];

  return (
    <main>
      <section className="hero">
        <div className="heroArt" aria-hidden="true" />
        <div className="heroCopy">
          <p className="tag">Pre-alpha</p>
          <h1>Fight the front.</h1>
          <p className="lead">
            Ironclad, Timberwolf, and Vanguard. Push the battle, run the
            supplies, and bring your gear home.
          </p>
          <div className="actions">
            <a className="button" href="/download/">
              Play
            </a>
            <a className="button ghost" href="/trailer/">
              Pre-alpha trailer
            </a>
          </div>
        </div>
      </section>

      <section id="teams" className="section">
        <div className="sectionIntro">
          <p className="tag">The sides</p>
          <h2>Pick your mark.</h2>
          <p>Three teams. One moving front. First to 100 points wins.</p>
        </div>
        <div className="teamGrid" role="list">
          {teams.map((item) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className="teamCard"
              aria-pressed={item.id === team.id}
              style={{ "--team": item.color }}
              onClick={() => setTeamId(item.id)}
            >
              <img src={item.logo} alt="" />
              <strong>{item.name}</strong>
            </button>
          ))}
        </div>
        <article className="teamStage" style={{ "--team": team.color }}>
          <img src={team.logo} alt="" />
          <div>
            <p className="tag">{team.name}</p>
            <h3>On the front.</h3>
            <p>{team.line}</p>
            <div className="meter" aria-hidden="true">
              <span />
            </div>
            <small>First to 100 points.</small>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="sectionIntro">
          <p className="tag">One match</p>
          <h2>The front does not sit still.</h2>
        </div>
        <div className="cards">
          <article>
            <span>01</span>
            <h3>Drop in</h3>
            <p>Choose Ironclad, Timberwolf, or Vanguard and get on the field.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Move</h3>
            <p>
              The battle zone shifts. Trucks and helicopters keep people and
              supplies in the fight.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Get home</h3>
            <p>
              A teammate can bring you back. Gear you extract stays in your
              stash.
            </p>
          </article>
        </div>
      </section>

      <section className="splitLinks" aria-label="Next steps">
        <a className="pathCard" href="/download/">
          <span>Play</span>
          <strong>Get on the front</strong>
          <p>Download Broken Front and drop into the next fight.</p>
        </a>
        <a className="pathCard" href="/account/">
          <span>Callsign</span>
          <strong>Your account</strong>
          <p>Sign in to see your callsign, your record, and the gear you kept.</p>
        </a>
      </section>
    </main>
  );
}
