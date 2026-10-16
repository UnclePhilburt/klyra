import TrailerPlayer, { TRAILER_ID } from "../components/TrailerPlayer";

export const metadata = {
  title: "Pre-alpha trailer · Klyra: Broken Front",
  description:
    "Watch the pre-alpha version trailer for Klyra: Broken Front.",
};

export default function TrailerPage() {
  return (
    <main>
      <section className="pageIntro kxIntro kxIntroCenter" style={{ "--kx-bg": "url(/shots/trailer/assault.jpg)" }}>
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
            <a className="button ghost" href={`https://www.youtube.com/watch?v=${TRAILER_ID}`} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          </div>
        </div>
      </section>
      <section className="kxTrailer" aria-label="Trailer">
        <TrailerPlayer />
      </section>
    </main>
  );
}
