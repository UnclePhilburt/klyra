import AccountLink from "../components/AccountLink";
import { SignedIn, SignedOut } from "../components/AuthGate";

export const metadata = {
  title: "Play in the browser · Klyra: Broken Front",
  description:
    "Play KLYRA free in your browser. Performance is degraded because it runs in a web browser. It uses your KLYRA account.",
};

const steps = [
  ["01", "Your account", "The browser game uses the same KLYRA account (callsign or email) as this site."],
  ["02", "Open this page", "The fight starts here. There is no launcher for the browser version."],
  ["03", "Expect less", "Performance is degraded because this is a web browser build. The free desktop download is the full-performance version."],
];

export default function PlayPage() {
  return (
    <main>
      <section className="pageIntro kxIntro" style={{ "--kx-bg": "url(/shots/trailer/action-1.jpg)" }}>
        <p className="tag">Browser build</p>
        <h1>Play in the browser.</h1>
        <p className="lead">
          This page is where the browser version of KLYRA opens.{" "}
          <SignedOut>Sign in on this site first. The game uses that account.</SignedOut>
          <SignedIn>You&apos;re signed in, so the game uses your account.</SignedIn>
        </p>
        <div className="actions">
          <AccountLink className="button" signedOutLabel="Sign in" signedInPrefix="Playing as" />
          <a className="button ghost" href="/download/">Download free for full performance</a>
        </div>
      </section>

      <section className="section">
        <div className="notice">
          <p className="tag">Performance</p>
          <h2>Degraded, because it is a web browser build.</h2>
          <p>
            Frame rate, view distance, and crowded fights are lower than the
            Windows and Mac versions. The browser build gives up that headroom
            so the fight can run inside a browser tab.
          </p>
          <p>
            The free desktop download is the full-performance way to play. No
            gameplay is locked behind either version, and both are free. Same factions, same
            front, less room to spare in the browser.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="sectionIntro">
          <p className="tag">On this page</p>
          <h2>How you get in.</h2>
        </div>
        <div className="cards featureList">
          {steps.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="notice">
          <p className="tag">This page</p>
          <h2>The fight opens here.</h2>
          <p>
            <SignedOut>Sign in on this site first. </SignedOut>The browser game uses your KLYRA account.
            The free Windows and Mac downloads are the full-performance way to play.
          </p>
          <div className="actions">
            <a className="button" href="/download/">Download free</a>
          </div>
        </div>
      </section>
    </main>
  );
}
