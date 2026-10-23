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
  title: "KLYRA · Every KLYRA game. One home.",
  description:
    "KLYRA is the home of KLYRA's own games: KLYRA: Broken Front, KLYRA: Redline (in development) and the Social Hub. Free to play. Every KLYRA game. One account, one download.",
  openGraph: {
    title: "KLYRA · Every KLYRA game. One home.",
    description: "Free to play. Every KLYRA game. One account, one download.",
    url: "https://klyra.lol",
    siteName: "KLYRA",
    type: "website",
    images: [{ url: "/shots/trailer/hero.jpg", width: 1600, height: 900, alt: "KLYRA: Broken Front battlefield" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KLYRA · Every KLYRA game. One home.",
    description: "Free to play. Every KLYRA game.",
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
