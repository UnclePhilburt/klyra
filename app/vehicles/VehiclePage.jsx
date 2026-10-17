import ModelViewer from "../components/ModelViewer";
import { RevealRoot } from "../features/FeatureFX";
import { getItem } from "./vehicleData";

export default function VehiclePage({ slug }) {
  const v = getItem(slug);
  return (
    <main className="kx3d">
      <RevealRoot />
      <section className="kx3dHead">
        <p className="tag" data-reveal><a href="/arsenal/">&larr; Back to the arsenal</a></p>
        <h1 data-reveal>{v.name}<span>.</span></h1>
        <p className="lead" data-reveal>{v.kind}. Drag to look around.</p>
      </section>
      <section className="kx3dList">
        <article className="kx3dRow" data-reveal>
          <ModelViewer src={v.model} label={v.name} orbit={v.orbit} />
          <div className="kx3dCardText">
            <span className="kx3dTeam">{v.kind}</span>
            <h2>{v.name}</h2>
            <p>{v.copy}</p>
            <a className="button ghost" href="/arsenal/">Back to the arsenal</a>
          </div>
        </article>
      </section>
    </main>
  );
}