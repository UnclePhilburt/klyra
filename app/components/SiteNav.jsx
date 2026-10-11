"use client";

import { useEffect, useState } from "react";
import { callsignOf, readSession, restoreSession } from "../session";

export default function SiteNav() {
  const [session, setSession] = useState(null);

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
        <a href="/#teams">Teams</a>
        <a href="/trailer/">Trailer</a>
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
