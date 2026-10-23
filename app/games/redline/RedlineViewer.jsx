"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const RedlineDrive = dynamic(() => import("./RedlineDrive"), { ssr: false });

// Paint schemes = the Synty Pro/Street Racer alt materials used in the Unity project (see docs/REDLINE_CUSTOMIZATION.md).
// Each is a full atlas swap on the "paint" material, loaded lazily from /cars/paint/<id>.webp.
let schemesP = null;
const loadSchemes = () => (schemesP ||= fetch("/cars/paint/schemes.json").then((r) => r.json()).catch(() => { schemesP = null; return null; }));
const schemesFor = (all, car) => (!all || !car ? [] : car.discipline === "pro" ? all.pro : [...all.street, ...(car.id === "redline_street_truck" ? all.truck : car.id === "redline_street_motorbike" ? all.motorbike : [])]);
const SCHEME_RE = /^(pro|st|sv)-[a-z0-9-]+$/;
const RIMS = [["Factory", null], ["Gunmetal", "#4a4f57"], ["Gold", "#d6a83a"], ["Cyan", "#1ec8ff"]];
const VIEWS = { front: [0.6, 1.3, 5.6], side: [5.8, 1.2, 0], rear: [-0.6, 1.4, -5.6], interior: [0.32, 1.08, 0.05], engine: [0, 3.4, 3.6] };
const TARGETS = { front: [0, 0.6, 0], side: [0, 0.6, 0], rear: [0, 0.6, 0], interior: [0, 0.95, 2.4], engine: [0, 0.6, 1.4] };
const CZ_LABEL = { Ligh_Covers_Front: "Light covers front", Ligh_Covers_Rear: "Light covers rear", RollCage: "Roll cage", Rollcage: "Roll cage", Wheels: "Wheels" };
const czLabel = (k) => CZ_LABEL[k] || k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()).replace(/ (\w)/g, (m) => m.toLowerCase());
const encodeBuild = (b) => Object.entries(b).map(([k, v]) => `${k}.${v}`).join("-");
const decodeBuild = (str) => { const o = {}; (str || "").split("-").forEach((x) => { const i = x.lastIndexOf("."); if (i > 0) o[x.slice(0, i)] = x.slice(i + 1); }); return o; };
const urlPaint = () => { const p = new URLSearchParams(window.location.search).get("paint"); return p && SCHEME_RE.test(p) ? p : null; };
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
  const czRef = useRef({ on: false, build: {}, slots: null });
  const stageRef = useRef(null);
  const hsLayer = useRef(null);
  const popRef = useRef(null);
  const [pop, setPop] = useState(null);
  const [driving, setDriving] = useState(false);

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
      let anchors = null, lastOcc = 0;
      const ray = new THREE.Raycaster(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
      // Hotspot anchors: one or two candidate points per slot (left/right for parts spanning the car width).
      function buildAnchors() {
        const slots = czRef.current.slots; if (!car || !slots) return null;
        car.updateMatrixWorld(true);
        const cb = new THREE.Box3().setFromObject(car), cw = cb.max.x - cb.min.x, out = [];
        slots.forEach((k) => {
          const own = []; const box = new THREE.Box3();
          const re = k === "Wheels" ? /^(W_)?Wheel_(FL|FR|RL|RR)_/ : new RegExp("^V_" + k + "_\\d\\d$");
          car.traverse((o) => { if (re.test(o.name)) { box.expandByObject(o); o.traverse((m) => m.isMesh && own.push(m)); } });
          if (box.isEmpty()) return;
          const c = box.getCenter(new THREE.Vector3()); let pts;
          if (k === "Wheels") {
            const fl = nodes.Wheel_FL, fr = nodes.Wheel_FR;
            pts = [fl, fr].filter(Boolean).map((w) => { const b = new THREE.Box3().setFromObject(w), q = b.getCenter(new THREE.Vector3()); q.x = q.x > 0 ? b.max.x : b.min.x; return q; });
            if (!pts.length) pts = [c];
          } else {
            // Solid part: anchor on its top surface. Split part (left/right pieces): one anchor per side.
            ray.set(new THREE.Vector3(c.x, box.max.y + 1, c.z), new THREE.Vector3(0, -1, 0)); ray.far = Infinity;
            const top = ray.intersectObjects(own, false)[0];
            if (top) pts = [top.point.clone()];
            else if (box.max.x - box.min.x > cw * 0.4) pts = [new THREE.Vector3(box.max.x, c.y, c.z), new THREE.Vector3(box.min.x, c.y, c.z)];
            else pts = [c];
          }
          out.push({ k, pts, own: new Set(own), occ: false, pi: 0 });
        });
        return out;
      }
      function updateHotspots(now) {
        const layer = hsLayer.current; if (!layer) return;
        if (!czRef.current.on || !car || !czRef.current.slots) { layer.dataset.on = "0"; return; }
        if (!anchors) anchors = buildAnchors(); if (!anchors) return;
        layer.dataset.on = "1";
        const w = el.clientWidth, h = el.clientHeight, doOcc = now - lastOcc > 120;
        let meshes = null;
        if (doOcc) { lastOcc = now; meshes = []; car.traverse((o) => { if (o.isMesh) { let vis = true; for (let a = o; a; a = a.parent) if (!a.visible) { vis = false; break; } const m = Array.isArray(o.material) ? o.material[0] : o.material; if (vis && !(m && m.name === "glass")) meshes.push(o); } }); }
        const placed = [], sel = czRef.current.pop;
        anchors.forEach((a) => {
          const btn = layer.querySelector(`[data-slot="${a.k}"]`); if (!btn) return;
          // pick the candidate on the camera's side
          let best = 0, bd = Infinity; a.pts.forEach((p, i) => { const d = p.distanceToSquared(camera.position); if (d < bd) { bd = d; best = i; } });
          const p = a.pts[best];
          if (doOcc) {
            v4.copy(p).sub(camera.position); const dist = v4.length(); v4.normalize();
            ray.set(camera.position, v4); ray.far = dist;
            const hit = ray.intersectObjects(meshes, false).find((x) => !a.own.has(x.object));
            a.occ = !!hit && hit.distance < dist - 0.04 * fit;
          }
          v3.copy(p).project(camera);
          const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * h;
          let show = !a.occ && v3.z < 1 && x > 8 && x < w - 8 && y > 8 && y < h - 8;
          if (show && a.k !== sel && placed.some(([px, py]) => Math.abs(px - x) < 38 && Math.abs(py - y) < 38)) show = false;
          if (show || a.k === sel) placed.push([x, y]);
          btn.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
          const vis = show || a.k === sel;
          if (btn.dataset.vis !== (vis ? "1" : "0")) { btn.dataset.vis = vis ? "1" : "0"; btn.tabIndex = vis ? 0 : -1; }
          a.sx = x; a.sy = y;
        });
        const pe = popRef.current;
        if (pe && sel && pe.dataset.dock !== "1") {
          const a = anchors.find((q) => q.k === sel);
          if (a) {
            const pw = pe.offsetWidth, ph = pe.offsetHeight, right = a.sx + 28 + pw < w - 8;
            const px = right ? a.sx + 28 : Math.max(8, a.sx - 28 - pw), py = Math.min(h - ph - 8, Math.max(8, a.sy - ph / 2));
            pe.style.transform = `translate3d(${px.toFixed(0)}px,${py.toFixed(0)}px,0)`;
          }
        }
      }
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
          anchors = null;
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
      const texCache = new Map(), texLoader = new THREE.TextureLoader();
      let paintReq = 0;
      function applyPaint(id) {
        const m = mats.paint; if (!m) return;
        const b = base[m.uuid]; if (!b.map) b.map = m.map;
        const req = ++paintReq;
        const set = (t) => { if (req !== paintReq || mats.paint !== m) return; m.map = t; m.color.copy(b.color); m.needsUpdate = true; };
        if (!id) { set(b.map); return; }
        let p = texCache.get(id);
        if (!p) {
          p = texLoader.loadAsync(`/cars/paint/${id}.webp`).then((t) => { const o = b.map; t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; if (o) { t.magFilter = o.magFilter; t.minFilter = o.minFilter; t.wrapS = o.wrapS; t.wrapT = o.wrapT; t.anisotropy = o.anisotropy; } t.needsUpdate = true; return t; });
          p.catch(() => texCache.delete(id)); texCache.set(id, p);
        }
        p.then(set, () => { if (req === paintReq) set(b.map); });
      }
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
        if (!visible || document.hidden || api.current?.paused) return;
        tweens = tweens.filter((t) => { const p = Math.min(1, (now - t.start) / t.ms); t.obj[t.prop][t.axis] = t.from + (t.to - t.from) * ease(p); return p < 1; });
        if (camFly) { const p = Math.min(1, (now - camFly.start) / camFly.ms), e = ease(p); camera.position.lerpVectors(camFly.from, camFly.to, e); controls.target.lerpVectors(camFly.tf, camFly.tt, e); if (p >= 1) camFly = null; }
        if (!reduce && wheelT < 0 && now > nextWheel && controls.autoRotate) wheelT = now;
        if (wheelT >= 0) {
          const t = (now - wheelT) / 2600; // 0..1: slide out, drift, snap back
          const out = t < 0.35 ? ease(t / 0.35) : t < 0.7 ? 1 : 1 - ease((t - 0.7) / 0.3);
          ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].forEach((k, i) => { const w = nodes[k]; if (!w) return; const h = w.userData.home, s = Math.sign(h.x) || 1; w.position.set(h.x + s * 0.55 * out, h.y + 0.08 * out * Math.sin(now / 300 + i), h.z + 0.06 * out * Math.cos(now / 400 + i)); w.rotation.x = out * Math.PI * 2 * t * (i % 2 ? 1 : -1); });
          if (t >= 1) { ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].forEach((k) => { const w = nodes[k]; if (w) { w.position.copy(w.userData.home); w.rotation.x = 0; } }); wheelT = -1; nextWheel = now + 7000; }
        }
        controls.update(); renderer.render(scene, camera); updateHotspots(now);
        frames++; if (now - fpsStart > 1000) { el.dataset.fps = String(Math.round((frames * 1000) / (now - fpsStart))); frames = 0; fpsStart = now; }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      api.current = { resume: () => { if (!raf) raf = requestAnimationFrame(loop); }, show, applyBuild, resetAnchors: () => { anchors = null; }, stopSpin: () => { controls.autoRotate = false; }, toggle, detach, view, applyPaint, applyRim, applyXray, paint: urlPaint(), rim: null, xray: false };
      const qs = new URLSearchParams(window.location.search), want = qs.get("car");
      if (qs.has("parts") && want && cars.find((c) => c.id === want)?.custom) { czRef.current.on = true; setCz(true); }
      show(want && cars.some((c) => c.id === want) ? want : cars[0].id);
      cleanup = () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); controls.dispose(); renderer.dispose(); draco.dispose(); pmrem.dispose(); renderer.domElement.remove(); };
    })().catch(() => setError("3D viewer unavailable on this device."));
    return () => { disposed = true; cleanup(); };
  }, [cars]);

  const pick = (id) => { if (id === active) return; setActive(id); api.current?.show(id); };
  const togglePanel = (k) => { const on = !open[k]; setOpen((o) => ({ ...o, [k]: on })); api.current?.toggle(k, on); };
  const setP = (id) => { setPaint(id); if (api.current) { api.current.paint = id; api.current.applyPaint(id); } };
  const [schemes, setSchemes] = useState(null);
  useEffect(() => { if (pop === "__paint" || paint) loadSchemes().then((d) => d && setSchemes(d)); }, [pop, paint]);
  const carSchemes = schemesFor(schemes, cars.find((c) => c.id === active));
  // A scheme from another pack (or an old hex link) falls back to factory paint.
  useEffect(() => { if (schemes && paint && !carSchemes.some((x) => x.id === paint)) setP(null); }, [schemes, paint, active]);
  const paintName = paint ? (carSchemes.find((x) => x.id === paint) || { name: "…" }).name : "Factory";
  const setR = (hex) => { setRim(hex); if (api.current) { api.current.rim = hex; api.current.applyRim(hex); } };
  const setX = () => { const v = !xray; setXray(v); if (api.current) { api.current.xray = v; api.current.applyXray(v); } };
  const view = (v) => { if (v === "engine" && panels.Hood && !open.Hood) togglePanel("Hood"); if (v === "interior" && !xray) setX(); api.current?.view(v); };
  const car = cars.find((c) => c.id === active);

  // Customizer: per-car slot data and parts are lazy-loaded only when the panel is opened.
  useEffect(() => {
    setPop(null); czRef.current.slots = null;
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
      czRef.current.slots = Object.keys(defs); api.current?.resetAnchors();
      setCzData(d); setBuild(b); czRef.current.build = b; api.current?.applyBuild(b); api.current?.stopSpin();
      setTab((t) => (t && t in defs ? t : Object.keys(defs)[0]));
    }).catch(() => setCzData({ error: true }));
    return () => { live = false; };
  }, [cz, active]);
  useEffect(() => {
    if (!cz || !czData || czData.error) return;
    const qs = new URLSearchParams(window.location.search);
    qs.set("car", active); qs.set("parts", encodeBuild(build));
    if (paint) qs.set("paint", paint); else qs.delete("paint");
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
  }, [cz, czData, build, active, paint]);
  useEffect(() => { const p = urlPaint(); if (p) setPaint(p); }, []);
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
  useEffect(() => { czRef.current.pop = pop; }, [pop]);
  useEffect(() => {
    if (!pop) return;
    const onKey = (e) => { if (e.key === "Escape") setPop(null); };
    const onDown = (e) => { if (!e.target.closest(".rlPop,.rlHs,.rlPaintBtn")) setPop(null); };
    window.addEventListener("keydown", onKey); window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [pop]);
  const [dock, setDock] = useState(false);
  useEffect(() => { const el = stageRef.current; if (!el) return; const ro = new ResizeObserver(() => setDock(el.clientWidth < 600)); ro.observe(el); return () => ro.disconnect(); }, []);
  // Removing a part the factory car has leaves a gap -> "None"; removing an add-on (no factory part) -> "Stock".
  const noneLabel = (k) => (czData && !czData.error && czData.slots[k]?.default ? "None" : "Stock");
  const optLabel = (k, v) => (!v ? "" : v === "none" ? noneLabel(k) : v === "stock" ? "Stock" : k === "Wheels" ? `Style ${v}` : `Option ${v}`);
  const czSlots = czData && !czData.error ? Object.keys(czData.defaults) : [];
  const czOpts = (slot) => {
    if (!czData || czData.error) return [];
    if (slot === "Wheels") return [["stock", "Stock", null], ...czData.wheels.map((w) => [w, `Style ${w}`, `/cars/custom/th/${active}/W_${w}.webp`])];
    const s = czData.slots[slot]; if (!s) return [];
    return [["none", s.default ? "None" : "Stock", null], ...s.variants.map((v) => [v, `${czLabel(slot)} ${v}`, `/cars/custom/th/${active}/V_${slot}_${v}.webp`])];
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
      <div className="rlStage" ref={stageRef}>
        <div ref={host} className="rlCanvas" data-car={active} />
        {loading ? <div className="rlLoading" aria-live="polite"><i />Loading {car.name}</div> : null}
        {error ? <div className="rlLoading">{error}</div> : null}
        {cz && car.custom && czData && !czData.error ? (
          <div ref={hsLayer} className="rlHsLayer" data-on="0">
            {czSlots.map((k) => (
              <button key={k} type="button" data-slot={k} data-vis="0" tabIndex={-1} className={`rlHs ${pop === k ? "on" : ""} ${k === "Wheels" ? "wheel" : ""}`} aria-label={`${czLabel(k)}: ${optLabel(k, build[k])}`} aria-expanded={pop === k} aria-controls="rlPop" title={czLabel(k)} onClick={() => setPop((p) => (p === k ? null : k))}><i aria-hidden="true" /></button>
            ))}
          </div>
        ) : null}
        {cz && car.custom ? (
          <div className="rlCzBar">
            <p className="rlCzNote">Preview of planned in-game customization</p>
            {!czData ? <span className="rlCzMsg" aria-live="polite">Loading parts…</span> : czData.error ? <span className="rlCzMsg">Could not load parts.</span> : (
              <>
                <button type="button" className={`rlPaintBtn ${pop === "__paint" ? "on" : ""}`} style={{ "--sw": paint ? `center/cover url(/cars/paint/th/${paint}.webp)` : "conic-gradient(#e3121f,#18c8ff,#9be22d,#e3121f)" }} aria-label="Paint" aria-expanded={pop === "__paint"} aria-controls="rlPop" onClick={() => setPop((p) => (p === "__paint" ? null : "__paint"))}><i aria-hidden="true" /></button>
                <button type="button" className="rlCzBtn" onClick={resetBuild}>Reset</button>
                <button type="button" className="rlCzBtn" onClick={copyLink}>{copied ? "Copied" : "Share build"}</button>
              </>
            )}
          </div>
        ) : car.custom ? (
          <button type="button" className="rlCzStart" onClick={toggleCz}>Customize parts</button>
        ) : <p className="rlCzNone">No parts for this vehicle</p>}
        {pop && (pop === "__paint" || (czData && !czData.error)) ? (
          <div ref={popRef} id="rlPop" className={`rlPop ${pop === "__paint" ? "paint" : ""}`} data-dock={dock || pop === "__paint" ? "1" : "0"} role="dialog" aria-label={pop === "__paint" ? "Paint" : czLabel(pop)}>
            <div className="rlPopHead"><b>{pop === "__paint" ? "Paint" : czLabel(pop)}</b><span>{pop === "__paint" ? paintName : optLabel(pop, build[pop])}</span><button type="button" className="rlPopX" aria-label="Close" onClick={() => setPop(null)}>×</button></div>
            {pop === "__paint" ? (
              <div className="rlPopGrid paint">{!schemes ? <p className="rlCzMsg">Loading paint…</p> : [{ id: null, name: "Factory" }, ...carSchemes].map((x) => (
                <button key={x.id || "f"} type="button" className={`rlCzOpt ${paint === x.id ? "on" : ""}`} aria-pressed={paint === x.id} aria-label={`Paint ${x.name}`} title={x.mat} onClick={() => setP(x.id)}>
                  {x.id ? <img src={`/cars/paint/th/${x.id}.webp`} alt="" width="96" height="48" loading="lazy" decoding="async" /> : <i aria-hidden="true">★</i>}
                  <b>{x.name}</b>
                </button>))}</div>
            ) : (
              <div className="rlPopGrid">
                {czOpts(pop).map(([v, label, img]) => (
                  <button key={v} type="button" className={`rlCzOpt ${build[pop] === v ? "on" : ""}`} aria-pressed={build[pop] === v} aria-label={label} onClick={() => choose(pop, v)}>
                    {img ? <img src={img} alt="" width="160" height="110" loading="lazy" decoding="async" /> : <i aria-hidden="true">{v === "none" ? "∅" : "★"}</i>}
                    <b>{v === "none" ? noneLabel(pop) : v === "stock" ? "Stock" : v}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {!loading && !error ? <button type="button" className="rlDriveStart" onClick={() => { setPop(null); if (api.current) api.current.paused = true; setDriving(true); }}>Test drive</button> : null}
        {driving ? <RedlineDrive car={car} build={cz && czData && !czData.error ? build : null} paint={paint} onExit={() => { setDriving(false); if (api.current) { api.current.paused = false; api.current.resume(); } }} /> : null}
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
            <button type="button" className="rlPaintBtn" style={{ "--sw": paint ? `center/cover url(/cars/paint/th/${paint}.webp)` : "conic-gradient(#e3121f,#18c8ff,#9be22d,#e3121f)" }} aria-label="Paint schemes" aria-expanded={pop === "__paint"} onClick={() => setPop((p) => (p === "__paint" ? null : "__paint"))} />
            <span className="rlPaintName">{paintName}</span>
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
      </div>
    </section>
  );
}
