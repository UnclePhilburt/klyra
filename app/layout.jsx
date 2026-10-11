import "./globals.css";
import SessionCatch from "./components/SessionCatch";
import SiteFooter from "./components/SiteFooter";
import SiteNav from "./components/SiteNav";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "Klyra: Broken Front",
  description:
    "KLYRA: Broken Front is a pre-alpha military sandbox. Fight for Ironclad, Timberwolf, or Vanguard, run the supplies, and bring your gear home.",
  openGraph: {
    title: "Klyra: Broken Front",
    description:
      "Fight the front for Ironclad, Timberwolf, or Vanguard, and bring your gear home.",
    url: "https://klyra.lol",
    siteName: "Klyra: Broken Front",
    type: "website",
  },
  icons: { icon: "/brand.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionCatch />
        <div className="shell">
          <SiteNav />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
