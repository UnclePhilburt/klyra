import CharacterStore from "./CharacterStore";
import StoreMast from "./StoreMast";
import { CHARACTER_PRICE_LABEL } from "./characterData";

export const metadata = {
  title: "KLYRA Store · Character skins",
  description: `Character skins for every KLYRA game. Preview every character in 3D. ${CHARACTER_PRICE_LABEL} each, linked to your KLYRA account.`,
  alternates: { canonical: "https://klyra.lol/store/" },
  openGraph: {
    title: "KLYRA Store · Character skins",
    description: `Preview every character in 3D. ${CHARACTER_PRICE_LABEL} each.`,
    url: "https://klyra.lol/store/",
  },
};

export default function StorePage() {
  return (
    <main className="kgPage">
      <StoreMast />
      <h1 className="kgSrOnly">KLYRA Store</h1>
      <CharacterStore />
    </main>
  );
}
