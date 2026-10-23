import { redlineDisciplines, redlineCars } from "../gamesData";
import { WipNote } from "./RlBits";

export const metadata = {
  title: "KLYRA: Redline · In development",
  description: "KLYRA: Redline is a racing game in development, with two disciplines: Redline Pro and Redline Street.",
  alternates: { canonical: "https://klyra.lol/games/redline/" },
  openGraph: { title: "KLYRA: Redline · In development", url: "https://klyra.lol/games/redline/", images: [{ url: "/cars/redline_street_sports.webp" }] },
};

export default function RedlinePage() {
  return (
    <main className="rlPage">
      <section className="rlHead rlHero">
        <div className="rlSpeed" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <p className="rlDev"><i aria-hidden="true" />In development</p>
        <h1><span>KLYRA:</span> Redline</h1>
        <p className="rlLead">A racing game in two disciplines: Redline Pro, professional circuit racing, and Redline Street, underground street racing.</p>
        <div className="rlHeroActions">
          <a className="rlBtn" href="/games/redline/garage/">Enter the garage</a>
          <a className="rlBtn ghost" href="/games/redline/roadmap/">Roadmap</a>
        </div>
        <img className="rlHeroCar" src="/cars/redline_pro_touring.webp" alt="" width="640" height="360" />
      </section>
      <section className="rlSplit" aria-label="Disciplines">
        {redlineDisciplines.map((d) => (
          <a key={d.id} className={`rlDisc ${d.id}`} href={`/games/redline/${d.id}/`}>
            <h2>{d.name}</h2>
            <ul>{d.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <b className="rlMore">Explore {d.name} &rarr;</b>
          </a>
        ))}
      </section>
      <section className="rlFacts" aria-label="At a glance">
        <div><b>{redlineCars.filter((c) => c.discipline === "pro").length}</b><span>Pro car models</span></div>
        <div><b>{redlineCars.filter((c) => c.discipline === "street").length}</b><span>Street car models</span></div>
        <div><b>One</b><span>KLYRA download</span></div>
      </section>
      <WipNote />
    </main>
  );
}
