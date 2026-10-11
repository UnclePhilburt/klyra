const links = [
  ["Play", "/download/"],
  ["Features", "/features/"],
  ["Roadmap", "/roadmap/"],
  ["Devlog", "/devlog/"],
  ["Community", "/community/"],
  ["Discord", "https://discord.gg/wWeH446a5"],
  ["Support", "/support/"],
  ["Help", "/help/"],
  ["Trailer", "/trailer/"],
  ["Account", "/account/"],
];

export default function SiteFooter() {
  return (
    <footer>
      <div>
        <strong>Klyra: Broken Front</strong>
        <p>Pre-alpha</p>
      </div>
      <nav className="footerLinks" aria-label="Site">
        {links.map(([label, href]) => (
          <a
            key={href}
            href={href}
            {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
