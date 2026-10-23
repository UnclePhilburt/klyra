// Reusable game card driven by app/games/gamesData.js.
export default function GameCard({ game }) {
  return (
    <a className={`kpGameCard theme-${game.theme}`} href={game.href} style={{ "--game-accent": game.accent }}>
      <span className="kpGameArt">
        <img src={game.image} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="kpGameBody">
        <span className="kpGameMeta"><b>{game.genre}</b><i>{game.status}</i></span>
        <span className="kpGameName">{game.name}</span>
        <span className="kpGameBlurb">{game.blurb}</span>
        <span className="kpGameGo">{game.id === "broken-front" ? "Enter the front" : "Preview"} <em aria-hidden="true">&rarr;</em></span>
      </span>
    </a>
  );
}
