import { RedlineSubPage } from "../RlBits";
import Roadmap from "../../../components/game/Roadmap";
import redlineRoadmap from "../data/roadmap";
import RoadmapCircuit from "./RoadmapCircuit";

export const metadata = { title: "Roadmap · KLYRA: Redline", description: "KLYRA: Redline development order. No dates.", alternates: { canonical: "https://klyra.lol/games/redline/roadmap/" } };

export default function RoadmapPage() {
  return (
    <RedlineSubPage title="Roadmap" lead="Development order only. No dates. Every phase is planned; statuses change only when verified.">
      <RoadmapCircuit phases={redlineRoadmap} />
      <h2 className="rrListHead" id="roadmap-list">All phases</h2>
      <Roadmap phases={redlineRoadmap} className="rlRoadmap" />
    </RedlineSubPage>
  );
}
