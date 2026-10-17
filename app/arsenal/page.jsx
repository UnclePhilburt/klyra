import { RevealRoot } from "../features/FeatureFX";
import { weapons } from "../weapons/weaponData";
import { vehicles } from "../vehicles/vehicleData";

export const metadata = { title: "Arsenal | Klyra: Broken Front" };

function Card({ item, base, i }) {
  return (
    <article className="kx3dCard" style={{ "--delay": `${i * 100}ms` }} data-reveal>
      <div className="kx3dCardText">
        <span className="kx3dTeam">{item.kind}</span>
        <h2>{item.name}</h2>
        <p>{item.copy}</p>
        <a className="button ghost" href={`${base}${item.slug}/`}>View {item.name}</a>
      </div>
    </article>
  );
}

export default function Arsenal() {
  return (
    <main className="kx3d">
      <RevealRoot />
      <section className="kx3dHead">
        <p className="tag" data-reveal>Armory &middot; Motor pool</p>
        <h1 data-reveal>Arsenal<span>.</span></h1>
        <p className="lead" data-reveal>The rifles and vehicles of the front. Open one to turn it over in 3D.</p>
      </section>
      <section id="weapons" className="kx3dSection">
        <p className="tag" data-reveal>Weapons</p>
        <div className="kx3dGrid three">
          {weapons.map((w, i) => <Card key={w.slug} item={w} base="/weapons/" i={i} />)}
        </div>
      </section>
      <div className="kxHazard" aria-hidden="true" />
      <section id="vehicles" className="kx3dSection">
        <p className="tag" data-reveal>Vehicles</p>
        <div className="kx3dGrid three">
          {vehicles.map((v, i) => <Card key={v.slug} item={v} base="/vehicles/" i={i} />)}
        </div>
      </section>
    </main>
  );
}