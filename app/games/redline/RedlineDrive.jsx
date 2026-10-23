"use client";

// Website mini test drive for the Redline garage. Arcade physics, solo time trial, lazy-loaded.
import { useEffect, useRef, useState } from "react";

// Track centreline (metres), closed Catmull-Rom loop.
const TRACK = [[0, -40], [0, 90], [18, 138], [60, 162], [108, 152], [128, 115], [112, 72], [124, 38], [165, 25], [198, -8], [192, -68], [145, -96], [85, -92], [38, -108], [6, -84]].map(([x, z]) => [x * 1.3, z * 1.3]);
// Track 2: tight street circuit around the dock blocks (PolygonStreetRacer buildings and props).
// Corner polygon with filleted (rounded) corners, sampled every ~6 m, so tight 90-degree street corners never fold the road ribbon.
function roundPoly(poly, r) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const [px, pz] = poly[(i - 1 + n) % n], [cx, cz] = poly[i], [nx, nz] = poly[(i + 1) % n];
    const a1 = Math.atan2(pz - cz, px - cx), a2 = Math.atan2(nz - cz, nx - cx); let half = (a2 - a1) / 2; half = Math.atan2(Math.sin(half), Math.cos(half));
    const t = Math.abs(r / Math.tan(half)), l1 = Math.hypot(px - cx, pz - cz), l2 = Math.hypot(nx - cx, nz - cz);
    if (Math.abs(Math.abs(half) - Math.PI / 2) < 0.01) { out.push([cx, cz]); continue; } // straight-through point
    const s = [cx + ((px - cx) / l1) * t, cz + ((pz - cz) / l1) * t], e = [cx + ((nx - cx) / l2) * t, cz + ((nz - cz) / l2) * t];
    for (let k = 0; k <= 4; k++) { const u = k / 4, q = [(1 - u) * (1 - u), 2 * u * (1 - u), u * u]; out.push([q[0] * s[0] + q[1] * cx + q[2] * e[0], q[0] * s[1] + q[1] * cz + q[2] * e[1]]); }
  }
  const d = []; out.forEach((p, i) => { const q = out[(i + 1) % out.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), m = Math.max(1, Math.round(L / 10)); for (let k = 0; k < m; k++) d.push([p[0] + ((q[0] - p[0]) * k) / m, p[1] + ((q[1] - p[1]) * k) / m]); });
  return d;
}
const CITY = roundPoly([[0, 0], [0, 110], [100, 110], [100, 50], [190, 50], [190, -110], [110, -110], [110, -40], [50, -40], [50, -90], [0, -90]], 17);
export const TRACKS = {
  gp: { id: "gp", name: "Grand Prix", desc: "Fast countryside circuit", pts: TRACK, road: 7.5, kerb: 8.8, wall: 13.5, key: "klyra.redline.testdrive.best" },
  city: { id: "city", name: "Dock City", desc: "Tight street circuit at dusk", pts: CITY, road: 6.2, kerb: 6.9, wall: 7.6, key: "klyra.redline.testdrive.best.city" },
};
const fmt = (ms) => (ms == null || !isFinite(ms) ? "--:--.---" : `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`);
const fmtS = (ms) => (ms == null || !isFinite(ms) ? "-:--.-" : `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`);

// Engine/skid/impact audio from Realistic Car Controller Pro (Assets/Realistic Car Controller Pro/Audio), as small AAC loops.
function makeAudio(set) {
  const A = "/cars/track/audio/";
  const bands = [["idle", 0, 0.05, 0.18], ["low", 0.08, 0.3, 0.5], ["med", 0.38, 0.6, 0.8], ["high", 0.68, 0.92, 1.2]];
  let voices = [], ctx = null, master = null, eng = [], skid = null, grass = null, wind = null, buf = {}, muted = false, rpm = 0, gear = 1, lastImpact = 0, ready = false;
  const load = async (n) => { const r = await fetch(A + n + ".m4a"); if (!r.ok) throw new Error("audio " + r.status); const ab = await r.arrayBuffer();
    return new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }); };
  const loop = (b) => { const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(master); src.start(); return { src, g }; };
  const once = (b, vol) => { if (!b || muted) return; const src = ctx.createBufferSource(); src.buffer = b; const g = ctx.createGain(); g.gain.value = vol; src.connect(g); g.connect(master); src.start(); };
  return {
    async start() {
      if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
      try {
        const names = [...bands.map(([b]) => `${set}-${b}`), "skid-asphalt", "skid-grass", "impact3", "exhaust-fire1", "wind"];
        const bs = await Promise.all(names.map(load)); if (!ctx) return; names.forEach((n, i) => { buf[n] = bs[i]; });
        eng = bands.map(([b]) => loop(buf[`${set}-${b}`])); skid = loop(buf["skid-asphalt"]); grass = loop(buf["skid-grass"]); wind = loop(buf.wind);
        voices = [loop(buf[`${set}-med`]), loop(buf[`${set}-low`])]; ready = true; // max 2 AI voices
      } catch { ready = false; }
    },
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05); },
    update(st, inp, dt, others = []) {
      if (!ready || !ctx) return;
      if (ctx.state === "suspended") { if (!document.hidden) ctx.resume(); return; }
      const t = ctx.currentTime, sp = Math.hypot(st.vx, st.vz);
      // simple 6-speed box: rpm climbs within each gear and drops on upshift
      const tops = [0, 9, 16, 23, 30, 38, 52]; let g = 1; while (g < 6 && sp > tops[g]) g++;
      if (g > gear && st.running) once(buf["exhaust-fire1"], 0.3); gear = g;
      const lo = tops[g - 1], hi = tops[g]; let target = Math.min(1, Math.max(0, (sp - lo) / (hi - lo))) * 0.75 + 0.2;
      if (sp < 1.5) target = inp.up ? 0.35 : 0.03; target = Math.min(1, target + (inp.up ? 0.06 : -0.04));
      rpm += (target - rpm) * Math.min(1, dt * 7);
      const ld = inp.up ? 1 : 0.55;
      bands.forEach(([, a, c, b], i) => { let w = rpm <= a || rpm >= b ? 0 : rpm < c ? (rpm - a) / (c - a) : 1 - (rpm - c) / (b - c); if (i === 0 && rpm < c) w = 1; const e = eng[i];
        e.g.gain.setTargetAtTime(w * ld * 0.9, t, 0.04); e.src.playbackRate.setTargetAtTime(0.75 + ((rpm - a) / (b - a)) * 0.6, t, 0.04); });
      const slip = st.slip || 0, sk = sp > 4 ? Math.min(1, Math.max(0, (slip - 3.5) / 6)) : 0;
      skid.g.gain.setTargetAtTime(st.off ? 0 : sk * 0.7, t, 0.05); grass.g.gain.setTargetAtTime(st.off && sp > 3 ? Math.min(0.6, sp / 40) : 0, t, 0.08);
      const wv = Math.min(1, sp / 46); wind.g.gain.setTargetAtTime(wv * wv * 0.42, t, 0.15); wind.src.playbackRate.setTargetAtTime(0.85 + wv * 0.35, t, 0.2);
      const near = others.map((o, i) => ({ ...o, i })).sort((a, b) => a.d - b.d).slice(0, voices.length);
      voices.forEach((vc, k) => { const o = near[k]; const gn = o ? Math.min(0.32, 0.32 / (1 + Math.max(0, o.d - 4) / 7)) * (o.d < 70 ? 1 : 0) : 0;
        vc.g.gain.setTargetAtTime(gn, t, 0.08); if (o) vc.src.playbackRate.setTargetAtTime(0.7 + Math.min(0.7, o.v / 60), t, 0.1); });
      if (st.impact > 3 && t - lastImpact > 0.35) { once(buf.impact3, Math.min(1, st.impact / 14)); lastImpact = t; } st.impact = 0;
    },
    state() { return { ctx: ctx && ctx.state, ready, rpm: Math.round(rpm * 100) / 100 }; },
    close() { try { if (ctx) ctx.close(); } catch {} ctx = null; ready = false; },
  };
}

