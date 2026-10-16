"use client";

import { useEffect } from "react";

// Drives the roadmap's scroll effects: the timeline line draws in, and the
// page progress bar fills. Writes CSS variables only (no re-renders).
export default function RoadmapFX({ routeId, barId }) {
  useEffect(() => {
    const route = document.getElementById(routeId);
    const bar = document.getElementById(barId);
    if (!route) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = route.getBoundingClientRect();
      const vh = window.innerHeight;
      const line = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      route.style.setProperty("--rm-line", line.toFixed(4));
      const doc = document.documentElement;
      const page = Math.min(1, Math.max(0, window.scrollY / Math.max(1, doc.scrollHeight - vh)));
      if (bar) bar.style.transform = `scaleX(${page.toFixed(4)})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [routeId, barId]);
  return null;
}
