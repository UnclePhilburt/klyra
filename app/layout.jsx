import "./globals.css";

export const metadata = {
  title: "Klyra: Broken Front",
  description:
    "A three-team tactical sandbox with infantry, logistics, FOBs, vehicles, stash progression, and permanent accounts.",
  openGraph: {
    title: "Klyra: Broken Front",
    description:
      "Build FOBs, move troops, loot the battlefield, and hold the moving front.",
    url: "https://klyra.lol",
    siteName: "Klyra: Broken Front",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
