"use client";

import { useEffect } from "react";
import { PRESENCE_INTERVAL_MS, announceRequests, loadFriendSummary, touchPresence } from "../friends/api";
import { useSession } from "../useSession";

// Site-wide friends helper for signed-in players. Renders nothing.
// 1. Presence: calls the touch_presence() RPC right away and then every minute
//    while the tab is visible.
// 2. Request alerts: counts incoming pending friend requests on the same
//    cadence and tells the nav (window.__klyraFriendRequests + the
//    "klyra-friend-requests" event, see announceRequests).
// Failures are silent (e.g. before the friends SQL has been applied).
export default function PresenceBeacon() {
  const { session, ready } = useSession();
  const userId = session?.user?.id || "";

  useEffect(() => {
    if (!ready) return undefined;
    if (!userId) {
      announceRequests(0);
      return undefined;
    }
    let timer = null;
    let live = true;
    const poll = () =>
      loadFriendSummary()
        .then((summary) => {
          if (live) announceRequests(summary.requests);
        })
        .catch(() => {});
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      touchPresence().catch(() => {});
      poll();
    };
    const start = () => {
      clearInterval(timer);
      beat();
      timer = setInterval(beat, PRESENCE_INTERVAL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else clearInterval(timer);
    };
    window.klyraRefreshFriendRequests = poll;
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (window.klyraRefreshFriendRequests === poll) delete window.klyraRefreshFriendRequests;
    };
  }, [ready, userId]);

  return null;
}
