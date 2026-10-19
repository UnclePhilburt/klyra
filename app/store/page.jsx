import CharacterStore from "./CharacterStore";
import StoreMast from "./StoreMast";
import { CHARACTER_PRICE_LABEL } from "./characterData";

export const metadata = {
  title: "Character Store · Klyra: Broken Front",
  description: `Character skins for KLYRA: Broken Front. Preview every character in 3D. ${CHARACTER_PRICE_LABEL} each, linked to your KLYRA account.`,
  alternates: { canonical: "https://klyra.lol/store/" },
  openGraph: {
    title: "Character Store · Klyra: Broken Front",
    description: `Preview every character in 3D. ${CHARACTER_PRICE_LABEL} each.`,
    url: "https://klyra.lol/store/",
  },
};

export default function StorePage() {
  return (
    <main className="kgPage">
      <StoreMast />
      <h1 className="kgSrOnly">Character store</h1>
      <CharacterStore />
    </main>
  );
}
