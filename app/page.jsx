"use client";

import { useEffect, useRef, useState } from "react";
import AccountLink from "./components/AccountLink";

const TRAILER_ID = "Bq7vnDIWrbc";

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
  { src: "/shots/trailer/assault.jpg", alt: "An assault under fire with explosions across the front", caption: "The push, under fire." },
  { src: "/shots/trailer/heli.jpg", alt: "Helicopter cockpit flying over the coast", caption: "Helicopters are part of the fight." },
  { src: "/shots/trailer/tanks.jpg", alt: "Tanks rolling across the battlefield", caption: "Armor on the front." },
  { src: "/shots/trailer/squad.jpg", alt: "A squad riding a helicopter at night", caption: "Night insertion by helicopter." },
  { src: "/shots/trailer/action-1.jpg", alt: "First-person rifle fire", caption: "The front, from the rifle." },
  { src: "/shots/trailer/heli-cabin.jpg", alt: "Door gunner in a helicopter cabin", caption: "Door gunner on the run in." },
];

const intel = [
  { k: "60-90", v: "Bots on the field" },
  { k: "Air + armor", v: "Helicopters and tanks" },
  { k: "Night ops", v: "Night vision" },
  { k: "An Nafud", v: "Desert front" },
];

function TrailerPlayer() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="kxPlayer">
      <span className="kxCorner tl" aria-hidden="true" />
      <span className="kxCorner tr" aria-hidden="true" />
      <span className="kxCorner bl" aria-hidden="true" />
      <span className="kxCorner br" aria-hidden="true" />
      <div className="kxPlayerScreen">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${TRAILER_ID}?rel=0&autoplay=1`}
            title="KLYRA: Broken Front pre-alpha gameplay trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="kxPoster"
            onClick={() => setPlaying(true)}
            aria-label="Play the KLYRA: Broken Front pre-alpha trailer"
          >
            <img src="/shots/trailer/hero.jpg" alt="" loading="lazy" decoding="async" />
            <span className="kxPosterShade" aria-hidden="true" />
            <span className="kxPlay" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </span>
            <span className="kxPosterLabel">
              <small>REC // Pre-alpha footage</small>
              <strong>Watch the trailer</strong>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [teamId, setTeamId] = useState("ironclad");
  const team = teams.find((item) => item.id === teamId) || teams[0];
  const musicRef = useRef(null);

  // Subtle parallax for the music backdrop. One rAF per scroll, transform-only
  // (GPU), skipped entirely for reduced-motion users.
  useEffect(() => {
    const el = musicRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      el.style.setProperty("--kx-par", `${(progress * 90).toFixed(1)}px`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="kxHome">
      <section className="kxHero">
        <div className="kxHeroBg" aria-hidden="true" />
        <div className="kxHeroGrain" aria-hidden="true" />
        <div className="kxHeroHud" aria-hidden="true">
          <span>GRID 27.4N / 41.2E</span>
          <span>SECTOR: AN NAFUD</span>
          <span className="kxLive">● LIVE BUILD // PRE-ALPHA</span>
        </div>
        <div className="kxHeroCopy">
          <img className="kxHeroLogo" src="/brand.png" alt="KLYRA" />
          <p className="kxKicker">Broken Front // Military sandbox shooter</p>
          <h1>
            Fight the <span>front.</span>
          </h1>
          <p className="kxLead">
            Ironclad, Timberwolf, and Vanguard. Push the battle, run the
            supplies, and bring your gear home.
          </p>
          <div className="kxActions">
            <a className="button huge kxCta" href="/play/">Play now</a>
            <a className="button ghost huge" href="/download/">Download</a>
            <AccountLink className="textLink heroSignIn" />
          </div>
        </div>
        <a className="kxScroll" href="#trailer" aria-label="Scroll to trailer"><span /></a>
      </section>

      <div className="kxHazard" aria-hidden="true" />

      <section className="kxIntel" aria-label="Game overview">
        {intel.map((item) => (
          <div key={item.v}>
            <strong>{item.k}</strong>
            <span>{item.v}</span>
          </div>
        ))}
        <a href="/account/">
          <strong>One account</strong>
          <span>Synced progress &rarr;</span>
        </a>
      </section>

      <section id="trailer" className="kxTrailer" aria-labelledby="kx-trailer-title">
        <div className="kxTrailerBg" aria-hidden="true" />
        <div className="kxTrailerHead">
          <p className="tag">Pre-alpha version</p>
          <h2 id="kx-trailer-title">Incoming transmission.</h2>
        </div>
        <TrailerPlayer />
      </section>

      <section className="kxMusic" ref={musicRef} aria-labelledby="music-credit-title">
        <div className="kxMusicBg" aria-hidden="true" />
        <div className="kxMusicStage" aria-hidden="true">
          <div className="kxMusicWave">
            {Array.from({ length: 64 }, (_, index) => (
              <i key={index} style={{ "--wave-index": index, "--h": `${28 + ((index * 37) % 72)}%` }} />
            ))}
          </div>
          <div className="kxMusicWave kxMusicWaveMirror">
            {Array.from({ length: 64 }, (_, index) => (
              <i key={index} style={{ "--wave-index": index, "--h": `${28 + ((index * 37) % 72)}%` }} />
            ))}
          </div>
        </div>
        <div className="kxMusicInner">
          <div className="kxMusicCover" aria-hidden="true">
            <img src="/shots/trailer/squad.jpg" alt="" loading="lazy" decoding="async" />
            <span className="kxMusicCoverShade" />
            <span className="kxMusicCoverText">
              <small>Official soundtrack partner</small>
              <strong>TROY</strong>
              <em>The Reality of Yourself</em>
            </span>
            <span className="kxMusicNote">♪</span>
          </div>
          <div className="kxMusicCopy">
            <p className="kxKicker">Official music partner</p>
            <h2 id="music-credit-title">
              The battlefield moves to the sound of{" "}
              <strong>The Reality of Yourself (TROY).</strong>
            </h2>
            <p className="kxMusicLead">Discover the music behind the front.</p>
            <div className="kxNowPlaying">
              <span className="kxEq" aria-hidden="true"><i /><i /><i /><i /></span>
              <span><small>Now playing on the front</small><strong>The Reality of Yourself</strong></span>
            </div>
            <div className="kxMusicActions">
              <a
                className="kxMusicBtn spotify"
                href="https://open.spotify.com/artist/0ZcBV5wpdzrQOKuC7hUGQs?si=44Oq1W4LQHeqPBMm8DKFaw"
                target="_blank"
                rel="noreferrer"
              >
                Listen on Spotify ↗
              </a>
              <a
                className="kxMusicBtn youtube"
                href="https://www.youtube.com/channel/UC_tSPmI8_iRieBMvpWvtpFg"
                target="_blank"
                rel="noreferrer"
              >
                Watch on YouTube ↗
              </a>
              <a
                className="kxMusicBtn store"
                href="https://www.store.therealityofyourself.com/"
                target="_blank"
                rel="noreferrer"
              >
                Official store ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="kxSolo">
        <p className="tag">Independently developed</p>
        <h2>
          One developer.
          <br />
          Three factions.
          <br />
          <span>One battlefield.</span>
        </h2>
        <p>
          KLYRA: Broken Front is a solo-developed military sandbox built around
          large-scale warfare, player freedom, and an evolving battlefield.
        </p>
      </section>

      <section className="section kxSection">
        <div className="sectionIntro">
          <p className="tag">From the pre-alpha</p>
          <h2>See the fight.</h2>
          <p>Frames from the pre-alpha gameplay trailer.</p>
        </div>
        <div className="kxShots">
          {shots.map((shot, index) => (
            <figure key={shot.src} className={index === 0 ? "kxShotWide" : undefined}>
              <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
              <figcaption><span>{String(index + 1).padStart(2, "0")}</span>{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="teams" className="section kxSection">
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

      <section className="kxDeploy" aria-label="Next steps">
        <a className="kxDeployCard" href="/play/">
          <span>Browser</span>
          <strong>Play in the tab</strong>
          <p>Performance is degraded because it is a web browser build. It uses your KLYRA account, and the fight opens in the tab.</p>
        </a>
        <a className="kxDeployCard" href="/download/">
          <span>Desktop</span>
          <strong>Download the build</strong>
          <p>The full-performance desktop build for Windows.</p>
        </a>
        <a className="kxDeployCard" href="/features/">
          <span>The battlefield</span>
          <strong>What you can do</strong>
          <p>Factions, helicopters, bases, logistics, and the weapon builder.</p>
        </a>
      </section>
    </main>
  );
}
