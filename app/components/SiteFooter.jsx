"use client";

import { callsignOf } from "../session";
import { useSession } from "../useSession";

const groups = [
  ["Game", [["Play free", "/play/"], ["Download free", "/download/"], ["Features", "/features/"], ["Factions", "/factions/"], ["Arsenal", "/arsenal/"]]],
  ["Development", [["Roadmap", "/roadmap/"], ["Devlog", "/devlog/"], ["Character Store", "/store/"], ["Support Klyra", "/support/"]]],
  ["Community", [["Community", "/community/"]]],
];

export default function SiteFooter() {
  const { session, ready } = useSession();
  return (
    <footer className="kxFooter">
      <div className="kxFooterHazard" aria-hidden="true" />
      <div className="kxFooterInner">
        <div className="kxFooterBrand">
          <div>
            <img className="kxFooterWordmark" src="/brand/klyra-wordmark.svg" alt="KLYRA" width="290" height="78" />
            <p>Home of KLYRA: Broken Front &middot; Free to play &middot; Pre-alpha &middot; Built by an independent developer</p>
          </div>
        </div>
        <nav className="kxFooterCols" aria-label="Site">
          {groups.map(([title, links]) => (
            <div key={title}>
              <h2>{title}</h2>
              {links.map(([label, href]) => (
                <a key={href} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                  {label}
                </a>
              ))}
            </div>
          ))}
          <div>
            <h2>Account</h2>
            <a href="/account/" style={ready ? undefined : { visibility: "hidden" }}>
              {session ? <><span className="kxCallsign">{callsignOf(session)}</span> &middot; Account</> : "Sign in / Account"}
            </a>
          </div>
        </nav>
      </div>
      <p className="kxFooterBase">&copy; {new Date().getFullYear()} KLYRA &middot; KLYRA: Broken Front is in pre-alpha &middot; Pre-alpha. Everything you see can change.</p>
    </footer>
  );
}
