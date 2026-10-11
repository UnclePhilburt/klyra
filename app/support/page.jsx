export const metadata = {
  title: "Founder's Access · Klyra: Broken Front",
  description:
    "Founder's Access is a $4.99 one-time purchase for the Windows and Mac versions of KLYRA. No gameplay is locked behind it. The game is in pre-alpha.",
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
      <section className="pageIntro">
        <p className="tag">Founder&apos;s Access</p>
        <h1>$4.99</h1>
        <p className="lead">One-time purchase.</p>
      </section>

      <section className="section">
        <div className="founderCard">
          <div>
            <p className="tag">KLYRA: Broken Front</p>
            <h2>Founder&apos;s Access</h2>
            <p>
              Enjoy KLYRA for free in your browser, or support its development
              by unlocking the downloadable Windows and Mac versions.
            </p>
            <a className="button huge" href="/download/">
              Download the pre-alpha
            </a>
            <p className="quiet">
              A browser version is not on this site yet. When it is, it uses this
              same sign-in. Checkout is not open. The Windows and Mac downloads
              are still free to get.
            </p>
          </div>
          <div>
            <h3>Founder&apos;s Access includes</h3>
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
            Future features are not guaranteed. Founder&apos;s Access is not a
            promise that something on the roadmap will ship, and it is not a
            finished game.
          </p>
        </div>
      </section>
    </main>
  );
}
