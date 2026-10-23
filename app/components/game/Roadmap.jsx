"use client";
import { useState } from "react";

export const STATUSES = [
  ["planned", "Planned"], ["in-development", "In Development"], ["testing", "Testing"], ["completed", "Completed"], ["released", "Released"],
];
const label = (s) => (STATUSES.find(([k]) => k === s) || [s, s])[1];

// Reusable, data-driven roadmap: expandable phases + status legend. Theme via className.
export default function Roadmap({ phases, className = "" }) {
  const [open, setOpen] = useState(() => new Set([phases[0]?.id]));
  const toggle = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = open.size === phases.length;
  return (
    <div className={`gRoad ${className}`}>
      <div className="gRoadBar">
        <ul className="gRoadLegend" aria-label="Status legend">
          {STATUSES.map(([k, l]) => <li key={k} className={`st-${k}`}><i aria-hidden="true" />{l}</li>)}
        </ul>
        <button type="button" className="gRoadAll" onClick={() => setOpen(all ? new Set() : new Set(phases.map((p) => p.id)))}>{all ? "Collapse all" : "Expand all"}</button>
      </div>
      <ol className="gRoadList">
        {phases.map((p, i) => {
          const isOpen = open.has(p.id);
          return (
            <li key={p.id} className={`gPhase st-${p.status} ${isOpen ? "open" : ""}`}>
              <button type="button" className="gPhaseHead" aria-expanded={isOpen} aria-controls={`ph-${p.id}`} onClick={() => toggle(p.id)}>
                <span className="gPhaseNum">Phase {i + 1}</span>
                <span className="gPhaseTitle">{p.title}</span>
                <em className="gPhaseStatus">{label(p.status)}</em>
                <span className="gPhaseChev" aria-hidden="true" />
              </button>
              <div id={`ph-${p.id}`} className="gPhaseBody" hidden={!isOpen}>
                {p.note ? <p className="gPhaseNote">{p.note}</p> : null}
                <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
