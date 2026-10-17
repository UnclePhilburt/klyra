"use client";

import { useEffect, useState } from "react";
import { loadFriendSummary } from "../friends/api";

// "Squad" card on /account: friend count, who is online, waiting requests.
export default function FriendsCard({ session }) {
  const [data, setData] = useState(null);
  const token = session?.access_token || "";

  useEffect(() => {
    let live = true;
    if (!token) return undefined;
    loadFriendSummary()
      .then((summary) => {
        if (live) setData(summary);
      })
      .catch(() => {
        if (live) setData({ failed: true });
      });
    return () => {
      live = false;
    };
  }, [token]);

  const ok = data && !data.failed;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const line = ok
    ? `${plural(data.friends, "friend")} · ${data.online} online${data.requests ? ` · ${plural(data.requests, "request")} waiting` : ""}`
    : data
      ? "Add friends by callsign and see who is online."
      : "Loading your squad...";

  return (
    <article className="kxAcctCard wide slim kxAcctIn" id="friends" style={{ "--d": "210ms" }}>
      <p className="tag">Squad</p>
      <h2>{ok ? `${data.friends} Friend${data.friends === 1 ? "" : "s"}` : "Friends"}</h2>
      <p>{line}</p>
      <p>
        <a className="button ghost" href="/friends/">
          {ok && data.requests ? "Answer requests →" : "Open friends →"}
        </a>
      </p>
    </article>
  );
}
