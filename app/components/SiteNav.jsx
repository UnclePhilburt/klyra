"use client";

import { useEffect, useState } from "react";
import { callsignOf, readSession, restoreSession } from "../session";

const pages = [
  ["Features", "/features/"],
  ["Roadmap", "/roadmap/"],
  ["Community", "/community/"],
  ["Devlog", "/devlog/"],
];

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
          Menu
        </button>
        <div className={menuOpen ? "navPages open" : "navPages"}>
          {pages.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a className="navAccount" href="/account/" onClick={() => setMenuOpen(false)}>
            {callsign || "Account"}
          </a>
        </div>
        <a className="button ghost small" href="/account/">
          {callsign || "Account"}
        </a>
        <a className="button small" href="/download/">
          Play
        </a>
      </div>
    </nav>
  );
}
