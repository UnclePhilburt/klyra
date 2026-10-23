import NewsList from "./NewsList";

export const metadata = { title: "News · KLYRA", description: "News from every KLYRA game.", alternates: { canonical: "https://klyra.lol/news/" } };

export default function NewsPage() {
  return (
    <main className="mHome nwPage">
      <header className="nwHead"><p>News</p><h1>Latest from KLYRA</h1></header>
      <NewsList />
    </main>
  );
}
