import "./globals.css";
import SessionCatch from "./components/SessionCatch";
import CanonicalHost from "./components/CanonicalHost";
import MobilePlayGuard from "./components/MobilePlayGuard";
import PresenceBeacon from "./components/PresenceBeacon";
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
    "KLYRA: Broken Front is a free-to-play pre-alpha military sandbox for Windows, Mac and the browser. Fight for The Regiment, Kin of the Hollow, or Blackline Group, run the supplies, and bring your gear home.",
  openGraph: {
    title: "Klyra: Broken Front",
    description:
      "Free to play on Windows, Mac and the browser. Fight the front for The Regiment, Kin of the Hollow, or Blackline Group, and bring your gear home.",
    url: "https://klyra.lol",
    siteName: "Klyra: Broken Front",
    type: "website",
    images: [{ url: "/shots/trailer/hero.jpg", width: 1600, height: 900, alt: "Klyra: Broken Front battlefield" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klyra: Broken Front",
    description: "Free to play. Fight the front for The Regiment, Kin of the Hollow, or Blackline Group.",
    images: ["/shots/trailer/hero.jpg"],
  },
  icons: { icon: [{ url: "/brand/klyra-favicon.svg", type: "image/svg+xml" }, { url: "/brand.png" }] },
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
        <PresenceBeacon />
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
