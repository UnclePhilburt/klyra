export const metadata = {
  title: "Community · Klyra: Broken Front",
  description:
    "How to help test KLYRA: Broken Front, and where bug reports, suggestions, and multiplayer groups will live.",
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
            <p>Online rooms hold up to 12 people. On one computer, a second controller can join the same fight.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="sectionIntro">
          <p className="tag">Discord</p>
          <h2>Reports, ideas, and groups.</h2>
          <p>
            Bug reports, suggestions, and multiplayer groups belong on the
            KLYRA Discord. The invite is not posted on this page yet. When it
            is ready, the join button goes here.
          </p>
          <p>
            Until then, play from the download page. Do not send reports to a
            server that is not this game.
          </p>
        </div>
        <a className="button" href="/download/">Play the pre-alpha</a>
      </section>
    </main>
  );
}
