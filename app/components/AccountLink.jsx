"use client";

import { callsignOf } from "../session";
import { useSession } from "../useSession";

// Account call-to-action that follows login state: "Sign in" when signed out,
// the player's callsign when signed in.
export default function AccountLink({ className = "textLink", signedOutLabel = "Sign in to your account", signedInPrefix = "Signed in as" }) {
  const { session, ready } = useSession();
  if (!ready) return <span className={className} aria-hidden="true" style={{ visibility: "hidden" }}>{signedOutLabel}</span>;
  return (
    <a className={className} href="/account/">
      {session ? <>{signedInPrefix ? <span>{signedInPrefix}</span> : null}<strong className="kxCallsign" style={signedInPrefix ? { marginLeft: "0.3em" } : undefined}>{callsignOf(session)}</strong><span style={{ marginLeft: "0.3em" }}>&rarr;</span></> : signedOutLabel}
    </a>
  );
}
