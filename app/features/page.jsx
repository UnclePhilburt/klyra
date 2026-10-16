import TrailerPlayer from "../components/TrailerPlayer";
import { BotSlider, Chapters, Counter, RevealRoot } from "./FeatureFX";

export const metadata = {
  title: "Features · Klyra: Broken Front",
  description:
    "Three factions, up to 90 bots (official dedicated servers run 90), multiplayer, split-screen, helicopters, forward bases, logistics, and a weapon builder.",
};

const T = "/shots/trailer/";

const shots = [
  [`${T}heli.jpg`, "Helicopter cockpit over the coast", "Helicopters"],
  [`${T}tanks.jpg`, "A tank on the battlefield", "Armor"],
  [`${T}gunship.jpg`, "Attack gunship over the treeline", "Attack gunship, chin gun tracks the gunner's view"],
  [`${T}action-2.jpg`, "Red-dot sight view on foot", "On foot, red-dot up"],
];

// Photos only where a trailer still really shows the feature; the rest use
// typographic / animated UI graphics.
const features = [
  { index: "01", title: "Three factions", gfx: "factions", copy: "Ironclad, Timberwolf, and Vanguard share one battlefield. The zone moves. First side to 100 points wins." },
  { index: "02", title: "Multiplayer", gfx: "players", copy: "Online rooms hold up to 20 players. Bots fill out the rest of the field." },
  { index: "03", title: "Split-screen", gfx: "split", copy: "Two players, one computer. Both people play with a controller." },
  { index: "04", title: "Helicopters", img: `${T}heli.jpg`, alt: "Helicopter cockpit over the coast", copy: "Get in a helicopter, fly the fight, and move people across the front." },
  { index: "05", title: "FOB building", gfx: "fob", copy: "Put up a forward operating base and keep it in the fight with supplies." },
  { index: "06", title: "Logistics", gfx: "logistics", copy: "Trucks carry soldiers and supplies. The front only holds if someone runs them." },
  { index: "07", title: "Weapon builder", img: `${T}armory.jpg`, alt: "A weapon built from parts", copy: "Build a weapon from parts and take that loadout onto the field. Gear you extract stays in your stash." },
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
        <div data-reveal><strong><Counter to={90} /></strong><span>Max bots per match</span></div>
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
        <div className="kxBotPanels single">
          <article className="kxBotPanel custom" data-reveal>
            <p className="tag">Host your own</p>
            <h3>You pick the number</h3>
            <p>When you host your own match, set the bot count yourself, up to 90. A player on a side takes one of those slots.</p>
            <BotSlider />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="sectionIntro" data-reveal>
          <p className="tag">From the pre-alpha</p>
          <h2>Frames from the fight.</h2>
        </div>
        <div className="kxShots kxShotsTwo">
          {shots.map(([src, alt, caption], i) => (
            <figure key={src} data-reveal style={{ "--d": `${i * 70}ms` }}>
              <img src={src} alt={alt} loading="lazy" decoding="async" />
              <figcaption><span>{String(i + 1).padStart(2, "0")}</span>{caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
