export const metadata = {
  title: "Roadmap · Klyra: Broken Front",
  description:
    "What is playable in KLYRA now, what is in progress, and what is planned. No release dates.",
};

const columns = [
  {
    status: "Completed",
    tone: "done",
    items: [
      "Ironclad, Timberwolf, and Vanguard",
      "Moving battle zone, first to 100 points",
      "Up to 60 bots, 20 on a side",
      "Online matches for up to 20 players",
      "Split-screen on one computer",
      "Helicopters",
      "Trucks and supply runs",
      "Forward operating bases",
      "Weapon builder and extracted gear stash",
      "Revive",
      "Keyboard, mouse, and controller",
      "Windows and Mac desktop builds",
      "Browser version on the play page. Performance is degraded because it is a web browser build",
      "KLYRA Discord for bug reports, suggestions, and groups",
    ],
  },
  {
    status: "In Progress",
    tone: "now",
    items: [
      "Quieter weather so combat stays in front",
      "Wildlife sounds removed from the battlefield",
      "Pre-alpha testing and fixes",
    ],
  },
  {
    status: "Planned",
    tone: "later",
    items: [
      "Founder's Access checkout, $4.99 once for Windows and Mac",
      "More battlefield systems, added one at a time",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main>
      <section className="pageIntro">
        <p className="tag">Roadmap</p>
        <h1>Where the fight stands.</h1>
        <p className="lead">
          Completed means you can do it in the current pre-alpha. In Progress
          means it is being built and is not in the download yet. Planned means
          it is intended. There are no release dates on this page.
        </p>
      </section>
      <section className="section">
        <div className="roadmap">
          {columns.map((column) => (
            <article key={column.status}>
              <p className={`status ${column.tone}`}>{column.status}</p>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
