import CharacterStore from "./CharacterStore";
import StoreHero from "./StoreHero";
import { CHARACTER_PRICE_LABEL } from "./characterData";

export const metadata = {
  title: "Character Store · Klyra: Broken Front",
  description: `Character skins for KLYRA: Broken Front. Preview every character in 3D. ${CHARACTER_PRICE_LABEL} each, linked to your KLYRA account. Supporter Edition includes three exclusive characters.`,
  alternates: { canonical: "https://klyra.lol/store/" },
  openGraph: {
    title: "Character Store · Klyra: Broken Front",
    description: `Preview every character in 3D. ${CHARACTER_PRICE_LABEL} each.`,
    url: "https://klyra.lol/store/",
  },
};

export default function StorePage() {
  return (
    <main className="kxStorePage">
      <StoreHero />
      <div className="kxHazard" aria-hidden="true" />
      <section className="kxStoreBody">
        <CharacterStore />
      </section>
    </main>
  );
}
