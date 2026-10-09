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
          <p className="tag">Alpha Deployment</p>
          <h1>Hold the front. Bring the gear home.</h1>
          <p className="lead">
            A three-team tactical sandbox where infantry, pilots, engineers,
            and logistics crews fight over shifting objectives while every kit
            and crate has to survive the trip back.
          </p>
          <div className="actions">
            <a className="button" href="/download/">
              Download Launcher
            </a>
            <a className="button ghost" href="/account/">
              Create Account
            </a>
          </div>
        </div>

        <section className="statusPanel" aria-label="Frontline status">
          <div className="panelSweep" aria-hidden="true" />
          <div className="panelHeader">
            <span>Frontline Status</span>
            <strong>Online</strong>
          </div>
          <div className="zoneMap" aria-hidden="true">
            <span className="ring outer" />
            <span className="ring inner" />
            <span className="route routeOne" />
            <span className="route routeTwo" />
            <span className="unit red" />
            <span className="unit green" />
            <span className="unit blue" />
          </div>
          <div className="metricGrid">
            <div>
              <span>Teams</span>
              <strong>3</strong>
            </div>
            <div>
              <span>Soldiers</span>
              <strong>100</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>Deploy</strong>
            </div>
          </div>
        </section>
      </section>

      <section id="front" className="section frontOnly">
        <div className="sectionIntro">
          <p className="tag">Combat Loop</p>
          <h2>Fight, build, transport, extract.</h2>
          <p>
            Broken Front is not just sprinting at a circle. Squads need rides,
            FOBs need supplies, wounded soldiers need revives, and captured
            weapons only matter if someone gets them back to storage.
          </p>
        </div>
        <div className="cards">
          <article>
            <span>01</span>
            <h3>Infantry</h3>
            <p>
              Push the zone, loot dead enemies, revive allies, and hold the
              hotzone.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Logistics</h3>
            <p>
              Buy vehicles, move troops, deliver supply crates, and haul loot to
              HQ.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Engineering</h3>
            <p>
              Build FOBs, depots, medical support, landing pads, and defenses.
            </p>
          </article>
        </div>
      </section>

      <section className="splitLinks" aria-label="Next steps">
        <a className="pathCard" href="/account/">
          <span>Account</span>
          <strong>Create your callsign</strong>
          <p>Register your player record before logging in inside the game.</p>
        </a>
        <a className="pathCard" href="/download/">
          <span>Download</span>
          <strong>Install the launcher</strong>
          <p>Grab the Mac or Windows launcher and patch through Cloudflare.</p>
        </a>
      </section>

      <footer>
        <strong>Klyra: Broken Front</strong>
        <span>Alpha systems online.</span>
      </footer>
    </main>
  );
}
