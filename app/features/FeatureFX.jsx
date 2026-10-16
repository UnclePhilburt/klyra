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
          <img key={item.img} src={item.img} alt="" loading="lazy" decoding="async" className={i === active ? "on" : undefined} />
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
            <img className="kxChapterInline" src={item.img} alt={item.alt} loading="lazy" decoding="async" />
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
  const dots = Math.min(bots, 120);
  return (
    <div className="kxBotDemo">
      <div className="kxBotReadout">
        <strong>{bots}</strong>
        <span>bots in your match</span>
      </div>
      <label className="kxBotRange">
        <span className="srOnly">Bot count</span>
        <input type="range" min="0" max="120" step="1" value={bots} onChange={(e) => setBots(Number(e.target.value))} aria-label="Bot count" />
      </label>
      <div className="kxBotField" aria-hidden="true">
        {Array.from({ length: 120 }, (_, i) => (
          <i key={i} className={i < dots ? `on t${i % 3}` : undefined} />
        ))}
      </div>
      <p className="kxBotNote">Demo only. In the game you set the number when you host.</p>
    </div>
  );
}
