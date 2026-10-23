import { RedlineSubPage } from "../RlBits";
import Roadmap from "../../../components/game/Roadmap";
import redlineRoadmap from "../data/roadmap";

export const metadata = { title: "Roadmap · KLYRA: Redline", description: "KLYRA: Redline development order. No dates.", alternates: { canonical: "https://klyra.lol/games/redline/roadmap/" } };

export default function RoadmapPage() {
  return (
    <RedlineSubPage title="Roadmap" lead="Development order only. No dates. Every phase is planned; statuses change only when verified.">
      <Roadmap phases={redlineRoadmap} className="rlRoadmap" />
    </RedlineSubPage>
  );
}
