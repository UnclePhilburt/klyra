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

const shots = [
  { src: "/shots/infantry.jpg", alt: "First-person view on foot in a KLYRA match", caption: "On foot, with all three factions on the board." },
  { src: "/shots/heli.jpg", alt: "Helicopter cockpit over the battlefield", caption: "Helicopters are part of the fight." },
  { src: "/shots/truck.jpg", alt: "Driving a supply truck across the map", caption: "Trucks move people and supplies." },
  { src: "/shots/squad.jpg", alt: "Soldiers riding in the back of a truck", caption: "A squad rides in the back." },
  { src: "/shots/fight.jpg", alt: "First-person rifle view of a vehicle fight", caption: "The front, from the rifle." },
  { src: "/shots/split.jpg", alt: "Split-screen match with two players on one computer", caption: "Two players. One computer." },
];

export default function Home() {
  const [teamId, setTeamId] = useState("ironclad");
  const team = teams.find((item) => item.id === teamId) || teams[0];

  return (
    <main>
      <section className="hero heroCompact">
        <div className="heroArt" aria-hidden="true" />
        <div className="heroCopy">
          <img className="heroLogo" src="/brand.png" alt="KLYRA" />
          <p className="tag">Pre-alpha</p>
          <h1>Fight the front.</h1>
          <p className="lead">
            Ironclad, Timberwolf, and Vanguard. Push the battle, run the
            supplies, and bring your gear home.
          </p>
          <div className="actions">
            <a className="button huge" href="/play/">
              Play
            </a>
            <a className="button ghost huge" href="/download/">
              Download
            </a>
          </div>
        </div>
      </section>

      <section className="trailerBand homeTrailer" aria-label="Pre-alpha trailer">
        <p className="tag">Pre-alpha version</p>
        <div className="trailerFrame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/UCOv0qqh0r0?rel=0"
            title="KLYRA: Broken Front pre-alpha gameplay trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>

      <section className="soloBand">
        <p className="tag">Independently developed</p>
        <h2>
          One developer.
          <br />
          Three factions.
          <br />
          One battlefield.
        </h2>
        <p>
          KLYRA: Broken Front is a solo-developed military sandbox built around
          large-scale warfare, player freedom, and an evolving battlefield.
        </p>
      </section>

      <section className="section">
        <div className="sectionIntro">
          <p className="tag">From the pre-alpha</p>
          <h2>See the fight.</h2>
          <p>Frames from the pre-alpha gameplay trailer.</p>
        </div>
        <div className="shotGrid">
          {shots.map((shot) => (
            <figure key={shot.src}>
              <img src={shot.src} alt={shot.alt} />
              <figcaption>{shot.caption}</figcaption>
            </figure>
          ))}
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

      <section className="splitLinks" aria-label="Next steps">
        <a className="pathCard" href="/play/">
          <span>Browser</span>
          <strong>Play in the tab</strong>
          <p>Performance is degraded because it is a web browser build. The game file is still being added to that page.</p>
        </a>
        <a className="pathCard" href="/features/">
          <span>The battlefield</span>
          <strong>What you can do</strong>
          <p>Factions, helicopters, bases, logistics, and the weapon builder.</p>
        </a>
      </section>
    </main>
  );
}
