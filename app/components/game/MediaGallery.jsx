// Reusable media grid. Each item: { src, title, kicker?, href?, tone? , label? }
export default function MediaGallery({ items, className = "" }) {
  return (
    <div className={`gMedia ${className}`}>
      {items.map((m) => {
        const Tag = m.href ? "a" : "figure";
        return (
          <Tag key={m.src} className={`gMediaItem ${m.tone || ""}`} {...(m.href ? { href: m.href } : {})}>
            <img src={m.src} alt={m.alt || ""} width="640" height="360" loading="lazy" decoding="async" />
            {m.label ? <em className="gMediaLabel">{m.label}</em> : null}
            <span>{m.kicker ? <small>{m.kicker}</small> : null}<b>{m.title}</b></span>
          </Tag>
        );
      })}
    </div>
  );
}
