// Add new entries here; a matching app/vehicles/<slug>/page.jsx renders each one.
export const vehicles = [
  { slug: "transport-truck", name: "Transport truck", kind: "Logistics", model: "/models/transport-truck.glb", orbit: "40deg 74deg 75%", copy: "The workhorse that keeps supplies moving up to the front." },
  { slug: "transport-helicopter", name: "Transport helicopter", kind: "Air", model: "/models/transport-helicopter.glb", orbit: "40deg 72deg auto", copy: "Moves squads across the front fast, and gets them out again." },
  { slug: "m9-halberd-tank", name: "M9 Halberd", kind: "Armor", model: "/models/m9-halberd.glb", orbit: "40deg 74deg 55%", copy: "The main battle tank. Heavy armor and a big gun for breaking a line." },
  { slug: "attack-helicopter", name: "Attack helicopter", kind: "Air", model: "/models/attack-helicopter.glb", orbit: "40deg 72deg 62%", copy: "A two-seat gunship carrying rocket pods on its stub wings." },
];

export const getItem = (slug) => vehicles.find((v) => v.slug === slug);