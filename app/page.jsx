import HomeReveal from "./components/HomeReveal";

export const metadata = { alternates: { canonical: "https://klyra.lol/" } };

const games = [
  { key: "bf", name: "Broken Front", tag: "Flagship · Free to play", pitch: "Free-to-play military shooter. Pre-alpha.", img: "/shots/trailer/tanks.jpg", href: "/games/broken-front/", cta: "Play" },
  { key: "rl", name: "Redline", tag: "In development", pitch: "Pro and Street racing. Car previews only.", img: "/cars/redline_pro_touring.webp", href: "/games/redline/", cta: "Preview" },
  { key: "hub", name: "Social Hub", tag: "Available now", pitch: "Hang out with friends and move between games. Casual minigames too: kick a ball around, box your friends.", img: null, href: "/games/", cta: "All games" },
];

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function Home() {
  return (
    <main className="kxHome mHome">
      <HomeReveal />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [
        { "@type": "Organization", name: "KLYRA", url: "https://klyra.lol/", logo: "https://klyra.lol/brand/klyra-wordmark.svg" },
        { "@type": "WebSite", name: "KLYRA", url: "https://klyra.lol/", description: "Free-to-play KLYRA games, connected by one account, one store and one social hub." },
      ] }) }} />
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

      <section className="mMusic mReveal" aria-labelledby="m-music">
        <div className="mMusicArt mMusicViz" aria-hidden="true">
          <svg className="mWaves" viewBox="0 0 600 450" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mwg" x1="0" x2="1"><stop offset="0" stopColor="#1ec8ff" stopOpacity="0" /><stop offset=".5" stopColor="#1ec8ff" /><stop offset="1" stopColor="#7a5cff" stopOpacity="0" /></linearGradient>
              <filter id="mwglow"><feGaussianBlur stdDeviation="4" /></filter>
            </defs>
            <g className="mWaveSet" fill="none" stroke="url(#mwg)">
              <path filter="url(#mwglow)" strokeWidth="6" d="M0 225 C75 150 150 300 225 225 S375 150 450 225 S550 300 600 225" />
              <path strokeWidth="2" d="M0 225 C75 150 150 300 225 225 S375 150 450 225 S550 300 600 225" />
              <path strokeWidth="1.5" opacity=".55" d="M0 225 C60 120 140 330 225 225 S380 110 450 225 S560 330 600 225" />
              <path strokeWidth="1" opacity=".35" d="M0 225 C90 185 160 265 240 225 S390 185 460 225 S560 265 600 225" />
            </g>
          </svg>
          <span className="mMusicWord">TROY</span>
          <span className="mMusicBars">{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ "--i": i, height: `${18 + ((i * 37) % 72)}%` }} />)}</span>
        </div>
        <div className="mMusicCopy">
          <p className="mSoloTag">Official soundtrack partner</p>
          <h2 id="m-music">TROY <span>The Reality of Yourself</span></h2>
          <p>The music of KLYRA, across every KLYRA game.</p>
          <div className="mMusicLinks">
            <a href="https://open.spotify.com/artist/0ZcBV5wpdzrQOKuC7hUGQs?si=44Oq1W4LQHeqPBMm8DKFaw" target="_blank" rel="noreferrer">Listen on Spotify ↗</a>
            <a href="https://www.youtube.com/channel/UC_tSPmI8_iRieBMvpWvtpFg" target="_blank" rel="noreferrer">Watch on YouTube ↗</a>
            <a href="https://www.store.therealityofyourself.com/" target="_blank" rel="noreferrer">Official store ↗</a>
          </div>
        </div>
      </section>

      <section className="mSolo mReveal" aria-labelledby="m-solo">
        <p className="mSoloTag">Independently developed</p>
        <h2 id="m-solo">One developer.</h2>
        <p>KLYRA is built by one independent developer: a growing collection of free-to-play games connected by one account, one store and one social hub.</p>
      </section>

      <section className="mOutro mReveal" aria-label="Get KLYRA">
        <h2>Ready when you are.</h2>
        <a className="mCta" href="/download/">Download KLYRA</a>
        <p className="mFreeNote">Free to play. Every KLYRA game.</p>
      </section>
    </main>
  );
}
