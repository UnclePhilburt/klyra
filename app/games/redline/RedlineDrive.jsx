"use client";

// Website mini test drive for the Redline garage. Arcade physics, solo time trial, lazy-loaded.
import { useEffect, useRef, useState } from "react";

// Track centreline (metres), closed Catmull-Rom loop.
const TRACK = [[0, -40], [0, 90], [18, 138], [60, 162], [108, 152], [128, 115], [112, 72], [124, 38], [165, 25], [198, -8], [192, -68], [145, -96], [85, -92], [38, -108], [6, -84]].map(([x, z]) => [x * 1.3, z * 1.3]);
const ROAD = 7.5, KERB = 8.8, WALL = 13.5, N = 1600;
const fmt = (ms) => (ms == null || !isFinite(ms) ? "--:--.---" : `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`);
const BEST_KEY = "klyra.redline.testdrive.best";

export default function RedlineDrive({ car, build, paint, onExit }) {
  const host = useRef(null);
  const input = useRef({ up: 0, down: 0, left: 0, right: 0, hb: 0 });
  const [phase, setPhase] = useState("loading");
  const [count, setCount] = useState(3);
  const [hud, setHud] = useState({ lap: 0, cur: null, last: null, best: null, kmh: 0, off: false });
  const [err, setErr] = useState("");
  const [touch, setTouch] = useState(false);
  const resetRef = useRef(() => {});

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
      scene.background = new THREE.Color(0x16202b);
      scene.fog = new THREE.Fog(0x16202b, 90, 260);
      scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x2a3a22, 1.25));
      const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(60, 120, 40); scene.add(sun);
      const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 400);
      const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 72 : 60; camera.updateProjectionMatrix(); };
      const ro = new ResizeObserver(resize); ro.observe(el); resize();

      // Centreline samples
      const curve = new THREE.CatmullRomCurve3(TRACK.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.5);
      const pts = curve.getSpacedPoints(N); pts.pop();
      const tan = pts.map((p, i) => pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]).normalize());
      const nor = tan.map((t) => new THREE.Vector3(t.z, 0, -t.x)); // left normal
      const LEN = curve.getLength();

      // Ground + road ribbons
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x3f6b35 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(130, -0.02, 40); scene.add(ground);
      function ribbon(a, b, y, color, stripe) {
        const pos = [], col = [], idx = [], c1 = new THREE.Color(color), c2 = new THREE.Color(0xffffff);
        for (let i = 0; i <= N; i++) {
          const k = i % N, p = pts[k], n = nor[k], c = stripe && Math.floor(i / 6) % 2 ? c2 : c1;
          for (const off of [a, b]) { pos.push(p.x + n.x * off, y, p.z + n.z * off); col.push(c.r, c.g, c.b); }
          if (i < N) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); scene.add(m); return m;
      }
      ribbon(-ROAD, ROAD, 0.01, 0x3b3f46);
      ribbon(ROAD, KERB, 0.02, 0xd6262f, true); ribbon(-KERB, -ROAD, 0.02, 0xd6262f, true);
      ribbon(ROAD - 0.45, ROAD - 0.3, 0.015, 0xe8e8e8); ribbon(-ROAD + 0.3, -ROAD + 0.45, 0.015, 0xe8e8e8);
      ribbon(KERB, WALL, 0.005, 0x5d5a52); ribbon(-WALL, -KERB, 0.005, 0x5d5a52);

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
      { const [x, z, ry] = at(S0, 0); const line = prop.Env_RoadMarkings_StartingLine_01; if (line) { const m = line.clone(); m.position.set(x, 0.03, z); m.rotation.y = ry; m.scale.set(ROAD * 2 / 13.6, 1, 1); scene.add(m); }
        const g = prop.Prop_Gantry_01; if (g) { const m = g.clone(); m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar((WALL * 2 + 2) / 13.2); scene.add(m); } }
      const grid = []; for (let r = 1; r <= 3; r++) for (const s of [-3, 3]) { const [x, z, ry] = at(-r * 14 + (s > 0 ? 7 : 0), s); grid.push([x, z, ry]); } scatter("Env_RoadMarkings_StartingGrid_01", grid);
      { const [x, z, ry] = at(-60, -(WALL + 9)); const gs = prop.Bld_Grandstand_01; if (gs) { const m = gs.clone(); m.position.set(x, 0, z); m.rotation.y = ry - Math.PI / 2; scene.add(m); const [x2, z2] = at(-20, -(WALL + 9)); const m2 = m.clone(); m2.position.set(x2, 0, z2); scene.add(m2); } }
      { const [x, z, ry] = at(30, WALL + 3); const pw = prop.Prop_Pit_Wall_01; if (pw) for (let k = 0; k < 6; k++) { const [px, pz, pr] = at(30 + k * 3, WALL + 3); const m = pw.clone(); m.position.set(px, 0, pz); m.rotation.y = pr; scene.add(m); } }
      // Tyre stacks + cones on bend apexes, trees and lights around.
      const stacks = [], cones = [], trees = [], trees2 = [], thin = [], lights = [];
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < N; i += 40) { if (curv[i] > 0.2) { const side = tan[(i + 8) % N].clone().cross(tan[(i - 8 + N) % N]).y > 0 ? -1 : 1; const [x, z] = at(i, side * (WALL + 1.4)); stacks.push([x, z, rnd() * 6]); const [cx, cz] = at(i, side * (KERB + 0.8)); cones.push([cx, cz, 0]); } }
      for (let i = 0; i < N; i += 22) { const side = rnd() > 0.5 ? 1 : -1, off = side * (WALL + 10 + rnd() * 30); const [x, z] = at(i, off); let ok = true; for (let j = 0; j < N; j += 8) if (Math.hypot(pts[j].x - x, pts[j].z - z) < WALL + 6) { ok = false; break; } if (ok) (rnd() < 0.4 ? trees : rnd() < 0.5 ? trees2 : thin).push([x, z, rnd() * 6, 0.8 + rnd() * 0.5]); }
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
      const wheels = ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].map((k) => nodes[k]).filter(Boolean);
      const front = [nodes.Wheel_FL, nodes.Wheel_FR].filter(Boolean);
      wheels.forEach((w) => { w.rotation.order = "YXZ"; });
      const shTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 4, 32, 32, 32); r.addColorStop(0, "rgba(0,0,0,.55)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(csz.x * 1.5, csz.z * 1.25), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; carRoot.add(shadow);

      // Arcade physics
      const st = { x: 0, z: 0, h: 0, vx: 0, vz: 0, yaw: 0, steer: 0, si: 0, lap: 0, lapStart: 0, last: null, best: Number(localStorage.getItem(BEST_KEY)) || null, cp: 0, running: false, off: false, wheelSpin: 0, lapsDone: 0 };
      function place(i) { const [x, z, ry] = at(i, 0); st.x = x; st.z = z; st.h = ry; st.vx = st.vz = st.yaw = 0; st.si = ((i % N) + N) % N; }
      place(-10);
      resetRef.current = () => { // R: back onto the track at the nearest point, facing forward
        place(st.si); };
      function nearest() { let best = st.si, bd = Infinity; for (let k = -40; k <= 40; k++) { const i = (st.si + k + N) % N, p = pts[i], d = (p.x - st.x) ** 2 + (p.z - st.z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
      const MAXV = 46, ACC = 17, BRK = 34, REV = 9;
      function step(dt, now) {
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
          const vn = st.vx * n.x + st.vz * n.z; if (vn * s > 0) { st.vx -= n.x * vn * 1.35; st.vz -= n.z * vn * 1.35; }
          st.vx *= 1 - 1.5 * dt; st.vz *= 1 - 1.5 * dt;
        }
        // laps: checkpoints at 1/3, 2/3; crossing index 0 forward completes a lap
        if (go) {
          const f = st.si / N;
          if (st.cp === 0 && f > 0.3 && f < 0.4) st.cp = 1; else if (st.cp === 1 && f > 0.63 && f < 0.73) st.cp = 2;
          if (prev > N * 0.9 && st.si < N * 0.1) {
            if (st.cp === 2) { const t = now - st.lapStart; st.last = t; st.lapsDone++; if (!st.best || t < st.best) { st.best = t; try { localStorage.setItem(BEST_KEY, String(Math.round(t))); } catch {} } }
            if (st.cp === 2 || st.lap === 0) { st.lap++; st.lapStart = now; st.cp = 0; }
          }
        }
        st.wheelSpin += vF * dt / 0.36;
      }
      window.__rlDrive = st; st.N = N; window.__rlPts = pts.map((p) => [p.x, p.z]);

      // camera
      const camPos = new THREE.Vector3(), look = new THREE.Vector3(), cd = Math.max(6.5, csz.z * 1.55), ch = Math.max(2.6, csz.y * 1.7);
      function cam(dt, snap) {
        const fx = Math.sin(st.h), fz = Math.cos(st.h);
        const tx = st.x - fx * cd, tz = st.z - fz * cd;
        const k = snap ? 1 : 1 - Math.exp(-dt * 5);
        camPos.set(camera.position.x + (tx - camera.position.x) * k, ch, camera.position.z + (tz - camera.position.z) * k);
        camera.position.copy(camPos); look.set(st.x + fx * 4, 0.9, st.z + fz * 4); camera.lookAt(look);
      }
      cam(0, true);

      let raf = 0, last = performance.now(), acc = 0, hudT = 0, startAt = 0;
      setPhase("count");
      const t0 = performance.now();
      function loop(now) {
        raf = 0; if (document.hidden) { last = now; return; }
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!st.running) { const left = 3 - Math.floor((now - t0) / 800); if (left <= 0) { st.running = true; st.lap = 0; startAt = now; setPhase("run"); setCount(0); } else setCount(left); }
        acc += dt; while (acc > 1 / 120) { step(1 / 120, now); acc -= 1 / 120; }
        carRoot.position.set(st.x, 0, st.z); carRoot.rotation.y = st.h;
        carObj.rotation.z = -st.yaw * 0.025 * Math.min(1, Math.hypot(st.vx, st.vz) / 20);
        wheels.forEach((w) => { w.rotation.x = st.wheelSpin; }); front.forEach((w) => { w.rotation.y = st.steer * 0.45; });
        cam(dt);
        renderer.render(scene, camera);
        if (now - hudT > 100) { hudT = now; setHud({ lap: st.lap, cur: st.lap > 0 ? now - st.lapStart : null, last: st.last, best: st.best, kmh: Math.round(Math.hypot(st.vx, st.vz) * 3.6), off: st.off }); el.dataset.si = String(st.si); }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      const onVis = () => { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
      document.addEventListener("visibilitychange", onVis);
      cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); draco.dispose(); renderer.dispose(); renderer.domElement.remove(); delete window.__rlDrive; delete window.__rlPts; };
    })().catch((e) => { if (!disposed) setErr("Could not start the test drive on this device."); });
    return () => { disposed = true; cleanup(); };
  }, [car, build, paint]);

  // keyboard
  useEffect(() => {
    const map = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "hb" };
    const kd = (e) => { if (e.code === "Escape") { onExit(); return; } if (e.code === "KeyR") { resetRef.current(); return; } const k = map[e.code]; if (k) { input.current[k] = 1; e.preventDefault(); } };
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
          <span><small>Lap</small>{hud.lap || "–"}</span>
          <span><small>Time</small>{fmt(hud.cur)}</span>
          <span><small>Last</small>{fmt(hud.last)}</span>
          <span className="best"><small>Best</small>{fmt(hud.best)}</span>
        </div>
        <div className="rlDriveBtns">
          <button type="button" className="rlDriveBtn" onClick={() => resetRef.current()} aria-label="Reset car to track">Reset</button>
          <button type="button" className="rlDriveBtn exit" onClick={onExit}>Exit</button>
        </div>
      </div>
      <div className={`rlDrvSpeed ${hud.off ? "off" : ""}`}><b>{hud.kmh}</b><small>km/h</small>{hud.off ? <em>Off track</em> : null}</div>
      {phase === "loading" && !err ? <div className="rlDriveMsg"><i />Loading track</div> : null}
      {err ? <div className="rlDriveMsg">{err}</div> : null}
      {phase === "count" && count > 0 ? <div className="rlCount" key={count}>{count}</div> : null}
      {!touch ? <p className="rlDriveKeys">W A S D / arrows · Space handbrake · R reset · Esc exit</p> : (
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
