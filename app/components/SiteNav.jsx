export default function SiteNav() {
  return (
    <nav className="nav">
      <a className="brand" href="/" aria-label="Klyra Broken Front home">
        <span className="brandMark">K</span>
        <span>Klyra: Broken Front</span>
      </a>
      <div className="navLinks">
        <a href="/#war">The war</a>
        <a href="/#trailer">Trailer</a>
        <a className="button ghost small" href="/account/">
          Account
        </a>
        <a className="button small" href="/download/">
          Download
        </a>
      </div>
    </nav>
  );
}
