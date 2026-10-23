"use client";

import { useEffect, useRef, useState } from "react";

const PAINTS = [["Factory", null], ["Redline", "#e3121f"], ["Volt", "#18c8ff"], ["Lime", "#9be22d"], ["Carbon", "#2a2d33"], ["Pearl", "#f2f2ee"]];
const RIMS = [["Factory", null], ["Gunmetal", "#4a4f57"], ["Gold", "#d6a83a"], ["Cyan", "#1ec8ff"]];
const VIEWS = { front: [0.6, 1.3, 5.6], side: [5.8, 1.2, 0], rear: [-0.6, 1.4, -5.6], interior: [0.32, 1.08, 0.05], engine: [0, 3.4, 3.6] };
const TARGETS = { front: [0, 0.6, 0], side: [0, 0.6, 0], rear: [0, 0.6, 0], interior: [0, 0.95, 2.4], engine: [0, 0.6, 1.4] };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function RedlineViewer({ cars }) {
  const host = useRef(null);
  const api = useRef(null);
  const [active, setActive] = useState(cars[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panels, setPanels] = useState({});
  const [open, setOpen] = useState({});
  const [xray, setXray] = useState(false);
  const [paint, setPaint] = useState(null);
  const [rim, setRim] = useState(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed) return;
      const el = host.current;
      const mobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
      camera.position.set(...VIEWS.front);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(...TARGETS.front);
      controls.minDistance = 0.3;
      controls.maxDistance = 12;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.6;
      controls.addEventListener("start", () => { controls.autoRotate = false; });
      const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 3); scene.add(key);
      const rimL = new THREE.DirectionalLight(0xff3344, 0.8); rimL.position.set(-5, 2, -4); scene.add(rimL);
      const shadowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); const r = g.createRadialGradient(64, 64, 8, 64, 64, 64); r.addColorStop(0, "rgba(0,0,0,.7)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = 0.002; scene.add(ground);

      const draco = new DRACOLoader(); draco.setDecoderPath("/vendor/draco/");
      const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      const cache = new Map();
      let car = null, nodes = {}, mats = {}, base = {}, tweens = [], wheelT = -1, nextWheel = 0;

      const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 58 : w / h < 1.4 ? 44 : 35; camera.updateProjectionMatrix(); };
      const ro = new ResizeObserver(resize); ro.observe(el); resize();

      function tween(obj, prop, axis, to, ms = 700) { const from = obj[prop][axis]; tweens = tweens.filter((t) => !(t.obj === obj && t.axis === axis && t.prop === prop)); tweens.push({ obj, prop, axis, from, to, start: performance.now(), ms }); }
      const HINGE = { Hood: ["x", -1.0], Trunk: ["x", 1.05], Door_L: ["y", -1.05], Door_R: ["y", 1.05] };

      async function show(id) {
        setLoading(true); setError("");
        try {
          let gltf = cache.get(id);
          if (!gltf) { gltf = await loader.loadAsync(cars.find((c) => c.id === id).model); cache.set(id, gltf); }
          if (disposed) return;
          if (car) scene.remove(car);
          car = gltf.scene; scene.add(car); nodes = {}; mats = {};
          car.traverse((o) => {
            if (o.name) nodes[o.name] = o;
            if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { mats[m.name] = m; if (!base[m.uuid]) base[m.uuid] = { color: m.color.clone(), opacity: m.opacity }; }); }
          });
          Object.keys(HINGE).forEach((k) => nodes[k] && nodes[k].rotation.set(0, 0, 0));
          ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].forEach((k) => { const w = nodes[k]; if (w) { w.userData.home = w.position.clone(); } });
          setPanels({ Hood: !!nodes.Hood, Trunk: !!nodes.Trunk, Door_L: !!nodes.Door_L, Door_R: !!nodes.Door_R, wheels: !!nodes.Wheel_FL });
          setOpen({});
          applyPaint(api.current?.paint ?? null); applyRim(api.current?.rim ?? null); applyXray(api.current?.xray ?? false);
          nextWheel = performance.now() + 2500;
        } catch (e) { setError("Could not load this car."); }
        setLoading(false);
      }
      function applyPaint(hex) { const m = mats.paint; if (m) m.color.copy(hex ? new THREE.Color(hex).multiplyScalar(1.6) : base[m.uuid].color); }
      function applyRim(hex) { const m = mats.rim; if (m) m.color.copy(hex ? new THREE.Color(hex).multiplyScalar(1.6) : base[m.uuid].color); }
      function applyXray(on) { const g = mats.glass; if (g) { g.transparent = true; g.opacity = on ? 0.08 : 0.6; g.needsUpdate = true; } }
      function toggle(k, on) { const n = nodes[k]; if (!n) return; const [axis, ang] = HINGE[k]; tween(n, "rotation", axis, on ? ang : 0, 650); }
      function detach() { if (nodes.Wheel_FL && wheelT < 0) wheelT = performance.now(); }
      let camFly = null;
      function view(name) { controls.autoRotate = false; camFly = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[name]), tf: controls.target.clone(), tt: new THREE.Vector3(...TARGETS[name]), start: performance.now(), ms: 900 }; }

      let visible = true, raf = 0;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }, { threshold: 0.01 });
      io.observe(el);
      const onVis = () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop); };
      document.addEventListener("visibilitychange", onVis);
      let frames = 0, fpsStart = performance.now();
      function loop(now) {
        raf = 0;
        if (!visible || document.hidden) return;
        tweens = tweens.filter((t) => { const p = Math.min(1, (now - t.start) / t.ms); t.obj[t.prop][t.axis] = t.from + (t.to - t.from) * ease(p); return p < 1; });
        if (camFly) { const p = Math.min(1, (now - camFly.start) / camFly.ms), e = ease(p); camera.position.lerpVectors(camFly.from, camFly.to, e); controls.target.lerpVectors(camFly.tf, camFly.tt, e); if (p >= 1) camFly = null; }
        if (!reduce && wheelT < 0 && now > nextWheel && controls.autoRotate) wheelT = now;
        if (wheelT >= 0) {
          const t = (now - wheelT) / 2600; // 0..1: slide out, drift, snap back
          const out = t < 0.35 ? ease(t / 0.35) : t < 0.7 ? 1 : 1 - ease((t - 0.7) / 0.3);
          ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].forEach((k, i) => { const w = nodes[k]; if (!w) return; const h = w.userData.home, s = Math.sign(h.x) || 1; w.position.set(h.x + s * 0.55 * out, h.y + 0.08 * out * Math.sin(now / 300 + i), h.z + 0.06 * out * Math.cos(now / 400 + i)); w.rotation.x = out * Math.PI * 2 * t * (i % 2 ? 1 : -1); });
          if (t >= 1) { ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].forEach((k) => { const w = nodes[k]; if (w) { w.position.copy(w.userData.home); w.rotation.x = 0; } }); wheelT = -1; nextWheel = now + 7000; }
        }
        controls.update(); renderer.render(scene, camera);
        frames++; if (now - fpsStart > 1000) { el.dataset.fps = String(Math.round((frames * 1000) / (now - fpsStart))); frames = 0; fpsStart = now; }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      api.current = { show, toggle, detach, view, applyPaint, applyRim, applyXray, paint: null, rim: null, xray: false };
      show(cars[0].id);
      cleanup = () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); controls.dispose(); renderer.dispose(); draco.dispose(); pmrem.dispose(); renderer.domElement.remove(); };
    })().catch(() => setError("3D viewer unavailable on this device."));
    return () => { disposed = true; cleanup(); };
  }, [cars]);

  const pick = (id) => { if (id === active) return; setActive(id); api.current?.show(id); };
  const togglePanel = (k) => { const on = !open[k]; setOpen((o) => ({ ...o, [k]: on })); api.current?.toggle(k, on); };
  const setP = (hex) => { setPaint(hex); if (api.current) { api.current.paint = hex; api.current.applyPaint(hex); } };
  const setR = (hex) => { setRim(hex); if (api.current) { api.current.rim = hex; api.current.applyRim(hex); } };
  const setX = () => { const v = !xray; setXray(v); if (api.current) { api.current.xray = v; api.current.applyXray(v); } };
  const view = (v) => { if (v === "engine" && panels.Hood && !open.Hood) togglePanel("Hood"); if (v === "interior" && !xray) setX(); api.current?.view(v); };
  const car = cars.find((c) => c.id === active);

  return (
    <section className="rlViewer" aria-label="Car viewer">
      <div className="rlPicker" role="tablist" aria-label="Cars">
        {["pro", "street"].map((d) => (
          <div key={d} className={`rlPickGroup ${d}`}>
            <span className="rlPickLabel">{d === "pro" ? "Pro" : "Street"}<small>{cars.filter((c) => c.discipline === d).length}</small></span>
            <div className="rlPickTrack">
              {cars.filter((c) => c.discipline === d).map((c) => (
                <button key={c.id} type="button" role="tab" aria-selected={c.id === active} aria-label={c.name} className={`rlPickCard ${c.id === active ? "on" : ""}`} onClick={() => pick(c.id)}>
                  <img src={c.poster} alt="" width="160" height="90" loading="lazy" decoding="async" />
                  <b>{c.name}</b>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rlStage">
        <div ref={host} className="rlCanvas" data-car={active} />
        {loading ? <div className="rlLoading" aria-live="polite"><i />Loading {car.name}</div> : null}
        {error ? <div className="rlLoading">{error}</div> : null}
        <p className="rlStageLabel"><b>{car.discipline === "pro" ? "Redline Pro" : "Redline Street"}</b>{car.name}</p>
      </div>
      <div className={`rlSheet ${sheet ? "open" : ""}`}>
        <button type="button" className="rlSheetHandle" aria-expanded={sheet} onClick={() => setSheet((s) => !s)}>{sheet ? "Hide controls" : "Controls"}</button>
        <div className="rlCtl">
          <div className="rlRow" aria-label="Camera">
            <span>View</span>
            {Object.keys(VIEWS).map((v) => <button key={v} type="button" onClick={() => view(v)}>{v === "engine" ? "Engine bay" : v[0].toUpperCase() + v.slice(1)}</button>)}
            <button type="button" className={xray ? "on" : ""} aria-pressed={xray} onClick={setX}>See inside</button>
          </div>
          <div className="rlRow" aria-label="Panels">
            <span>Open</span>
            {[["Hood", "Hood"], ["Trunk", "Trunk"], ["Door_L", "Left door"], ["Door_R", "Right door"]].map(([k, l]) => (
              <button key={k} type="button" disabled={!panels[k]} className={open[k] ? "on" : ""} aria-pressed={!!open[k]} onClick={() => togglePanel(k)}>{l}</button>
            ))}
            <button type="button" disabled={!panels.wheels} onClick={() => api.current?.detach()}>Detach wheels</button>
          </div>
          <div className="rlRow" aria-label="Paint">
            <span>Paint</span>
            {PAINTS.map(([n, hex]) => <button key={n} type="button" className={`rlSwatch ${paint === hex ? "on" : ""}`} style={{ "--sw": hex || "conic-gradient(#e3121f,#18c8ff,#9be22d,#e3121f)" }} aria-label={`Paint ${n}`} aria-pressed={paint === hex} onClick={() => setP(hex)} />)}
          </div>
          <div className="rlRow" aria-label="Rims">
            <span>Rims</span>
            {RIMS.map(([n, hex]) => <button key={n} type="button" className={`rlSwatch ${rim === hex ? "on" : ""}`} style={{ "--sw": hex || "conic-gradient(#888,#ddd,#888)" }} aria-label={`Rims ${n}`} aria-pressed={rim === hex} onClick={() => setR(hex)} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
