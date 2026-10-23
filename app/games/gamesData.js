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
  },
];

export const redlineDisciplines = [
  { id: "pro", name: "Redline Pro", points: ["Circuit racing", "Championships", "Racing AI", "Precision driving"] },
  { id: "street", name: "Redline Street", points: ["Underground", "Urban", "Customization", "Drifting", "Night racing", "Progression"] },
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

export function gameById(id) {
  return games.find((g) => g.id === id) || null;
}
