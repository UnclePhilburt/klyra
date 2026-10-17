"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Adds .isIn to any [data-reveal] element as it scrolls into view.
export function RevealRoot() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (reduced() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("isIn"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("isIn"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

// Counts up from 0 to `to` when it first becomes visible.
export function Counter({ to, suffix = "", duration = 1400 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !("IntersectionObserver" in window)) return;
    setValue(0);
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{value}{suffix}</span>;
}

// Sticky image on the left that swaps to whichever feature is in the middle of the screen.
export function Chapters({ items }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.index)); }),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="kxChapters">
      <div className="kxChapterStage" aria-hidden="true">
        {items.map((item, i) => (
          item.img
            ? <img key={item.index} src={item.img} alt="" loading="lazy" decoding="async" className={i === active ? "on" : undefined} />
            : <div key={item.index} className={`kxGfxLayer${i === active ? " on" : ""}`}><Graphic kind={item.gfx} /></div>
        ))}
        <div className="kxChapterHud">
          <span>{items[active].index} / {String(items.length).padStart(2, "0")}</span>
          <strong>{items[active].title}</strong>
        </div>
        <div className="kxChapterBar"><i style={{ width: `${((active + 1) / items.length) * 100}%` }} /></div>
      </div>
      <ol className="kxChapterList">
        {items.map((item, i) => (
          <li key={item.index} ref={(el) => { refs.current[i] = el; }} data-index={i} className={i === active ? "on" : undefined}>
            {item.img
              ? <img className="kxChapterInline" src={item.img} alt={item.alt} loading="lazy" decoding="async" />
              : <div className="kxChapterInline kxGfxInline" aria-hidden="true"><Graphic kind={item.gfx} /></div>}
            <span>{item.index}</span>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Interactive host-your-own demo: pick a bot count, watch the field fill.
export function BotSlider() {
  const [bots, setBots] = useState(40);
  const dots = Math.min(bots, 90);
  return (
    <div className="kxBotDemo">
      <div className="kxBotReadout">
        <strong>{bots}</strong>
        <span>bots in your match</span>
      </div>
      <label className="kxBotRange">
        <span className="srOnly">Bot count</span>
        <input type="range" min="0" max="90" step="1" value={bots} onChange={(e) => setBots(Number(e.target.value))} aria-label="Bot count" />
      </label>
      <div className="kxBotField" aria-hidden="true">
        {Array.from({ length: 90 }, (_, i) => (
          <i key={i} className={i < dots ? `on t${i % 3}` : undefined} />
        ))}
      </div>
      <p className="kxBotNote">Demo only. In the game you set the number, up to 90, when you host.</p>
    </div>
  );
}

// Typographic / animated UI stand-ins for features without a matching still.
export function Graphic({ kind }) {
  if (kind === "factions") return (
    <div className="kxGfx kxGfxFactions">
      {[["blackline", "#f15a52", "Blackline Group"], ["hollow", "#61cf88", "Kin of the Hollow"], ["regiment", "#4bb6ff", "The Regiment"]].map(([id, c, n], i) => (
        <div key={id} style={{ "--c": c, "--i": i }}><img src={`/teams/${id}.svg`} alt="" /><span>{n}</span></div>
      ))}
      <p className="kxGfxCaption">First to <b>100</b> points</p>
    </div>
  );
  if (kind === "bots") return (
    <div className="kxGfx kxGfxBots">
      <div className="kxGfxBotGrid">{Array.from({ length: 90 }, (_, i) => <i key={i} className={`t${i % 3}`} style={{ "--i": i }} />)}</div>
      <p className="kxGfxCaption"><b>Up to 90</b> bots per match</p>
    </div>
  );
  if (kind === "players") return (
    <div className="kxGfx kxGfxPlayers">
      <strong>20</strong>
      <div className="kxGfxSlots">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ "--i": i }} />)}</div>
      <p className="kxGfxCaption">Players per online room</p>
    </div>
  );
  if (kind === "split") return (
    <div className="kxGfx kxGfxSplit">
      <div><span>P1</span><Pad /></div>
      <div><span>P2</span><Pad /></div>
      <p className="kxGfxCaption">Two players &middot; one computer</p>
    </div>
  );
  if (kind === "fob") return (
    <div className="kxGfx kxGfxFob">
      <div className="kxGfxFobBox"><span>FOB</span></div>
      {[["Build", 92], ["Supplies", 68], ["Hold", 45]].map(([n, v], i) => (
        <div key={n} className="kxGfxMeter" style={{ "--v": `${v}%`, "--i": i }}><span>{n}</span><i /></div>
      ))}
    </div>
  );
  if (kind === "logistics") return (
    <div className="kxGfx kxGfxRoute">
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M20 130 C 120 130, 140 30, 230 50 S 340 120, 380 30" />
      </svg>
      <div className="kxGfxEnds"><span>BASE</span><span>FRONT</span></div>
      <p className="kxGfxCaption">Soldiers and supplies, by truck</p>
    </div>
  );
  return null;
}

function Pad() {
  return (
    <svg viewBox="0 0 64 40" width="64" height="40" aria-hidden="true">
      <path d="M14 6h36c8 0 12 8 12 18 0 8-4 12-8 12-5 0-7-6-12-6H22c-5 0-7 6-12 6-4 0-8-4-8-12 0-10 4-18 12-18z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="46" cy="16" r="2.5" fill="currentColor" /><circle cx="52" cy="22" r="2.5" fill="currentColor" />
      <path d="M16 14v10M11 19h10" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}
