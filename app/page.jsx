"use client";

import { useEffect, useState } from "react";
import SiteNav from "./components/SiteNav";

export default function Home() {
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      return undefined;
    }

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setScroll(window.scrollY);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  const parallaxVars = {
    "--drift-slow": `${scroll * -0.055}px`,
    "--drift-mid": `${scroll * -0.11}px`,
    "--drift-fast": `${scroll * -0.18}px`,
  };

  return (
    <main className="shell homeShell" style={parallaxVars}>
      <div className="parallaxLayer layerGrid" aria-hidden="true" />
      <div className="parallaxLayer layerGlow" aria-hidden="true" />
      <SiteNav />

      <section id="top" className="hero">
        <div className="heroCopy">
          <p className="tag">Pre-alpha</p>
          <h1>Fight the front. Get your gear home.</h1>
          <p className="lead">
            Three teams fight over a battle that keeps moving. Push with your
            squad, run supplies by truck and helicopter, build a base, and
            bring back what you can carry. What makes it home stays yours.
          </p>
          <div className="actions">
            <a className="button" href="#trailer">
              Watch the trailer
            </a>
            <a className="button ghost" href="/download/">
              Download
            </a>
          </div>
        </div>

        <div id="trailer" className="trailerFrame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/UCOv0qqh0r0?rel=0"
            title="Klyra: Broken Front pre-alpha trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          <a href="https://www.youtube.com/watch?v=UCOv0qqh0r0">
            Watch on YouTube
          </a>
        </div>
      </section>

      <section id="war" className="section frontOnly">
        <div className="sectionIntro">
          <p className="tag">The war</p>
          <h2>Fight, haul, and keep it.</h2>
          <p>
            Someone has to take the ground. Someone has to drive. A base with
            nothing in it cannot hold.
          </p>
        </div>
        <div className="cards">
          <article>
            <span>01</span>
            <h3>Fight</h3>
            <p>
              Take the hot zone with your team. Loot weapons off the field.
              Pick up the soldier next to you before the fight moves on.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Haul</h3>
            <p>
              Trucks and helicopters move people and supplies. If the crates
              do not arrive, the base goes quiet.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Keep it</h3>
            <p>
              Build a forward base and stock it. Gear you get back to safety
              goes into your stash for the next fight.
            </p>
          </article>
        </div>
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
            <p>You join red, green, or blue. The first team to 100 points wins.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Move</h3>
            <p>
              The battle zone shifts. Stay on it, or go run the trucks, the
              helicopters, and the supplies.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Get out</h3>
            <p>
              A teammate can bring you back. If you do not make it out, the
              gear you were carrying is still out there.
            </p>
          </article>
        </div>
      </section>

      <section className="splitLinks" aria-label="Next steps">
        <a className="pathCard" href="/download/">
          <span>Play</span>
          <strong>Download the game</strong>
          <p>Windows or Mac. The launcher installs Broken Front and gets you updates.</p>
        </a>
        <a className="pathCard" href="/account/">
          <span>Callsign</span>
          <strong>Save your stash</strong>
          <p>Make an account so the gear you extract is waiting next time.</p>
        </a>
      </section>

      <footer>
        <strong>Klyra: Broken Front</strong>
        <span>Pre-alpha. The war is still being built.</span>
      </footer>
    </main>
  );
}
