"use client";

import { useEffect } from "react";
import styles from "./friends.module.css";

const FACTIONS = {
  regiment: "The Regiment",
  "the-regiment": "The Regiment",
  "kin-of-the-hollow": "Kin of the Hollow",
  hollow: "Kin of the Hollow",
  "blackline-group": "Blackline Group",
  blackline: "Blackline Group",
};

export const FACTION_CHOICES = [
  ["", "No favorite"],
  ["the-regiment", "The Regiment"],
  ["kin-of-the-hollow", "Kin of the Hollow"],
  ["blackline-group", "Blackline Group"],
];
export const BIO_MAX = 160;

export function factionName(value) {
  if (!value) return "";
  const key = String(value).toLowerCase().trim().replace(/\s+/g, "-");
  return FACTIONS[key] || String(value);
}

function num(value) {
  return Number(value || 0).toLocaleString();
}

function since(value) {
  const at = value ? new Date(value) : null;
  if (!at || Number.isNaN(at.getTime())) return "";
  return at.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function StatGrid({ stats }) {
  if (!stats) return <p className={styles.muted}>No service record yet.</p>;
  const items = [
    ["Matches", stats.matches],
    ["Wins", stats.wins],
    ["Kills", stats.kills],
    ["Deaths", stats.deaths],
    ["Revives", stats.revives],
    ["Cash earned", stats.cash_earned],
  ];
  return (
    <div className={styles.stats}>
      {items.map(([label, value]) => (
        <div key={label}>
          <strong>{num(value)}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// Body of a player card. `card` comes from player_card() (or a minimal
// fallback before the SQL runs). `children` are the action buttons.
export function CardBody({ card, available, children }) {
  const name = card.username || card.display_name || "Player";
  const faction = factionName(card.favorite_faction || card.faction);
  const joined = since(card.member_since);
  const presence = card.is_online === true ? "Online" : card.relationship === "accepted" && card.last_seen_at ? "Offline" : "";
  return (
    <div className={styles.card}>
      <p className="tag">Player card</p>
      <h2 className={`kxCallsign ${styles.cardName}`}>{name}</h2>
      <p className={styles.cardMeta}>
        {faction ? <span>Favorite faction: {faction}</span> : null}
        {joined ? <span>Since {joined}</span> : null}
        {presence ? <span className={card.is_online ? styles.onText : ""}>{presence}</span> : null}
      </p>
      {typeof card.bio === "string" && card.bio.trim() ? <p className={styles.bio}>{card.bio}</p> : null}
      {available === false ? (
        <p className={styles.muted}>Full player cards with stats switch on soon.</p>
      ) : (
        <StatGrid stats={card.stats} />
      )}
      {children ? <div className={styles.cardActions}>{children}</div> : null}
    </div>
  );
}

export default function PlayerCardModal({ open, loading, card, available, error, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Player card" onClick={(event) => event.stopPropagation()}>
        <button className={styles.close} type="button" aria-label="Close" onClick={onClose}>×</button>
        {loading ? <p className={styles.muted}>Loading player...</p> : error ? <p className="formMessage error">{error}</p> : card ? (
          <CardBody card={card} available={available}>{children}</CardBody>
        ) : (
          <p className={styles.muted}>No player uses that callsign.</p>
        )}
      </div>
    </div>
  );
}
