"use client";

import { useEffect, useRef, useState } from "react";

// Lazy 3D viewer. The model-viewer library (self-hosted, ~1 MB) and the model are
// only fetched when the viewer scrolls near the screen. No download controls.
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

export default function ModelViewer({ src, label, orbit = "35deg 75deg auto", animated = false, className = "" }) {
  const box = useRef(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let alive = true;
    loadLibrary().then(() => alive && setReady(true)).catch(() => {});
    return () => { alive = false; };
  }, [near]);

  useEffect(() => {
    const mv = box.current?.querySelector("model-viewer");
    if (!mv) return;
    const done = () => {
      setLoaded(true);
      // React passes custom-element props as properties, so set them explicitly.
      if (animated && mv.availableAnimations?.length) { mv.animationName = mv.availableAnimations[0]; mv.play({ repetitions: Infinity }); }
    };
    mv.addEventListener("load", done);
    return () => mv.removeEventListener("load", done);
  }, [ready, animated]);

  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div ref={box} className={`kxModel ${loaded ? "isLoaded" : ""} ${className}`} onContextMenu={(e) => e.preventDefault()}>
      {ready ? (
        <model-viewer
          src={src}
          alt={label}
          camera-controls=""
          touch-action="pan-y"
          {...(reduced ? {} : { "auto-rotate": "" })}
          auto-rotate-delay="0"
          rotation-per-second="18deg"
          {...(animated ? { autoplay: "" } : {})}
          camera-orbit={orbit}
          interaction-prompt="none"
          shadow-intensity="1.2"
          shadow-softness="0.8"
          exposure="0.95"
          environment-image="neutral"
          disable-pan=""
          style={{ width: "100%", height: "100%", background: "transparent", "--poster-color": "transparent" }}
        />
      ) : null}
      {!loaded ? <span className="kxModelLoading" aria-hidden="true"><i /> Loading model</span> : null}
      <span className="kxModelLabel">{label}</span>
      <span className="kxModelHint" aria-hidden="true">Drag to orbit</span>
    </div>
  );
}