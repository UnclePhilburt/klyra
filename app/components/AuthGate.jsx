"use client";

import { useSession } from "../useSession";

// Render children only once we know the player is signed out.
export function SignedOut({ children }) {
  const { session, ready } = useSession();
  return ready && !session ? children : null;
}

// Render children only for signed-in players.
export function SignedIn({ children }) {
  const { session, ready } = useSession();
  return ready && session ? children : null;
}
