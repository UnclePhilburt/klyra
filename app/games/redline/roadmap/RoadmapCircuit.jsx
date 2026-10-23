"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Top-down circuit map roadmap. Phase data: ../data/roadmap.js (single source of truth).
// Car marker is a top-down render of the Redline Pro Touring model. Illustration, not gameplay.
const STATUS = { planned: "Planned", "in-development": "In development", testing: "Testing", completed: "Completed", released: "Released" };
const PRO = "M120 560 L470 560 C585 560 605 495 560 448 C520 405 425 432 385 382 C345 332 418 292 470 252 C532 204 522 120 440 100 C340 76 205 88 150 150 C98 210 172 262 142 332 C112 402 52 452 88 522 C98 545 108 560 120 560";
const STREET = "M120 560 L700 560 Q720 560 720 540 L720 470 Q720 450 740 450 L830 450 Q850 450 850 430 L850 350 Q850 330 870 330 L910 330";
const FUTURE = "M910 330 C962 320 968 250 944 196 C924 150 946 92 990 40";
// Corner anchor points (nearest point on the route becomes the phase marker).
const ANCHORS = [[566, 470], [400, 400], [450, 262], [500, 115], [160, 140], [125, 360], [850, 400], [952, 170]];
const SECTOR = ["#ff3b30", "#ff3b30", "#3aa0ff", "#3aa0ff", "#ffd43b", "#ffd43b", "#ff2d9a", "#9fb4c8"];
const LABEL_OFF = [[34, 6], [-30, 34], [36, 8], [30, -26], [24, -22], [-26, 4], [-40, -8], [-38, 22]];

const ease = (x) => 1 - Math.pow(1 - x, 3);

