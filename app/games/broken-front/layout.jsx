import SectionNav from "../../components/SectionNav";
import { activeSections } from "../gamesData";

// Sub-nav is driven by the game config (only active sections are shown).
export default function GameLayout({ children }) {
  return (
    <>
      <SectionNav label="Broken Front" items={activeSections("broken-front")} className="secBF" />
      {children}
    </>
  );
}
