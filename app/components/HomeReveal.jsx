"use client";
import { useEffect } from "react";

// Adds .in to .mReveal elements as they scroll into view. Tiny, no deps.
export default function HomeReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll(".mReveal")];
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    // Pointer glow on cards (desktop only)
    const cards = [...document.querySelectorAll(".mCard")];
    const move = (ev) => { const c = ev.currentTarget, r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${ev.clientX - r.left}px`); c.style.setProperty("--my", `${ev.clientY - r.top}px`); };
    cards.forEach((c) => c.addEventListener("pointermove", move));
    return () => { io.disconnect(); cards.forEach((c) => c.removeEventListener("pointermove", move)); };
  }, []);
  return null;
}
