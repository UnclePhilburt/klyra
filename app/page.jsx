import HomeReveal from "./components/HomeReveal";

export const metadata = { alternates: { canonical: "https://klyra.lol/" } };

const games = [
  { key: "bf", name: "Broken Front", tag: "Flagship · Free to play", pitch: "Free-to-play military shooter. Pre-alpha.", img: "/shots/trailer/tanks.jpg", href: "/games/broken-front/", cta: "Play" },
  { key: "rl", name: "Redline", tag: "In development", pitch: "Pro and Street racing. Car previews only.", img: "/cars/redline_pro_touring.webp", href: "/games/redline/", cta: "Preview" },
  { key: "hub", name: "Social Hub", tag: "Part of the platform", pitch: "Soccer, boxing, team deathmatch and friends.", img: null, href: "/games/", cta: "All games" },
];

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function Home() {
  return (
    <main className="kxHome mHome">
      <HomeReveal />
      <section className="mHero" aria-labelledby="m-title">
        <div className="mMesh" aria-hidden="true"><i /><i /><i /></div>
        <div className="mGrid" aria-hidden="true" />
        <div className="mHeroInner">
          <img className="mWordmark" src="/brand/klyra-wordmark.svg" alt="KLYRA" width="290" height="78" fetchPriority="high" />
          <p className="mFree"><i aria-hidden="true" />Free to play. Every KLYRA game.</p>
          <h1 id="m-title" className="mTitle">Every KLYRA game. <span>One home.</span></h1>
          <p className="mLead">The KLYRA platform: our games, your friends and your gear in one place.</p>
          <div className="mActions">
            <a className="mCta" href="/download/">
              <Icon d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />
              Download KLYRA
            </a>
            <a className="mGhost" href="#games">Explore games</a>
          </div>
          <p className="mFreeNote">Free download. Every KLYRA game is free to play; optional skins are sold in the store.</p>
        </div>
        <a className="mScroll" href="#games" aria-label="Scroll to games"><span /></a>
      </section>

      <section className="mStrip" aria-label="Platform">
        <div className="mStripItem mReveal"><Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c1.5-3.3 4-5 7-5s5.5 1.7 7 5" /><span><b>One account</b> Callsign and friends everywhere</span></div>
        <div className="mStripItem mReveal"><Icon d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" /><span><b>One download</b> Every KLYRA game, one client</span></div>
        <div className="mStripItem mReveal"><Icon d="M4 7h16l-1.5 11h-13L4 7zm4 0a4 4 0 0 1 8 0" /><span><b>Universal store</b> Skins live on your KLYRA account</span></div>
      </section>

      <section id="games" className="mGames" aria-labelledby="m-games">
        <header className="mHead mReveal"><p>Games</p><h2 id="m-games">Pick your world.</h2></header>
        <div className="mCards">
          {games.map((g, i) => (
            <a key={g.key} href={g.href} className={`mCard mReveal ${g.key}`} style={{ "--d": `${i * 90}ms` }}>
              <span className="mCardMedia">
                {g.img ? <img src={g.img} alt="" loading="lazy" decoding="async" /> : <span className="mHubArt" aria-hidden="true"><i /><i /><i /></span>}
              </span>
              <span className="mCardGlow" aria-hidden="true" />
              <span className="mCardBody">
                <em>{g.tag}</em>
                <strong>{g.name}</strong>
                <small>{g.pitch}</small>
                <b>{g.cta}<span aria-hidden="true">→</span></b>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mSolo mReveal" aria-labelledby="m-solo">
        <p className="mSoloTag">Independently developed</p>
        <h2 id="m-solo">One developer.</h2>
        <p>KLYRA is built by an independent developer. KLYRA: Broken Front is a solo-developed military sandbox built around large-scale warfare, player freedom, and an evolving battlefield.</p>
      </section>

      <section className="mOutro mReveal" aria-label="Get KLYRA">
        <h2>Ready when you are.</h2>
        <a className="mCta" href="/download/">Download KLYRA</a>
        <p className="mFreeNote">Free to play. Every KLYRA game.</p>
      </section>
    </main>
  );
}
