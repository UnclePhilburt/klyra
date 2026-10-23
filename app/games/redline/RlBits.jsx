import GamePage from "../../components/game/GamePage";
import MediaGallery from "../../components/game/MediaGallery";
import { redlineCars } from "../gamesData";

const Speed = () => <div className="rlSpeed" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>;

export function RedlineSubPage({ title, lead, className = "", children }) {
  return (
    <GamePage theme="rlPage rlSub" className={className} badge="In development" title={title} lead={lead} fx={<Speed />}>
      {children}
      <WipNote />
    </GamePage>
  );
}

export function CarGrid({ discipline }) {
  const items = redlineCars.filter((c) => !discipline || c.discipline === discipline).map((c) => ({
    src: c.poster, title: c.name, kicker: c.discipline === "pro" ? "Redline Pro" : "Redline Street",
    href: `/games/redline/vehicles/?car=${c.id}`, tone: c.discipline, label: "Model render",
  }));
  return <MediaGallery items={items} className="rlMedia" />;
}

export function WipNote() {
  return <p className="rlNote">KLYRA: Redline is in development. Car images are renders of in-development models, not gameplay. Everything here can change.</p>;
}
