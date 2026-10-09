import SiteNav from "../components/SiteNav";
import { macLauncher, windowsLauncher } from "../site-data";

export default function DownloadPage() {
  return (
    <main className="shell">
      <SiteNav />
      <section className="pageHero downloadPage">
        <div>
          <p className="tag">Launcher</p>
          <h1>Install once. Patch from the launcher.</h1>
          <p className="lead">
            Download the launcher for your machine. The launcher checks the
            Cloudflare manifest, downloads Broken Front, and updates the game
            when a new package goes live.
          </p>
        </div>
        <div className="downloadCard">
          <a className="button full" href={windowsLauncher}>
            Windows Launcher
          </a>
          <a className="button ghost full" href={macLauncher}>
            Mac Launcher
          </a>
          <ul>
            <li>Launcher version: 0.1.7</li>
            <li>Current Mac build: 0.1.1 manifest</li>
            <li>Game builds download from cdn.klyra.lol</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
