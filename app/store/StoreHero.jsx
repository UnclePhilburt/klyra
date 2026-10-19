import { CHARACTER_PRICE_LABEL } from "./characterData";

export default function StoreHero({ title = "Character store", children }) {
  return (
    <section className="kxIntro kxStoreHero" style={{ "--kx-bg": "url(/shots/trailer/gunship.jpg)" }}>
      <p className="tag">Cosmetics &middot; Optional</p>
      <h1>{title}</h1>
      <p className="lead">
        {children || <>Pick who you deploy as. Every character below is the real in-game model playing its idle. Drag to turn them around. Skins are cosmetic only and never change how you play.</>}
      </p>
      <div className="kxStoreFacts">
        <span><b>{CHARACTER_PRICE_LABEL}</b> per character</span>
        <span><b>Account</b> sign-in required</span>
        <span><b>Supporter</b> 5 exclusives included</span>
      </div>
    </section>
  );
}