export default function RedlineDrive({ car, cars, build, paint, onExit }) {
  const host = useRef(null);
  const input = useRef({ up: 0, down: 0, left: 0, right: 0, hb: 0 });
  const [phase, setPhase] = useState("loading");
  const [count, setCount] = useState(3);
  const [hud, setHud] = useState({ lap: 0, cur: null, last: null, best: null, kmh: 0, off: false });
  const [err, setErr] = useState("");
  const [touch, setTouch] = useState(false);
  const resetRef = useRef(() => {});
  const ctlRef = useRef({});
  const [mode, setMode] = useState(null); // "race" | "trial"
  const [track, setTrack] = useState(() => { try { return localStorage.getItem("klyra.redline.testdrive.track") === "city" ? "city" : "gp"; } catch { return "gp"; } });
  const pickTrack = (t) => { if (t === track) return; try { localStorage.setItem("klyra.redline.testdrive.track", t); } catch {} setPhase("loading"); setMode(null); setResults(null); setTrack(t); };
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState(null);
  const camModeRef = useRef({ current: "fp" });
  const [camMode, setCamMode] = useState("fp");
  const toggleCam = () => setCamMode((m) => { const n = m === "fp" ? "chase" : "fp"; camModeRef.current.current = n; camModeRef.current.apply?.(n); return n; });
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem("klyra.redline.testdrive.muted") === "1"; } catch { return false; } });
  const [armed, setArmed] = useState(false);
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = makeAudio(car.discipline === "pro" ? "fast" : "muscle");

  useEffect(() => { setTouch(window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);
    const mq = window.matchMedia("(max-width: 760px), (max-height: 520px)"); const f = () => setCompact(mq.matches); f(); mq.addEventListener?.("change", f); return () => mq.removeEventListener?.("change", f); }, []);

  useEffect(() => {
    let disposed = false, cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      if (disposed) return;
      const TR = TRACKS[track] || TRACKS.gp, CITYT = TR.id === "city", ROAD = TR.road, KERB = TR.kerb, WALL = TR.wall, BEST_KEY = TR.key;
      const el = host.current;
      const mobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
      const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; if (TRACKS[track]?.id === "city") renderer.toneMappingExposure = 1.3;
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      // Late-afternoon look: gradient sky dome, warm sun, cool sky fill, horizon-matched fog.
      const HORIZON = new THREE.Color(CITYT ? 0xd89a7a : 0xbfd6e3);
      scene.fog = CITYT ? new THREE.Fog(0x6a5a78, 70, 420) : new THREE.Fog(HORIZON, 180, 760);
      const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color(CITYT ? 0x1b2148 : 0x2f6fb0) }, mid: { value: HORIZON }, sunDir: { value: new THREE.Vector3(-0.55, CITYT ? 0.06 : 0.32, -0.77).normalize() } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }",
        fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 sunDir; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(mid, top, pow(h,0.55)); float s = max(dot(vP,sunDir),0.0); c += vec3(1.0,0.85,0.6)*(pow(s,10.0)*0.35 + pow(s,400.0)*1.4); if (vP.y < 0.0) c = mid; gl_FragColor = vec4(c,1.0); }" }));
      sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
      scene.add(CITYT ? new THREE.HemisphereLight(0x9aa6e8, 0x4a4048, 1.5) : new THREE.HemisphereLight(0xcfe6ff, 0x4a5a32, 1.15));
      const sun = new THREE.DirectionalLight(CITYT ? 0xffb27a : 0xfff1dc, CITYT ? 1.7 : 2.2); sun.position.set(-110, CITYT ? 30 : 64, -154); scene.add(sun); scene.add(sun.target);
      const useShadow = !mobile;
      if (useShadow) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -18; sc.right = sc.top = 18; sc.near = 1; sc.far = 300; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; }
      const canvasTex = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
      const noise = (g, w, h, base, amp, n) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
      const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 800);
      const audio = audioRef.current;
      const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 72 : 58; camera.updateProjectionMatrix(); };
      const ro = new ResizeObserver(resize); ro.observe(el); resize();

      // Centreline samples
      const curve = new THREE.CatmullRomCurve3(TR.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.5);
      const LEN = curve.getLength(), N = CITYT ? Math.round(LEN / 0.8) : 1600;
      const pts = curve.getSpacedPoints(N); pts.pop();
      const tan = pts.map((p, i) => pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]).normalize());
      const nor = tan.map((t) => new THREE.Vector3(t.z, 0, -t.x)); // left normal

      // Ground + road ribbons
      const grassTex = CITYT ? canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#4a4a50", 0.14, 9000); g.strokeStyle = "rgba(0,0,0,.25)"; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [220, 220]) : canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#5d8a3e", 0.22, 9000); for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${i % 2 ? "40,70,30" : "120,150,70"},.12)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 30 + Math.random() * 50, 0, 7); g.fill(); } }, [140, 140]);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ map: grassTex }));
      ground.receiveShadow = useShadow;
      ground.rotation.x = -Math.PI / 2; ground.position.set(CITYT ? 95 : 130, -0.02, CITYT ? 0 : 40); scene.add(ground);
      const asphalt = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, CITYT ? "#3e4147" : "#55595f", 0.16, 14000); });
      const gravel = canvasTex(128, 128, (g, w, h) => noise(g, w, h, "#9c9384", 0.35, 5000));
      function ribbon(a, b, y, color, stripe, map) {
        const pos = [], col = [], idx = [], uv = [], c1 = new THREE.Color(color), c2 = new THREE.Color(0xf2f2f2);
        for (let i = 0; i <= N; i++) {
          const k = i % N, p = pts[k], n = nor[k], c = stripe && Math.floor(i / 6) % 2 ? c2 : c1;
          for (const off of [a, b]) { pos.push(p.x + n.x * off, y, p.z + n.z * off); col.push(c.r, c.g, c.b); uv.push(off === a ? 0 : Math.max(1, Math.round((b - a) / 4)), (i / N) * LEN / 4); }
          if (i < N) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: map || null, side: THREE.DoubleSide })); m.receiveShadow = useShadow; scene.add(m); return m;
      }
      ribbon(-ROAD, ROAD, 0.01, 0xffffff, false, asphalt);
      ribbon(ROAD, KERB, 0.02, 0xd6262f, true); ribbon(-KERB, -ROAD, 0.02, 0xd6262f, true);
      ribbon(ROAD - 0.45, ROAD - 0.3, 0.015, 0xe8e8e8); ribbon(-ROAD + 0.3, -ROAD + 0.45, 0.015, 0xe8e8e8);
      if (CITYT) { const pave = canvasTex(128, 128, (g, w, h) => { noise(g, w, h, "#8d8a86", 0.18, 3000); g.strokeStyle = "rgba(0,0,0,.18)"; g.strokeRect(0, 0, w, h); });
        ribbon(KERB, WALL + 0.2, 0.012, 0x6d6f74, false, asphalt); ribbon(-WALL - 0.2, -KERB, 0.012, 0x6d6f74, false, asphalt);
        ribbon(WALL + 0.2, WALL + 5, 0.14, 0xffffff, false, pave); ribbon(-WALL - 5, -WALL - 0.2, 0.14, 0xffffff, false, pave);
        ribbon(-0.08, 0.08, 0.013, 0xe8c33a, false); }
      else { ribbon(KERB, WALL + 1, 0.005, 0xffffff, false, gravel); ribbon(-WALL - 1, -KERB, 0.005, 0xffffff, false, gravel); }
      // Distant low-poly hills ring so the horizon is never an empty void.
      if (!CITYT) { const hm = new THREE.MeshLambertMaterial({ color: 0x4d7048, flatShading: true }), hm2 = new THREE.MeshLambertMaterial({ color: 0x5f7a74, flatShading: true });
        for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + Math.random() * 0.1, r = 330 + Math.random() * 90, hgt = 22 + Math.random() * 38;
          const m = new THREE.Mesh(new THREE.ConeGeometry(60 + Math.random() * 50, hgt, 6 + (i % 3)), i % 3 ? hm : hm2); m.position.set(130 + Math.cos(a) * r, hgt / 2 - 4, 40 + Math.sin(a) * r); m.rotation.y = Math.random() * 3; scene.add(m); } }

      const draco = new DRACOLoader(); draco.setDecoderPath("/vendor/draco/");
      const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      const carUrl = car.custom && build ? `/cars/custom/${car.id}.glb` : car.model;
      const [kit, carG, cityK] = await Promise.all([loader.loadAsync("/cars/track/kit.glb"), loader.loadAsync(carUrl), CITYT ? loader.loadAsync("/cars/track/city.glb") : null]);
      if (disposed) return;
      const prop = {}; kit.scene.traverse((o) => { if (o.isMesh) prop[o.name] = o; });
      const cprop = {}; if (cityK) cityK.scene.traverse((o) => { if (o.isMesh) cprop[o.name] = o; });
      const dummy = new THREE.Object3D();
      function scatter(name, list) {
        const src = prop[name] || cprop[name]; if (!src || !list.length) return;
        const im = new THREE.InstancedMesh(src.geometry, src.material, list.length);
        list.forEach(([x, z, ry, s = 1, y = 0], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
        scene.add(im);
      }
      const at = (i, off) => { const k = ((i % N) + N) % N, p = pts[k], n = nor[k]; return [p.x + n.x * off, p.z + n.z * off, Math.atan2(tan[k].x, tan[k].z)]; };
      // Walls: concrete barriers on straights, tyre walls where the track bends.
      const curv = pts.map((_, i) => tan[(i + 8) % N].angleTo(tan[(i - 8 + N) % N]));
      const conc = [], tyres = [];
      if (!CITYT) for (const side of [1, -1]) {
        for (let d = 0; d < LEN; ) {
          const i = Math.round((d / LEN) * N), bend = curv[i % N] > 0.12;
          const [x, z, ry] = at(i, side * (WALL + 0.4));
          (bend ? tyres : conc).push([x, z, ry + Math.PI / 2]);
          d += bend ? 3.0 : 5.6;
        }
      }
      scatter("Prop_Barrier_Concrete_01_Striped_01", conc); scatter("Prop_Barrier_Tyres_01", tyres);
      // Start/finish: line, gantry, grid, lights, grandstand
      const S0 = 0;
      { const [x, z, ry] = at(S0, 0); const chk = canvasTex(128, 16, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; g.fillRect(i * 8, j * 8, 8, 8); } }); chk.magFilter = THREE.NearestFilter;
        const line = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 2, 1.6), new THREE.MeshLambertMaterial({ map: chk })); line.rotation.set(-Math.PI / 2, 0, ry); line.position.set(x, 0.03, z); line.receiveShadow = useShadow; scene.add(line);
        const g = prop.Prop_Gantry_01; if (g) { const m = g.clone(); m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar((WALL * 2 + 2) / 13.2); scene.add(m); } }
      const grid = []; for (let r = 1; r <= 3; r++) for (const s of [-3, 3]) { const [x, z, ry] = at(-r * 14 + (s > 0 ? 7 : 0), s); grid.push([x, z, ry]); } scatter("Env_RoadMarkings_StartingGrid_01", grid);
      if (!CITYT) { const [x, z, ry] = at(-60, -(WALL + 9)); const gs = prop.Bld_Grandstand_01; if (gs) { const m = gs.clone(); m.position.set(x, 0, z); m.rotation.y = ry - Math.PI / 2; scene.add(m); const [x2, z2] = at(-20, -(WALL + 9)); const m2 = m.clone(); m2.position.set(x2, 0, z2); scene.add(m2); } }
      if (!CITYT) { const [x, z, ry] = at(30, WALL + 3); const pw = prop.Prop_Pit_Wall_01; if (pw) for (let k = 0; k < 6; k++) { const [px, pz, pr] = at(30 + k * 3, WALL + 3); const m = pw.clone(); m.position.set(px, 0, pz); m.rotation.y = pr; scene.add(m); } }
      // Tyre stacks + cones on bend apexes, trees and lights around.
      const stacks = [], cones = [], trees = [], trees2 = [], thin = [], lights = [];
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      if (!CITYT) for (let i = 0; i < N; i += 40) { if (curv[i] > 0.2) { const side = tan[(i + 8) % N].clone().cross(tan[(i - 8 + N) % N]).y > 0 ? -1 : 1; const [x, z] = at(i, side * (WALL + 1.4)); stacks.push([x, z, rnd() * 6]); const [cx, cz] = at(i, side * (KERB + 0.8)); cones.push([cx, cz, 0]); } }
      if (!CITYT) for (let i = 0; i < N; i += 9) { const side = rnd() > 0.5 ? 1 : -1; const off = side * (WALL + 8 + rnd() * 55); const [x, z] = at(i, off); let ok = true; for (let j = 0; j < N; j += 8) if (Math.hypot(pts[j].x - x, pts[j].z - z) < WALL + 6) { ok = false; break; } if (ok) (rnd() < 0.4 ? trees : rnd() < 0.5 ? trees2 : thin).push([x, z, rnd() * 6, 0.8 + rnd() * 0.5]); }
      if (!CITYT) for (let i = 20; i < N; i += 110) { const [x, z, ry] = at(i, WALL + 2.2); lights.push([x, z, ry]); }
      if (CITYT) {
        // Barriers line both sides; street lights with warm glow pools; buildings, towers and signs behind the pavement.
        const bar = [], poles = [], glowP = [], hz = [], arrows = [], signs = [[], [], []], neon = [], pallets = [], barrels = [];
        for (const side of [1, -1]) for (let d = 0; d < LEN; d += 2.95) { const i = Math.round((d / LEN) * N) % N; const [x, z, ry] = at(i, side * (WALL + 0.45)); bar.push([x, z, ry + Math.PI / 2]); }
        const farOK = (x, z, r) => { for (let j = 0; j < N; j += 6) if (Math.hypot(pts[j].x - x, pts[j].z - z) < r) return false; return true; };
        for (let i = 0, k = 0; i < N; i += 34, k++) { const side = k % 2 ? 1 : -1; const [x, z, ry] = at(i, side * (WALL + 1.6)); if (!farOK(x, z, WALL + 1.2)) continue; poles.push([x, z, ry + (side > 0 ? Math.PI : 0), 1.7]);
          const [gx, gz] = at(i, side * (WALL - 2.6)); glowP.push([gx, gz]); }
        let seed2 = 11; const r2 = () => ((seed2 = (seed2 * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < N; i += 10) if (curv[i] > 0.3 && r2() < 0.5) { const side = tan[(i + 8) % N].clone().cross(tan[(i - 8 + N) % N]).y > 0 ? -1 : 1; const [x, z, ry] = at(i, -side * (WALL + 0.2)); arrows.push([x, z, ry + (side > 0 ? 0 : Math.PI), 2.2, 0.95]); const [hx, hzz] = at(i + 3, side * (KERB + 0.15)); if (r2() < 0.4) hz.push([hx, hzz, ry]); }
        const blds = ["Bld_Warehouse_01", "Bld_RepairShop_Large_01", "Bld_RepairShop_Medium_01", "Bld_SingleGarage_01", "Bld_Shelter_01"], bl = blds.map(() => []);
        const placed = [];
        for (const side of [1, -1]) for (let d = 0; d < LEN; d += 17) { const i = Math.round((d / LEN) * N) % N, b = Math.floor(r2() * blds.length), src = cprop[blds[b]]; if (!src) continue;
          src.geometry.computeBoundingBox(); const bb = src.geometry.boundingBox, sc = 1.55, depth = (bb.max.z - bb.min.z) * sc, wid = (bb.max.x - bb.min.x) * sc;
          const off = side * (WALL + 5.5 + depth / 2), [x, z, ry] = at(i, off), rad = Math.max(depth, wid) * 0.5;
          if (!farOK(x, z, WALL + 5 + rad * 0.85) || placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < p[2] + rad * 0.8)) continue;
          placed.push([x, z, rad]); bl[b].push([x, z, ry + (side > 0 ? -Math.PI / 2 : Math.PI / 2), sc]);
          const [sx, sz] = at(i, side * (WALL + 3.6)); if (r2() < 0.35) signs[Math.floor(r2() * 3)].push([sx, sz, ry + (side > 0 ? -Math.PI / 2 : Math.PI / 2), 1.3]); else if (r2() < 0.3) pallets.push([sx, sz, r2() * 6]); else if (r2() < 0.3) barrels.push([sx, sz, r2() * 6]);
          if (r2() < 0.25) { const [nx, nz] = at(i + 8, side * (WALL + 4.2)); neon.push([nx, nz, 0, 1.2]); } }
        scatter("Prop_Barrier_Concrete_02_Striped_01", bar); scatter("Prop_Pole_Large_Lights_02", poles); scatter("Prop_Barrier_HazzardSign_01", hz); scatter("Prop_Sign_Arrow_Corner_01", arrows);
        ["Prop_Sign_Company_Synco_01", "Prop_Sign_Company_Polycorp_01", "Prop_Sign_Company_Express_01"].forEach((n, k) => scatter(n, signs[k])); scatter("Prop_NeonLight_Large_03", neon); scatter("Prop_Pallet_Stack_01", pallets); scatter("Prop_Barrier_Barrel_02", barrels);
        blds.forEach((n, k) => scatter(n, bl[k]));
        // skyline: lit-window towers further out
        const win = canvasTex(64, 128, (g, w, h) => { g.fillStyle = "#23252e"; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) { const r = Math.random(); g.fillStyle = r < 0.32 ? "rgba(255,206,140,.95)" : r < 0.4 ? "rgba(160,220,255,.8)" : "#30333d"; g.fillRect(x, y, 6, 6); } }, [2, 5]);
        const tg = new THREE.BoxGeometry(1, 1, 1); tg.translate(0, 0.5, 0); const tm = new THREE.MeshLambertMaterial({ color: 0x9aa0b4, map: win, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.55 });
        const tw = []; for (let k = 0; k < 140; k++) { const a = r2() * Math.PI * 2, rr = 140 + r2() * 160, x = 95 + Math.cos(a) * rr, z = Math.sin(a) * rr * 1.1; if (!farOK(x, z, 40)) continue; tw.push([x, z, 14 + r2() * 12, 30 + r2() * 70, 14 + r2() * 12, r2()]); }
        const tI = new THREE.InstancedMesh(tg, tm, tw.length); tw.forEach(([x, z, w, h, d, r], k) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, r * 3, 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); tI.setMatrixAt(k, dummy.matrix); }); scene.add(tI);
        // warm light pools on the road + lamp glows (no real lights: cheap on phones)
        const pool = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, "rgba(255,190,120,.55)"); r.addColorStop(1, "rgba(255,190,120,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
        const pm = new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), pg = new THREE.PlaneGeometry(11, 11); pg.rotateX(-Math.PI / 2);
        const pI = new THREE.InstancedMesh(pg, pm, glowP.length); glowP.forEach(([x, z], k) => { dummy.position.set(x, 0.045, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pI.setMatrixAt(k, dummy.matrix); }); scene.add(pI);
        const gm = new THREE.SpriteMaterial({ map: pool, color: 0xffe2b8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); poles.forEach(([x, z, ry]) => { const sp = new THREE.Sprite(gm); sp.scale.setScalar(2.6); sp.position.set(x + Math.sin(ry) * 0, 7.1, z); scene.add(sp); });
      }
      scatter("Prop_Tyre_Stack_01", stacks); scatter("Prop_Cone_01", cones); scatter("Env_Tree_01", trees); scatter("Env_Tree_02", trees2); scatter("Env_Tree_Thin_01", thin); scatter("Prop_Light_01", lights);

      // The visitor's car: same parts, wheels and paint as the garage.
      const carObj = carG.scene; const nodes = {}; let paintMat = null;
      carObj.traverse((o) => { if (o.name) nodes[o.name] = o; if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.name === "paint") paintMat = m; }); } });
      if (car.custom && build) carObj.traverse((o) => {
        let m = /^V_(.+)_(\d\d)$/.exec(o.name); if (m) { o.visible = build[m[1]] === m[2]; return; }
        m = /^W_Wheel_(FL|FR|RL|RR)_(\d\d)$/.exec(o.name); if (m) { o.visible = build.Wheels === m[2]; return; }
        if (/^Wheel_(FL|FR|RL|RR)_Stock$/.test(o.name)) o.visible = !build.Wheels || build.Wheels === "stock";
      });
      if (paint && paintMat) new THREE.TextureLoader().loadAsync(`/cars/paint/${paint}.webp`).then((t) => { const o = paintMat.map; t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; if (o) { t.magFilter = o.magFilter; t.minFilter = o.minFilter; } paintMat.map = t; paintMat.needsUpdate = true; }).catch(() => {});
      const bx = new THREE.Box3().setFromObject(carObj), csz = bx.getSize(new THREE.Vector3());
      const carRoot = new THREE.Group(); carRoot.add(carObj); scene.add(carRoot);
      if (useShadow) carObj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const wheels = ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].map((k) => nodes[k]).filter(Boolean);
      const front = [nodes.Wheel_FL, nodes.Wheel_FR].filter(Boolean);
      wheels.forEach((w) => { w.rotation.order = "YXZ"; });
      const shTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 4, 32, 32, 32); r.addColorStop(0, "rgba(0,0,0,.55)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(csz.x * 1.5, csz.z * 1.25), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; carRoot.add(shadow);

      // Arcade physics
      const st = { x: 0, z: 0, h: 0, vx: 0, vz: 0, yaw: 0, steer: 0, si: 0, lap: 0, lapStart: 0, last: null, best: Number(localStorage.getItem(BEST_KEY)) || null, cp: 0, running: false, off: false, wheelSpin: 0, lapsDone: 0 };
      // Render state: physics runs at a fixed 120 Hz; visuals interpolate between the last two steps.
      const R = { x: 0, z: 0, h: 0, roll: 0, rollV: 0 };
      function place(i) { const [x, z, ry] = at(i, 0); st.x = x; st.z = z; st.h = ry; st.vx = st.vz = st.yaw = 0; st.si = ((i % N) + N) % N; st.px = x; st.pz = z; st.ph = ry; R.x = x; R.z = z; R.h = ry; }
      // Six-car grid behind the line (staggered); the player starts 4th.
      const GRID = [7, 14, 21, 28, 35, 42].map((b, i) => ({ i: -b, off: i % 2 ? -3 : 3 })), PSLOT = 3, LAPS = 3;
      const placeGrid = (slot) => { const g = GRID[slot]; place(g.i); const [x, z] = at(g.i, g.off); st.x = st.px = R.x = x; st.z = st.pz = R.z = z; };
      placeGrid(PSLOT);
      resetRef.current = () => { // R: back onto the track at the nearest point, facing forward
        place(st.si); };
      function nearest() { let best = st.si, bd = Infinity; for (let k = -40; k <= 40; k++) { const i = (st.si + k + N) % N, p = pts[i], d = (p.x - st.x) ** 2 + (p.z - st.z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
      const MAXV = 46, ACC = 17, BRK = 34, REV = 9;
      function step(dt, now) {
        st.px = st.x; st.pz = st.z; st.ph = st.h;
        const inp = input.current, go = st.running;
        const fx = Math.sin(st.h), fz = Math.cos(st.h);
        let vF = st.vx * fx + st.vz * fz, vL = st.vx * fz - st.vz * fx;
        const thr = go ? inp.up : 0, brk = go ? inp.down : 0;
        const vmax = st.off ? MAXV * 0.45 : MAXV;
        if (thr) vF += ACC * thr * (1 - Math.max(0, vF) / vmax) * dt * (vF < 0 ? 2 : 1);
        if (brk) { if (vF > 0.5) vF -= BRK * dt; else vF = Math.max(-REV, vF - REV * 1.2 * dt); }
        vF -= vF * (st.off ? 1.6 : 0.18) * dt; if (!thr && !brk) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.5 * dt);
        st.vx = fx * vF + fz * vL; st.vz = fz * vF - fx * vL; // world velocity before the heading turns (so turning creates real lateral slip)
        const steerIn = (go ? (inp.left - inp.right) : 0);
        st.steer += (steerIn - st.steer) * Math.min(1, dt * 8);
        const sp = Math.abs(vF), sf = Math.min(1, sp / 7);
        const yawTarget = st.steer * (1.9 - Math.min(1, sp / MAXV) * 0.9) * sf * Math.sign(vF || 1) * (inp.hb && go ? 1.45 : 1);
        st.yaw += (yawTarget - st.yaw) * Math.min(1, dt * 6);
        st.h += st.yaw * dt;
        const grip = inp.hb && go ? 1.4 : st.off ? 5 : 7.5;
        { const hx = Math.sin(st.h), hz = Math.cos(st.h); vF = st.vx * hx + st.vz * hz; vL = st.vx * hz - st.vz * hx; }
        st.slip = Math.abs(vL);
        vL *= Math.exp(-grip * dt); if (inp.hb && go) vF -= vF * 0.6 * dt;
        const nfx = Math.sin(st.h), nfz = Math.cos(st.h);
        // velocity keeps some momentum sideways (drift), the rest follows the new heading
        st.vx = nfx * vF + nfz * vL; st.vz = nfz * vF - nfx * vL;
        st.x += st.vx * dt; st.z += st.vz * dt;
        // track-relative position
        const prev = st.si; st.si = nearest();
        const p = pts[st.si], n = nor[st.si];
        let lat = (st.x - p.x) * n.x + (st.z - p.z) * n.z;
        st.off = Math.abs(lat) > KERB + 0.4; st.lat = lat;
        const lim = WALL - Math.max(csz.x, 1.6) * 0.5;
        if (Math.abs(lat) > lim) { // wall: push back, kill normal velocity, scrub speed
          const s = Math.sign(lat), push = Math.abs(lat) - lim; st.x -= n.x * s * push; st.z -= n.z * s * push;
          const vn = st.vx * n.x + st.vz * n.z; if (vn * s > 0) { st.impact = Math.max(st.impact || 0, Math.abs(vn)); st.vx -= n.x * vn * 1.35; st.vz -= n.z * vn * 1.35; }
          st.vx *= 1 - 1.5 * dt; st.vz *= 1 - 1.5 * dt;
        }
        // laps: checkpoints at 1/3, 2/3; crossing index 0 forward completes a lap
        if (go) {
          const f = st.si / N;
          if (st.cp === 0 && f > 0.3 && f < 0.4) st.cp = 1; else if (st.cp === 1 && f > 0.63 && f < 0.73) st.cp = 2;
          if (prev > N * 0.9 && st.si < N * 0.1) {
            if (st.cp === 2) { const t = now - st.lapStart; st.last = t; st.lapsDone++; if (mode0.current === "race" && st.lapsDone >= LAPS && !st.finished) { st.finished = true; st.finishT = now - raceStart; st.running = false; } if (!st.best || t < st.best) { st.best = t; try { localStorage.setItem(BEST_KEY, String(Math.round(t))); } catch {} } }
            if (st.cp === 2 || st.lap === 0) { st.lap++; st.lapStart = now; st.cp = 0; }
          }
        }
        st.wheelSpin += vF * dt / 0.36;
      }
      window.__rlDrive = st; st.track = TR.id; st.dbg = () => ({ carObj, scene, camera }); st.start = (m) => ctlRef.current.start(m); st.camera = camera; st.audio = () => audio.state(); st.N = N; window.__rlPts = pts.map((p) => [p.x, p.z]);

      // camera
      const camPos = new THREE.Vector3(), look = new THREE.Vector3(), cd = Math.max(6.5, csz.z * 1.55), ch = Math.max(2.6, csz.y * 1.7);
      // ---- AI rivals: other garage cars of the same class, stock GLBs (one shared download per model), random real paint.
      const ds = LEN / N;
      const vAllow = (() => { const v = curv.map((a) => { const r = (16 * ds) / Math.max(a, 1e-3); return Math.min(60, Math.sqrt(13.5 * r)); });
        for (let pass = 0; pass < 2; pass++) for (let k = 2 * N - 1; k >= 0; k--) { const i = k % N, j = (i + 1) % N; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * 16 * ds)); } return v; })();
      const turn = pts.map((_, i) => nor[i].dot(tan[(i + 24) % N])); // >0: track bends left ahead
      const AIN = mobile ? 3 : 5;
      const pool = (cars || []).filter((c) => c.discipline === car.discipline && c.id !== car.id && !/motorbike|dirtbike/.test(c.id) && c.model);
      const ai = [];
      if (pool.length) {
        const shuffled = pool.slice().sort(() => Math.random() - 0.5);
        const picks = Array.from({ length: AIN }, (_, k) => shuffled[k % shuffled.length]);
        const models = {}; await Promise.all([...new Set(picks.map((c) => c.model))].map(async (u) => { models[u] = await loader.loadAsync(u); }));
        const sch = await fetch("/cars/paint/schemes.json").then((r) => r.json()).catch(() => null);
        const list = sch ? (car.discipline === "pro" ? sch.pro : sch.street) : [];
        const texL = new THREE.TextureLoader(), texC = {};
        const slots = GRID.map((g, k) => k).filter((k) => k !== PSLOT);
        picks.forEach((c, k) => {
          if (disposed) return;
          const obj = models[c.model].scene.clone(true); const wh = [];
          obj.traverse((o) => { if (/^Wheel_(FL|FR|RL|RR)$/.test(o.name)) wh.push(o); if (o.isMesh && o.material && o.material.name === "paint") { o.material = o.material.clone(); o.userData.paint = true; } });
          if (list.length) { const sc = list[Math.floor(Math.random() * list.length)]; const tp = texC[sc.id] || (texC[sc.id] = texL.loadAsync(`/cars/paint/${sc.id}.webp`));
            tp.then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; obj.traverse((o) => { if (o.userData.paint) { const om = o.material.map; if (om) { t.magFilter = om.magFilter; t.minFilter = om.minFilter; } o.material.map = t; o.material.needsUpdate = true; } }); }).catch(() => {}); }
          const sh = new THREE.Mesh(shadow.geometry, shadow.material); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04; obj.add(sh);
          scene.add(obj);
          const skill = 0.86 + Math.random() * 0.1;
          ai.push({ obj, wh, name: c.name, skill, vmax: MAXV * (0.84 + Math.random() * 0.1), lane: (Math.random() - 0.5) * 2, s: 0, d: 0, v: 0, lap: 0, done: null, ps: 0, pd: 0, spin: 0, slot: slots[k] });
        });
      }
      const aiReset = () => ai.forEach((a) => { const g = GRID[a.slot]; a.s = a.ps = N + g.i; a.d = a.pd = g.off; a.v = 0; a.lap = 0; a.done = null; });
      st.ai = ai;
      aiReset();
      const sAt = (sf, d, out) => { const i0 = Math.floor(sf) % N, i1 = (i0 + 1) % N, f = sf - Math.floor(sf); const p0 = pts[i0], p1 = pts[i1], n0 = nor[i0];
        out.x = p0.x + (p1.x - p0.x) * f + n0.x * d; out.z = p0.z + (p1.z - p0.z) * f + n0.z * d; out.h = Math.atan2(tan[i0].x, tan[i0].z); return out; };
      const tmpP = { x: 0, z: 0, h: 0 };
      const progress = (lap, sf) => lap * N + sf;
      function aiStep(dt, now) {
        if (!raceOn) return;
        const ppos = { s: st.si, d: (st.x - pts[st.si].x) * nor[st.si].x + (st.z - pts[st.si].z) * nor[st.si].z, v: Math.hypot(st.vx, st.vz) };
        ai.forEach((a) => {
          a.ps = a.s; a.pd = a.d;
          if (!st.running && !st.finished) return;
          const i = Math.floor(a.s) % N;
          let target = Math.min(a.vmax, vAllow[(i + 6) % N] * a.skill);
          // racing line: drift to the inside of the coming bend, own lane bias on straights
          const tn = turn[(i + 10) % N];
          let dT = Math.max(-4.6, Math.min(4.6, Math.sign(tn) * Math.min(4.6, Math.abs(tn) * 18) + a.lane));
          // separation from other AI and the player
          const others = ai.filter((b) => b !== a).map((b) => ({ s: b.s % N, d: b.d, v: b.v })); others.push(ppos);
          for (const o of others) {
            let gap = (o.s - (a.s % N) + N) % N; if (gap > N / 2) gap -= N; const gm = gap * ds, dd = o.d - a.d;
            if (gm > 0 && gm < 14 && Math.abs(dd) < 3.2) { dT += (dd > 0 ? -1 : 1) * 3.4; if (gm < 7) target = Math.min(target, o.v * 0.97); }
            if (Math.abs(gm) < 5 && Math.abs(dd) < 2.4) a.d += (dd > 0 ? -1 : 1) * 2.5 * dt;
          }
          dT = Math.max(-(ROAD - 1.3), Math.min(ROAD - 1.3, dT));
          a.v += Math.max(-18 * dt, Math.min((target - a.v), 15 * dt * (1 - a.v / (a.vmax + 2))));
          a.d += Math.max(-3.2 * dt, Math.min(3.2 * dt, dT - a.d));
          a.s += (a.v * dt) / ds;
          if (a.s >= N) { a.s -= N; a.ps -= N; a.lap++; if (mode0.current === "race" && a.lap > LAPS && !a.done) a.done = now - raceStart; }
        });
        // soft contact with the player
        ai.forEach((a) => { sAt(a.s, a.d, tmpP); const dx = st.x - tmpP.x, dz = st.z - tmpP.z, dist = Math.hypot(dx, dz), R0 = 2.4;
          if (dist < R0 && dist > 1e-3) { const nx = dx / dist, nz = dz / dist, ov = R0 - dist; st.x += nx * ov * 0.6; st.z += nz * ov * 0.6; a.d -= (nx * nor[Math.floor(a.s) % N].x + nz * nor[Math.floor(a.s) % N].z) * ov * 0.4;
            const vn = st.vx * nx + st.vz * nz; if (vn < 0) { st.vx -= nx * vn * 0.8; st.vz -= nz * vn * 0.8; st.impact = Math.max(st.impact || 0, -vn); } a.v *= 0.985; } });
      }
      function aiRender(al, dt) {
        ai.forEach((a) => { a.obj.visible = raceOn; if (!raceOn) return; let ps = a.ps; if (a.s < ps) ps -= N; const sf = ps + (a.s - ps) * al, d = a.pd + (a.d - a.pd) * al;
          sAt((sf + N) % N, d, tmpP); a.obj.position.set(tmpP.x, 0, tmpP.z); a.obj.rotation.y = tmpP.h + (a.d - a.pd) * 0.0; a.spin += (a.v * dt) / 0.36; a.wh.forEach((w) => { w.rotation.x = a.spin; }); });
      }
      const mode0 = { current: null }; let raceOn = false, raceStart = 0;
      function standings(now) {
        const pl = { name: "You", you: true, prog: progress(st.lap, st.si), done: st.finishT ?? null };
        const all = [pl, ...ai.map((a) => ({ name: a.name, prog: progress(a.lap, a.s), done: a.done }))];
        all.sort((x, y) => (x.done != null && y.done != null ? x.done - y.done : x.done != null ? -1 : y.done != null ? 1 : y.prog - x.prog));
        return all;
      }
      // First-person (default): eye at the driver's seat inside the built car; chase cam is optional (C).
      const ctr = bx.getCenter(new THREE.Vector3());
      const open = /kart|openwheeler|vintage|motorbike|dirtbike/.test(car.id);
      // Driver eye per car: start at the seat (glass bounds when the car has a cabin), then raise it until the bonnet/dash
      // in front stays below ~9 deg of depression (road clearly visible). Per-car tweaks live in gamesData (car.fpv).
      const eye = (() => {
        const e = new THREE.Vector3(open ? 0 : csz.x * 0.15, bx.min.y + csz.y * (open ? 0.95 : 0.8), ctr.z + csz.z * (open ? -0.1 : 0.005));
        carObj.updateMatrixWorld(true);
        const isGlass = (m) => m && /^glass/i.test(m.name), gb = new THREE.Box3(), hb = new THREE.Box3(), vv = new THREE.Vector3();
        // cabin = bounds of the glass-material vertices; rider head = top 6% of an open vehicle
        carObj.traverse((o) => { if (!o.isMesh) return; const pa = o.geometry.attributes.position, ms = Array.isArray(o.material) ? o.material : [o.material], groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: o.geometry.index ? o.geometry.index.count : pa.count, materialIndex: 0 }];
          groups.forEach((g) => { if (!isGlass(ms[g.materialIndex || 0])) return; const ix = o.geometry.index; for (let k = g.start; k < g.start + g.count; k += 3) { vv.fromBufferAttribute(pa, ix ? ix.getX(k) : k).applyMatrix4(o.matrixWorld); gb.expandByPoint(vv); } });
          if (open) for (let k = 0; k < pa.count; k += 2) { vv.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld); if (vv.y > bx.max.y - csz.y * 0.06) hb.expandByPoint(vv); } });
        if (!open && !gb.isEmpty()) { e.y = gb.min.y + (gb.max.y - gb.min.y) * 0.45; e.z = (gb.min.z + gb.max.z) / 2 - (gb.max.z - gb.min.z) * 0.05; e.x = Math.min(e.x, (gb.max.x - gb.min.x) * 0.22); }
        if (open && !hb.isEmpty()) { e.x = (hb.min.x + hb.max.x) / 2; e.y = (hb.min.y + hb.max.y) / 2; e.z = hb.max.z + 0.06; }
        const y0 = e.y, TH = Math.tan((9 * Math.PI) / 180), v = new THREE.Vector3(); let need = e.y;
        const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
        carObj.updateMatrixWorld(true);
        carObj.traverse((o) => { if (!o.isMesh || !shown(o) || /glass/i.test(o.name) || (o.material && o.material.name === "glass")) return; const pa = o.geometry.attributes.position, step = Math.max(1, Math.floor(pa.count / 4000));
          for (let k = 0; k < pa.count; k += step) { v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld); const dz = v.z - e.z; if (dz < 0.25 || Math.abs(v.x - e.x) > 0.8 || v.y > y0 + 0.04) continue; need = Math.max(need, v.y + TH * dz); } });
        if (!open) e.y = Math.min(need, y0 + 0.15);
        const f = car.fpv || {}; e.x += f.dx || 0; e.y += f.dy || 0; e.z += f.dz || 0; e.pitch = f.pitch || 0; return e; })();
      if (typeof window !== "undefined") window.__rlEye = { x: +eye.x.toFixed(3), y: +eye.y.toFixed(3), z: +eye.z.toFixed(3), carH: +csz.y.toFixed(3), zmin: +bx.min.z.toFixed(2), zmax: +bx.max.z.toFixed(2) };
      const glass = []; carObj.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (/^glass/i.test(m.name) && !glass.includes(m)) glass.push(m); }); });
      // In driver view, clip the player's own car above eye level so the roof lining and pillars never cover the windscreen; the dash and bonnet stay.
      renderer.localClippingEnabled = true; const roofClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), eye.y + (open ? -0.05 : 0.04)); // open cockpits: also cut the rider's own helmet
      st.setEye = (x, y, z, pitch) => { eye.set(x, y, z); if (pitch != null) eye.pitch = pitch; roofClip.constant = eye.y + (open ? -0.05 : 0.04); cam(0, true); return window.__rlEye = { x, y, z }; };
      const carMats = []; carObj.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!carMats.includes(m)) { m.userData.side0 = m.side; carMats.push(m); } }); });
      const setFp = (on) => { carMats.forEach((m) => { m.clippingPlanes = on ? [roofClip] : null; m.needsUpdate = true; }); glass.forEach((m) => { m.transparent = true; m.opacity = on ? 0.1 : 0.6; m.needsUpdate = true; }); camera.near = on ? 0.03 : 0.3; camera.updateProjectionMatrix(); };
      let fpMode = camModeRef.current.current === "fp"; setFp(fpMode);
      camModeRef.current.apply = (m) => { fpMode = m === "fp"; setFp(fpMode); cam(0, true); };
      let bobT = 0, lean = 0, kick = 0, rumT = 0;
      // tiny rumble only over kerbs or off the asphalt; zero on the racing surface
      const rumble = (dt, spd) => { const a = Math.abs(st.lat || 0); const on = st.off ? 0.006 : a > ROAD - 0.05 && a < KERB + 0.4 ? 0.0035 : 0; rumT += dt; return on ? on * Math.min(1, spd / 18) * (Math.sin(rumT * 57) * 0.6 + Math.sin(rumT * 89) * 0.4) : 0; };
      const ew = new THREE.Vector3(), fw = new THREE.Vector3();
      function fpCam(dt) {
        const spd = Math.hypot(st.vx, st.vz);
        bobT += dt * 1.2; // slow ~0.2 Hz sway, not a per-step bounce
        const bob = Math.sin(bobT) * 0.0015 * Math.min(1, Math.max(0, (spd - 30) / 20));
        lean += (-st.yaw * Math.min(1, spd / 25) * 0.025 - lean) * Math.min(1, dt * 5);
        // speed FOV: gentle widening plus a small kick under hard acceleration
        const acc_ = (spd - (fpCam.lv ?? spd)) / Math.max(dt, 1e-3); fpCam.lv = spd; kick += (Math.max(0, Math.min(4, acc_ * 0.35)) * Math.min(1, spd / 15) - kick) * Math.min(1, dt * 2.5);
        const fov = camera.aspect < 1 ? 68 + Math.min(9, spd * 0.2) + kick * 0.6 : 66 + Math.min(13, spd * 0.28) + kick; // portrait: narrower vertical FOV so roof/dash do not fill the screen if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * (Math.abs(camera.fov - fov) > 5 ? 1 : Math.min(1, dt * 3)); camera.updateProjectionMatrix(); }
        const ch_ = Math.cos(R.h), sh_ = Math.sin(R.h);
        ew.set(R.x + eye.x * ch_ + eye.z * sh_, eye.y + bob + rumble(dt, spd), R.z - eye.x * sh_ + eye.z * ch_);
        camera.position.copy(ew);
        fw.set(sh_, 0, ch_); look.copy(ew).addScaledVector(fw, 20); look.y = ew.y - 20 * Math.tan(((camera.aspect < 1 ? 1.5 : 2) + eye.pitch) * Math.PI / 180);
        camera.up.set(ch_ * lean, 1, -sh_ * lean).normalize(); camera.lookAt(look);
        if (useShadow) { sun.position.set(R.x - 110, 64, R.z - 154); sun.target.position.set(R.x, 0, R.z); }
      }
      let camH = st.h;
      function cam(dt, snap) {
        if (fpMode) { fpCam(dt); return; }
        camera.up.set(0, 1, 0);
        const spd = Math.hypot(st.vx, st.vz); let dh = R.h - camH; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); camH += dh * (snap ? 1 : 1 - Math.exp(-dt * 4.5));
        const fov = (camera.aspect < 1 ? 72 : 58) + Math.min(10, spd * 0.22); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
        const fx = Math.sin(camH), fz = Math.cos(camH);
        const tx = R.x - fx * (cd + spd * 0.04), tz = R.z - fz * (cd + spd * 0.04);
        const k = snap ? 1 : 1 - Math.exp(-dt * 7);
        camera.position.set(camera.position.x + (tx - camera.position.x) * k, ch + rumble(dt, spd) * 0.7, camera.position.z + (tz - camera.position.z) * k);
        look.set(R.x + Math.sin(camH) * 5, 1.0, R.z + Math.cos(camH) * 5); camera.lookAt(look);
        if (useShadow) { sun.position.set(R.x - 110, 64, R.z - 154); sun.target.position.set(R.x, 0, R.z); }
      }
      function camOld(dt, snap) {
        const fx = Math.sin(st.h), fz = Math.cos(st.h);
        const tx = st.x - fx * cd, tz = st.z - fz * cd;
        const k = snap ? 1 : 1 - Math.exp(-dt * 5);
        camPos.set(camera.position.x + (tx - camera.position.x) * k, ch, camera.position.z + (tz - camera.position.z) * k);
        camera.position.copy(camPos); look.set(st.x + fx * 4, 0.9, st.z + fz * 4); camera.lookAt(look);
      }
      cam(0, true);

      // ---- Feel of speed: speed lines (camera-attached streaks), tyre smoke (pooled points), persistent skid marks (ring-buffer ribbon).
      scene.add(camera);
      const LN = mobile ? 18 : 56, lineM = new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const lineG = new THREE.BoxGeometry(1, 1, 1), lines = new THREE.InstancedMesh(lineG, lineM, LN); lines.frustumCulled = false; lines.renderOrder = 5; camera.add(lines);
      const ld = Array.from({ length: LN }, () => ({ a: Math.random() * 6.283, r: 0.75 + Math.random() * 0.5, z: -2 - Math.random() * 14 }));
      function speedLines(dt, spd) { const k = Math.max(0, Math.min(1, (spd - 24) / 22)); lineM.opacity = k * (mobile ? 0.1 : 0.14); lines.visible = k > 0.01; if (!lines.visible) return;
        const tf = Math.tan((camera.fov * Math.PI) / 360);
        ld.forEach((l, i) => { l.z += spd * dt * 0.9; if (l.z > -0.6) { l.z = -14 - Math.random() * 4; l.a = Math.random() * 6.283; l.r = 0.75 + Math.random() * 0.5; }
          const R0 = -l.z * tf * l.r, len = 0.6 + k * 2.6; dummy.position.set(Math.cos(l.a) * R0 * camera.aspect, Math.sin(l.a) * R0, l.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(0.012 * -l.z * 0.12, 0.012 * -l.z * 0.12, len); dummy.updateMatrix(); lines.setMatrixAt(i, dummy.matrix); });
        lines.instanceMatrix.needsUpdate = true; }
      const SM = mobile ? 40 : 110, sPos = new Float32Array(SM * 3), sSz = new Float32Array(SM), sAl = new Float32Array(SM), sp_ = Array.from({ length: SM }, () => ({ t: 9, life: 1, vx: 0, vy: 0, vz: 0 }));
      const smG = new THREE.BufferGeometry(); smG.setAttribute("position", new THREE.BufferAttribute(sPos, 3)); smG.setAttribute("aS", new THREE.BufferAttribute(sSz, 1)); smG.setAttribute("aA", new THREE.BufferAttribute(sAl, 1));
      const smM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { scale: { value: 400 }, col: { value: new THREE.Color(CITYT ? 0xb9b6c4 : 0xdcdcdc) } },
        vertexShader: "attribute float aS; attribute float aA; varying float vA; uniform float scale; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aS * scale / max(0.1,-mv.z); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 col; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c,c); if (d > 0.25) discard; gl_FragColor = vec4(col, vA * (1.0 - d * 4.0)); }" });
      const smoke = new THREE.Points(smG, smM); smoke.frustumCulled = false; scene.add(smoke); let sNext = 0, sAcc = 0;
      const SK = mobile ? 360 : 1000, kPos = new Float32Array(SK * 12), kIdx = []; for (let q = 0; q < SK; q++) { const b = q * 4; kIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      const skG = new THREE.BufferGeometry(); skG.setAttribute("position", new THREE.BufferAttribute(kPos, 3)); skG.setIndex(kIdx); skG.setDrawRange(0, 0);
      const skids = new THREE.Mesh(skG, new THREE.MeshBasicMaterial({ color: 0x101012, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); skids.frustumCulled = false; scene.add(skids);
      let kN = 0; const rw = [nodes.Wheel_RL, nodes.Wheel_RR].filter(Boolean), lastW = rw.map(() => null), wp = new THREE.Vector3();
      function fx(dt, spd) {
        const inp = input.current, burn = st.running && inp.up && (inp.hb || inp.down) && spd < 9, drift = st.running && !st.off && spd > 6 && (st.slip || 0) > (inp.hb ? 2.2 : 4.2);
        const on = burn || drift; carRoot.updateMatrixWorld(true);
        rw.forEach((w, k) => { w.getWorldPosition(wp); wp.y = 0.03; const L = lastW[k];
          if (on && L && Math.hypot(wp.x - L.x, wp.z - L.z) > 0.25) { const dx = wp.x - L.x, dz = wp.z - L.z, dl = Math.hypot(dx, dz), nx = (-dz / dl) * 0.13, nz = (dx / dl) * 0.13, b = (kN % SK) * 12;
            kPos.set([L.x + nx, 0.03, L.z + nz, L.x - nx, 0.03, L.z - nz, wp.x + nx, 0.03, wp.z + nz, wp.x - nx, 0.03, wp.z - nz], b); kN++; skG.attributes.position.needsUpdate = true; skG.setDrawRange(0, Math.min(kN, SK) * 6); lastW[k] = wp.clone(); }
          else if (!on) lastW[k] = null; else if (!L) lastW[k] = wp.clone();
          if (on) { sAcc += dt * (burn ? 34 : 16 + Math.min(20, st.slip)); while (sAcc > 1) { sAcc--; const p = sp_[sNext]; sNext = (sNext + 1) % SM; p.t = 0; p.life = 1.2 + Math.random() * 0.8; p.x = wp.x; p.y = 0.25; p.z = wp.z; p.vx = (Math.random() - 0.5) * 1.2 - st.vx * 0.08; p.vz = (Math.random() - 0.5) * 1.2 - st.vz * 0.08; p.vy = 0.5 + Math.random() * 0.6; } } });
        for (let i = 0; i < SM; i++) { const p = sp_[i]; p.t += dt; const u = p.t / p.life; if (u >= 1) { sAl[i] = 0; continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.97; p.vz *= 0.97;
          sPos[i * 3] = p.x; sPos[i * 3 + 1] = p.y; sPos[i * 3 + 2] = p.z; sSz[i] = 0.7 + u * 3.2; sAl[i] = 0.4 * (1 - u) * Math.min(1, u * 6); }
        smG.attributes.position.needsUpdate = smG.attributes.aS.needsUpdate = smG.attributes.aA.needsUpdate = true; smM.uniforms.scale.value = renderer.domElement.height * 0.5;
        speedLines(dt, spd); }
      st.fx = () => ({ skids: Math.min(kN, SK), smoke: sAl.filter((a) => a > 0).length, lines: +lineM.opacity.toFixed(3) });

      let raf = 0, last = performance.now(), acc = 0, hudT = 0, startAt = 0;
      setPhase("menu");
      let t0 = Infinity;
      ctlRef.current.start = (m) => { mode0.current = m; raceOn = m === "race" && ai.length > 0; st.running = false; st.finished = false; st.finishT = null; st.lap = 0; st.lapsDone = 0; st.cp = 0; st.last = null;
        placeGrid(raceOn ? PSLOT : PSLOT); aiReset(); t0 = performance.now(); acc = 0; setResults(null); setPhase("count"); setCount(3); cam(0, true); };
      ctlRef.current.aiCount = ai.length;
      function loop(now) {
        raf = 0; if (document.hidden) { last = now; return; }
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!st.running && !st.finished && mode0.current && now >= t0) { const left = 3 - Math.floor((now - t0) / 800); if (left <= 0) { st.running = true; st.lap = 0; startAt = raceStart = now; setPhase("run"); setCount(0); } else setCount(left); }
        acc += dt; while (acc >= 1 / 120) { if (mode0.current) { step(1 / 120, now); aiStep(1 / 120, now); } acc -= 1 / 120; }
        const al = acc * 120, px = st.px ?? st.x, pz = st.pz ?? st.z, ph = st.ph ?? st.h; let dhh = st.h - ph; dhh = Math.atan2(Math.sin(dhh), Math.cos(dhh));
        R.x = px + (st.x - px) * al; R.z = pz + (st.z - pz) * al; R.h = ph + dhh * al;
        // body roll: critically damped spring toward a small target (no oscillation)
        const rollT = -st.yaw * 0.02 * Math.min(1, Math.hypot(st.vx, st.vz) / 20), wn = 6;
        R.rollV += (wn * wn * (rollT - R.roll) - 2 * wn * R.rollV) * dt; R.roll += R.rollV * dt;
        carRoot.position.set(R.x, 0, R.z); carRoot.rotation.y = R.h; carObj.rotation.z = R.roll;
        aiRender(al, dt); fx(dt, Math.hypot(st.vx, st.vz));
        wheels.forEach((w) => { w.rotation.x = st.wheelSpin; }); front.forEach((w) => { w.rotation.y = st.steer * 0.45; });
        cam(dt); sky.position.copy(camera.position);
        audio.update(st, input.current, dt, raceOn ? ai.map((a) => { sAt(a.s, a.d, tmpP); return { d: Math.hypot(tmpP.x - st.x, tmpP.z - st.z), v: a.v }; }) : []);
        renderer.render(scene, camera);
        if (now - hudT > 100) { hudT = now;
          if (raceOn) { const sd = standings(now); const pos = sd.findIndex((x) => x.you) + 1; st.pos = pos; if (st.finished && (!st.resT || now - st.resT < 15000)) { st.resT = st.resT || now; setResults(sd.map((x) => ({ name: x.name, you: !!x.you, done: x.done, prog: x.prog }))); } }
          setHud({ pos: raceOn ? st.pos : 0, of: ai.length + 1, race: raceOn, lap: st.lap, cur: st.lap > 0 ? now - st.lapStart : null, last: st.last, best: st.best, kmh: Math.round(Math.hypot(st.vx, st.vz) * 3.6), off: st.off }); el.dataset.si = String(st.si); }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      const onVis = () => { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
      document.addEventListener("visibilitychange", onVis);
      cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); draco.dispose(); renderer.dispose(); renderer.domElement.remove(); delete window.__rlDrive; delete window.__rlPts; };
    })().catch((e) => { console.warn("rlDrive init", e && (e.stack || e)); if (!disposed) setErr("Could not start the test drive on this device."); });
    return () => { disposed = true; cleanup(); };
  }, [car, build, paint, track]);
  useEffect(() => { audioRef.current.setMuted(muted); try { localStorage.setItem("klyra.redline.testdrive.muted", muted ? "1" : "0"); } catch {} }, [muted]);
  useEffect(() => () => audioRef.current.close(), []);
  // Sound starts only after the first key press / tap inside the test drive (browser autoplay rules).
  useEffect(() => {
    const arm = () => { audioRef.current.start(); setArmed(true); };
    window.addEventListener("keydown", arm, { once: true }); window.addEventListener("pointerdown", arm, { once: true });
    return () => { window.removeEventListener("keydown", arm); window.removeEventListener("pointerdown", arm); };
  }, []);

  // keyboard
  useEffect(() => {
    const map = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "hb" };
    const kd = (e) => { if (e.code === "Escape") { onExit(); return; } if (e.code === "KeyR") { resetRef.current(); return; } if (e.code === "KeyC") { toggleCam(); return; } const k = map[e.code]; if (k) { input.current[k] = 1; e.preventDefault(); } };
    const ku = (e) => { const k = map[e.code]; if (k) input.current[k] = 0; };
    const blur = () => { Object.keys(input.current).forEach((k) => { input.current[k] = 0; }); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", blur); };
  }, [onExit]);
  useEffect(() => { document.documentElement.classList.add("rlDriving"); return () => document.documentElement.classList.remove("rlDriving"); }, []);

  const hold = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); input.current[k] = 1; e.currentTarget.classList.add("on"); },
    onPointerUp: (e) => { input.current[k] = 0; e.currentTarget.classList.remove("on"); },
    onPointerCancel: (e) => { input.current[k] = 0; e.currentTarget.classList.remove("on"); },
    onContextMenu: (e) => e.preventDefault(),
  });

  return (
    <div className="rlDrive" role="dialog" aria-label="Test drive">
      <div ref={host} className="rlDriveCanvas" />
      <div className={`rlDriveTop ${compact ? "cmp" : ""}`}>
        <p className="rlDriveTag" title="Website test drive: mini preview, not the actual game">{compact ? <b>Web preview · not the game</b> : <><b>Website test drive</b><span>Mini preview, not the actual game</span></>}</p>
        <div className="rlDriveTimes" aria-live="off">
          {hud.race ? <span className="pos"><small>Pos</small>P{hud.pos || "–"}<i>/{hud.of}</i></span> : null}
          <span><small>Lap</small>{hud.race ? `${Math.min(hud.lap || 0, 3) || "–"}/3` : hud.lap || "–"}</span>
          <span className="t"><small>Time</small>{(compact ? fmtS : fmt)(hud.cur)}</span>
          {compact ? null : <span className="t"><small>Last</small>{fmt(hud.last)}</span>}
          <span className="best t"><small>Best</small>{(compact ? fmtS : fmt)(hud.best)}</span>
        </div>
        {compact ? (
          <div className="rlDriveBtns cmp">
            <button type="button" className={`rlDriveIco ${muted || !armed ? "mute" : ""}`} onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute sound" : "Mute sound"}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>{muted ? <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/> : <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>}</svg></button>
            <button type="button" className="rlDriveIco" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Menu"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            {menuOpen ? (
              <div className="rlDriveDrop" role="menu" onClick={() => setMenuOpen(false)}>
                <button type="button" role="menuitem" onClick={toggleCam}>{camMode === "fp" ? "Chase cam" : "Driver view"}</button>
                {mode ? <button type="button" role="menuitem" onClick={() => ctlRef.current.start?.(mode)}>Restart</button> : null}
                <button type="button" role="menuitem" onClick={() => resetRef.current()}>Reset car</button>
                <button type="button" role="menuitem" className="exit" onClick={onExit}>Exit</button>
              </div>
            ) : null}
          </div>
        ) : (
        <div className="rlDriveBtns">
          <button type="button" className={`rlDriveBtn snd ${muted || !armed ? "mute" : ""}`} onClick={() => setMuted((m) => !m)} aria-pressed={!muted} aria-label={muted ? "Unmute sound" : "Mute sound"} title={!armed ? "Sound starts on your first key press or tap" : ""}>{muted ? "Sound off" : armed ? "Sound on" : "Sound"}</button>
          <button type="button" className="rlDriveBtn" onClick={toggleCam} aria-label={camMode === "fp" ? "Switch to chase camera" : "Switch to driver view"}>{camMode === "fp" ? "Chase cam" : "Driver view"}</button>
          {mode ? <button type="button" className="rlDriveBtn" onClick={() => ctlRef.current.start?.(mode)} aria-label="Restart">Restart</button> : null}
          <button type="button" className="rlDriveBtn" onClick={() => resetRef.current()} aria-label="Reset car to track">Reset</button>
          <button type="button" className="rlDriveBtn exit" onClick={onExit}>Exit</button>
        </div>
        )}
      </div>
      <div className={`rlDrvSpeed ${hud.off ? "off" : ""}`}><b>{hud.kmh}</b><small>km/h</small>{hud.off ? <em>Off track</em> : null}</div>
      {phase === "loading" && !err ? <div className="rlDriveMsg"><i />Loading track</div> : null}
      {err ? <div className="rlDriveMsg">{err}</div> : null}
      {phase === "menu" ? (
        <div className="rlDrvMenu" role="group" aria-label="Choose a mode">
          <p className="rlDrvMenuT">Test drive</p>
          <div className="rlDrvTracks" role="radiogroup" aria-label="Track">
            {Object.values(TRACKS).map((t) => <button key={t.id} type="button" role="radio" aria-checked={track === t.id} className={track === t.id ? "on" : ""} onClick={() => pickTrack(t.id)}><b>{t.name}</b><span>{t.desc}</span></button>)}
          </div>
          <button type="button" className="rlDrvMode main" onClick={() => { setMode("race"); ctlRef.current.start?.("race"); }}><b>Race</b><span>3 laps vs {ctlRef.current.aiCount || (touch ? 3 : 5)} AI rivals</span></button>
          <button type="button" className="rlDrvMode" onClick={() => { setMode("trial"); ctlRef.current.start?.("trial"); }}><b>Time trial</b><span>Solo, chase your best lap</span></button>
        </div>
      ) : null}
      {results ? (
        <div className="rlDrvRes" role="dialog" aria-label="Race results">
          <p className="rlDrvMenuT">Finish · P{results.findIndex((r) => r.you) + 1}</p>
          <ol>{results.map((r, k) => <li key={k} className={r.you ? "you" : ""}><span>{k + 1}</span><b>{r.name}</b><em>{r.done != null ? fmt(r.done) : "racing…"}</em></li>)}</ol>
          <div className="rlDrvResBtns">
            <button type="button" className="rlDrvMode main" onClick={() => ctlRef.current.start?.("race")}><b>Restart race</b></button>
            <button type="button" className="rlDrvMode" onClick={() => { setMode("trial"); ctlRef.current.start?.("trial"); }}><b>Time trial</b></button>
            <button type="button" className="rlDrvMode" onClick={onExit}><b>Exit</b></button>
          </div>
        </div>
      ) : null}
      {phase === "count" && count > 0 ? <div className="rlCount" key={count}>{count}</div> : null}
      {!touch ? <p className="rlDriveKeys">W A S D / arrows · Space handbrake · C camera · R reset · Esc exit</p> : (
        <div className="rlPads">
          <div className="rlPadL">
            <button type="button" aria-label="Steer left" {...hold("left")}>◀</button>
            <button type="button" aria-label="Steer right" {...hold("right")}>▶</button>
          </div>
          <div className="rlPadR">
            <button type="button" className="brake" aria-label="Brake / reverse" {...hold("down")}>Brake</button>
            <button type="button" className="gas" aria-label="Accelerate" {...hold("up")}>Gas</button>
          </div>
        </div>
      )}
    </div>
  );
}
