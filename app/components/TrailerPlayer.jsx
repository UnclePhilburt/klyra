"use client";

import { useState } from "react";

export const TRAILER_ID = "Bq7vnDIWrbc";

// Framed trailer with a poster + custom play button. The YouTube player only
// loads after the click, so pages stay light on mobile.
export default function TrailerPlayer({ id = TRAILER_ID, poster = "/shots/trailer/hero.jpg", label = "Watch the trailer" }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="kxPlayer">
      <span className="kxCorner tl" aria-hidden="true" />
      <span className="kxCorner tr" aria-hidden="true" />
      <span className="kxCorner bl" aria-hidden="true" />
      <span className="kxCorner br" aria-hidden="true" />
      <div className="kxPlayerScreen">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`}
            title="KLYRA: Broken Front pre-alpha gameplay trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button type="button" className="kxPoster" onClick={() => setPlaying(true)} aria-label="Play the KLYRA: Broken Front pre-alpha trailer">
            <img src={poster} alt="" loading="lazy" decoding="async" />
            <span className="kxPosterShade" aria-hidden="true" />
            <span className="kxPlay" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </span>
            <span className="kxPosterLabel">
              <small>REC // Pre-alpha footage</small>
              <strong>{label}</strong>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
