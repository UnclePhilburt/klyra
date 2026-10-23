import RedlineViewer from "./RedlineViewer";
import { redlineCars, redlineDisciplines } from "../gamesData";

export const metadata = {
  title: "KLYRA: Redline · In development",
  description: "KLYRA: Redline is a racing game in development, with two disciplines: Redline Pro and Redline Street.",
  alternates: { canonical: "https://klyra.lol/games/redline/" },
  openGraph: { title: "KLYRA: Redline · In development", url: "https://klyra.lol/games/redline/", images: [{ url: "/cars/redline_street_sports.webp" }] },
};

export default function RedlinePage() {
  return (
    <main className="rlPage">
      <section className="rlHead">
        <p className="rlDev"><i aria-hidden="true" />In development</p>
        <h1><span>KLYRA:</span> Redline</h1>
        <p className="rlLead">A racing game with two disciplines. Work-in-progress car models, no gameplay shown.</p>
      </section>
      <RedlineViewer cars={redlineCars} />
      <section className="rlSplit" aria-label="Disciplines">
        {redlineDisciplines.map((d) => (
          <article key={d.id} className={`rlDisc ${d.id}`}>
            <h2>{d.name}</h2>
            <ul>{d.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </article>
        ))}
      </section>
      <p className="rlNote">KLYRA: Redline is in development. Everything shown here is work in progress and can change.</p>
    </main>
  );
}
