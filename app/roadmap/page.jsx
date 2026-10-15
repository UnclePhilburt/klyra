import styles from "./roadmap.module.css";

export const metadata = {
  title: "Development Roadmap · Klyra: Broken Front",
  description:
    "KLYRA's current development priorities, upcoming improvements, and future plans through pre-alpha.",
};

const phases = [
  {
    number: "01", title: "Current Focus", label: "In development", tone: "current",
    cards: [
      { title: "Frostline Valley", items: [
        "Continued development of the 64 km² snow-covered map",
        "Expanded forests, roads, terrain details, and points of interest",
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

export default function RoadmapPage() {
  return (
    <main>
      <section className={`pageIntro ${styles.intro}`}>
        <p className="tag">Development route</p>
        <h1>KLYRA Development Roadmap</h1>
        <p className="lead">
          The route from today&apos;s pre-alpha battlefield to a deeper, sharper,
          and more stable war. Work moves forward in phases as core systems become ready.
        </p>
        <div className={styles.legend} aria-label="Roadmap phase key">
          <span><i className={styles.currentDot} />Current focus</span>
          <span><i className={styles.upcomingDot} />Upcoming</span>
          <span><i className={styles.futureDot} />Future</span>
        </div>
      </section>

      <section className={`section ${styles.section}`}>
        <div className={styles.route}>
          {phases.map((phase) => (
            <article className={`${styles.phase} ${styles[phase.tone]}`} key={phase.title}>
              <div className={styles.marker} aria-hidden="true">{phase.number}</div>
              <div>
                <header className={styles.phaseHeader}>
                  <h2>{phase.title}</h2><span>{phase.label}</span>
                </header>
                <div className={styles.cards}>
                  {phase.cards.map((card) => (
                    <section className={styles.card} key={card.title}>
                      <h3>{card.title}</h3>
                      <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className={styles.disclaimer}>
          This roadmap reflects current development priorities. Features and plans may change
          as KLYRA continues through pre-alpha development.
        </p>
      </section>
    </main>
  );
}
