import SupporterAccess from "../components/SupporterAccess";
import SupporterBadge from "../components/SupporterBadge";
import { CardBody } from "../friends/PlayerCard";
import { StarIcon } from "../components/PlatformIcons";
import { topics } from "../components/helpTopics";

export const metadata = {
  title: "Support Klyra · Supporter Edition · Klyra: Broken Front",
  description:
    "KLYRA: Broken Front is free to play. The optional $4.99 Supporter Edition is a one-time way to help pay for servers and development, plus answers to common questions.",
};

const funds = [
  {
    n: "01",
    title: "Servers",
    copy: "Dedicated servers running 90-bot fronts, plus the accounts, friends and match services behind them. Every hour online costs money.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="7" y="7" width="34" height="10" /><rect x="7" y="19" width="34" height="10" /><rect x="7" y="31" width="34" height="10" /></g><g fill="currentColor"><circle cx="13" cy="12" r="1.8" /><circle cx="13" cy="24" r="1.8" /><circle cx="13" cy="36" r="1.8" /></g><path d="M22 12h14M22 24h14M22 36h14" stroke="currentColor" strokeWidth="2.4" /></svg>
    ),
  },
  {
    n: "02",
    title: "Development",
    copy: "KLYRA is built by one independent developer. Support buys time: new vehicles and weapons, bigger fronts, and the fixes from your bug reports.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.4" d="M29.5 9.5a9 9 0 0 0-11.3 11.3L7.5 31.5a3.5 3.5 0 0 0 5 5l10.7-10.7a9 9 0 0 0 11.3-11.3l-5.3 5.3-4.7-1-1-4.7z" /></svg>
    ),
  },
  {
    n: "03",
    title: "Downloads & updates",
    copy: "Hosting the Windows and Mac launcher and every game update, so the free download stays fast for everyone.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.4" d="M24 7v24M14 22l10 10 10-10M8 35v6h32v-6" /></svg>
    ),
  },
];

const perks = [
  ["Supporter badge", "A gold supporter badge on your player card and next to your callsign in friends lists.", "Rolling out on the site"],
  ["In-game supporter marker", "A gold supporter diamond above your name in matches.", "Coming in the next game update"],
  ["Supporter Edition in the launcher", "Your launcher shows Supporter Edition once you have backed the game.", "Windows launcher 0.1.22"],
  ["Supporter profile titles", "Five supporter-only titles for your profile card. See the full set below.", "Coming in the next game update"],
  ["Supporter characters", "Exclusive playable characters for supporters.", "Coming soon"],
  ["Our thanks", "You keep the servers on and the front moving. That matters more than any badge.", "Yours today"],
];

const supporterTitles = ["FOUNDING SUPPORTER", "FRONTLINE SUPPORTER", "BACKED THE FRONT", "EARLY REINFORCEMENT", "KLYRA VANGUARD"];

const previewCard = {
  username: "Your callsign",
  supporter: true,
  profile_title: "FOUNDING SUPPORTER",
  favorite_faction: "the-regiment",
  relationship: "self",
  stats: { matches: 42, wins: 23, kills: 318, deaths: 141, revives: 37, cash_earned: 18450 },
};

