import TrailerPlayer from "../components/TrailerPlayer";
import { BotSlider, Chapters, Counter, RevealRoot } from "./FeatureFX";

export const metadata = {
  title: "Features · Klyra: Broken Front",
  description:
    "Three factions, 90 bots on official dedicated servers (any bot count when you host), multiplayer, split-screen, helicopters, forward bases, logistics, and a weapon builder.",
};

const T = "/shots/trailer/";

const shots = [
  [`${T}assault.jpg`, "An assault under fire with explosions", "The moving front"],
  [`${T}heli.jpg`, "Helicopter cockpit over the coast", "Helicopters"],
  [`${T}tanks.jpg`, "Tanks on the battlefield", "Armor"],
  [`${T}action-2.jpg`, "Red-dot sight view in a firefight", "On foot"],
  [`${T}armory.jpg`, "A built weapon on a dark background", "Weapon builder"],
  [`${T}gunship.jpg`, "Attack gunship over the treeline", "Attack gunship, chin gun tracks the gunner's view"],
];

const features = [
  { index: "01", title: "Three factions", img: `${T}assault.jpg`, alt: "An assault on the front", copy: "Ironclad, Timberwolf, and Vanguard share one battlefield. The zone moves. First side to 100 points wins." },
  { index: "02", title: "90 bots", img: `${T}tanks.jpg`, alt: "Armor and soldiers filling the battlefield", copy: "Official dedicated servers run 90 bots. Host your own match and you choose how many. A player on a side takes one of those slots." },
  { index: "03", title: "Multiplayer", img: `${T}action-1.jpg`, alt: "First-person rifle fire in a match", copy: "Online rooms hold up to 20 players. Bots fill out the rest of the field." },
  { index: "04", title: "Split-screen", img: `${T}heli-cabin.jpg`, alt: "Two soldiers in a helicopter cabin", copy: "Two players, one computer. Both people play with a controller." },
  { index: "05", title: "Helicopters", img: `${T}heli.jpg`, alt: "Helicopter cockpit over the coast", copy: "Get in a helicopter, fly the fight, and move people across the front." },
  { index: "06", title: "FOB building", img: `${T}action-2.jpg`, alt: "Holding a position under fire", copy: "Put up a forward operating base and keep it in the fight with supplies." },
  { index: "07", title: "Logistics", img: `${T}squad.jpg`, alt: "A squad moving up by helicopter at night", copy: "Trucks carry soldiers and supplies. The front only holds if someone runs them." },
  { index: "08", title: "Weapon builder", img: `${T}armory.jpg`, alt: "A weapon built from parts", copy: "Build a weapon from parts and take that loadout onto the field. Gear you extract stays in your stash." },
];

export default function FeaturesPage() {
  return (
    <main className="kxFeatures">
      <RevealRoot />
      <section className="pageIntro kxIntro" style={{ "--kx-bg": `url(${T}heli.jpg)` }}>
        <p className="tag">The battlefield</p>
        <h1>What you can do.</h1>
        <p className="lead">
          Large-scale fights, a job for every player, and a front that does not
          sit still. These clips and frames are from the pre-alpha.
        </p>
        <div className="actions">
          <a className="button" href="/play/">Play in the browser</a>
          <a className="button ghost" href="/download/">Download</a>
        </div>
      </section>

      <section className="kxStatRow" aria-label="By the numbers">
        <div data-reveal><strong><Counter to={3} /></strong><span>Factions</span></div>
        <div data-reveal><strong><Counter to={90} /></strong><span>Bots on dedicated servers</span></div>
        <div data-reveal><strong><Counter to={20} /></strong><span>Players per online room</span></div>
        <div data-reveal><strong><Counter to={100} /></strong><span>Points to win</span></div>
      </section>

      <section className="kxTrailer kxTrailerTight" aria-label="Pre-alpha gameplay">
        <div className="kxTrailerHead">
          <p className="tag">Pre-alpha version</p>
        </div>
        <TrailerPlayer />
      </section>

      <section className="section">
        <div className="sectionIntro" data-reveal>
          <p className="tag">Field systems</p>
          <h2>Everything on the front.</h2>
          <p>Scroll through the systems that make up a match.</p>
        </div>
        <Chapters items={features} />
      </section>

      <section className="section kxBots" aria-labelledby="bots-title">
        <div className="sectionIntro" data-reveal>
          <p className="tag">Custom bot count</p>
          <h2 id="bots-title">Fill the field your way.</h2>
        </div>
        <p className="kxCallout" data-reveal>Official dedicated servers run 90 bots and are the recommended way to play.</p>
        <div className="kxBotPanels">
          <article className="kxBotPanel official" data-reveal>
            <p className="tag">Dedicated servers</p>
            <div className="kxBigNum"><Counter to={90} /><small>bots</small></div>
            <h3>Official servers &mdash; 90 bots</h3>
            <p>Every official dedicated server runs a full 90-bot battle. Jump in and the front is already crowded.</p>
          </article>
          <article className="kxBotPanel custom" data-reveal>
            <p className="tag">Host your own</p>
            <h3>You pick the number</h3>
            <p>When you host your own match, set any number of bots you want.</p>
            <BotSlider />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="sectionIntro" data-reveal>
          <p className="tag">From the pre-alpha</p>
          <h2>Frames from the fight.</h2>
        </div>
        <div className="kxShots">
          {shots.map(([src, alt, caption], i) => (
            <figure key={src} className={i === 0 ? "kxShotWide" : undefined} data-reveal style={{ "--d": `${i * 70}ms` }}>
              <img src={src} alt={alt} loading="lazy" decoding="async" />
              <figcaption><span>{String(i + 1).padStart(2, "0")}</span>{caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
