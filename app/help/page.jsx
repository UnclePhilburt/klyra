export const metadata = {
  title: "Help · Klyra: Broken Front",
  description:
    "How to install KLYRA: Broken Front, which computers it runs on, controllers, and what to try when a match will not start.",
};

const topics = [
  {
    q: "How do I install it?",
    a: "Open the Play page and download the file for your computer. Open that file. Let it finish getting the game, then start a match. Sign in with your callsign or your email if you want the gear you extract to stay on your account.",
  },
  {
    q: "Which computers can run it?",
    a: "Windows on a 64-bit PC, and Mac on macOS 12 or newer. There is no phone version. A free browser version is part of the plan and is not playable on this site yet.",
  },
  {
    q: "What does my computer need?",
    a: "A current 64-bit Windows PC, or a Mac on macOS 12 or newer. Online matches and accounts need an internet connection. Play with a keyboard and mouse, or a controller. Memory and graphics numbers are not published yet.",
  },
  {
    q: "Do controllers work?",
    a: "Yes. Keyboard and mouse work, and so do Xbox and PlayStation controllers. On-screen prompts follow the device you are using. For two players on one computer, player one can stay on the keyboard. Press Start on a second controller to join.",
  },
  {
    q: "The download will not open",
    a: "You got the file from klyra.lol. If Windows asks before it runs an unrecognized app, you can still choose to run it. On a Mac, open the disk image. If the Mac says the app cannot be opened, Control-click the app and choose Open. If it stops halfway, close it and open the download again so it can finish getting the game.",
  },
  {
    q: "The game will not start, or it is stuck getting files",
    a: "Close the game, then open the download again and let it finish. If the game is already open, close it before you try to remove it or get it again.",
  },
  {
    q: "I cannot get into a multiplayer match",
    a: "Check that the computer is online. Sign in with your callsign or email. A room holds up to 12 players, and bots fill the sides. If the room will not start, leave it and try again. On one computer, the second person needs their own controller and presses Start.",
  },
  {
    q: "Who do I contact?",
    a: (
      <>
        Account sign-in starts on the account page. Bug reports, suggestions,
        and multiplayer groups go on the{" "}
        <a href="https://discord.gg/wWeH446a5" target="_blank" rel="noreferrer">
          KLYRA Discord
        </a>
        . There is no public email on this site.
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <main>
      <section className="pageIntro">
        <p className="tag">Help</p>
        <h1>Get into the match.</h1>
        <p className="lead">
          Install, computers, controllers, and the usual ways a pre-alpha
          refuses to start.
        </p>
        <div className="actions">
          <a className="button" href="/download/">Play</a>
          <a className="button ghost" href="/account/">Account</a>
        </div>
      </section>
      <section className="section">
        <div className="faq">
          {topics.map((topic) => (
            <details key={topic.q}>
              <summary>{topic.q}</summary>
              <p>{topic.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
