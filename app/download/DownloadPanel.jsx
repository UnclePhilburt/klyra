"use client";
import { windowsLauncher, macLauncher } from "../site-data";
import { WindowsIcon, AppleIcon } from "../components/PlatformIcons";
import AccountLink from "../components/AccountLink";
import ServerDownloads from "./ServerDownloads";
import HomeReveal from "../components/HomeReveal";

const steps = [
  ["01", "Download the launcher", "Free for Windows and Mac. It installs your KLYRA games and keeps them up to date."],
  ["02", "Sign in", "Use a free KLYRA account, the same one as this site. No account yet? Create one in under a minute."],
  ["03", "Pick a game and play", "Jump into Broken Front or the Social Hub. Your account, friends and skins come with you."],
];

const games = [
  { name: "Broken Front", cls: "bf", status: "Playable now", line: "Free-to-play military shooter. Three factions, one moving front. Every faction, vehicle and weapon is open to everyone.", img: "/shots/trailer/tanks.jpg", href: "/games/broken-front/", cta: "About Broken Front" },
  { name: "Redline", cls: "rl", img: "/cars/redline_pro_touring.webp", status: "In development", line: "Pro circuit racing and underground street racing. Not playable yet.", href: "/games/redline/", cta: "About Redline" },
  { name: "Social Hub", cls: "hub", img: null, status: "Available now", line: "Hang out with friends and move between games. Casual minigames too.", href: "/games/", cta: "All games" },
];

const Dl = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function DownloadPanel() {
  return (
    <div className="mHome kd">
      <HomeReveal />
      <section className="mHero kdHero" aria-labelledby="kd-title">
        <div className="mMesh" aria-hidden="true"><i /><i /><i /></div>
        <div className="mGrid" aria-hidden="true" />
        <div className="mHeroInner">
          <img className="mWordmark" src="/brand/klyra-wordmark.svg" alt="KLYRA" width="290" height="78" fetchPriority="high" />
          <p className="mFree"><i aria-hidden="true" />Free to play. No paywall, no subscription.</p>
          <h1 id="kd-title" className="mTitle">Download KLYRA. <span>Free.</span></h1>
          <p className="mLead">KLYRA is free on Windows and Mac. One download, every KLYRA game. Grab the launcher, sign in with your free KLYRA account, and play.</p>
          <div className="kdPlatforms" aria-label="Choose your platform">
            <a className="mCta" href={windowsLauncher}><WindowsIcon /><span>Download free for Windows</span></a>
            <a className="mGhost kdGhost" href={macLauncher}><AppleIcon /><span>Download free for Mac</span></a>
          </div>
          <p className="mFreeNote">Windows: 64-bit. Mac: macOS 12 or newer. Keyboard and mouse or controller.</p>
        </div>
      </section>

      <section className="mGames kdInside" aria-labelledby="dl-inside">
        <header className="mHead mReveal"><p>What's inside</p><h2 id="dl-inside">One launcher. Every game.</h2></header>
        <ul className="kdGames">
          {games.map((g, i) => (
            <li key={g.name} className={`kdGame mReveal ${g.cls}`} style={{ "--d": `${i * 90}ms` }}>
              <span className="kdArt" aria-hidden="true">{g.img ? <img src={g.img} alt="" loading="lazy" decoding="async" /> : <span className="mHubArt"><i /><i /><i /></span>}</span>
              <span className="kdBody">
                <span className="kdStatus">{g.status}</span>
                <h3>{g.name}</h3>
                <p>{g.line}</p>
                <a href={g.href}>{g.cta} <b aria-hidden="true">&rarr;</b></a>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="kdWrap mReveal">
        <div className="kdFree">
          <div><strong>Free for everyone.</strong><span>Every KLYRA game is free to play. Optional skins are sold in the store and live on your KLYRA account.</span></div>
          <AccountLink className="mGhost" signedOutLabel="Create free account" signedInPrefix="Signed in as" />
        </div>
      </section>

      <section className="kdWrap">
        <header className="mHead mReveal"><p>How it works</p><h2>Three steps in.</h2></header>
        <ol className="kdSteps">
          {steps.map(([n, t, c], i) => (
            <li key={n} className="mReveal" style={{ "--d": `${i * 90}ms` }}><span>{n}</span><h3>{t}</h3><p>{c}</p></li>
          ))}
        </ol>
      </section>

      <section className="kdWrap mReveal">
        <a className="kdSupport" href="/support/">
          <img src="/brand/klyra-wordmark.svg" alt="" width="120" height="32" />
          <span className="kdSupportText">
            <small>Optional</small>
            <strong>Support KLYRA.</strong>
            <span>A one-time $4.99 Supporter Edition helps pay for servers and development, and unlocks supporter cosmetics: badge, profile titles, exclusive characters and an in-game marker.</span>
          </span>
          <span className="kdSupportGo">Support KLYRA <b aria-hidden="true">&rarr;</b></span>
        </a>
        <p className="kdAlt">Rather not download? <a href="/play/">Play free in your browser &rarr;</a></p>
      </section>

      <section className="kdWrap" id="dedicated-servers">
        <div className="kdServers mReveal">
          <div>
            <p className="kdKicker">Private developer tools</p>
            <h2>Dedicated servers</h2>
            <p>Run a KLYRA dedicated server on Windows or Mac. Server packages require the authorized developer account.</p>
          </div>
          <div>
            <ServerDownloads />
            <p className="quiet">Extract the package and run its included start script.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
