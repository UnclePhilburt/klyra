import "./globals.css";

export const metadata = {
  title: "Klyra: Broken Front",
  description:
    "Klyra: Broken Front is a three-team war. Fight the moving front, run supplies, build a base, and bring your gear home.",
  openGraph: {
    title: "Klyra: Broken Front",
    description:
      "Fight the front, run supplies, build a base, and bring your gear home.",
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
