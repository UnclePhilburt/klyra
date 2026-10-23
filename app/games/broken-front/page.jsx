import BrokenFrontHome from "./BrokenFrontHome";

export const metadata = {
  title: "KLYRA: Broken Front · Free-to-play military shooter",
  description: "KLYRA: Broken Front is a free-to-play military shooter in pre-alpha. Play on Windows, Mac or in your browser.",
  alternates: { canonical: "https://klyra.lol/games/broken-front/" },
  openGraph: { title: "KLYRA: Broken Front", url: "https://klyra.lol/games/broken-front/", images: [{ url: "/shots/trailer/hero.jpg", width: 1600, height: 900, alt: "KLYRA: Broken Front battlefield" }] },
};

export default function BrokenFrontPage() {
  return <BrokenFrontHome />;
}
