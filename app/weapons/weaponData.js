// Optic names as they appear in the game's armory (WeaponPartNames).
export const optics = ["Kestrel R1 Red Dot", "Sentinel M2 Red Dot", "Raven RX Holographic", "Regiment C4 Combat Sight", "Falcon Pro Reflex", "AK Side Rail Scope"];
export const grips = ["Ranger V1 Foregrip", "Sentinel V2 Foregrip", "Raider V3 Foregrip", "Pathfinder V4 Foregrip", "Warden V5 Foregrip", "Regiment V6 Foregrip"];

// Add new weapons here; a matching app/weapons/<slug>/page.jsx renders each one.
export const weapons = [
  { slug: "ak-74", name: "AK-74", kind: "Assault rifle", model: "/models/ak74.glb", orbit: "90deg 80deg auto", copy: "A rugged rifle that keeps working when everything around it doesn't.", parts: ["Top-mounted sight", "Curved magazine"] },
  { slug: "m4a1", name: "M4A1", kind: "Carbine", model: "/models/m4a1.glb", orbit: "90deg 80deg auto", copy: "Shown here with a red dot sight on the top rail and a weapon light mounted on the handguard.", parts: ["Red dot sight", "Weapon light"] },
];

export const getWeapon = (slug) => weapons.find((w) => w.slug === slug);