import { RevealRoot } from "../features/FeatureFX";
import { factions } from "./factionData";

export const metadata = { title: "Factions | Klyra: Broken Front" };

export default function FactionsHub() {
  return (
    <main className="kx3d">
      <RevealRoot />
      <section className="kx3dHead">
        <p className="tag" data-reveal>Three sides, one front</p>
        <h1 data-reveal>Factions<span>.</span></h1>
        <p className="lead" data-reveal>A civil war ended, and the fighting didn't. Peacekeepers who never went home, a resistance born in emptied villages, and contractors nobody will claim now share one front. Open a file to learn more.</p>
      </section>
      <section className="kx3dGrid three">
        {factions.map((f, i) => (
          <article key={f.slug} className="kx3dCard" style={{ "--team": f.color, "--delay": `${i * 100}ms` }} data-reveal>
            <div className="kx3dCardText">
              <img className="kx3dLogo" src={f.logo} alt={`${f.name} logo`} width="160" height="160" loading="lazy" decoding="async" />
              <span className="kx3dTeam">{f.team}</span>
              <h2>{f.name}</h2>
              <p>{f.hook}</p>
              <a className="button ghost" href={`/factions/${f.slug}/`}>View {f.name}</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}