export default function RoadmapCircuit({ phases }) {
  const wrap = useRef(null), route = useRef(null), proRef = useRef(null), stRef = useRef(null), fuRef = useRef(null), carRef = useRef(null);
  const [geo, setGeo] = useState(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(null);
  const [rm, setRm] = useState(false);

  // Geometry: lengths and marker positions measured from the real paths.
  useEffect(() => {
    const r = route.current, L = r.getTotalLength();
    const lens = [proRef.current.getTotalLength(), stRef.current.getTotalLength(), fuRef.current.getTotalLength()];
    const marks = ANCHORS.map(([ax, ay], i) => {
      const from = i < 6 ? 0 : i === 6 ? lens[0] + 330 : lens[0] + lens[1] - 10;
      const to = i < 6 ? lens[0] : L;
      let best = from, bd = 1e9;
      for (let s = from; s <= to; s += 2) { const p = r.getPointAtLength(s); const d = (p.x - ax) ** 2 + (p.y - ay) ** 2; if (d < bd) { bd = d; best = s; } }
      const p = r.getPointAtLength(best); return { s: best, f: best / L, x: p.x, y: p.y };
    });
    setGeo({ L, lens, marks });
    setRm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!geo) return;
    const { L, lens, marks } = geo;
    const segs = [[0, lens[0], proRef], [lens[0], lens[0] + lens[1], stRef], [lens[0] + lens[1], L, fuRef]];
    let target = 0, cur = 0, raf = 0, last = -2;
    const apply = (p) => {
      const s = p * L;
      segs.forEach(([a, b, ref]) => { const len = b - a, done = Math.min(len, Math.max(0, s - a)); ref.current.style.strokeDashoffset = `${len - done}`; });
      const q = route.current.getPointAtLength(Math.max(0.5, s)), q2 = route.current.getPointAtLength(Math.min(L, s + 3));
      const ang = (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI;
      carRef.current.setAttribute("transform", `translate(${q.x} ${q.y}) rotate(${ang - 90})`);
      carRef.current.style.opacity = p > 0.97 ? `${Math.max(0, (1 - p) / 0.03)}` : "1";
      let a = -1; marks.forEach((m, i) => { if (s >= m.s - 6) a = i; });
      if (a !== last) { last = a; setActive(a); }
    };
    if (rm) { apply(1); setActive(-1); return; }
    const measure = () => { const r = wrap.current.getBoundingClientRect(); const tot = r.height - window.innerHeight; target = Math.min(1, Math.max(0, -r.top / Math.max(1, tot))); };
    const tick = () => { cur += (target - cur) * 0.12; if (Math.abs(target - cur) < 0.0002) cur = target; apply(ease(cur) * 0.4 + cur * 0.6); raf = requestAnimationFrame(tick); };
    measure(); cur = target; window.addEventListener("scroll", measure, { passive: true }); window.addEventListener("resize", measure); tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [geo, rm]);

  const goTo = (i) => {
    setOpen(i);
    if (rm || !geo) return;
    const el = wrap.current, tot = el.offsetHeight - window.innerHeight, top = el.getBoundingClientRect().top + window.scrollY;
    // invert the mixed easing approximately by search
    const want = geo.marks[i].f; let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; (ease(m) * 0.4 + m * 0.6 < want ? (lo = m) : (hi = m)); }
    window.scrollTo({ top: top + lo * tot + 4, behavior: "smooth" });
  };

  const shown = open != null ? open : active;
  const ph = shown >= 0 ? phases[shown] : null;
  const city = useMemo(() => { const b = []; for (let x = 660; x < 990; x += 34) for (let y = 300; y < 610; y += 34) { const h = ((x * 7 + y * 13) % 5); if (!((x > 690 && x < 740 && y > 440) || (y > 430 && y < 470 && x > 720) || (x > 830 && x < 870 && y > 310) || (y > 300 && y < 350 && x > 850))) b.push([x, y, h]); } return b; }, []);

  return (
    <section ref={wrap} className={"rcWrap" + (rm ? " rcStatic" : "")} aria-label="Roadmap circuit map (illustration). The full roadmap list follows below.">
      <div className="rcSticky">
        <div className="rcSide">
        <aside className="rcTower" aria-label="Phases">
          <div className="rcTowerHead"><span className="rcBrand">REDLINE</span><span>ROADMAP</span></div>
          <ol>
            {phases.map((p, i) => (
              <li key={p.id}>
                <button type="button" className={"rcRow" + (i === shown ? " on" : "") + (i <= active ? " past" : "")} onClick={() => goTo(i)} aria-label={`Phase ${i + 1}: ${p.title}, ${STATUS[p.status]}`}>
                  <span className="rcBar" style={{ background: SECTOR[i] }} /><span className="rcPos">T{i + 1}</span><span className="rcName">{p.title}</span><span className="rcStat">{STATUS[p.status]}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="rcFoot">Development order · no dates</div>
        </aside>
        <div className={"rcCard" + (ph ? " show" : "")} aria-live="polite">
          {ph ? (
            <>
              <div className="rcCardTop"><span className="rcCardT" style={{ color: SECTOR[shown] }}>T{shown + 1}</span><span className="rcCardPhase">Phase {shown + 1}</span><span className="rcPill">{STATUS[ph.status]}</span>{open != null && <button type="button" className="rcX" onClick={() => setOpen(null)} aria-label="Close">×</button>}</div>
              <h3>{ph.title}</h3>
              <ul>{ph.items.map((it) => <li key={it}>{it}</li>)}</ul>
              {ph.note && <p className="rcNote">{ph.note}</p>}
            </>
          ) : (
            <><div className="rcCardTop"><span className="rcCardPhase">Lights out</span></div><h3>Eight phases, one lap</h3><p className="rcNote">{rm ? "Select a turn to see its features." : "Scroll to drive the circuit. Select a turn to see its features."}</p></>
          )}
        </div>
        </div>
        <div className="rcMapBox">
          <svg className="rcMap" viewBox="-40 -10 1060 660" role="img" aria-label="Top-down circuit map with eight roadmap phases as numbered turns">
            <defs>
              <pattern id="rcGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="1" /></pattern>
              <radialGradient id="rcFog" cx="0.95" cy="0.12" r="0.38"><stop offset="0" stopColor="#c9d6e6" stopOpacity=".55" /><stop offset="1" stopColor="#c9d6e6" stopOpacity="0" /></radialGradient>
              <linearGradient id="rcFut" x1="910" y1="330" x2="990" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#dfe7f2" /><stop offset="1" stopColor="#dfe7f2" stopOpacity="0" /></linearGradient>
              <filter id="rcGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <filter id="rcNeon" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>
            <rect x="-40" y="-10" width="1060" height="660" fill="url(#rcGrid)" />
            <linearGradient id="rcStRun" x1="470" y1="0" x2="720" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#ff3b30" /><stop offset="1" stopColor="#ff4fb0" /></linearGradient>
            {/* street night block */}
            <g className="rcCity">
              <rect x="650" y="290" width="350" height="350" rx="18" fill="#0a0716" />
              {city.map(([x, y, h], k) => <rect key={k} x={x + 3} y={y + 3} width="26" height="26" rx="3" fill={h === 0 ? "#1a1030" : "#120c22"} stroke={h === 1 ? "rgba(255,45,154,.35)" : h === 3 ? "rgba(33,230,255,.3)" : "none"} />)}
            </g>
            <rect x="760" y="0" width="240" height="330" fill="url(#rcFog)" />
            {/* base track */}
            <path d={PRO} className="rcEdge" />
            {geo && geo.marks.slice(0, 6).map((m, i) => <path key={i} d={PRO} className="rcKerb" style={{ strokeDasharray: `0 ${m.s - 26} 52 ${geo.L}` }} />)}
            <path d={PRO} className="rcAsphalt" />
            <path d={STREET} className="rcNeonBase" filter="url(#rcNeon)" />
            <path d={STREET} className="rcAsphalt rcStreetAsphalt" />
            <path d={FUTURE} className="rcFutBase" />
            <path d="M700 548 L700 572" className="rcPitMark" />
            <path d="M190 545 L190 575" className="rcFinish" />
            <text x="190" y="598" className="rcSmall" textAnchor="middle">START / FINISH</text>
            <path d="M300 584 L470 584 Q520 584 540 572" className="rcPit" /><text x="300" y="604" className="rcSmall">PIT LANE</text>
            <text x="672" y="320" className="rcZone rcZoneSt">STREET · NIGHT</text>
            <text x="860" y="30" className="rcZone rcZoneFu">FUTURE</text>
            {/* progress */}
            <path ref={proRef} d={PRO} className="rcRun" filter="url(#rcGlow)" pathLength={undefined} style={{ strokeDasharray: geo ? geo.lens[0] : 9999, strokeDashoffset: geo ? geo.lens[0] : 9999 }} />
            <path ref={stRef} d={STREET} className="rcRun rcRunSt" filter="url(#rcGlow)" style={{ strokeDasharray: geo ? geo.lens[1] : 9999, strokeDashoffset: geo ? geo.lens[1] : 9999 }} />
            <path ref={fuRef} d={FUTURE} className="rcRunFu" style={{ strokeDasharray: geo ? geo.lens[2] : 9999, strokeDashoffset: geo ? geo.lens[2] : 9999 }} />
            <path ref={route} d={PRO + " " + STREET + " " + FUTURE} fill="none" stroke="none" />
            {/* turn markers */}
            {geo && geo.marks.map((m, i) => (
              <g key={i} className={"rcTurn" + (i <= active ? " past" : "") + (i === shown ? " on" : "")} transform={`translate(${m.x} ${m.y})`} onClick={() => goTo(i)} onMouseEnter={() => setOpen(i)} role="button" tabIndex={0} aria-label={`Turn ${i + 1}: ${phases[i].title}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(i); } }}>
                <circle r="22" className="rcHit" />
                <circle r="13" className="rcDot" style={{ "--c": SECTOR[i] }} />
                <text className="rcNum" dy="4.5" textAnchor="middle">{i + 1}</text>
                <text className="rcTLabel" x={LABEL_OFF[i][0]} y={LABEL_OFF[i][1]} textAnchor={LABEL_OFF[i][0] < 0 ? "end" : "start"}>T{i + 1} · {phases[i].title}</text>
              </g>
            ))}
            <g ref={carRef} className="rcCar">
              <circle r="16" className="rcCarGlow" />
              <image href="/roadmap/redline_car_top.webp" x="-7" y="-18" width="14" height="36" />
            </g>
          </svg>
          <div className="rcTag">Illustrated circuit map · not gameplay</div>
        </div>
        </div>
    </section>
  );
}
