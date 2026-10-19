"use client";
import { windowsLauncher, macLauncher } from "../site-data";
import { WindowsIcon, AppleIcon } from "../components/PlatformIcons";
import AccountLink from "../components/AccountLink";
import SupporterEmblem from "../components/SupporterEmblem";
import ServerDownloads from "./ServerDownloads";
import { RevealRoot } from "../features/FeatureFX";

const steps = [
  ["01", "Download the launcher", "Free for Windows and Mac. It installs the game and keeps it up to date."],
  ["02", "Sign in", "Use a free KLYRA account, the same one as this site. No account yet? Create one in under a minute."],
  ["03", "Drop in", "Pick The Regiment, Kin of the Hollow, or Blackline Group and push the front. Your account keeps the gear you extract."],
];

export default function DownloadPanel() {
  return (
    <>
      <RevealRoot />
      <section className="kxDlHero kxF2PDlHero">
        <div className="kxDlBg" aria-hidden="true" />
        <div className="kxF2PFlare" aria-hidden="true" />
        <p className="kxF2PStamp kxF2PStampCenter"><span>Free to play</span><b>No paywall · No subscription</b></p>
        <h1>Download <span className="kxF2PFree" data-text="free.">free.</span></h1>
        <p className="lead">KLYRA: Broken Front is free on Windows and Mac. Grab the launcher, sign in with your free KLYRA account, and drop onto the front.</p>
      </section>

      <section className="kxDlPlatforms" aria-label="Choose your platform">
        <article className="kxDlCard kxF2PDlCard" data-reveal>
          <span className="kxF2PFreeTag">Free</span>
          <div className="kxDlIcon"><WindowsIcon /></div>
          <p className="tag">Windows</p>
          <h2>Windows</h2>
          <p>64-bit Windows. Keyboard and mouse or controller.</p>
          <a className="kxDlBtn" href={windowsLauncher}><WindowsIcon /><span>Download free for Windows</span></a>
        </article>
        <article className="kxDlCard kxF2PDlCard" data-reveal style={{ "--d": "90ms" }}>
          <span className="kxF2PFreeTag">Free</span>
          <div className="kxDlIcon"><AppleIcon /></div>
          <p className="tag">Mac</p>
          <h2>Mac</h2>
          <p>macOS 12 or newer. Keyboard and mouse or controller.</p>
          <a className="kxDlBtn" href={macLauncher}><AppleIcon /><span>Download free for Mac</span></a>
        </article>
      </section>

      <section className="kxDlExplain kxF2PDlExplain" data-reveal>
        <div className="kxDlFree">
          <strong>Free for everyone.</strong>
          <span>Every faction, vehicle and weapon. Nothing in the fight is behind a purchase.</span>
        </div>
        <AccountLink className="button" signedOutLabel="Create free account" signedInPrefix="Signed in as" />
      </section>

      <section className="kxDlWrap kxF2PDlSupport" data-reveal>
        <a className="kxF2PSupportBand" href="/support/">
          <SupporterEmblem size={140} className="kxF2PSupportCrest" alt="" />
          <span className="kxF2PSupportText">
            <small>Optional</small>
            <strong>Like it? Back the front.</strong>
            <span>A one-time $4.99 Supporter Edition helps pay for servers and development, and unlocks supporter cosmetics: badge, profile titles, exclusive characters and an in-game marker.</span>
          </span>
          <span className="kxF2PSupportGo">Support Klyra <b aria-hidden="true">&rarr;</b></span>
        </a>
        <p className="kxDlAlt">Rather not download? <a href="/play/">Play free in your browser &rarr;</a></p>
      </section>

      <section className="kxDlWrap">
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

      <section className="kxDlWrap" id="dedicated-servers">
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
