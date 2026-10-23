"use client";

import { useEffect, useRef, useState } from "react";

const PAINTS = [["Factory", null], ["Redline", "#e3121f"], ["Volt", "#18c8ff"], ["Lime", "#9be22d"], ["Carbon", "#2a2d33"], ["Pearl", "#f2f2ee"]];
const RIMS = [["Factory", null], ["Gunmetal", "#4a4f57"], ["Gold", "#d6a83a"], ["Cyan", "#1ec8ff"]];
const VIEWS = { front: [0.6, 1.3, 5.6], side: [5.8, 1.2, 0], rear: [-0.6, 1.4, -5.6], interior: [0.32, 1.08, 0.05], engine: [0, 3.4, 3.6] };
const TARGETS = { front: [0, 0.6, 0], side: [0, 0.6, 0], rear: [0, 0.6, 0], interior: [0, 0.95, 2.4], engine: [0, 0.6, 1.4] };
const CZ_LABEL = { Ligh_Covers_Front: "Light covers front", Ligh_Covers_Rear: "Light covers rear", RollCage: "Roll cage", Rollcage: "Roll cage", Wheels: "Wheels" };
const czLabel = (k) => CZ_LABEL[k] || k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()).replace(/ (\w)/g, (m) => m.toLowerCase());
const encodeBuild = (b) => Object.entries(b).map(([k, v]) => `${k}.${v}`).join("-");
const decodeBuild = (str) => { const o = {}; (str || "").split("-").forEach((x) => { const i = x.lastIndexOf("."); if (i > 0) o[x.slice(0, i)] = x.slice(i + 1); }); return o; };
const urlPaint = () => { const p = new URLSearchParams(window.location.search).get("paint"); return (PAINTS.find(([, h]) => h && h.slice(1) === p) || [])[1] || null; };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function RedlineViewer({ cars }) {
  const host = useRef(null);
  const api = useRef(null);
  const [active, setActive] = useState(cars[0].id);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("car");
    if (want && cars.some((c) => c.id === want)) setActive(want);
  }, [cars]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panels, setPanels] = useState({});
  const [open, setOpen] = useState({});
  const [xray, setXray] = useState(false);
  const [paint, setPaint] = useState(null);
  const [rim, setRim] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [cz, setCz] = useState(false);
  const [czData, setCzData] = useState(null);
  const [build, setBuild] = useState({});
  const [tab, setTab] = useState(null);
  const [copied, setCopied] = useState(false);
  const czRef = useRef({ on: false, build: {} });

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
      let fit = 1, fitY = 0.6, car = null, nodes = {}, mats = {}, base = {}, tweens = [], wheelT = -1, nextWheel = 0;

      const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 58 : w / h < 1.4 ? 44 : 35; camera.updateProjectionMatrix(); };
      const ro = new ResizeObserver(resize); ro.observe(el); resize();

      function tween(obj, prop, axis, to, ms = 700) { const from = obj[prop][axis]; tweens = tweens.filter((t) => !(t.obj === obj && t.axis === axis && t.prop === prop)); tweens.push({ obj, prop, axis, from, to, start: performance.now(), ms }); }
      const HINGE = { Hood: ["x", -1.0], Trunk: ["x", 1.05], Door_L: ["y", -1.05], Door_R: ["y", 1.05] };

      async function show(id) {
        setLoading(true); setError("");
        try {
          const c = cars.find((x) => x.id === id);
          const custom = czRef.current.on && c.custom;
          const ck = (custom ? "cz:" : "") + id;
          let gltf = cache.get(ck);
          if (!gltf) { gltf = await loader.loadAsync(custom ? `/cars/custom/${id}.glb` : c.model); cache.set(ck, gltf); }
          if (disposed) return;
          if (car) scene.remove(car);
          car = gltf.scene; scene.add(car); nodes = {}; mats = {};
          { const bx = new THREE.Box3().setFromObject(car), sz = bx.getSize(new THREE.Vector3());
            fit = Math.max(1, Math.max(sz.z / 4.6, sz.y / 1.6, sz.x / 2.2)); fitY = Math.max(0.6, sz.y * 0.42);
            ground.scale.set(fit, fit, 1); controls.maxDistance = 12 * fit;
            if (!camFly) { camera.position.set(...VIEWS.front.map((v) => v * fit)); controls.target.set(0, fitY, 0); } }
          car.traverse((o) => {
            if (o.name) nodes[o.name] = o;
            if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { mats[m.name] = m; if (!base[m.uuid]) base[m.uuid] = { color: m.color.clone(), opacity: m.opacity }; }); }
          });
          Object.keys(HINGE).forEach((k) => nodes[k] && nodes[k].rotation.set(0, 0, 0));
          ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].forEach((k) => { const w = nodes[k]; if (w) { w.userData.home = w.position.clone(); } });
          setPanels({ Hood: !!nodes.Hood, Trunk: !!nodes.Trunk, Door_L: !!nodes.Door_L, Door_R: !!nodes.Door_R, wheels: !!nodes.Wheel_FL });
          setOpen({});
          if (custom) applyBuild(czRef.current.build);
          applyPaint(api.current?.paint ?? null); applyRim(api.current?.rim ?? null); applyXray(api.current?.xray ?? false);
          nextWheel = performance.now() + 2500;
        } catch (e) { setError("Could not load this car."); }
        setLoading(false);
      }
      function applyBuild(b) {
        if (!car) return;
        car.traverse((o) => {
          let m = /^V_(.+)_(\d\d)$/.exec(o.name);
          if (m) { o.visible = b[m[1]] === m[2]; return; }
          m = /^W_Wheel_(FL|FR|RL|RR)_(\d\d)$/.exec(o.name);
          if (m) { o.visible = b.Wheels === m[2]; return; }
          if (/^Wheel_(FL|FR|RL|RR)_Stock$/.test(o.name)) o.visible = !b.Wheels || b.Wheels === "stock";
        });
      }
      function applyPaint(hex) { const m = mats.paint; if (m) m.color.copy(hex ? new THREE.Color(hex).multiplyScalar(1.6) : base[m.uuid].color); }
      function applyRim(hex) { const m = mats.rim; if (m) m.color.copy(hex ? new THREE.Color(hex).multiplyScalar(1.6) : base[m.uuid].color); }
      function applyXray(on) { const g = mats.glass; if (g) { g.transparent = true; g.opacity = on ? 0.08 : 0.6; g.needsUpdate = true; } }
      function toggle(k, on) { const n = nodes[k]; if (!n) return; const [axis, ang] = HINGE[k]; tween(n, "rotation", axis, on ? ang : 0, 650); }
      function detach() { if (nodes.Wheel_FL && wheelT < 0) wheelT = performance.now(); }
      let camFly = null;
      function view(name) { controls.autoRotate = false; camFly = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[name]).multiplyScalar(name === "interior" ? 1 : fit), tf: controls.target.clone(), tt: new THREE.Vector3(...TARGETS[name]).setY(name === "interior" ? TARGETS[name][1] : Math.max(TARGETS[name][1], fitY)), start: performance.now(), ms: 900 }; }

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
      api.current = { show, applyBuild, toggle, detach, view, applyPaint, applyRim, applyXray, paint: urlPaint(), rim: null, xray: false };
      const qs = new URLSearchParams(window.location.search), want = qs.get("car");
      if (qs.has("parts") && want && cars.find((c) => c.id === want)?.custom) { czRef.current.on = true; setCz(true); }
      show(want && cars.some((c) => c.id === want) ? want : cars[0].id);
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

  // Customizer: per-car slot data and parts are lazy-loaded only when the panel is opened.
  useEffect(() => {
    if (!cz || !car.custom) { setCzData(null); return; }
    let live = true;
    fetch(`/cars/custom/${active}.json`).then((r) => r.json()).then((d) => {
      if (!live) return;
      const defs = {}; Object.entries(d.slots).forEach(([k, v]) => { defs[k] = v.default || "none"; });
      if (d.wheels.length) defs.Wheels = "stock";
      d.defaults = defs;
      const qs = new URLSearchParams(window.location.search);
      const fromUrl = qs.get("car") === active ? decodeBuild(qs.get("parts")) : {};
      const b = { ...defs };
      Object.entries(fromUrl).forEach(([k, v]) => { if (k === "Wheels" ? v === "stock" || d.wheels.includes(v) : d.slots[k] && (v === "none" || d.slots[k].variants.includes(v))) b[k] = v; });
      setCzData(d); setBuild(b); czRef.current.build = b; api.current?.applyBuild(b);
      setTab((t) => (t && t in defs ? t : Object.keys(defs)[0]));
    }).catch(() => setCzData({ error: true }));
    return () => { live = false; };
  }, [cz, active]);
  useEffect(() => {
    if (!cz || !czData || czData.error) return;
    const qs = new URLSearchParams(window.location.search);
    qs.set("car", active); qs.set("parts", encodeBuild(build));
    if (paint) qs.set("paint", paint.slice(1)); else qs.delete("paint");
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
  }, [cz, czData, build, active, paint]);
  useEffect(() => { const p = new URLSearchParams(window.location.search).get("paint"); const hit = PAINTS.find(([, h]) => h && h.slice(1) === p); if (hit) setPaint(hit[1]); }, []);
  const toggleCz = () => {
    const on = !cz; czRef.current.on = on; setCz(on);
    if (!on) { const qs = new URLSearchParams(window.location.search); qs.delete("parts"); qs.delete("paint"); window.history.replaceState(null, "", `${window.location.pathname}${qs.toString() ? "?" + qs : ""}`); }
    api.current?.show(active);
  };
  const choose = (slot, v) => { const b = { ...build, [slot]: v }; setBuild(b); czRef.current.build = b; api.current?.applyBuild(b); };
  const resetBuild = () => { if (!czData?.defaults) return; const b = { ...czData.defaults }; setBuild(b); czRef.current.build = b; api.current?.applyBuild(b); setP(null); setR(null); };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } };
  const tabKeys = (e, keys) => {
    const i = keys.indexOf(tab); let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % keys.length; else if (e.key === "ArrowLeft") n = (i - 1 + keys.length) % keys.length; else if (e.key === "Home") n = 0; else if (e.key === "End") n = keys.length - 1;
    if (n >= 0) { e.preventDefault(); setTab(keys[n]); e.currentTarget.parentElement.querySelectorAll("[role=tab]")[n]?.focus(); }
  };
  const czSlots = czData && !czData.error ? Object.keys(czData.defaults) : [];
  const czOpts = (slot) => {
    if (!czData || czData.error) return [];
    if (slot === "Wheels") return [["stock", "Stock", null], ...czData.wheels.map((w) => [w, `Style ${w}`, `/cars/custom/th/${active}/W_${w}.webp`])];
    const s = czData.slots[slot]; if (!s) return [];
    return [...(s.default ? [] : [["none", "None", null]]), ...s.variants.map((v) => [v, `${czLabel(slot)} ${v}`, `/cars/custom/th/${active}/V_${slot}_${v}.webp`])];
  };

  return (
    <section className="rlViewer" aria-label="Car viewer">
      <div className="rlPicker" role="tablist" aria-label="Cars">
        {["pro", "street"].map((d) => (
          <div key={d} className={`rlPickGroup ${d}`}>
            <span className="rlPickLabel">{d === "pro" ? "Pro" : "Street"}<small>{cars.filter((c) => c.discipline === d).length}</small></span>
            <div className="rlPickTrack">
              {cars.filter((c) => c.discipline === d).map((c) => (
                <button key={c.id} type="button" role="tab" aria-selected={c.id === active} aria-label={c.name} className={`rlPickCard ${c.id === active ? "on" : ""}`} onClick={() => pick(c.id)}>
                  <img src={c.thumb || c.poster} alt="" width="160" height="90" loading="lazy" decoding="async" />
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
          <div className="rlRow" aria-label="Customize">
            <span>Build</span>
            <button type="button" className={cz ? "on" : ""} aria-pressed={cz} aria-controls="rlCz" disabled={!car.custom} onClick={toggleCz}>{car.custom ? (cz ? "Close customizer" : "Customize parts") : "No parts for this vehicle"}</button>
          </div>
          <div className="rlRow" aria-label="Rims">
            <span>Rims</span>
            {RIMS.map(([n, hex]) => <button key={n} type="button" className={`rlSwatch ${rim === hex ? "on" : ""}`} style={{ "--sw": hex || "conic-gradient(#888,#ddd,#888)" }} aria-label={`Rims ${n}`} aria-pressed={rim === hex} onClick={() => setR(hex)} />)}
          </div>
        </div>
        {cz && car.custom ? (
          <div className="rlCz" id="rlCz" aria-label="Customize parts">
            <p className="rlCzNote">Preview of planned in-game customization</p>
            {!czData ? <p className="rlCzMsg" aria-live="polite">Loading parts…</p> : czData.error ? <p className="rlCzMsg">Could not load parts for this car.</p> : (
              <>
                <div className="rlCzTabs" role="tablist" aria-label="Part slots">
                  {czSlots.map((k) => <button key={k} type="button" role="tab" id={`czt-${k}`} aria-selected={tab === k} aria-controls="czPanel" tabIndex={tab === k ? 0 : -1} className={tab === k ? "on" : ""} onKeyDown={(e) => tabKeys(e, czSlots)} onClick={() => setTab(k)}>{czLabel(k)}</button>)}
                </div>
                <div className="rlCzGrid" id="czPanel" role="tabpanel" aria-labelledby={`czt-${tab}`}>
                  {czOpts(tab).map(([v, label, img]) => (
                    <button key={v} type="button" className={`rlCzOpt ${build[tab] === v ? "on" : ""}`} aria-pressed={build[tab] === v} aria-label={label} onClick={() => choose(tab, v)}>
                      {img ? <img src={img} alt="" width="160" height="110" loading="lazy" decoding="async" /> : <i aria-hidden="true">{v === "none" ? "∅" : "★"}</i>}
                      <b>{v === "none" ? "None" : v === "stock" ? "Stock" : v}</b>
                    </button>
                  ))}
                </div>
                <div className="rlCzActions">
                  <button type="button" onClick={resetBuild}>Reset build</button>
                  <button type="button" onClick={copyLink}>{copied ? "Link copied" : "Copy build link"}</button>
                  <span className="rlCzCount">{czSlots.length} slots</span>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
