// One or two lines per character: each was pulled from their own world into Klyra's war.
// Supporter lore lives here too so the Support page can use it; the store never shows supporter characters.
export const lore = {
  police_officer_male: "Was writing a parking ticket when the sky tore open. Still has the ticket book. Still writes them.",
  police_officer_female: "Twelve years on night patrol taught her two things: keep your radio charged and never run toward a bright light. She ran anyway.",
  police_detective_male: "Came to Klyra chasing a suspect through a door that wasn't there yesterday. The case is still open.",
  police_detective_female: "She solved every murder in her precinct. Here the bodies come by the hundreds, and nobody wants to know who did it.",
  police_forensic: "Bags and tags what the war leaves behind. Somebody has to remember who everyone was.",
  police_criminal_male: "Three escapes from county lockup. Klyra is just the biggest cell he's ever been in, and he's already mapping the vents.",
  police_criminal_female: "Got her one phone call. It connected to a recruiting sergeant in another world.",
  palm_city_male: "Stepped out for coffee on a Tuesday. Has not found the coffee, the Tuesday, or the way home.",
  palm_city_female: "Keeps a photo of a beach that doesn't exist here. Shows it to new recruits so they remember what they're fighting to get back to.",
  palm_surfer_male: "Paddled out for the wave of his life and washed up on Klyra's shore. Calls artillery 'the big sets.'",
  palm_surfer_female: "Reads the wind better than any spotter in the regiment. Swears the swell here is terrible.",
  palm_gang_male: "A street kid conscripted by accident when the draft wagon took the wrong corner. Turned out to be the best shot in the platoon.",
  palm_gang_female: "Ran her block back home. Ran three trench lines by her second week here. Nobody remembers giving her the job.",
  palm_goon: "Used to break kneecaps for a boss who never paid on time. The new boss is a general. Pays worse, yells louder.",
  palm_detective_male: "Palm City's sharpest eye, now stuck reading muzzle flashes instead of fingerprints. He hates how good he is at it.",
  palm_detective_female: "Followed a missing-person lead straight into the war. Turns out the missing person was her.",
  palm_sea_captain_male: "Lost his ship in a storm that ended in a desert. Still salutes the horizon every morning.",
  palm_sea_captain_female: "Never lost a crew in thirty years at sea. Here, she writes the letters herself.",
  fantasy_barbarian: "Pulled mid-battle-cry from a world of axes and kings. Hasn't stopped yelling since. Morale has never been higher.",
  fantasy_corpse: "A plague doctor who followed the sick to the front. The sickness followed him further.",
  fantasy_inquisitor: "Hunted heretics across seven kingdoms. Klyra has no gods he recognizes, so he questions everyone.",
  fantasy_necromancer: "In his world the dead obeyed. Here they just keep getting back up on their own, and he finds that rude.",
  fantasy_plague_doctor: "Brought her mask, her herbs and her bad bedside manner. The field medics pretend not to take notes.",
  fantasy_plague_lord: "Once ruled a kingdom of rot. Klyra's trenches feel almost like home, and that worries everyone else.",
  fantasy_undead_01: "Died in one war, woke up in another. Mostly annoyed about the paperwork.",
  fantasy_undead_02: "Doesn't remember his name or his world. Remembers how to hold a rifle. That's enough for the sergeant.",
  fantasy_apothecary: "Packed for a short trip to the market. Now runs the only pharmacy for three factions and charges all of them double.",
  supporter_blue_knight: "A tournament champion, conscripted when his patron's lands fell. He still bows before every fight.",
  supporter_red_kingpin: "A mob boss who woke up in a trench. By Friday he was running every supply-depot racket on the line.",
  supporter_green_wraith: "A real ghost, stuck in a war it can't die in. It has stopped trying to leave.",
};

export function loreFor(id) {
  return lore[id] || "Pulled from another world into Klyra's war.";
}
