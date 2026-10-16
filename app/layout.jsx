import "./globals.css";
import SessionCatch from "./components/SessionCatch";
import CanonicalHost from "./components/CanonicalHost";
import MobilePlayGuard from "./components/MobilePlayGuard";
import SiteFooter from "./components/SiteFooter";
import SiteNav from "./components/SiteNav";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL("https://klyra.lol"),
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
    images: [{ url: "/shots/trailer/hero.jpg", width: 1600, height: 900, alt: "Klyra: Broken Front battlefield" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klyra: Broken Front",
    description: "Fight the front for Ironclad, Timberwolf, or Vanguard.",
    images: ["/shots/trailer/hero.jpg"],
  },
  icons: { icon: "/brand.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <CanonicalHost />
        <MobilePlayGuard />
      </head>
      <body>
        <SessionCatch />
        <div className="shell">
          <a className="skipLink" href="#main-content">Skip to content</a>
          <SiteNav />
          <div id="main-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
