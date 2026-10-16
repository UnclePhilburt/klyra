import styles from "./roadmap.module.css";
import RoadmapFX from "./RoadmapFX";
import { RevealRoot } from "../features/FeatureFX";

export const metadata = {
  title: "Development Roadmap · Klyra: Broken Front",
  description:
    "KLYRA's current development priorities, upcoming improvements, and future plans through pre-alpha.",
};

const phases = [
  {
    number: "01", title: "Current Focus", label: "In development", tone: "current",
    cards: [
      { title: "An Nafud", items: [
        "Continued development of the An Nafud desert map",
        "Expanded roads, terrain details, and points of interest",
        "Improved baked lighting and environmental visuals",
        "Four selectable times of day", "Nine weather presets",
        "Environmental optimization and performance improvements",
      ]},
      { title: "Night Combat Overhaul", items: [
        "Complete night vision system overhaul", "Improved flashlight visuals and functionality",
        "Better nighttime lighting and visibility",
        "Improved interactions between artificial lighting and night vision",
      ]},
      { title: "Artificial Intelligence", items: [
        "Improved squad coordination and combat behavior", "Better navigation and pathfinding",
        "More intelligent vehicle and logistics operations", "Improved objective participation",
        "AI performance optimization",
      ]},
    ],
  },
  {
    number: "02", title: "Upcoming Improvements", label: "Next on the route", tone: "upcoming",
    cards: [
      { title: "User Interface Overhaul", items: [
        "Redesigned HUD and menus", "Improved inventory and equipment management",
        "Weapon builder interface improvements", "Tactical map and navigation improvements",
        "Better visual feedback and notifications",
      ]},
      { title: "Player Progression", items: [
        "Player leveling and experience system", "Ranks and progression rewards",
        "Potential skill and specialization system", "Additional progression incentives",
      ]},
      { title: "Gameplay & Combat", items: [
        "Improved weapon handling and combat feedback", "Character movement and animation improvements",
        "Battlefield audio and visual effects", "Continued weapon, vehicle, and economy balancing",
      ]},
    ],
  },
  {
    number: "03", title: "Future Development", label: "Planned", tone: "future",
    cards: [
      { title: "Battlefield Systems", items: [
        "Expanded logistics and supply mechanics", "Improved squad commands and coordination",
        "Additional battlefield locations and activities", "Further equipment and customization options",
      ]},
      { title: "Multiplayer & Optimization", items: [
        "Dedicated-server improvements",
        "Player-run custom dedicated servers with names, passwords, and configurable rules",
        "Community servers listed automatically in the in-game server browser",
        "Improved multiplayer stability and synchronization", "CPU and AI performance optimization",
        "Continued Windows, macOS, and browser improvements",
      ]},
      { title: "Quality of Life", items: [
        "Improved new-player experience", "Better tutorials and gameplay explanations",
        "Expanded graphics and control settings", "Ongoing bug fixes and community-requested improvements",
      ]},
    ],
  },
];

const statusText = { current: "Active", upcoming: "Queued", future: "Planned" };

export default function RoadmapPage() {
  const total = phases.reduce((sum, phase) => sum + phase.cards.reduce((n, card) => n + card.items.length, 0), 0);
  return (
    <main className={styles.page}>
      <RevealRoot />
      <RoadmapFX routeId="rm-route" barId="rm-progress" />
      <div className={styles.progress} aria-hidden="true"><i id="rm-progress" /></div>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Development route // Pre-alpha</p>
          <h1>The <span>roadmap.</span></h1>
          <p className={styles.lead}>
            The route from today&apos;s pre-alpha battlefield to a deeper, sharper,
            and more stable war. Work moves forward in phases as core systems become ready.
          </p>
          <div className={styles.stats}>
            <div><strong>03</strong><span>Phases</span></div>
            <div><strong>{String(total)}</strong><span>Objectives</span></div>
            <div><strong>An Nafud</strong><span>Primary map</span></div>
          </div>
        </div>
      </section>

      <div className={styles.hazard} aria-hidden="true" />

      <nav className={styles.jump} aria-label="Roadmap phases">
        {phases.map((phase) => (
          <a key={phase.number} href={`#phase-${phase.number}`} className={styles[phase.tone]}>
            <i aria-hidden="true" />
            <span>{phase.number}</span>
            <strong>{phase.title}</strong>
          </a>
        ))}
      </nav>

      <section id="rm-route" className={styles.route}>
        <div className={styles.routeFill} aria-hidden="true" />
        {phases.map((phase) => (
          <article id={`phase-${phase.number}`} className={`${styles.phase} ${styles[phase.tone]}`} key={phase.title}>
            <header className={styles.phaseHeader} data-reveal>
              <div className={styles.marker} aria-hidden="true">{phase.number}</div>
              <div>
                <p className={styles.phaseLabel}><i aria-hidden="true" />{phase.label}</p>
                <h2>{phase.title}</h2>
              </div>
              <span className={styles.status}>{statusText[phase.tone]}</span>
            </header>
            <div className={styles.cards}>
              {phase.cards.map((card, index) => (
                <section className={styles.card} key={card.title} data-reveal style={{ "--d": `${index * 90}ms` }}>
                  <p className={styles.cardCode}>OBJ {phase.number}-{String(index + 1).padStart(2, "0")}</p>
                  <h3>{card.title}</h3>
                  <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.footer}>
        <p className={styles.disclaimer} data-reveal>
          This roadmap reflects current development priorities. Features and plans may change
          as KLYRA continues through pre-alpha development.
        </p>
        <div className={styles.actions}>
          <a className="button huge" href="/play/">Play the pre-alpha</a>
          <a className="button ghost huge" href="/devlog/">Read the devlog</a>
        </div>
      </section>
    </main>
  );
}
