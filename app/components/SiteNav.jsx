"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { callsignOf } from "../session";
import { useSession } from "../useSession";

const pages = [
  ["Features", "/features/"],
  ["Download", "/download/"],
  ["Roadmap", "/roadmap/"],
  ["Community", "/community/"],
];

const morePages = [
  ["Browser", "/play/"],
  ["Devlog", "/devlog/"],
  ["Get Klyra", "/support/"],
  ["Trailer", "/trailer/"],
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

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <>
      <nav className={`kxNav${scrolled ? " scrolled" : ""}${menuOpen ? " menuOpen" : ""}`} aria-label="Main">
        <a className="kxBrand" href="/" aria-label="Klyra Broken Front home">
          <img src="/brand.png" alt="" />
          <span>Klyra<em>Broken Front</em></span>
        </a>

        <div className="kxNavLinks">
          {pages.map(([label, href]) => (
            <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>
              {label}
            </a>
          ))}
          <a href="/support/" aria-current={isActive("/support/") ? "page" : undefined}>Get Klyra</a>
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
          <a className="kxPlayBtn" href="/play/">Play</a>
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
            </a>
          ))}
        </div>
        <div className="kxDrawerCta">
          <a className="button huge" href="/play/" onClick={() => setMenuOpen(false)}>Play in browser</a>
          <a className="button ghost huge" href="/download/" onClick={() => setMenuOpen(false)}>Download</a>
        </div>
      </div>
    </>
  );
}
