import { RedlineSubPage, CarGrid } from "../RlBits";
import { redlineDisciplines } from "../../gamesData";

export const metadata = { title: "Redline Street · KLYRA: Redline", description: "Underground street racing: urban environments, night and highway racing, drifting and customization. Its own identity and progression. In development.", alternates: { canonical: "https://klyra.lol/games/redline/street/" } };

export default function Page() {
  const d = redlineDisciplines.find((x) => x.id === "street");
  return (
    <RedlineSubPage className="rl-street" title="Redline Street" lead="Underground street racing: urban environments, night and highway racing, drifting and customization. Its own identity and progression.">
      <ul className="rlChips">{d.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <h2 className="rlH2">The cars</h2>
      <CarGrid discipline="street" />
    </RedlineSubPage>
  );
}
