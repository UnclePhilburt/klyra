"use client";
import { windowsLauncher, macLauncher } from "../site-data";
import SupporterAccess from "../components/SupporterAccess";
import ServerDownloads from "./ServerDownloads";
import { RevealRoot } from "../features/FeatureFX";

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5.1 10.4 4v7.2H3V5.1Zm0 13.8 7.4 1.1v-7.1H3v6Zm8.3 1.2L21 21.5v-8.6h-9.7v7.2Zm0-16.2v7.3H21V2.5l-9.7 1.4Z" /></svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1ZM13.9 4.9c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z" /></svg>
  );
}

const steps = [
  ["01", "Download the launcher", "Free for Windows and Mac. It keeps the game up to date."],
  ["02", "Sign in", "Use the same KLYRA account as this site."],
  ["03", "Drop in", "Pick Ironclad, Timberwolf, or Vanguard and push the front. Your account keeps the gear you extract."],
];

export default function DownloadPanel() {
  return (
    <>
      <RevealRoot />
      <section className="kxDlHero">
        <div className="kxDlBg" aria-hidden="true" />
        <p className="tag">Pre-alpha &middot; Desktop</p>
        <h1>Get on the <span className="kxGold">front.</span></h1>
        <p className="lead">Download the free launcher for your computer. The Supporter Edition unlocks the full desktop game.</p>
      </section>

      <section className="kxDlPlatforms" aria-label="Choose your platform">
        <article className="kxDlCard" data-reveal>
          <div className="kxDlIcon"><WindowsIcon /></div>
          <p className="tag">Windows</p>
          <h2>Windows</h2>
          <p>64-bit Windows. Keyboard and mouse or controller.</p>
          <a className="kxDlBtn" href={windowsLauncher}><WindowsIcon /><span>Download for Windows</span></a>
        </article>
        <article className="kxDlCard" data-reveal style={{ "--d": "90ms" }}>
          <div className="kxDlIcon"><AppleIcon /></div>
          <p className="tag">Mac</p>
          <h2>Mac</h2>
          <p>macOS 12 or newer. Keyboard and mouse or controller.</p>
          <a className="kxDlBtn" href={macLauncher}><AppleIcon /><span>Download for Mac</span></a>
        </article>
      </section>

      <section className="kxDlExplain" data-reveal>
        <div className="kxDlFree">
          <strong>The launcher is free.</strong>
          <span>Desktop play needs the Supporter Edition &mdash; $4.99, one time, Windows and Mac.</span>
        </div>
        <a className="button ghost" href="/support/#buy">See Supporter Edition</a>
      </section>

      <section className="section kxDlAccess">
        <div className="sectionIntro" data-reveal>
          <p className="tag">Your access</p>
          <h2>Supporter Edition</h2>
        </div>
        <div className="kxDlAccessBox" data-reveal><SupporterAccess /></div>
        <p className="kxDlAlt" data-reveal>Rather not download? <a href="/play/">Play free in your browser &rarr;</a></p>
      </section>

      <section className="section">
        <div className="sectionIntro" data-reveal>
          <p className="tag">How it works</p>
          <h2>Three steps in.</h2>
        </div>
        <ol className="kxDlSteps">
          {steps.map(([n, t, c], i) => (
            <li key={n} data-reveal style={{ "--d": `${i * 90}ms` }}><span>{n}</span><h3>{t}</h3><p>{c}</p></li>
          ))}
        </ol>
      </section>

      <section className="section" id="dedicated-servers">
        <div className="kxDlServers" data-reveal>
          <div>
            <p className="tag">Private developer tools</p>
            <h2>Dedicated servers</h2>
            <p>Run a KLYRA dedicated server on Windows or Mac. Server packages require the authorized developer account.</p>
          </div>
          <div>
            <ServerDownloads />
            <p className="quiet">Extract the package and run its included start script.</p>
          </div>
        </div>
      </section>
    </>
  );
}
