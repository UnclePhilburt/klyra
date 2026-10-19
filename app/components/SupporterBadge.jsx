// Supporter Edition badge for player cards, friend rows and presence.
//
// The site never decides who is a supporter. It only shows the badge when a
// player row returned by Supabase (player_card(), my_friends,
// recently_played_with()) carries a true supporter flag. The field is
// `supporter` (boolean), the same name the game-session ticket uses
// (profile.supporter). `is_supporter` is also accepted. Missing or false: no
// badge, nothing else changes. Paid Supporter Edition only; complimentary
// flags must not set it.
export const SUPPORTER_FIELDS = ["supporter", "is_supporter"];

export function isSupporter(row) {
  if (!row || typeof row !== "object") return false;
  return SUPPORTER_FIELDS.some((key) => row[key] === true);
}

export default function SupporterBadge({ row, force = false, size = "md", label = "Supporter" }) {
  if (!force && !isSupporter(row)) return null;
  return (
    <span className={`kxSupBadge ${size === "sm" ? "sm" : ""}`} title="Supporter Edition" aria-label="Supporter Edition">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.6 2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17.1l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7L12 2.6Z" /></svg>
      <span>{label}</span>
    </span>
  );
}
