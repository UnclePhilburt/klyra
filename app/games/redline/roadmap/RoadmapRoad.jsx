"use client";
import { useEffect, useRef, useState } from "react";

// Scroll-driven 3D roadmap. Phase data comes from ../data/roadmap.js (single source of truth).
// Props are real models from the Redline asset packs (public/roadmap/*.glb). Not gameplay footage.
const STATUS_LABEL = { planned: "Planned", "in-development": "In development", testing: "Testing", completed: "Completed", released: "Released" };
const START = 0.04, END = 0.9;
const milestoneT = (i, n) => START + ((END - START) * i) / (n - 1);

function canUse3D() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const c = navigator.connection;
  if (c && c.saveData) return false;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  try { const cv = document.createElement("canvas"); return !!(cv.getContext("webgl2") || cv.getContext("webgl")); } catch { return false; }
}

export default function RoadmapRoad({ phases }) {
  const wrap = useRef(null), canvasRef = useRef(null), api = useRef({});
  const [ok, setOk] = useState(null);
  const [active, setActive] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(null);
  const [exp, setExp] = useState(false);

  useEffect(() => { setOk(canUse3D()); }, []);

  useEffect(() => {
    if (!ok) return;
    let disposed = false, raf = 0, cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      if (disposed) return;
      const canvas = canvasRef.current;
      const mobile = window.innerWidth < 760;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      const dayC = new THREE.Color("#28324a"), nightC = new THREE.Color("#07040f"), futureC = new THREE.Color("#9fb4c8");
      scene.background = dayC.clone();
      scene.fog = new THREE.Fog(dayC.clone(), 40, 160);
      const camera = new THREE.PerspectiveCamera(mobile ? 62 : 50, 1, 0.5, 400);
      const hemi = new THREE.HemisphereLight("#cfe0ff", "#2a2218", 1.6); scene.add(hemi);
      const sun = new THREE.DirectionalLight("#ffe2c0", 2.2); sun.position.set(30, 50, 20); scene.add(sun);

      // Winding track
      const n = phases.length;
      const pts = [];
      for (let i = 0; i <= 18; i++) { const z = -i * 42; pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 26 + Math.sin(i * 0.37) * 14, 0, z)); }
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const W = 11, SEG = 700;
      // Road ribbon (asphalt + painted lines, drawn in code)
      const pos = [], uv = [], idx = [];
      const len = curve.getLength();
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
        const r = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
        const a = p.clone().addScaledVector(r, -W / 2), b = p.clone().addScaledVector(r, W / 2);
        pos.push(a.x, 0.02, a.z, b.x, 0.02, b.z); const v = (t * len) / 12; uv.push(0, v, 1, v);
        if (s < SEG) { const k = s * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); rg.setIndex(idx); rg.computeVertexNormals();
      const tc = document.createElement("canvas"); tc.width = 128; tc.height = 256; const g = tc.getContext("2d");
      g.fillStyle = "#2b2d33"; g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
      g.fillStyle = "#e9e9e9"; g.fillRect(4, 0, 4, 256); g.fillRect(120, 0, 4, 256); g.fillRect(62, 0, 4, 128);
      const rtex = new THREE.CanvasTexture(tc); rtex.wrapT = THREE.RepeatWrapping; rtex.colorSpace = THREE.SRGBColorSpace; rtex.anisotropy = 4;
      scene.add(new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rtex, roughness: 0.92, side: THREE.DoubleSide })));
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 1100), new THREE.MeshStandardMaterial({ color: "#2f4a2c", roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -360); scene.add(ground);

      const frame = (t, side = 0, off = 0) => {
        const p = curve.getPointAt(Math.min(Math.max(t, 0), 1)), tg = curve.getTangentAt(Math.min(Math.max(t, 0), 1));
        const r = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
        return { p: p.addScaledVector(r, side * off), yaw: Math.atan2(tg.x, tg.z) };
      };
      const STREET0 = (milestoneT(5, n) + milestoneT(6, n)) / 2, FUTURE0 = (milestoneT(6, n) + milestoneT(7, n)) / 2;

      const dl = new DRACOLoader(); dl.setDecoderPath("/vendor/draco/");
      const loader = new GLTFLoader(); loader.setDRACOLoader(dl);
      const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
      const [pro, street, car] = await Promise.all([load("/roadmap/redline_road_pro.glb"), load("/roadmap/redline_road_street.glb"), load("/cars/redline_pro_touring.glb")]);
      if (disposed) return;
      const lib = {}; [pro, street].forEach((gl) => gl.scene.traverse((o) => { if (o.isMesh) lib[o.name] = o; }));
      const place = (name, t, side, off, rot = 0, sc = 1) => {
        const src = lib[name]; if (!src) return null;
        const m = src.clone(); const f = frame(t, side, off);
        m.position.copy(f.p); m.rotation.set(0, f.yaw + rot, 0); m.scale.setScalar(sc); scene.add(m); return m;
      };
      // Start line + grid + lights
      place("Env_RoadMarkings_StartingLine_01", 0.012, 0, 0, 0, W / 15.2).position.y = 0.04;
      for (let k = 0; k < 4; k++) [-1, 1].forEach((sd) => { const m = place("Env_RoadMarkings_StartingGrid_01", 0.004 - k * 0.0, sd, 2.6, 0); if (m) { m.position.copy(frame(0.002 + k * 0.0, sd, 2.6).p); m.position.y = 0.04; m.position.addScaledVector(new THREE.Vector3(Math.sin(frame(0,0,0).yaw),0,Math.cos(frame(0,0,0).yaw)), -5 - k * 4); } });
      place("Prop_Sign_Start_01", 0.012, -1, 7.5, 0, 1.8);
      place("Prop_Trafficlight_01", 0.014, 1, 6.8, Math.PI);
      place("Bld_Grandstand_01", 0.035, -1, 26, Math.PI / 2);

      // Roadside dressing
      const rnd = (s) => { const x = Math.sin(s * 127.1) * 43758.5; return x - Math.floor(x); };
      for (let t = 0.02; t < 0.99; t += 0.006) {
        const street = t > STREET0 && t < FUTURE0;
        [-1, 1].forEach((sd, j) => {
          if (street) {
            place("Prop_Barrier_Concrete_01_Striped_01", t, sd, W / 2 + 0.7, 0);
            if (Math.floor(t * 1000) % 3 === 0) place(j ? "Prop_NeonLight_Large_01" : "Prop_NeonLight_02", t, sd, W / 2 + 2.4);
          } else if (t < FUTURE0) {
            place("Prop_Barrier_Curb_Straight_01", t, sd, W / 2 + 0.35, Math.PI / 2);
            const r = rnd(t * 99 + j);
            if (r < 0.5) place(["Env_Tree_01", "Env_Tree_02", "Env_Tree_Thin_01", "Generic_Tree_01"][Math.floor(r * 8)], t, sd, W / 2 + 9 + r * 20, r * 6);
            else if (r < 0.58) place("Prop_Barrier_Tyres_01", t, sd, W / 2 + 3, 0);
            else if (r < 0.63) place("Prop_Tyre_Stack_01", t, sd, W / 2 + 3.5);
            else if (r < 0.7) place("Prop_Light_01", t, sd, W / 2 + 2.2);
          } else {
            if (rnd(t * 7 + j) < 0.35) place("Prop_Barrier_Cone_Futuristic_01", t, sd, W / 2 + 0.6);
            if (rnd(t * 13 + j) < 0.2) place("Prop_Barrier_Futuristic_01", t, sd, W / 2 + 1.6);
          }
        });
      }
      // Neon glow for the street stretch (cheap: emissive strips, few lights)
      const neonMat = [new THREE.MeshBasicMaterial({ color: "#ff2d6f" }), new THREE.MeshBasicMaterial({ color: "#21e6ff" })];
      for (let t = STREET0; t < FUTURE0; t += 0.004) [-1, 1].forEach((sd, j) => {
        const f = frame(t, sd, W / 2 + 0.75); const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 2.6), neonMat[j]);
        m.position.copy(f.p); m.position.y = 1.15; m.rotation.y = f.yaw; scene.add(m);
      });
      const neonLights = [];
      for (let k = 0; k < 3; k++) { const L = new THREE.PointLight(k % 2 ? "#21e6ff" : "#ff2d6f", 0, 40, 1.4); scene.add(L); neonLights.push(L); }

      // Milestone gantries with signboards drawn from roadmap data
      const boards = [];
      phases.forEach((ph, i) => {
        const t = milestoneT(i, n), streetG = i === 6;
        const gname = streetG ? "Prop_Gantry_Round_01" : "Prop_Gantry_01";
        const gm = place(gname, t, 0, 0, 0, W / (streetG ? 10.4 : 12.2));
        const c = document.createElement("canvas"); c.width = 1024; c.height = 300; const x = c.getContext("2d");
        x.fillStyle = streetG ? "#120820" : i === 7 ? "#0e1620" : "#0b0d12"; x.fillRect(0, 0, 1024, 300);
        x.fillStyle = streetG ? "#ff2d6f" : "#ff3b30"; x.fillRect(0, 0, 1024, 14); x.fillRect(0, 286, 1024, 14);
        x.fillStyle = "#9aa3b2"; x.font = "700 46px system-ui, sans-serif"; x.fillText(`PHASE ${i + 1}`, 40, 88);
        x.fillStyle = "#fff"; let fs = 76; x.font = `800 ${fs}px system-ui, sans-serif`;
        while (x.measureText(ph.title).width > 940 && fs > 40) { fs -= 4; x.font = `800 ${fs}px system-ui, sans-serif`; }
        x.fillText(ph.title, 40, 182);
        const label = (STATUS_LABEL[ph.status] || ph.status).toUpperCase(); x.font = "700 38px system-ui, sans-serif";
        const pw = x.measureText(label).width + 48; x.fillStyle = "#2a3550"; x.beginPath(); x.roundRect(40, 210, pw, 58, 29); x.fill();
        x.fillStyle = "#cfe0ff"; x.fillText(label, 64, 252);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const board = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true }));
        const f = frame(t, 0, 0); board.position.copy(f.p); board.position.y = streetG ? 5.6 : 5.0; board.rotation.y = f.yaw + Math.PI;
        board.position.addScaledVector(new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw)), -0.8);
        board.userData.phase = i; scene.add(board); boards.push(board);
        place("Prop_Sign_Checkpoint_01", t - 0.004, 1, W / 2 + 1.4, Math.PI, 1.2);
        for (let k = -2; k <= 2; k++) place("Prop_Cone_01", t + 0.006, 0, 0).position.copy(frame(t + 0.006, 1, k * 0.6 + (k < 0 ? -W / 2 + 1.4 : W / 2 - 1.4) * 0 + k * 2.4).p);
      });
      // Finish-ish: Phase 8 leads into fog; a finish sign stays at the edge of the future
      place("Prop_Sign_Finish_01", 0.97, 0, 0, 0, 2.2);

      // Car
      const carObj = car.scene; scene.add(carObj);
      const headL = new THREE.SpotLight("#fff4dd", 0, 60, 0.5, 0.5, 1.2); scene.add(headL); scene.add(headL.target);

      let target = 0, prog = 0, lastActive = -2;
      const measure = () => {
        const el = wrap.current; if (!el) return;
        const r = el.getBoundingClientRect(); const total = r.height - window.innerHeight;
        target = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      };
      const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
      window.addEventListener("scroll", measure, { passive: true }); window.addEventListener("resize", resize);
      resize(); measure(); prog = target;
      const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
      const onClick = (e) => {
        const r = canvas.getBoundingClientRect(); mv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(mv, camera); const hit = ray.intersectObjects(boards)[0];
        if (hit) { setOpen(hit.object.userData.phase); setExp(true); }
      };
      canvas.addEventListener("click", onClick);
      api.current.goTo = (i) => {
        const el = wrap.current; const total = el.offsetHeight - window.innerHeight;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + (milestoneT(i, n) - 0.012) / 0.985 * total, behavior: "smooth" });
      };
      const tmp = new THREE.Color(), camPos = new THREE.Vector3(), look = new THREE.Vector3();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        prog += (target - prog) * 0.08;
        const ct = 0.012 + prog * 0.985;
        const f = frame(ct, 0, 0); const fw = new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
        carObj.position.copy(f.p).addScaledVector(new THREE.Vector3(-fw.z, 0, fw.x), 1.8); carObj.rotation.y = f.yaw;
        carObj.traverse((o) => { if (/^Wheel_/.test(o.name)) o.rotation.x += (target - prog) * 6; });
        const back = frame(Math.max(0, ct - 9 / len), 0, 0);
        camPos.copy(back.p).add(new THREE.Vector3(0, 3.2, 0)).addScaledVector(new THREE.Vector3(-fw.z, 0, fw.x), 2.2);
        camera.position.lerp(camPos, 0.25);
        look.copy(frame(Math.min(1, ct + 14 / len), 0, 0).p).add(new THREE.Vector3(0, 1.4, 0));
        camera.lookAt(look);
        // Atmosphere: day -> night street -> future fog
        const night = THREE.MathUtils.smoothstep(ct, STREET0 - 0.03, STREET0 + 0.02) * (1 - THREE.MathUtils.smoothstep(ct, FUTURE0 - 0.01, FUTURE0 + 0.04));
        const fut = THREE.MathUtils.smoothstep(ct, FUTURE0 - 0.01, FUTURE0 + 0.06);
        tmp.copy(dayC).lerp(nightC, night).lerp(futureC, fut);
        scene.background.copy(tmp); scene.fog.color.copy(tmp);
        scene.fog.near = 40 - 32 * fut; scene.fog.far = 160 - 120 * fut - 40 * night;
        hemi.intensity = 1.6 - 1.25 * night; sun.intensity = 2.2 - 2.1 * night - 1.2 * fut;
        ground.material.color.set(night > 0.5 ? "#0c0c12" : "#2f4a2c").lerp(tmp.clone(), fut * 0.8);
        headL.intensity = 40 * night; headL.position.copy(carObj.position).add(new THREE.Vector3(0, 1, 0)); headL.target.position.copy(carObj.position).addScaledVector(fw, 20);
        neonLights.forEach((L, k) => { const lf = frame(ct + 0.01 + k * 0.012, k % 2 ? 1 : -1, W / 2 + 1); L.position.copy(lf.p).add(new THREE.Vector3(0, 2.5, 0)); L.intensity = 60 * night; });
        let a = -1; for (let i = 0; i < n; i++) if (ct >= milestoneT(i, n) - 0.025) a = i;
        if (a !== lastActive) { lastActive = a; setActive(a); }
        renderer.render(scene, camera);
      };
      setLoaded(true); tick();
      cleanup = () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", measure); window.removeEventListener("resize", resize); canvas.removeEventListener("click", onClick); renderer.dispose(); dl.dispose(); };
    })().catch((e) => { console.warn("Roadmap road unavailable, showing list.", e); setOk(false); });
    return () => { disposed = true; cleanup(); };
  }, [ok, phases]);

  if (!ok) return null;
  const shown = open != null ? open : active;
  const ph = shown >= 0 ? phases[shown] : null;
  return (
    <section className="rrWrap" ref={wrap} aria-label="Roadmap road (visual). The full roadmap list follows below.">
      <div className="rrSticky">
        <canvas ref={canvasRef} className="rrCanvas" aria-hidden="true" />
        {!loaded && <div className="rrLoading">Loading the road…</div>}
        <div className="rrHud">
          <div className="rrTag">3D scene built from Redline asset packs · not gameplay</div>
          <ol className="rrDots" aria-label="Jump to phase">
            {phases.map((p, i) => (
              <li key={p.id}><button type="button" className={i === shown ? "on" : i <= active ? "past" : ""} onClick={() => { setOpen(null); api.current.goTo && api.current.goTo(i); }} aria-label={`Phase ${i + 1}: ${p.title}`}>{i + 1}</button></li>
            ))}
          </ol>
          {ph ? (
            <div className={"rrCard" + (exp ? " exp" : "")} key={ph.id}>
              <div className="rrCardTop"><span className="rrNum">Phase {shown + 1}</span><span className="rrPill">{STATUS_LABEL[ph.status] || ph.status}</span><button type="button" className="rrMore" aria-expanded={exp} onClick={() => setExp(!exp)}>{exp ? "Hide" : `${ph.items.length} features`}</button>{open != null && <button type="button" className="rrX" onClick={() => setOpen(null)} aria-label="Close">×</button>}</div>
              <h3>{ph.title}</h3>
              <ul>{ph.items.map((it) => <li key={it}>{it}</li>)}</ul>
              {ph.note && <p className="rrNote">{ph.note}</p>}
            </div>
          ) : (
            <div className="rrCard rrIntro"><h3>Start line</h3><p>Scroll to drive the roadmap. Eight phases, in development order. No dates.</p></div>
          )}
          <div className="rrHint">{active < phases.length - 1 ? "Scroll to drive ↓" : "Full list below ↓"}</div>
        </div>
      </div>
    </section>
  );
}
