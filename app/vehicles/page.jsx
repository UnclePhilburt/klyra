import { RevealRoot } from "../features/FeatureFX";
import { vehicles } from "./vehicleData";

export const metadata = { title: "Vehicles | Klyra: Broken Front" };

function Card({ v, i }) {
  return (
    <article className="kx3dCard" style={{ "--delay": `${i * 100}ms` }} data-reveal>
      <div className="kx3dCardText">
        <span className="kx3dTeam">{v.kind}</span>
        <h2>{v.name}</h2>
        <p>{v.copy}</p>
        <a className="button ghost" href={`/games/broken-front/vehicles/${v.slug}/`}>View {v.name}</a>
      </div>
    </article>
  );
}

export default function Vehicles() {
  return (
    <main className="kx3d">
      <RevealRoot />
      <section className="kx3dHead">
        <p className="tag" data-reveal>Motor pool</p>
        <h1 data-reveal>Vehicles<span>.</span></h1>
        <p className="lead" data-reveal>Air, armor and the trucks that keep it all running. Pick one to look around in 3D.</p>
      </section>
      <section className="kx3dGrid two">
        {vehicles.map((v, i) => <Card key={v.slug} v={v} i={i} />)}
      </section>
    </main>
  );
}