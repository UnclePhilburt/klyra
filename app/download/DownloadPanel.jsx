"use client";
import { windowsLauncher, macLauncher } from "../site-data";
import SupporterAccess from "../components/SupporterAccess";
import ServerDownloads from "./ServerDownloads";

export default function DownloadPanel() {
  return (
    <>
    <section className="pageHero downloadPage kxIntro" style={{ "--kx-bg": "url(/shots/trailer/tanks.jpg)" }}>
      <div className="downloadArt" aria-hidden="true" />
      <div className="downloadCopy">
        <p className="tag">Pre-alpha</p>
        <h1>Get on the front.</h1>
        <p className="lead">
          One download. Then you are in the fight with Ironclad, Timberwolf,
          and Vanguard.
        </p>
        <div className="actions"><a className="button" href={windowsLauncher}>Download Windows launcher</a><a className="button ghost" href={macLauncher}>Download Mac launcher</a></div>
        <p className="quiet">The launcher is free. Supporter Edition is required for desktop game access through the updated launcher.</p>
        <SupporterAccess />
      </div>
      <div className="mission">
        <article>
          <span>01</span>
          <h3>Drop in</h3>
          <p>Pick Ironclad, Timberwolf, or Vanguard.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Push</h3>
          <p>The battle zone moves. Trucks and helicopters keep it supplied.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Come home</h3>
          <p>Your account keeps the gear you extract for next time.</p>
        </article>
      </div>
    </section>

    <section className="section" id="dedicated-servers">
      <div className="founderCard">
        <div><p className="tag">Private developer tools</p><h2>Dedicated servers</h2></div>
        <div>
          <p>Run an unattended KLYRA match from Windows or an Apple Silicon Mac. Server packages require the authorized developer account.</p>
          <ServerDownloads />
          <p className="quiet">Extract the package, run its included start script, and wait for <code>[HeadlessHost] READY</code> in <code>Logs/server.log</code>.</p>
        </div>
      </div>
    </section>
    <section className="section founder">
      <div className="founderCard">
        <div>
          <p className="tag">Supporter Edition</p>
          <h2>$4.99</h2>
          <p className="quiet">One-time purchase.</p>
        </div>
        <div>
          <h3>Play in the browser, or unlock desktop.</h3>
          <p>
            Enjoy KLYRA for free in your browser, or support its development by
            unlocking the downloadable Windows and Mac versions.
          </p>
          <p>
            No gameplay content is locked behind a purchase. Everyone can
            experience the battles, vehicles, weapon customization, and FOB
            systems.
          </p>
          <p className="quiet">
            The browser version opens on the play page. Performance is degraded
            because it is a web browser build. Supporter Edition unlocks Windows
            and Mac. KLYRA is in pre-alpha, and what you play can change.
          </p>
          <div className="actions">
            <a className="button" href="/play/">Play in the browser</a>
            <a className="button ghost" href="/support/">What $4.99 includes</a>
          </div>
        </div>
      </div>
    </section>
  </>
  );
}
