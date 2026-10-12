export const metadata = {
  title: "Pre-alpha trailer · Klyra: Broken Front",
  description:
    "Watch the pre-alpha version trailer for Klyra: Broken Front.",
};

export default function TrailerPage() {
  return (
    <main>
      <section className="pageHero trailerPage">
        <div>
          <p className="tag">Pre-alpha version</p>
          <h1>Pre-alpha trailer.</h1>
          <p className="lead">
            This trailer is the pre-alpha version of Klyra: Broken Front. The
            war on screen is still being built.
          </p>
          <div className="actions">
            <a className="button" href="/play/">
              Play in the browser
            </a>
            <a className="button ghost" href="https://www.youtube.com/watch?v=UCOv0qqh0r0">
              Watch on YouTube
            </a>
          </div>
        </div>
        <div className="trailerFrame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/UCOv0qqh0r0?rel=0"
            title="Klyra: Broken Front pre-alpha version trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>
    </main>
  );
}
