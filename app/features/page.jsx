export const metadata = {
  title: "Features · Klyra: Broken Front",
  description:
    "Three factions, up to 60 bots, multiplayer, split-screen, helicopters, forward bases, logistics, and a weapon builder.",
};

const shots = [
  ["/shots/fight.jpg", "A rifle fight between the factions", "The moving front"],
  ["/shots/heli.jpg", "Helicopter cockpit", "Helicopters"],
  ["/shots/truck.jpg", "Supply truck on the road", "Logistics"],
  ["/shots/squad.jpg", "Soldiers in a truck", "The ride in"],
  ["/shots/infantry.jpg", "First-person infantry", "On foot"],
  ["/shots/split.jpg", "Two players split across one screen", "Split-screen"],
];

const features = [
  ["01", "Three factions", "Ironclad, Timberwolf, and Vanguard share one battlefield. The zone moves. First side to 100 points wins."],
  ["02", "60 bots", "The match fills out to 60 soldiers, 20 on a side. A player on that side takes one of those slots."],
  ["03", "Multiplayer", "Online rooms hold up to 12 players. Everyone else on the field is part of that soldier count."],
  ["04", "Split-screen", "Two players, one computer. Player one can use the keyboard. Press Start on a second controller to join."],
  ["05", "Helicopters", "Get in a helicopter, fly the fight, and move people across the front."],
  ["06", "FOB building", "Put up a forward operating base and keep it in the fight with supplies."],
  ["07", "Logistics", "Trucks carry soldiers and supplies. The front only holds if someone runs them."],
  ["08", "Weapon builder", "Build a weapon from parts and take that loadout onto the field. Gear you extract stays in your stash."],
];

export default function FeaturesPage() {
  return (
    <main>
      <section className="pageIntro">
        <p className="tag">The battlefield</p>
        <h1>What you can do.</h1>
        <p className="lead">
          Large-scale fights, a job for every player, and a front that does not
          sit still. These clips and frames are from the pre-alpha.
        </p>
        <div className="actions">
          <a className="button" href="/download/">Play</a>
        </div>
      </section>

      <section className="trailerBand" aria-label="Pre-alpha gameplay">
        <p className="tag">Pre-alpha version</p>
        <div className="trailerFrame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/UCOv0qqh0r0?rel=0"
            title="KLYRA: Broken Front pre-alpha gameplay trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>

      <section className="section">
        <div className="shotGrid">
          {shots.map(([src, alt, caption]) => (
            <figure key={src}>
              <img src={src} alt={alt} />
              <figcaption>{caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="cards featureList">
          {features.map(([index, title, copy]) => (
            <article key={index}>
              <span>{index}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
