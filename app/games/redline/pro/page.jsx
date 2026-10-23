import { RedlineSubPage, CarGrid } from "../RlBits";
import { redlineDisciplines } from "../../gamesData";

export const metadata = { title: "Redline Pro · KLYRA: Redline", description: "Professional circuit racing: purpose-built circuits, lap timing, racing AI and multiplayer races. In development.", alternates: { canonical: "https://klyra.lol/games/redline/pro/" } };

export default function Page() {
  const d = redlineDisciplines.find((x) => x.id === "pro");
  return (
    <RedlineSubPage className="rl-pro" title="Redline Pro" lead="Professional circuit racing: purpose-built circuits, lap timing, racing AI and multiplayer races.">
      <ul className="rlChips">{d.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <h2 className="rlH2">The cars</h2>
      <CarGrid discipline="pro" />
    </RedlineSubPage>
  );
}
