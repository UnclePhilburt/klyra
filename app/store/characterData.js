export const CHARACTER_PRICE_CENTS = 199;
export const CHARACTER_PRICE_LABEL = "$1.99";

export const teams = {
  blue: { key: "blue", name: "The Regiment", slug: "the-regiment", color: "#4f8fe0" },
  red: { key: "red", name: "Blackline Group", slug: "blackline-group", color: "#d9544a" },
  green: { key: "green", name: "Kin of the Hollow", slug: "kin-of-the-hollow", color: "#6fae54" },
};

const c = (id, name, resource, allowedTeams, exclusive = false) => ({
  id,
  name,
  resource,
  teams: allowedTeams,
  exclusive,
  model: `/characters/${id}.glb`,
  poster: `/characters/${id}.webp`,
});

export const supporterCharacters = [
  c("supporter_blue_knight", "Knight", "Fantasy_Knight_01", ["blue"], true),
  c("supporter_red_kingpin", "Kingpin", "Palm_Kingpin_01", ["red"], true),
  c("supporter_green_wraith", "Wraith", "Fantasy_Wraith_01", ["green"], true),
];

export const shopCharacters = [
  c("police_officer_male", "Officer", "Police_Officer_Male_01", ["green", "blue"]),
  c("police_officer_female", "Officer (Female)", "Police_Officer_Female_01", ["green", "blue"]),
  c("police_detective_male", "Detective", "Police_Detective_Male_01", ["blue"]),
  c("police_detective_female", "Detective (Female)", "Police_Detective_Female_01", ["blue"]),
  c("police_forensic", "Forensic Specialist", "Police_Forensic_01", ["blue"]),
  c("police_criminal_male", "Criminal", "Police_Criminal_Male_01", ["red"]),
  c("police_criminal_female", "Criminal (Female)", "Police_Criminal_Female_01", ["red", "green"]),
  c("palm_city_male", "City Resident", "Palm_City_Male_01", ["green"]),
  c("palm_city_female", "City Resident (Female)", "Palm_City_Female_01", ["green"]),
  c("palm_surfer_male", "Surfer", "Palm_Surfer_Male_01", ["green"]),
  c("palm_surfer_female", "Surfer (Female)", "Palm_Surfer_Female_01", ["green"]),
  c("palm_gang_male", "Gang Member", "Palm_Gang_Male_01", ["red", "green"]),
  c("palm_gang_female", "Gang Member (Female)", "Palm_Gang_Female_01", ["red"]),
  c("palm_goon", "Goon", "Palm_Goon_01", ["red"]),
  c("palm_detective_male", "Palm City Detective", "Palm_Detective_Male_01", ["red", "blue"]),
  c("palm_detective_female", "Palm City Detective (Female)", "Palm_Detective_Female_01", ["blue"]),
  c("palm_sea_captain_male", "Sea Captain", "Palm_SeaCaptain_Male_01", ["blue"]),
  c("palm_sea_captain_female", "Sea Captain (Female)", "Palm_SeaCaptain_Female_01", ["blue"]),
  c("fantasy_barbarian", "Barbarian", "Fantasy_Barbarian_01", ["red"]),
  c("fantasy_corpse", "Corpse", "Fantasy_Corpse_01", ["red"]),
  c("fantasy_inquisitor", "Inquisitor", "Fantasy_Inquisitor_01", ["blue"]),
  c("fantasy_necromancer", "Necromancer", "Fantasy_Necromancer_01", ["green"]),
  c("fantasy_plague_doctor", "Plague Doctor", "Fantasy_Plague_01", ["green"]),
  c("fantasy_plague_lord", "Plague Lord", "Fantasy_PlagueLord_01", ["red"]),
  c("fantasy_undead_01", "Undead I", "Fantasy_Undead_01", ["red"]),
  c("fantasy_undead_02", "Undead II", "Fantasy_Undead_02", ["blue"]),
  c("fantasy_apothecary", "Apothecary", "Fantasy_Apothecary_01", ["green"]),
];

const w = (id, name, resource, blurb) => ({
  id,
  name,
  resource,
  blurb,
  teams: ["blue", "red", "green"],
  exclusive: true,
  kind: "weapon",
  accent: "#d8b45a",
  model: `/supporter-weapons/${id}.glb`,
  poster: `/supporter-weapons/${id}.webp`,
});

export const supporterWeapons = [
  w("supporter_midas_ak47", "Midas AK-47", "Gold AK-47", "Gold assault rifle"),
  w("supporter_sunfire_rpg7", "Sunfire RPG-7", "Gold RPG", "Gold rocket launcher"),
];

export const supporterExclusives = [...supporterCharacters, ...supporterWeapons];

export const allCharacters = [...supporterCharacters, ...supporterWeapons, ...shopCharacters];

export function characterById(id) {
  return allCharacters.find((ch) => ch.id === id) || null;
}
