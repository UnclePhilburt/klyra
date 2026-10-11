import SiteNav from "../components/SiteNav";
import { macLauncher, windowsLauncher } from "../site-data";

export default function DownloadPage() {
  return (
    <main className="shell">
      <SiteNav />
      <section className="pageHero downloadPage">
        <div>
          <p className="tag">Play</p>
          <h1>Download and get in.</h1>
          <p className="lead">
            Grab the launcher for your computer. It installs Broken Front and
            picks up new versions when they are ready.
          </p>
        </div>
        <div className="downloadCard">
          <a className="button full" href={windowsLauncher}>
            Windows
          </a>
          <a className="button ghost full" href={macLauncher}>
            Mac
          </a>
          <ul>
            <li>Free pre-alpha.</li>
            <li>Sign in after it installs so your stash is saved.</li>
            <li>New fights show up in the launcher. You do not reinstall.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
