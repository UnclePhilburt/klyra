"use client";
import { useEffect, useRef } from "react";

// Homepage hero: the wordmark tilts toward the cursor and a canvas layer
// draws soft cyan ripples where the cursor moves. Purely decorative.
export default function HeroCursor() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, hero = cv && cv.closest(".mHero");
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const logo = hero.querySelector(".mWordmark");
    const ctx = cv.getContext("2d");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, visible = true;
    const rip = [];
    let px = -1, py = -1, tx = 0, ty = 0, cx = 0, cy = 0;
    const size = () => { const r = hero.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; };
    size();
    const add = (x, y, s = 1) => { rip.push({ x, y, t: 0, s }); if (rip.length > 24) rip.shift(); kick(); };
    const onMove = (e) => {
      const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      tx = (x / r.width - 0.5) * 2; ty = (y / r.height - 0.5) * 2;
      const now = performance.now();
      if (now - last > 70 || Math.hypot(x - px, y - py) > 60) { add(x, y, e.pointerType === "touch" ? 1.4 : 1); last = now; }
      px = x; py = y; kick();
    };
    const onLeave = () => { tx = 0; ty = 0; px = py = -1; kick(); };
    const draw = () => {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (px >= 0) { const g = ctx.createRadialGradient(px, py, 0, px, py, 260); g.addColorStop(0, "rgba(30,200,255,.10)"); g.addColorStop(1, "rgba(30,200,255,0)"); ctx.fillStyle = g; ctx.fillRect(px - 260, py - 260, 520, 520); }
      for (let i = rip.length - 1; i >= 0; i--) {
        const r = rip[i]; r.t += 0.016;
        const life = r.t / 1.6; if (life >= 1) { rip.splice(i, 1); continue; }
        const rad = 10 + life * 220 * r.s, a = (1 - life) * (1 - life);
        ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(30,200,255,${0.32 * a})`;
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = `rgba(122,92,255,${0.2 * a})`;
        ctx.beginPath(); ctx.arc(r.x, r.y, rad * 0.62, 0, Math.PI * 2); ctx.stroke();
      }
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      if (logo) logo.style.transform = `perspective(700px) translate3d(${cx * 10}px,${cy * 6}px,0) rotateY(${cx * 9}deg) rotateX(${-cy * 7}deg)`;
      if (visible && (rip.length || Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 || px >= 0)) kick();
    };
    function kick() { if (!raf && visible) raf = requestAnimationFrame(draw); }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(hero);
    const opts = { passive: true };
    hero.addEventListener("pointermove", onMove, opts);
    hero.addEventListener("pointerdown", onMove, opts);
    hero.addEventListener("pointerleave", onLeave, opts);
    window.addEventListener("resize", size, opts);
    // Touch devices: a slow idle ripple now and then, otherwise static.
    const idle = fine ? 0 : setInterval(() => { if (visible && !document.hidden) add(w * (0.25 + Math.random() * 0.5), h * (0.3 + Math.random() * 0.4), 1.2); }, 3200);
    return () => { cancelAnimationFrame(raf); clearInterval(idle); io.disconnect(); hero.removeEventListener("pointermove", onMove); hero.removeEventListener("pointerdown", onMove); hero.removeEventListener("pointerleave", onLeave); window.removeEventListener("resize", size); if (logo) logo.style.transform = ""; };
  }, []);
  return <canvas ref={ref} className="mRipple" aria-hidden="true" />;
}
