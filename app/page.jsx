export const metadata = { alternates: { canonical: "https://klyra.lol/" } };

const cards = [
  { name: "KLYRA: Broken Front", tag: "Flagship · Free to play", tagClass: "mil", pitch: "A free-to-play military shooter, in pre-alpha.", img: "/shots/trailer/gunship.jpg", href: "/games/broken-front/", cta: "Enter the front" },
  { name: "KLYRA: Redline", tag: "In development", tagClass: "dev", pitch: "Racing with Pro and Street disciplines. Car previews only.", img: "/cars/redline_pro_touring.webp", href: "/games/redline/", cta: "Preview the cars" },
  { name: "KLYRA Social Hub", tag: "Part of the platform", tagClass: "hub", pitch: "Soccer, boxing, team deathmatch, joining friends and public matchmaking.", img: null, href: "/games/", cta: "All games" },
];

export default function Home() {
  return (
    <main className="kxHome khHome">
      <section className="khHero" aria-labelledby="kh-title">
        <div className="khHeroGlow" aria-hidden="true" />
        <div className="khHeroInner">
          <img className="khWordmark" src="/brand/klyra-wordmark.svg" alt="" aria-hidden="true" width="290" height="78" />
          <h1 id="kh-title" className="khTitle">One platform. <span>Every KLYRA game.</span></h1>
          <ul className="khPillars">
            <li><b>One download</b><span>Get the KLYRA client once.</span></li>
            <li><b>One account</b><span>Your callsign and friends in every game.</span></li>
            <li><b>Universal store</b><span>Skins belong to your KLYRA account, across games.</span></li>
          </ul>
          <div className="khActions">
            <a className="khPrimary" href="/download/">Download KLYRA</a>
            <a className="khSecondary" href="/account/">Create your account</a>
          </div>
        </div>
      </section>

      <section id="games" className="khGames" aria-labelledby="kh-games-title">
        <div className="khHead"><p className="khKicker">Games</p><h2 id="kh-games-title">The KLYRA lineup</h2></div>
        <div className="khRow">
          {cards.map((c) => (
            <a key={c.name} className={`khMini ${c.tagClass}`} href={c.href}>
              {c.img ? <img src={c.img} alt="" loading="lazy" /> : <span className="khMiniArt" aria-hidden="true"><i>⚽</i><i>🥊</i><i>⌖</i></span>}
              <span className="khCardBody">
                <em className={`khTag ${c.tagClass}`}>{c.tag}</em>
                <strong>{c.name}</strong>
                <small>{c.pitch}</small>
                <b>{c.cta} &rarr;</b>
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
