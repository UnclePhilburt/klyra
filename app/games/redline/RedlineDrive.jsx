"use client";

// Website mini test drive for the Redline garage. Arcade physics, solo time trial, lazy-loaded.
import { useEffect, useRef, useState } from "react";

// Track centreline (metres), closed Catmull-Rom loop.
const TRACK = [[0, -40], [0, 90], [18, 138], [60, 162], [108, 152], [128, 115], [112, 72], [124, 38], [165, 25], [198, -8], [192, -68], [145, -96], [85, -92], [38, -108], [6, -84]].map(([x, z]) => [x * 1.3, z * 1.3]);
const ROAD = 7.5, KERB = 8.8, WALL = 13.5, N = 1600;
const fmt = (ms) => (ms == null || !isFinite(ms) ? "--:--.---" : `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`);
const BEST_KEY = "klyra.redline.testdrive.best";

// Engine/skid/impact audio from Realistic Car Controller Pro (Assets/Realistic Car Controller Pro/Audio), as small AAC loops.
function makeAudio(set) {
  const A = "/cars/track/audio/";
  const bands = [["idle", 0, 0.05, 0.18], ["low", 0.08, 0.3, 0.5], ["med", 0.38, 0.6, 0.8], ["high", 0.68, 0.92, 1.2]];
  let voices = [], ctx = null, master = null, eng = [], skid = null, grass = null, buf = {}, muted = false, rpm = 0, gear = 1, lastImpact = 0, ready = false;
  const load = async (n) => { const r = await fetch(A + n + ".m4a"); if (!r.ok) throw new Error("audio " + r.status); const ab = await r.arrayBuffer();
    return new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }); };
  const loop = (b) => { const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(master); src.start(); return { src, g }; };
  const once = (b, vol) => { if (!b || muted) return; const src = ctx.createBufferSource(); src.buffer = b; const g = ctx.createGain(); g.gain.value = vol; src.connect(g); g.connect(master); src.start(); };
  return {
    async start() {
      if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
      try {
        const names = [...bands.map(([b]) => `${set}-${b}`), "skid-asphalt", "skid-grass", "impact3", "exhaust-fire1"];
        const bs = await Promise.all(names.map(load)); if (!ctx) return; names.forEach((n, i) => { buf[n] = bs[i]; });
        eng = bands.map(([b]) => loop(buf[`${set}-${b}`])); skid = loop(buf["skid-asphalt"]); grass = loop(buf["skid-grass"]);
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
      const slip = st.slip || 0, sk = sp > 4 ? Math.min(1, Math.max(0, (slip - 2.2) / 6)) : 0;
      skid.g.gain.setTargetAtTime(st.off ? 0 : sk * 0.7, t, 0.05); grass.g.gain.setTargetAtTime(st.off && sp > 3 ? Math.min(0.6, sp / 40) : 0, t, 0.08);
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
  const [results, setResults] = useState(null);
  const camModeRef = useRef({ current: "fp" });
  const [camMode, setCamMode] = useState("fp");
  const toggleCam = () => setCamMode((m) => { const n = m === "fp" ? "chase" : "fp"; camModeRef.current.current = n; camModeRef.current.apply?.(n); return n; });
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem("klyra.redline.testdrive.muted") === "1"; } catch { return false; } });
  const [armed, setArmed] = useState(false);
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = makeAudio(car.discipline === "pro" ? "fast" : "muscle");

  useEffect(() => { setTouch(window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window); }, []);

  useEffect(() => {
    let disposed = false, cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      if (disposed) return;
      const el = host.current;
      const mobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
      const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      // Late-afternoon look: gradient sky dome, warm sun, cool sky fill, horizon-matched fog.
      const HORIZON = new THREE.Color(0xbfd6e3);
      scene.fog = new THREE.Fog(HORIZON, 180, 760);
      const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color(0x2f6fb0) }, mid: { value: HORIZON }, sunDir: { value: new THREE.Vector3(-0.55, 0.32, -0.77).normalize() } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }",
        fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 sunDir; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(mid, top, pow(h,0.55)); float s = max(dot(vP,sunDir),0.0); c += vec3(1.0,0.85,0.6)*(pow(s,10.0)*0.35 + pow(s,400.0)*1.4); if (vP.y < 0.0) c = mid; gl_FragColor = vec4(c,1.0); }" }));
      sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
      scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x4a5a32, 1.15));
      const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(-110, 64, -154); scene.add(sun); scene.add(sun.target);
      const useShadow = !mobile;
      if (useShadow) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -18; sc.right = sc.top = 18; sc.near = 1; sc.far = 300; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; }
      const canvasTex = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
      const noise = (g, w, h, base, amp, n) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
      const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 800);
      const audio = audioRef.current;
      const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 72 : 58; camera.updateProjectionMatrix(); };
      const ro = new ResizeObserver(resize); ro.observe(el); resize();

      // Centreline samples
      const curve = new THREE.CatmullRomCurve3(TRACK.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.5);
      const pts = curve.getSpacedPoints(N); pts.pop();
      const tan = pts.map((p, i) => pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]).normalize());
      const nor = tan.map((t) => new THREE.Vector3(t.z, 0, -t.x)); // left normal
      const LEN = curve.getLength();

      // Ground + road ribbons
      const grassTex = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#5d8a3e", 0.22, 9000); for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${i % 2 ? "40,70,30" : "120,150,70"},.12)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 30 + Math.random() * 50, 0, 7); g.fill(); } }, [140, 140]);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ map: grassTex }));
      ground.receiveShadow = useShadow;
      ground.rotation.x = -Math.PI / 2; ground.position.set(130, -0.02, 40); scene.add(ground);
      const asphalt = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#55595f", 0.16, 14000); });
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
      ribbon(KERB, WALL + 1, 0.005, 0xffffff, false, gravel); ribbon(-WALL - 1, -KERB, 0.005, 0xffffff, false, gravel);
      // Distant low-poly hills ring so the horizon is never an empty void.
      { const hm = new THREE.MeshLambertMaterial({ color: 0x4d7048, flatShading: true }), hm2 = new THREE.MeshLambertMaterial({ color: 0x5f7a74, flatShading: true });
        for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + Math.random() * 0.1, r = 330 + Math.random() * 90, hgt = 22 + Math.random() * 38;
          const m = new THREE.Mesh(new THREE.ConeGeometry(60 + Math.random() * 50, hgt, 6 + (i % 3)), i % 3 ? hm : hm2); m.position.set(130 + Math.cos(a) * r, hgt / 2 - 4, 40 + Math.sin(a) * r); m.rotation.y = Math.random() * 3; scene.add(m); } }

      const draco = new DRACOLoader(); draco.setDecoderPath("/vendor/draco/");
      const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      const carUrl = car.custom && build ? `/cars/custom/${car.id}.glb` : car.model;
      const [kit, carG] = await Promise.all([loader.loadAsync("/cars/track/kit.glb"), loader.loadAsync(carUrl)]);
      if (disposed) return;
      const prop = {}; kit.scene.traverse((o) => { if (o.isMesh) prop[o.name] = o; });
      const dummy = new THREE.Object3D();
      function scatter(name, list) {
        const src = prop[name]; if (!src || !list.length) return;
        const im = new THREE.InstancedMesh(src.geometry, src.material, list.length);
        list.forEach(([x, z, ry, s = 1], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
        scene.add(im);
      }
      const at = (i, off) => { const k = ((i % N) + N) % N, p = pts[k], n = nor[k]; return [p.x + n.x * off, p.z + n.z * off, Math.atan2(tan[k].x, tan[k].z)]; };
      // Walls: concrete barriers on straights, tyre walls where the track bends.
      const curv = pts.map((_, i) => tan[(i + 8) % N].angleTo(tan[(i - 8 + N) % N]));
      const conc = [], tyres = [];
      for (const side of [1, -1]) {
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
      { const [x, z, ry] = at(-60, -(WALL + 9)); const gs = prop.Bld_Grandstand_01; if (gs) { const m = gs.clone(); m.position.set(x, 0, z); m.rotation.y = ry - Math.PI / 2; scene.add(m); const [x2, z2] = at(-20, -(WALL + 9)); const m2 = m.clone(); m2.position.set(x2, 0, z2); scene.add(m2); } }
      { const [x, z, ry] = at(30, WALL + 3); const pw = prop.Prop_Pit_Wall_01; if (pw) for (let k = 0; k < 6; k++) { const [px, pz, pr] = at(30 + k * 3, WALL + 3); const m = pw.clone(); m.position.set(px, 0, pz); m.rotation.y = pr; scene.add(m); } }
      // Tyre stacks + cones on bend apexes, trees and lights around.
      const stacks = [], cones = [], trees = [], trees2 = [], thin = [], lights = [];
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < N; i += 40) { if (curv[i] > 0.2) { const side = tan[(i + 8) % N].clone().cross(tan[(i - 8 + N) % N]).y > 0 ? -1 : 1; const [x, z] = at(i, side * (WALL + 1.4)); stacks.push([x, z, rnd() * 6]); const [cx, cz] = at(i, side * (KERB + 0.8)); cones.push([cx, cz, 0]); } }
      for (let i = 0; i < N; i += 9) { const side = rnd() > 0.5 ? 1 : -1; const off = side * (WALL + 8 + rnd() * 55); const [x, z] = at(i, off); let ok = true; for (let j = 0; j < N; j += 8) if (Math.hypot(pts[j].x - x, pts[j].z - z) < WALL + 6) { ok = false; break; } if (ok) (rnd() < 0.4 ? trees : rnd() < 0.5 ? trees2 : thin).push([x, z, rnd() * 6, 0.8 + rnd() * 0.5]); }
      for (let i = 20; i < N; i += 110) { const [x, z, ry] = at(i, WALL + 2.2); lights.push([x, z, ry]); }
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
        const steerIn = (go ? (inp.left - inp.right) : 0);
        st.steer += (steerIn - st.steer) * Math.min(1, dt * 8);
        const sp = Math.abs(vF), sf = Math.min(1, sp / 7);
        const yawTarget = st.steer * (1.9 - Math.min(1, sp / MAXV) * 0.9) * sf * Math.sign(vF || 1) * (inp.hb && go ? 1.45 : 1);
        st.yaw += (yawTarget - st.yaw) * Math.min(1, dt * 6);
        st.h += st.yaw * dt;
        const grip = inp.hb && go ? 1.4 : st.off ? 5 : 7.5;
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
        st.off = Math.abs(lat) > KERB + 0.4;
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
      window.__rlDrive = st; st.start = (m) => ctlRef.current.start(m); st.camera = camera; st.audio = () => audio.state(); st.N = N; window.__rlPts = pts.map((p) => [p.x, p.z]);

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
      const open = /kart|openwheeler|motorbike|dirtbike/.test(car.id);
      const eye = new THREE.Vector3(open ? 0 : csz.x * 0.15, bx.min.y + csz.y * (open ? 0.95 : 0.8), ctr.z + csz.z * (open ? -0.1 : 0.005));
      const glass = []; carObj.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.name === "glass" && !glass.includes(m)) glass.push(m); }); });
      const setFp = (on) => { glass.forEach((m) => { m.transparent = true; m.opacity = on ? 0.1 : 0.6; m.needsUpdate = true; }); camera.near = on ? 0.03 : 0.3; camera.updateProjectionMatrix(); };
      let fpMode = camModeRef.current.current === "fp"; setFp(fpMode);
      camModeRef.current.apply = (m) => { fpMode = m === "fp"; setFp(fpMode); cam(0, true); };
      let bobT = 0, lean = 0;
      const ew = new THREE.Vector3(), fw = new THREE.Vector3();
      function fpCam(dt) {
        const spd = Math.hypot(st.vx, st.vz);
        bobT += dt * 1.2; // slow ~0.2 Hz sway, not a per-step bounce
        const bob = Math.sin(bobT) * 0.0015 * Math.min(1, Math.max(0, (spd - 30) / 20));
        lean += (-st.yaw * Math.min(1, spd / 25) * 0.025 - lean) * Math.min(1, dt * 5);
        const fov = (camera.aspect < 1 ? 80 : 68) + Math.min(14, spd * 0.3); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
        const ch_ = Math.cos(R.h), sh_ = Math.sin(R.h);
        ew.set(R.x + eye.x * ch_ + eye.z * sh_, eye.y + bob, R.z - eye.x * sh_ + eye.z * ch_);
        camera.position.copy(ew);
        fw.set(sh_, 0, ch_); look.copy(ew).addScaledVector(fw, 20); look.y = ew.y - (camera.aspect < 1 ? 0.25 : 0.7);
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
        camera.position.set(camera.position.x + (tx - camera.position.x) * k, ch, camera.position.z + (tz - camera.position.z) * k);
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
        aiRender(al, dt);
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
  }, [car, build, paint]);
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
      <div className="rlDriveTop">
        <p className="rlDriveTag"><b>Website test drive</b><span>Mini preview, not the actual game</span></p>
        <div className="rlDriveTimes" aria-live="off">
          {hud.race ? <span className="pos"><small>Pos</small>P{hud.pos || "–"}<i>/{hud.of}</i></span> : null}
          <span><small>Lap</small>{hud.race ? `${Math.min(hud.lap || 0, 3) || "–"}/3` : hud.lap || "–"}</span>
          <span><small>Time</small>{fmt(hud.cur)}</span>
          <span><small>Last</small>{fmt(hud.last)}</span>
          <span className="best"><small>Best</small>{fmt(hud.best)}</span>
        </div>
        <div className="rlDriveBtns">
          <button type="button" className={`rlDriveBtn snd ${muted || !armed ? "mute" : ""}`} onClick={() => setMuted((m) => !m)} aria-pressed={!muted} aria-label={muted ? "Unmute sound" : "Mute sound"} title={!armed ? "Sound starts on your first key press or tap" : ""}>{muted ? "Sound off" : armed ? "Sound on" : "Sound"}</button>
          <button type="button" className="rlDriveBtn" onClick={toggleCam} aria-label={camMode === "fp" ? "Switch to chase camera" : "Switch to driver view"}>{camMode === "fp" ? "Chase cam" : "Driver view"}</button>
          {mode ? <button type="button" className="rlDriveBtn" onClick={() => ctlRef.current.start?.(mode)} aria-label="Restart">Restart</button> : null}
          <button type="button" className="rlDriveBtn" onClick={() => resetRef.current()} aria-label="Reset car to track">Reset</button>
          <button type="button" className="rlDriveBtn exit" onClick={onExit}>Exit</button>
        </div>
      </div>
      <div className={`rlDrvSpeed ${hud.off ? "off" : ""}`}><b>{hud.kmh}</b><small>km/h</small>{hud.off ? <em>Off track</em> : null}</div>
      {phase === "loading" && !err ? <div className="rlDriveMsg"><i />Loading track</div> : null}
      {err ? <div className="rlDriveMsg">{err}</div> : null}
      {phase === "menu" ? (
        <div className="rlDrvMenu" role="group" aria-label="Choose a mode">
          <p className="rlDrvMenuT">Test drive</p>
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
