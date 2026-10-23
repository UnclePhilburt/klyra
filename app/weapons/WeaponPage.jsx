import ModelViewer from "../components/ModelViewer";
import { RevealRoot } from "../features/FeatureFX";
import { getWeapon, optics, grips } from "./weaponData";

export default function WeaponPage({ slug }) {
  const w = getWeapon(slug);
  return (
    <main className="kx3d">
      <RevealRoot />
      <section className="kx3dHead">
        <p className="tag" data-reveal><a href="/games/broken-front/arsenal/">&larr; Back to the arsenal</a></p>
        <h1 data-reveal>{w.name}<span>.</span></h1>
        <p className="lead" data-reveal>{w.kind}. Drag to turn it over.</p>
      </section>
      <section className="kx3dGrid">
        <article className="kx3dCard wide" data-reveal>
          <ModelViewer src={w.model} label={w.name} orbit={w.orbit} />
          <div className="kx3dCardText">
            <span className="kx3dTeam">{w.kind}</span>
            <h2>{w.name}</h2>
            <p>{w.copy}</p>
            <ul className="kx3dFacts">{w.parts.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </article>
      </section>
      <div className="kxHazard" aria-hidden="true" />
      <section className="kx3dSection">
        <p className="tag" data-reveal>Attachments in the armory</p>
        <div className="kx3dParts" data-reveal>
          <div><h3>Optics</h3><ul>{optics.map((o) => <li key={o}>{o}</li>)}</ul></div>
          <div><h3>Foregrips</h3><ul>{grips.map((g) => <li key={g}>{g}</li>)}</ul></div>
        </div>
        <p data-reveal><a className="button ghost" href="/games/broken-front/arsenal/">Back to the arsenal</a></p>
      </section>
    </main>
  );
}