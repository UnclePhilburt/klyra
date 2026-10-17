import { RevealRoot } from "../features/FeatureFX";
import { weapons } from "./weaponData";

export const metadata = { title: "Weapons | Klyra: Broken Front" };

export default function Weapons() {
  return (
    <main className="kx3d">
      <RevealRoot />
      <section className="kx3dHead">
        <p className="tag" data-reveal>Armory</p>
        <h1 data-reveal>Weapons<span>.</span></h1>
        <p className="lead" data-reveal>Rifles from the front. Pick one to turn it over in 3D.</p>
      </section>
      <section className="kx3dGrid two">
        {weapons.map((w, i) => (
          <article key={w.slug} className="kx3dCard" style={{ "--delay": `${i * 100}ms` }} data-reveal>
            <div className="kx3dCardText">
              <span className="kx3dTeam">{w.kind}</span>
              <h2>{w.name}</h2>
              <p>{w.copy}</p>
              <a className="button ghost" href={`/weapons/${w.slug}/`}>View {w.name}</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}