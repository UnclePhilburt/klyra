import "./globals.css";
import SessionCatch from "./components/SessionCatch";
import SiteFooter from "./components/SiteFooter";
import SiteNav from "./components/SiteNav";

export const metadata = {
  title: "Klyra: Broken Front",
  description:
    "Klyra: Broken Front is a pre-alpha war between Ironclad, Timberwolf, and Vanguard. Fight the moving front, run supplies, and bring your gear home.",
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
