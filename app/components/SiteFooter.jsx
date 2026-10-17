"use client";

import { callsignOf } from "../session";
import { useSession } from "../useSession";

const groups = [
  ["Game", [["Play", "/play/"], ["Download", "/download/"], ["Features", "/features/"], ["Factions", "/factions/"], ["Arsenal", "/arsenal/"]]],
  ["Development", [["Roadmap", "/roadmap/"], ["Devlog", "/devlog/"], ["Get Klyra", "/support/"]]],
  ["Community", [["Community", "/community/"]]],
];

export default function SiteFooter() {
  const { session, ready } = useSession();
  return (
    <footer className="kxFooter">
      <div className="kxFooterHazard" aria-hidden="true" />
      <div className="kxFooterInner">
        <div className="kxFooterBrand">
          <img src="/brand.png" alt="" />
          <div>
            <strong>Klyra: Broken Front</strong>
            <p>Pre-alpha &middot; Built by an independent developer</p>
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
      <p className="kxFooterBase">&copy; {new Date().getFullYear()} Klyra: Broken Front &middot; Pre-alpha. Everything you see can change.</p>
    </footer>
  );
}
