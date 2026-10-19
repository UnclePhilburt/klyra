import CharacterStore from "../../CharacterStore";
import StoreHero from "../../StoreHero";
import { CHARACTER_PRICE_LABEL, allCharacters, characterById, teams } from "../../characterData";

export function generateStaticParams() {
  return allCharacters.map((ch) => ({ id: ch.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const ch = characterById(id);
  if (!ch) return { title: "Character Store · Klyra: Broken Front" };
  const factions = ch.teams.map((t) => teams[t].name).join(", ");
  const price = ch.exclusive ? "Included with the Supporter Edition" : `${CHARACTER_PRICE_LABEL}`;
  const kind = ch.kind === "weapon" ? "weapon" : "character";
  return {
    title: `${ch.name} · Character Store · Klyra: Broken Front`,
    description: kind === "weapon" ? `${ch.name}, a Supporter Edition exclusive ${ch.blurb.toLowerCase()} for every faction. ${price}.` : `${ch.name} character skin for ${factions}. ${price}.`,
    alternates: { canonical: `https://klyra.lol/store/characters/${ch.id}/` },
    openGraph: { title: `${ch.name} · KLYRA ${kind}`, url: `https://klyra.lol/store/characters/${ch.id}/`, images: [{ url: ch.poster, width: 480, height: 640 }] },
  };
}

export default async function CharacterPage({ params }) {
  const { id } = await params;
  const ch = characterById(id);
  return (
    <main className="kxStorePage">
      <StoreHero title={ch ? ch.name : "Character store"}>
        {ch?.kind === "weapon"
          ? <>{ch.blurb}. A Supporter Edition exclusive for every faction. It is not sold on its own.</>
          : ch?.exclusive
          ? <>A Supporter Edition exclusive for {ch.teams.map((t) => teams[t].name).join(", ")}. It is not sold on its own.</>
          : ch ? <>Character skin for {ch.teams.map((t) => teams[t].name).join(" and ")}. {CHARACTER_PRICE_LABEL}, linked to your KLYRA account.</> : null}
      </StoreHero>
      <div className="kxHazard" aria-hidden="true" />
      <section className="kxStoreBody">
        <CharacterStore focusId={ch ? ch.id : null} />
      </section>
    </main>
  );
}
