import CharacterStore from "../../CharacterStore";
import StoreMast from "../../StoreMast";
import { CHARACTER_PRICE_LABEL, characterById, shopCharacters, teams } from "../../characterData";

export function generateStaticParams() {
  return shopCharacters.map((ch) => ({ id: ch.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const ch = characterById(id);
  if (!ch) return { title: "Character Store · Klyra: Broken Front" };
  const factions = ch.teams.map((t) => teams[t].name).join(", ");
  const price = `${CHARACTER_PRICE_LABEL}`;
  const kind = "character";
  return {
    title: `${ch.name} · Character Store · Klyra: Broken Front`,
    description: `${ch.name} character skin for ${factions}. ${price}.`,
    alternates: { canonical: `https://klyra.lol/store/characters/${ch.id}/` },
    openGraph: { title: `${ch.name} · KLYRA ${kind}`, url: `https://klyra.lol/store/characters/${ch.id}/`, images: [{ url: ch.poster, width: 480, height: 640 }] },
  };
}

export default async function CharacterPage({ params }) {
  const { id } = await params;
  const ch = characterById(id);
  return (
    <main className="kgPage">
      <StoreMast />
      <h1 className="kgSrOnly">{ch ? ch.name : "Character store"}</h1>
      <CharacterStore focusId={ch ? ch.id : null} />
    </main>
  );
}
