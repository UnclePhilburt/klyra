export const metadata = {
  title: "Development · Klyra: Broken Front",
  description:
    "KLYRA: Broken Front is built by one developer. New systems, progress, and what is being worked on now.",
};

export default function DevlogPage() {
  return (
    <main>
      <section className="pageIntro">
        <p className="tag">Development</p>
        <h1>Built by one developer.</h1>
        <p className="lead">
          KLYRA: Broken Front is an independently developed military sandbox
          created by a solo developer with a passion for large-scale warfare
          and player-driven gameplay.
        </p>
        <p>
          From infantry combat and helicopters to logistics, weapon
          customization, and forward operating bases, KLYRA is being built and
          expanded one system at a time.
        </p>
        <p>
          Currently in pre-alpha, the game continues to evolve through
          development, testing, and community feedback.
        </p>
        <p>
          The goal is to create a battlefield where every player has a role and
          every battle tells a different story.
        </p>
      </section>

      <section className="section">
        <article className="post">
          <p className="tag">October 11, 2026</p>
          <h2>The browser page is up.</h2>
          <p>
            The play page is where the browser version will open. The game file
            is still being built, so it is not playable there yet. Sign in on
            this site and the browser game uses that account.
          </p>
          <p>
            Performance is degraded because it is a web browser build. Frame
            rate, view distance, and crowded fights are lower than the Windows
            and Mac versions. The desktop download remains the full-performance
            way to play.
          </p>
        </article>

        <article className="post">
          <p className="tag">October 11, 2026</p>
          <h2>The pre-alpha is playable.</h2>
          <p>
            The desktop build has the three factions, a moving front that ends
            at 100 points, helicopters, supply trucks, forward bases, a weapon
            builder, revive, and a stash for gear you extract. Online rooms hold
            up to 20 players. The field fills toward 60 soldiers, 20 on a side.
            Two people can also play on one computer with two controllers.
          </p>
          <div className="shotGrid">
            <figure>
              <img src="/shots/heli.jpg" alt="Helicopter cockpit in the pre-alpha" />
              <figcaption>Helicopter cockpit from the current trailer.</figcaption>
            </figure>
            <figure>
              <img src="/shots/truck.jpg" alt="Supply truck in the pre-alpha" />
              <figcaption>A supply run on the road.</figcaption>
            </figure>
            <figure>
              <img src="/shots/split.jpg" alt="Split-screen in the pre-alpha" />
              <figcaption>Split-screen on one computer.</figcaption>
            </figure>
          </div>
        </article>

        <article className="post">
          <p className="tag">In the workshop</p>
          <h2>The battlefield is getting quieter.</h2>
          <p>
            Weather around the fight is being turned down so guns, trucks, and
            helicopters stay in front of the wind and rain. Bird and animal
            sounds are being taken off the test map. A warzone should not sound
            like a nature reserve.
          </p>
          <p>
            That pass is in the project now. It is not in the desktop download
            yet. It ships when the next build goes out.
          </p>
        </article>
      </section>
    </main>
  );
}
