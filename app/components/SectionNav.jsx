"use client";
import { usePathname } from "next/navigation";

export default function SectionNav({ label, items, className }) {
  const path = usePathname() || "";
  const norm = (h) => h.replace(/\/$/, "");
  const here = norm(path);
  const isOn = (href, i) => (i === 0 ? here === norm(href) : here === norm(href) || here.startsWith(norm(href) + "/"));
  return (
    <nav className={`secNav ${className}`} aria-label={label}>
      <div className="secNavInner">
        <span className="secNavTitle">{label}</span>
        {items.map(([l, h], i) => (
          <a key={h} href={h} aria-current={isOn(h, i) ? "page" : undefined}>{l}</a>
        ))}
      </div>
    </nav>
  );
}
