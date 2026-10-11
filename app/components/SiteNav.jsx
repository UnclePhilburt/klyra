"use client";

import { useEffect, useState } from "react";
import { callsignOf, readSession, restoreSession } from "../session";

const pages = [
  ["Features", "/features/"],
  ["Download", "/download/"],
  ["Roadmap", "/roadmap/"],
  ["Community", "/community/"],
];

const morePages = [
  ["Devlog", "/devlog/"],
  ["Support", "/support/"],
  ["Help", "/help/"],
  ["Trailer", "/trailer/"],
  ["Discord", "https://discord.gg/fNkZjwQJBX"],
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

export default function SiteNav() {
  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let live = true;
    const apply = () => {
      if (live) setSession(readSession());
    };

    apply();
    restoreSession().finally(apply);
    window.addEventListener("klyra-session", apply);
    return () => {
      live = false;
      window.removeEventListener("klyra-session", apply);
    };
  }, []);

  const callsign = session ? callsignOf(session) : "";

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <nav className="nav">
      <a className="brand" href="/" aria-label="Klyra Broken Front home">
        <img className="brandMark" src="/brand.png" alt="Klyra" />
        <span>Klyra: Broken Front</span>
      </a>
      <div className="navLinks">
        <button
          className="menuButton"
          type="button"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
        <div className={menuOpen ? "navPages open" : "navPages"}>
          {pages.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          {morePages.map(([label, href]) => (
            <a
              key={href}
              className="navMore"
              href={href}
              onClick={() => setMenuOpen(false)}
              {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {label}
            </a>
          ))}
          <a className="navAccount" href="/account/" onClick={() => setMenuOpen(false)}>
            {callsign || "Account"}
          </a>
        </div>
        <a className="button ghost small accountLink" href="/account/" aria-label={callsign || "Account"}>
          <AccountMark />
          <span>{callsign || "Account"}</span>
        </a>
        <a className="button small" href="/download/">
          Play
        </a>
      </div>
    </nav>
  );
}
