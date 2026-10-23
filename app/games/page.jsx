import GameCard from "../components/GameCard";
import { games } from "./gamesData";

export const metadata = {
  title: "Games · KLYRA",
  description: "Games on the KLYRA platform: KLYRA: Broken Front and KLYRA: Redline (in development).",
  alternates: { canonical: "https://klyra.lol/games/" },
  openGraph: { title: "Games · KLYRA", url: "https://klyra.lol/games/" },
};

export default function GamesPage() {
  return (
    <main className="kpPage">
      <section className="kpHead">
        <p className="kpTag">KLYRA</p>
        <h1>Games</h1>
      </section>
      <section className="kpGrid" aria-label="Games">
        {games.map((g) => <GameCard key={g.id} game={g} />)}
      </section>
    </main>
  );
}
