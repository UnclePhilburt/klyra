// Data-driven game registry for the KLYRA platform. Copy here is factual only: no dates, counts or availability claims.
export const games = [
  {
    id: "broken-front",
    name: "KLYRA: Broken Front",
    short: "Broken Front",
    genre: "Military shooter",
    status: "Pre-alpha · Free to play",
    blurb: "The flagship KLYRA game. A serious military shooter with three factions, combined-arms vehicles and an arsenal built for the front line.",
    href: "/games/broken-front/",
    image: "/shots/trailer/gunship.jpg",
    theme: "military",
    accent: "#d8b45a",
    // --- config schema (docs/WEBSITE_ARCHITECTURE.md §8) ---
    slug: "broken-front", title: "KLYRA: Broken Front", description: "Free-to-play military shooter. Pre-alpha.",
    logo: "/brand.png", cover: "/shots/trailer/tanks.jpg", themeKey: "secBF", flagship: true, statusKey: "pre-alpha",
    newsCategory: "broken-front", roadmap: null, layout: "custom",
    links: { download: "/download/", play: "/play/", page: "/games/broken-front/" },
    sections: [
      { id: "overview", label: "Overview", href: "/games/broken-front/", active: true },
      { id: "features", label: "Features", href: "/games/broken-front/features/", active: true },
      { id: "factions", label: "Factions", href: "/games/broken-front/factions/", active: true },
      { id: "arsenal", label: "Arsenal", href: "/games/broken-front/arsenal/", active: true },
      { id: "weapons", label: "Weapons", href: "/games/broken-front/weapons/", active: true },
      { id: "vehicles", label: "Vehicles", href: "/games/broken-front/vehicles/", active: true },
      { id: "roadmap", label: "Roadmap", href: "/games/broken-front/roadmap/", active: true },
      { id: "news", label: "Devlog", href: "/games/broken-front/devlog/", active: true },
      { id: "download", label: "Download", href: "/download/", active: true },
      { id: "play", label: "Play in browser", href: "/play/", active: true },
    ],
  },
  {
    id: "redline",
    name: "KLYRA: Redline",
    short: "Redline",
    genre: "Racing",
    status: "In development",
    blurb: "Racing in two disciplines: Redline Pro for circuit racing and Redline Street for the underground.",
    href: "/games/redline/",
    image: "/cars/redline_street_sports.webp",
    theme: "motorsport",
    accent: "#ff2d3d",
    slug: "redline", title: "KLYRA: Redline", description: "Racing in two disciplines. In development.",
    logo: null, cover: "/cars/redline_pro_touring.webp", themeKey: "secRL", flagship: false, statusKey: "in-development",
    newsCategory: "redline", roadmap: "app/games/redline/data/roadmap.js", layout: "standard",
    links: { download: null, play: null, page: "/games/redline/" },
    sections: [
      { id: "overview", label: "Overview", href: "/games/redline/", active: true },
      { id: "features", label: "Features", href: "/games/redline/features/", active: true },
      { id: "pro", label: "Pro", href: "/games/redline/pro/", active: true },
      { id: "street", label: "Street", href: "/games/redline/street/", active: true },
      { id: "vehicles", label: "Vehicles", href: "/games/redline/vehicles/", active: true },
      { id: "tracks", label: "Tracks", href: "/games/redline/tracks/", active: false }, // no real track content yet
      { id: "media", label: "Media", href: "/games/redline/media/", active: true },
      { id: "roadmap", label: "Roadmap", href: "/games/redline/roadmap/", active: true },
      { id: "news", label: "News", href: "/news/?game=redline", active: false }, // no Redline posts yet
      { id: "play", label: "Play", href: null, active: false }, // not playable
    ],
  },
];

export const redlineDisciplines = [
  { id: "pro", name: "Redline Pro", points: ["Professional circuits", "Elevation changes", "Banked turns", "Lap timing", "Racing AI", "Multiplayer racing"] },
  { id: "street", name: "Redline Street", points: ["Urban environments", "Night racing", "Highway races", "Sprint races", "Drifting", "Customization", "Performance upgrades", "Street reputation"] },
];

export const redlineCars = [
  { id: "redline_pro_touring", name: "Touring car", discipline: "pro" },
  { id: "redline_pro_stock", name: "Stock car", discipline: "pro" },
  { id: "redline_pro_prototype", name: "Prototype", discipline: "pro" },
  { id: "redline_pro_rally", name: "Rally car", discipline: "pro" },
  { id: "redline_pro_openwheeler", name: "Open-wheeler", discipline: "pro" },
  { id: "redline_pro_vintage", name: "Vintage racer", discipline: "pro" },
  { id: "redline_pro_kart", name: "Kart", discipline: "pro" },
  { id: "redline_pro_truck", name: "Race truck", discipline: "pro" },
  { id: "redline_pro_dirtbike", name: "Dirt bike", discipline: "pro" },
  { id: "redline_street_sports", name: "Sports coupe", discipline: "street" },
  { id: "redline_street_muscle", name: "Muscle car", discipline: "street" },
  { id: "redline_street_exotic", name: "Exotic", discipline: "street" },
  { id: "redline_street_hatch", name: "Hot hatch", discipline: "street" },
  { id: "redline_street_sedan", name: "Sedan", discipline: "street" },
  { id: "redline_street_ute", name: "Ute", discipline: "street" },
  { id: "redline_street_truck", name: "Street truck", discipline: "street" },
  { id: "redline_street_motorbike", name: "Motorbike", discipline: "street" },
].map((c) => ({ ...c, model: `/cars/${c.id}.glb`, poster: `/cars/${c.id}.webp` }));

export function activeSections(id) {
  const g = games.find((x) => x.id === id);
  return g ? g.sections.filter((s) => s.active).map((s) => [s.label, s.href]) : [];
}

export function gameById(id) {
  return games.find((g) => g.id === id) || null;
}
