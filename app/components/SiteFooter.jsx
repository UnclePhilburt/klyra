"use client";

import { callsignOf } from "../session";
import { useSession } from "../useSession";

const groups = [
  ["KLYRA", [["Games", "/games/"], ["Download KLYRA", "/download/"], ["Store", "/store/"], ["Friends", "/friends/"], ["Community", "/community/"]]],
  ["Broken Front", [["Overview", "/games/broken-front/"], ["Play in browser", "/play/"], ["Features", "/games/broken-front/features/"], ["Factions", "/games/broken-front/factions/"], ["Arsenal", "/games/broken-front/arsenal/"]]],
  ["Development", [["Redline", "/games/redline/"], ["Roadmap", "/games/broken-front/roadmap/"], ["Devlog", "/games/broken-front/devlog/"], ["Support Broken Front", "/support/"]]],
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
            <p>KLYRA &middot; Home of Broken Front, Redline and the Social Hub &middot; Built by an independent developer</p>
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
      <p className="kxFooterBase">&copy; {new Date().getFullYear()} KLYRA &middot; Games in pre-alpha and in development. Everything you see can change.</p>
    </footer>
  );
}
