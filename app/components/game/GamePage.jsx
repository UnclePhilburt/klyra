// Reusable game subpage shell: themed main + header (badge, title, lead) + optional speed lines.
export default function GamePage({ theme, badge, title, lead, fx = null, className = "", children }) {
  return (
    <main className={`gPage ${theme} ${className}`}>
      <header className="gHead">
        {fx}
        {badge ? <p className="gBadge"><i aria-hidden="true" />{badge}</p> : null}
        <h1>{title}</h1>
        {lead ? <p className="gLead">{lead}</p> : null}
      </header>
      {children}
    </main>
  );
}
