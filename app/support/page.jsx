import SupporterAccess from "../components/SupporterAccess";
import AccountLink from "../components/AccountLink";
import { SignedIn, SignedOut } from "../components/AuthGate";
import { topics } from "../components/helpTopics";

export const metadata = {
  title: "Get Klyra · Klyra: Broken Front",
  description:
    "Buy KLYRA Supporter Edition ($4.99, one-time, Windows + Mac) or reach the team: Discord, account help, and answers to common questions.",
};

const included = [
  "Access to the Windows desktop version",
  "Access to the Mac desktop version",
  "The ability to play without running the game in a browser",
  "Direct support for KLYRA's ongoing solo development",
];

export default function GetKlyraPage() {
  return (
    <main>
      <section className="pageIntro kxIntro" style={{ "--kx-bg": "url(/shots/trailer/armory.jpg)" }}>
        <p className="tag">Supporter Edition &middot; Help &middot; Account</p>
        <h1>Get <span className="kxGold">Klyra.</span></h1>
        <p className="lead">Play free in your browser. The Supporter Edition unlocks the Windows and Mac download and supports development.</p>
        <nav className="kxJump" aria-label="On this page">
          <a href="#buy"><small>01</small>Buy</a>
          <a href="#team"><small>02</small>Reach the team</a>
        </nav>
      </section>

      <section id="buy" className="section kxAnchor">
        <div className="sectionIntro">
          <p className="tag">01 // Buy</p>
          <h2>Supporter Edition &mdash; $4.99</h2>
          <p>One price, paid once. The full desktop build on Windows and Mac, tied to your account. No subscription.</p>
        </div>
        <div className="founderCard">
          <div>
            <p className="tag">KLYRA: Broken Front</p>
            <h2>Supporter Edition</h2>
            <p>
              The browser build is free and always will be. Supporter Edition
              gives you the full-performance Windows and Mac build: higher frame
              rates, longer view distance, and room for crowded fights.
            </p>
            <SupporterAccess />
            <a className="button ghost" href="/play/">Play in the browser</a>
          </div>
          <div>
            <h3>What you get</h3>
            <ul>
              {included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>Same war, no paywall</h3>
            <p>
              No gameplay content is locked behind a purchase. Everyone can
              experience KLYRA&apos;s ongoing battles, vehicles, weapon
              customization, and FOB systems.
            </p>
          </div>
        </div>
        <figure className="kxDevNote">
          <blockquote>
            Klyra is built by one developer. The Supporter Edition gets you the
            full Windows and Mac build, and it pays for new maps, vehicles and
            fixes. Thanks for being on the front.
          </blockquote>
          <figcaption>&mdash; Uncle Philburt</figcaption>
        </figure>
        <div className="notice">
          <p className="tag">Pre-alpha</p>
          <h2>Know what you&apos;re buying.</h2>
          <p>
            KLYRA is currently in pre-alpha. Features, performance, and content
            may change throughout development.
          </p>
          <p>
            Future features are not guaranteed. Supporter Edition is not a
            promise that something on the roadmap will ship, and it is not a
            finished game.
          </p>
        </div>
      </section>

      <section id="team" className="section kxAnchor">
        <div className="sectionIntro">
          <p className="tag">02 // Reach the team</p>
          <h2>Straight to the developer.</h2>
          <p>Bug reports, purchase questions, and account issues all go to the same place, and they get read.</p>
        </div>
        <div className="cards kxContact">
          <article>
            <span>Discord</span>
            <h3>The KLYRA Discord</h3>
            <p>Report a bug, pitch an idea, ask about a purchase, or find a squad. It&apos;s the fastest line to the developer.</p>
            <a className="button" href="https://discord.gg/fNkZjwQJBX" target="_blank" rel="noreferrer">Join Discord ↗</a>
          </article>
          <article>
            <span>Account</span>
            <h3>Your account</h3>
            <SignedOut>
              <p>Sign in or create an account, reset a password, or change your callsign on the account page.</p>
            </SignedOut>
            <SignedIn>
              <p>You&apos;re signed in. Change your callsign, reset your password, and see your purchases and receipts on the account page.</p>
            </SignedIn>
            <AccountLink className="button ghost" signedOutLabel="Open account" signedInPrefix="" />
          </article>
          <article>
            <span>Purchases</span>
            <h3>Payment questions</h3>
            <p>Every receipt is on your account page after checkout. If a payment went through and access hasn&apos;t shown up, post on Discord with your callsign and it gets sorted.</p>
            <a className="button ghost" href="#buy">Back to Buy</a>
          </article>
        </div>

        <div className="sectionIntro kxFaqHead">
          <p className="tag">Common questions</p>
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