export default function SupportPage() {
  return (
    <main className="kxSupPage">
      <section className="kxSupHero">
        <div className="kxSupHeroBg" aria-hidden="true" />
        <div className="kxF2PFlare" aria-hidden="true" />
        <div className="kxSupHeroCopy">
          <p className="kxF2PStamp"><span>Optional</span><b>The game is free</b></p>
          <h1>Back the <span className="kxF2PFree" data-text="front.">front.</span></h1>
          <p className="lead">
            KLYRA: Broken Front is free to play on Windows, Mac and in your browser. If you want to
            help keep the servers on and the front moving, the Supporter Edition is how.
          </p>
          <div className="kxSupPrice">
            <strong>$4.99</strong>
            <span>One time<br />No subscription</span>
          </div>
          <div className="kxF2PActions">
            <a className="kxF2PPrimary" href="#buy">
              <span className="kxF2PFace">
                <span className="kxF2PSheen" aria-hidden="true" />
                <span className="kxF2PLabel"><strong>Become a supporter</strong><small>Supporter Edition &middot; $4.99</small></span>
                <span className="kxF2PIcons" aria-hidden="true"><StarIcon /></span>
              </span>
            </a>
            <a className="kxF2PSecondary" href="/download/">
              <span className="kxF2PLabel"><strong>Download free</strong><small>Windows + Mac</small></span>
            </a>
          </div>
        </div>
        <div className="kxSupMedal" aria-hidden="true">
          <svg viewBox="0 0 240 240">
            <defs>
              <path id="kxSupRing" d="M120 120m-92 0a92 92 0 1 1 184 0a92 92 0 1 1-184 0" />
              <radialGradient id="kxSupGlow" cx="50%" cy="45%" r="60%">
                <stop offset="0" stopColor="#f6dc98" stopOpacity=".55" />
                <stop offset="1" stopColor="#d7b57a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="kxSupGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f8e3a6" />
                <stop offset=".5" stopColor="#d7b57a" />
                <stop offset="1" stopColor="#9c7a3c" />
              </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="118" fill="url(#kxSupGlow)" />
            <g className="kxSupSpin">
              <circle cx="120" cy="120" r="108" fill="none" stroke="#d7b57a" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="3 9" />
              <text className="kxSupRingText"><textPath href="#kxSupRing" startOffset="0" textLength="570" lengthAdjust="spacing">SUPPORTER EDITION ★ BACK THE FRONT ★ SUPPORTER EDITION ★ BACK THE FRONT ★</textPath></text>
            </g>
            <path d="M120 52 170 74v36c0 30-21 50-50 60-29-10-50-30-50-60V74Z" fill="#11150f" stroke="url(#kxSupGold)" strokeWidth="4" />
            <path d="m120 86 9.6 20.8 22.8 2.4-17 15.3 4.8 22.5L120 135.6 99.8 147l4.8-22.5-17-15.3 22.8-2.4Z" fill="url(#kxSupGold)" />
          </svg>
        </div>
      </section>

      <div className="kxHazard" aria-hidden="true" />

      <section className="section kxSupFunds" aria-labelledby="kx-funds-title">
        <div className="sectionIntro">
          <p className="tag">01 // Where it goes</p>
          <h2 id="kx-funds-title">Where your support goes.</h2>
          <p>Supporter money pays for the things that keep a free game running.</p>
        </div>
        <div className="kxSupFundGrid">
          {funds.map((f) => (
            <article key={f.n} className="kxSupFund">
              <span className="kxSupFundN">{f.n}</span>
              <span className="kxSupFundIcon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section kxSupPerks" aria-labelledby="kx-perks-title">
        <div className="sectionIntro">
          <p className="tag">02 // What supporters get</p>
          <h2 id="kx-perks-title">Wear it with pride.</h2>
          <p>Supporter perks are cosmetic: a badge, a marker, titles and exclusive characters. Supporters and free players fight the same war with the same gear. No advantage is for sale.</p>
        </div>
        <div className="kxSupPerkGrid">
          <div className="kxSupPreview">
            <p className="kxSupPreviewLabel">Preview</p>
            <div className="kxSupPreviewCard">
              <CardBody card={previewCard} available />
            </div>
            <div className="kxSupPreviewRow">
              <span className="kxSupDot" />
              <span className="kxCallsign">Your callsign</span>
              <SupporterBadge force size="sm" />
              <small>Online</small>
            </div>
          </div>
          <ul className="kxSupPerkList">
            {perks.map(([title, copy, status]) => (
              <li key={title}>
                <span className="kxSupPerkStar" aria-hidden="true"><StarIcon /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <em className={status === "Yours today" ? "live" : ""}>{status}</em>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section kxSupTitles" aria-labelledby="kx-titles-title">
        <div className="sectionIntro">
          <p className="tag">Supporter titles</p>
          <h2 id="kx-titles-title">Earn your stripes.</h2>
          <p>Five titles only supporters can wear on their profile card. Arriving with the next game update.</p>
        </div>
        <ul className="kxSupPlates">
          {supporterTitles.map((title, i) => (
            <li key={title} className="kxSupPlate" style={{ "--i": i }}>
              <span className="kxSupPlateRivet l" aria-hidden="true" />
              <span className="kxSupPlateNo">{String(i + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <span className="kxSupPlateStars" aria-hidden="true">&#9733;&#9733;&#9733;</span>
              <span className="kxSupPlateRivet r" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>

      <section id="buy" className="section kxAnchor kxSupBuy">
        <div className="sectionIntro">
          <p className="tag">03 // Become a supporter</p>
          <h2>Supporter Edition &mdash; $4.99</h2>
          <p>One payment, linked to your KLYRA account. No subscription. Totally optional: the game is free either way.</p>
        </div>
        <div className="founderCard kxSupBuyCard">
          <div>
            <p className="tag">KLYRA: Broken Front</p>
            <h2>Supporter Edition</h2>
            <p className="kxCardLead">Back an independent game and unlock supporter cosmetics: badge, titles, characters and an in-game marker.</p>
            <SupporterAccess />
          </div>
          <div>
            <h3>Same war for everyone</h3>
            <p>
              KLYRA is free to play. Every faction, vehicle, weapon and the FOB
              systems are open to everyone. Supporting changes how you look, never
              how you fight.
            </p>
            <h3>Where to play</h3>
            <p>
              Download free for <a className="kxGold" href="/download/">Windows and Mac</a>, or{" "}
              <a className="kxGold" href="/play/">play free in your browser</a>.
            </p>
          </div>
        </div>
        <figure className="kxDevNote">
          <blockquote>
            Klyra is built by one developer, and I want everyone to be able to
            play it. If you want to help keep it going, the Supporter Edition
            pays for servers and development time. Thanks for being on the front.
          </blockquote>
          <figcaption>&mdash; Uncle Philburt</figcaption>
        </figure>
        <div className="notice">
          <p className="tag">Pre-alpha</p>
          <h2>Know what you&apos;re supporting.</h2>
          <p>
            KLYRA is currently in pre-alpha. Features, performance, and content
            may change throughout development.
          </p>
          <p>
            Future features are not guaranteed. The Supporter Edition is not a
            promise that something on the roadmap will ship, and it is not a
            finished game.
          </p>
        </div>
      </section>

      <section id="team" className="section kxAnchor">
        <div className="sectionIntro kxFaqHead">
          <p className="tag">04 // Common questions</p>
          <h2>Get into the match.</h2>
        </div>
        <div className="faq">
          {topics.map((topic) => (
            <details key={topic.q}>
              <summary>{topic.q}</summary>
              <p>{topic.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
