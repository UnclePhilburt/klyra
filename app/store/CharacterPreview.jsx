"use client";

import { useEffect, useRef, useState } from "react";

let loader = null;
function loadLibrary() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.customElements?.get("model-viewer")) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "/vendor/model-viewer.min.js";
      s.onload = () => {
        customElements.whenDefined("model-viewer").then((El) => {
          try { El.dracoDecoderLocation = "/vendor/draco/"; } catch {}
          resolve();
        });
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return loader;
}

// Phones and low-memory devices start on the static poster; the 3D idle loads on tap.
function liteDevice() {
  if (typeof window === "undefined") return true;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const small = window.matchMedia?.("(max-width: 720px)").matches;
  const lowMem = typeof navigator !== "undefined" && navigator.deviceMemory && navigator.deviceMemory <= 4;
  const saveData = typeof navigator !== "undefined" && navigator.connection?.saveData;
  return Boolean((coarse && small) || lowMem || saveData);
}

export default function CharacterPreview({ character, large = false }) {
  const box = useRef(null);
  const [visible, setVisible] = useState(false);
  const [want3d, setWant3d] = useState(false);
  const [lite, setLite] = useState(true);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const isLite = liteDevice();
    setLite(isLite);
    if (!isLite) setWant3d(true);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const mount = want3d && (visible || loaded);

  useEffect(() => {
    if (!mount) return;
    let alive = true;
    loadLibrary().then(() => alive && setReady(true)).catch(() => {});
    return () => { alive = false; };
  }, [mount]);

  useEffect(() => {
    const mv = box.current?.querySelector("model-viewer");
    if (!mv) return;
    const done = () => {
      setLoaded(true);
      if (mv.availableAnimations?.length) {
        mv.animationName = mv.availableAnimations[0];
        mv.play({ repetitions: Infinity });
      }
    };
    mv.addEventListener("load", done);
    return () => mv.removeEventListener("load", done);
  }, [ready, mount]);

  const team = character.teams[0];

  return (
    <div
      ref={box}
      className={`kxCharStage ${large ? "large" : ""} ${loaded ? "isLoaded" : ""}`}
      data-team={team}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img className="kxCharPoster" src={character.poster} alt={`${character.name} character preview`} loading="lazy" decoding="async" width="480" height="640" />
      {ready && mount ? (
        <model-viewer
          src={character.model}
          alt={`${character.name} 3D preview`}
          poster={character.poster}
          loading="lazy"
          reveal="auto"
          camera-controls=""
          touch-action="pan-y"
          disable-zoom=""
          disable-pan=""
          autoplay=""
          camera-orbit="20deg 85deg auto"
          min-camera-orbit="auto 60deg auto"
          max-camera-orbit="auto 100deg auto"
          interaction-prompt="none"
          shadow-intensity="1"
          shadow-softness="0.9"
          exposure="1"
          environment-image="neutral"
          style={{ width: "100%", height: "100%", background: "transparent", "--poster-color": "transparent" }}
        />
      ) : null}
      {lite && !want3d ? (
        <button type="button" className="kxChar3d" onClick={() => setWant3d(true)} aria-label={`View ${character.name} in 3D`}>
          3D
        </button>
      ) : null}
      {want3d && !loaded && visible ? <span className="kxCharLoading" aria-hidden="true"><i /></span> : null}
    </div>
  );
}
