export const metadata = {
  title: "Support development · Klyra: Broken Front",
  description:
    "Founder's Access is $4.99. It supports solo development of the KLYRA pre-alpha. Future features are not guaranteed.",
};

export default function SupportPage() {
  return (
    <main>
      <section className="pageIntro">
        <p className="tag">Founder&apos;s Access</p>
        <h1>Support the build.</h1>
        <p className="lead">
          KLYRA: Broken Front is made by one developer. A purchase helps that
          work continue.
        </p>
      </section>

      <section className="section">
        <div className="founderCard">
          <div>
            <p className="tag">$4.99</p>
            <h2>Founder&apos;s Access</h2>
            <a className="button huge" href="/download/">
              Download the pre-alpha
            </a>
            <p className="quiet">
              The $4.99 checkout is not open on this page yet. The current
              pre-alpha desktop build can still be downloaded.
            </p>
          </div>
          <div>
            <h3>Support Solo Indie Development</h3>
            <p>
              Your purchase gives you access to KLYRA&apos;s current pre-alpha
              desktop build while supporting its continued development by a
              solo creator.
            </p>
            <h3>What you receive</h3>
            <p>
              The current pre-alpha desktop build on Windows and Mac. That is
              the build on the Play page today: the factions, the bots, the
              vehicles, the bases, and the weapon builder as they stand now.
            </p>
            <h3>What a purchase supports</h3>
            <p>
              More time on the battlefield. New systems are added one at a
              time by the same person who is building the game.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="notice">
          <p className="tag">Pre-alpha</p>
          <h2>Read this before you pay.</h2>
          <p>
            KLYRA is in pre-alpha. Matches can break. Progress can be reset.
            Screens, weapons, vehicles, and maps can change or be removed.
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
