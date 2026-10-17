import ModelViewer from "../components/ModelViewer";
import { RevealRoot } from "../features/FeatureFX";
import { factions } from "./factionData";

export default function FactionPage({ slug }) {
  const f = factions.find((x) => x.slug === slug);
  const others = factions.filter((x) => x.slug !== slug);
  return (
    <main className="kx3d" style={{ "--team": f.color }}>
      <RevealRoot />
      <section className="kx3dHero">
        <div className="kx3dHeroText" data-reveal>
          <p className="tag"><a href="/factions/">Factions</a> / {f.team}</p>
          <h1>{f.name}<span>.</span></h1>
          <p className="kx3dArchetype">{f.archetype}</p>
          <p className="kx3dTagline">{f.tagline}</p>
        </div>
        <div className="kx3dStage" data-reveal style={{ "--delay": "120ms" }}>
          <ModelViewer src={f.model} label={`${f.name} · ${f.team}`} orbit="25deg 80deg auto" animated />
        </div>
      </section>
      <div className="kxHazard" aria-hidden="true" />
      <section className="kx3dSection kx3dLore">
        <div className="kx3dLoreText">
          <p className="tag" data-reveal>Field file</p>
          {f.lore.map((para, i) => (
            <p key={i} data-reveal style={{ "--delay": `${i * 80}ms` }}>{para}</p>
          ))}
        </div>
        <div className="kx3dQuotes">
          <figure data-reveal>
            <figcaption>What they say</figcaption>
            <blockquote>&ldquo;{f.quotes.them}&rdquo;</blockquote>
          </figure>
          <figure className="others" data-reveal style={{ "--delay": "100ms" }}>
            <figcaption>What others say</figcaption>
            <blockquote>&ldquo;{f.quotes.others}&rdquo;</blockquote>
          </figure>
        </div>
      </section>
      {f.sections?.length ? (
        <section className="kx3dSection kx3dExtra">
          {f.sections.map((sec) => (
            <article key={sec.title} className="kx3dExtraCard" data-reveal>
              <h2>{sec.title}</h2>
              {sec.paras.map((para, i) => <p key={i}>{para}</p>)}
            </article>
          ))}
        </section>
      ) : null}
      <section className="kx3dSection">
        <p className="tag" data-reveal>The other sides</p>
        <div className="kx3dOthers">
          {others.map((o, i) => (
            <a key={o.slug} className="kx3dOther" href={`/factions/${o.slug}/`} style={{ "--team": o.color, "--delay": `${i * 90}ms` }} data-reveal>
              <span>{o.team}</span>
              <strong>{o.name}</strong>
              <em>{o.hook} &rarr;</em>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}