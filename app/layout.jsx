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
    "KLYRA is a growing collection of free-to-play games, connected by one account, one download, one store and one social hub.",
  openGraph: {
    title: "KLYRA · Every KLYRA game. One home.",
    description: "Free to play. Every KLYRA game. One account, one store, one social hub.",
    url: "https://klyra.lol",
    siteName: "KLYRA",
    type: "website",
    images: [{ url: "/og/klyra-og.png", width: 1200, height: 630, alt: "KLYRA. Every KLYRA game. One home." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KLYRA · Every KLYRA game. One home.",
    description: "Free to play. Every KLYRA game.",
    images: ["/og/klyra-og.png"],
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
