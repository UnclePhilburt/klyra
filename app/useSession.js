"use client";

import { useEffect, useState } from "react";
import { readSession, restoreSession } from "./session";

// Shared login state for every page. `ready` is false until the stored session
// has been read in the browser, so nothing flashes "Sign in" for a logged-in player.
export function useSession() {
  const [state, setState] = useState({ session: null, ready: false });

  useEffect(() => {
    let live = true;
    const apply = () => {
      if (live) setState({ session: readSession(), ready: true });
    };
    apply();
    restoreSession().catch(() => {}).finally(apply);
    window.addEventListener("klyra-session", apply);
    return () => {
      live = false;
      window.removeEventListener("klyra-session", apply);
    };
  }, []);

  return state;
}
