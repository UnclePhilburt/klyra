"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { callsignOf } from "../session";
import { useSession } from "../useSession";

const pages = [
  ["Games", "/games/"],
  ["News", "/news/"],
  ["Community", "/community/"],
  ["Store", "/store/"],
];

// Broken Front sections stay one tap away in the mobile drawer (and on the BF page / footer).
const morePages = [
  ["Friends", "/friends/"],
  ["Broken Front", "/games/broken-front/"],
  ["Features", "/games/broken-front/features/"],
  ["Factions", "/games/broken-front/factions/"],
  ["Arsenal", "/games/broken-front/arsenal/"],
  ["Roadmap", "/games/broken-front/roadmap/"],
  ["Devlog", "/games/broken-front/devlog/"],
  ["Browser play", "/play/"],
  ["Support KLYRA", "/support/"],
];

function AccountMark() {
  return (
    <svg className="accountIcon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19.2c1.4-3 3.8-4.5 7-4.5s5.6 1.5 7 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const external = (href) => (href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

export default function SiteNav() {
  const pathname = usePathname();
  const { session, ready } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    const read = () => setRequests(Math.max(0, Number(window.__klyraFriendRequests) || 0));
    read();
    window.addEventListener("klyra-friend-requests", read);
    return () => window.removeEventListener("klyra-friend-requests", read);
  }, []);

  const badge = requests > 0 ? (
    <span className="kxFriendBadge" role="img" aria-label={`${requests} pending friend request${requests === 1 ? "" : "s"}`}>
      {requests > 9 ? "9+" : String(requests)}
    </span>
  ) : null;

  const callsign = session ? callsignOf(session) : "";
  const accountLabel = callsign || "Sign in";

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return () => { document.body.style.overflow = ""; };
    const onKey = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    if (href === "/games/broken-front/arsenal/") return ["/games/broken-front/arsenal", "/games/broken-front/weapons", "/games/broken-front/vehicles"].some((p) => pathname?.startsWith(p));
    return pathname?.startsWith(href);
  };

  return (
    <>
      <nav className={`kxNav${scrolled ? " scrolled" : ""}${menuOpen ? " menuOpen" : ""}`} aria-label="Main">
        <a className="kxBrand kxBrandMark" href="/" aria-label="KLYRA home">
          <img className="kxWordmark" src="/brand/klyra-wordmark.svg" alt="KLYRA" width="290" height="78" />
        </a>

        <div className="kxNavLinks">
          {pages.map(([label, href]) => (
            <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>
              {label}
            </a>
          ))}
          <a href="/friends/" aria-current={isActive("/friends/") ? "page" : undefined}>Friends{badge}</a>
          <a className="kxNavSupport" href="/support/" aria-current={isActive("/support/") ? "page" : undefined}><i aria-hidden="true">&#9733;</i>Support</a>
        </div>

        <div className="kxNavActions">
          <a
            className={`kxAccount${session ? " signedIn" : ""}`}
            href="/account/"
            aria-label={session ? `Account: ${callsign}` : "Sign in"}
            aria-current={isActive("/account/") ? "page" : undefined}
            style={ready ? undefined : { visibility: "hidden" }}
          >
            <AccountMark />
            <span className="kxCallsign">{accountLabel}</span>
          </a>
          <a className="kxPlayBtn kxPlayFree" href="/download/"><span>Download KLYRA</span></a>
          <button
            className="kxBurger"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="kx-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div id="kx-mobile-menu" className={`kxDrawer${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <a className={`kxDrawerAccount${session ? " signedIn" : ""}`} href="/account/" onClick={() => setMenuOpen(false)}>
          <AccountMark />
          <span>
            <small>{session ? "Signed in" : "Your account"}</small>
            <strong className="kxCallsign">{session ? callsign : "Sign in / Create account"}</strong>
          </span>
          <b aria-hidden="true">&rarr;</b>
        </a>
        <div className="kxDrawerLinks">
          {[...pages, ...morePages].map(([label, href], index) => (
            <a
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              style={{ "--i": index }}
              {...external(href)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
              {href.startsWith("http") ? " ↗" : ""}
              {href === "/friends/" ? badge : null}
            </a>
          ))}
        </div>
        <div className="kxDrawerCta">
          <a className="button huge" href="/download/" onClick={() => setMenuOpen(false)}>Download KLYRA</a>
          <a className="button ghost huge" href="/play/" onClick={() => setMenuOpen(false)}>Play free in browser</a>
          <a className="kxDrawerSupport" href="/support/" onClick={() => setMenuOpen(false)}><i aria-hidden="true">&#9733;</i> Support KLYRA &middot; optional $4.99</a>
        </div>
      </div>
    </>
  );
}
