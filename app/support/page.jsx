import SupporterAccess from "../components/SupporterAccess";
export const metadata = {
  title: "Supporter Edition · Klyra: Broken Front",
  description:
    "Supporter Edition is a $4.99 one-time purchase for the Windows and Mac versions of KLYRA. No gameplay is locked behind it. The game is in pre-alpha.",
};

const included = [
  "Access to the Windows desktop version",
  "Access to the Mac desktop version",
  "The ability to play without running the game in a browser",
  "Direct support for KLYRA's ongoing solo development",
];

export default function SupportPage() {
  return (
    <main>
      <section className="pageIntro kxIntro" style={{ "--kx-bg": "url(/shots/truck.jpg)" }}>
        <p className="tag">Supporter Edition</p>
        <h1>$4.99</h1>
        <p className="lead">One-time purchase.</p>
      </section>

      <section className="section">
        <div className="founderCard">
          <div>
            <p className="tag">KLYRA: Broken Front</p>
            <h2>Supporter Edition</h2>
            <p>
              Enjoy KLYRA for free in your browser, or support its development
              by unlocking the downloadable Windows and Mac versions.
            </p>
            <SupporterAccess />
            <a className="button ghost" href="/play/">Play in the browser</a>
          </div>
          <div>
            <h3>Supporter Edition includes</h3>
            <ul>
              {included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>The fight stays open</h3>
            <p>
              No gameplay content is locked behind a purchase. Everyone can
              experience KLYRA&apos;s ongoing battles, vehicles, weapon
              customization, and FOB systems.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="notice">
          <p className="tag">Pre-alpha</p>
          <h2>Read this before you pay.</h2>
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
    </main>
  );
}
