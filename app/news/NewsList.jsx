"use client";
import { useEffect, useState } from "react";
import news from "./newsData";
import { games } from "../games/gamesData";

export default function NewsList() {
  const [game, setGame] = useState("all");
  useEffect(() => { const g = new URLSearchParams(location.search).get("game"); if (g) setGame(g); }, []);
  const tabs = [["all", "All"], ...games.map((g) => [g.id, g.short]), ["platform", "Platform"]];
  const list = news.filter((n) => game === "all" || n.game === game);
  const name = (id) => games.find((g) => g.id === id)?.short || "Platform";
  return (
    <>
      <div className="nwTabs" role="tablist" aria-label="Filter news by game">
        {tabs.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={game === id} className={game === id ? "on" : ""} onClick={() => setGame(id)}>{l}</button>)}
      </div>
      {list.length ? (
        <div className="nwGrid">
          {list.map((n) => (
            <a key={n.id} className={`nwCard g-${n.game}`} href={n.href}>
              <em>{name(n.game)}</em><small>{n.date}</small><strong>{n.title}</strong>
            </a>
          ))}
        </div>
      ) : <p className="nwEmpty">No posts here yet.</p>}
    </>
  );
}
