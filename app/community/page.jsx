export const metadata = {
  title: "Community · Klyra: Broken Front",
  description:
    "Join the KLYRA: Broken Front Discord: find a squad, talk to the developer, share clips, report bugs, and follow every update.",
};

const DISCORD = "https://discord.gg/fNkZjwQJBX";

const perks = [
  ["Find a squad", "Line up teammates for online rooms and split-screen nights."],
  ["Talk to the developer", "Ideas and feedback go straight to the person building the game."],
  ["First to know", "New builds, devlog posts, and roadmap news land here first."],
  ["Share the fight", "Post clips and screenshots from the front."],
];

export default function CommunityPage() {
  return (
    <main>
      <section className="kxDiscordHero">
        <div className="kxDiscordBg" aria-hidden="true" />
        <div className="kxDiscordCopy">
          <p className="tag">Community &middot; Discord</p>
          <svg className="kxDiscordLogo" viewBox="0 0 127.14 96.36" aria-hidden="true"><path fill="currentColor" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.44-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"/></svg>
          <h1>Join the <span className="kxGold">Discord.</span></h1>
          <p className="lead">The KLYRA community lives on Discord. Squad up, talk to the developer, and get every update first.</p>
          <a className="kxDiscordBtn" href={DISCORD} target="_blank" rel="noreferrer">
            <span>Join the KLYRA Discord</span><b aria-hidden="true">↗</b>
          </a>
        </div>
      </section>

      <section className="section">
        <div className="cards kxPerks">
          {perks.map(([title, copy], i) => (
            <article key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <p className="kxSecondary">
          Found a bug? Post it in the Discord with what you were doing and what happened.{" "}
          <a href={DISCORD} target="_blank" rel="noreferrer">Join Discord ↗</a>
        </p>
      </section>
    </main>
  );
}
