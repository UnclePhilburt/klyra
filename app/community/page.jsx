export const metadata = {
  title: "Community · Klyra: Broken Front",
  description:
    "Join the KLYRA: Broken Front Discord for bug reports, suggestions, and multiplayer groups.",
};

export default function CommunityPage() {
  return (
    <main>
      <section className="pageIntro">
        <p className="tag">Community</p>
        <h1>Help test the front.</h1>
        <p className="lead">
          KLYRA is in pre-alpha. The useful thing you can do right now is play
          it and say what broke.
        </p>
      </section>

      <section className="section">
        <div className="cards">
          <article>
            <span>01</span>
            <h3>Play a match</h3>
            <p>Download the desktop build, pick a faction, and stay in long enough to see the zone move.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Write down the break</h3>
            <p>What you were doing, what you expected, and what the game did instead. A screenshot helps.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Bring a second player</h3>
            <p>Online rooms hold up to 20 people. On one computer, two people play with two controllers.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="sectionIntro">
          <p className="tag">Discord</p>
          <h2>Reports, ideas, and groups.</h2>
          <p>
            Bug reports, suggestions, and multiplayer groups go on the KLYRA
            Discord. This is the server for KLYRA: Broken Front.
          </p>
        </div>
        <div className="actions">
          <a className="button" href="https://discord.gg/fNkZjwQJBX" target="_blank" rel="noreferrer">
            Join Discord
          </a>
          <a className="button ghost" href="/download/">Play the pre-alpha</a>
        </div>
      </section>
    </main>
  );
}
