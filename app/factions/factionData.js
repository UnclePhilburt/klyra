// Rough-draft lore. Keep to the agreed facts: no new named people, places or events.
export const factions = [
  {
    slug: "the-regiment",
    logo: "/teams/regiment-v2-512.webp",
    name: "The Regiment",
    team: "Blue team",
    color: "#4f8fe0",
    archetype: "Deployed US troops",
    model: "/models/regiment.glb",
    hook: "Came to keep the peace. Never left.",
    tagline: "The flag on the shoulder makes it legal.",
    lore: [
      "The Regiment are deployed US troops, the flag stitched on every shoulder. They arrived as a peacekeeping force after the civil war, with orders to hold the line until things settled.",
      "Things never settled. The FOBs grew into towns, the towns needed guarding, and now the Regiment can't leave. Peacekeeping turned into gray-zone work, run with deniability, because the flag on the shoulder makes it legal.",
      "Some of them signed up to make the world better and got thrown into the reality. Some know exactly why they're really here. Some still don't.",
      "Every Blackline atrocity gets blamed on the uniform, and the contractors make the job impossible. Out in the villages, Kin of the Hollow is the one force that actually fights back on the ground.",
    ],
    sections: [
      {
        title: "Why they can't finish Blackline",
        paras: [
          "Everyone knows who stands behind Blackline Group. Hitting them hard means attacking a sovereign nation by proxy, and that starts a war nobody in Washington wants on the record.",
          "So the Regiment holds its fire, files its reports, and watches the contractors walk.",
        ],
      },
    ],
    quotes: {
      them: "We're here to keep the peace. Somebody has to.",
      others: "They came to keep the peace. Then they built towns and stayed.",
    },
  },
  {
    slug: "kin-of-the-hollow",
    logo: "/teams/kin-of-the-hollow-v2-512.webp",
    name: "Kin of the Hollow",
    team: "Green team",
    color: "#6fae54",
    archetype: "Insurgents and resistance",
    model: "/models/kin-of-the-hollow.glb",
    hook: "Named for the homes that were emptied.",
    tagline: "Freedom fighters or terrorists. Depends who's asking.",
    lore: [
      "Kin of the Hollow started as a militia of farmers and teachers, defending their villages from Regiment sweeps and Blackline extortion, because nobody else was going to. Blackline did the burning.",
      "The elders knelt to Blackline's guns, not the Regiment's. Blackline burns villages to send messages. The Regiment mostly follows its rules of engagement. The name comes from that wound: hollow, as in the homes that got emptied.",
      "Grief hardened them into something uglier. Their worst acts don't come from ideology. They come from loss. Locals call them freedom fighters. The occupiers call them terrorists.",
      "To the Kin, the Regiment is the daily face of the occupation: checkpoints, house searches, names taken every morning, even if the soldiers mostly follow the rules of engagement. Blackline is the one that burned their villages. Both are the enemy in different ways. One occupies. One destroys.",
    ],
    quotes: {
      them: "We didn't start this. We just stopped running.",
      others: "Terrorists. Every one of them.",
    },
  },
  {
    slug: "blackline-group",
    logo: "/teams/blackline-group-v2-512.webp",
    name: "Blackline Group",
    team: "Red team",
    color: "#d9544a",
    archetype: "Contractors",
    model: "/models/blackline-group.glb",
    hook: "Not just contractors. A proxy knife.",
    tagline: "Officially, they were never here.",
    lore: [
      "Blackline Group are contractors, backed by a state through ties that stay murky on purpose. Plausible deniability is built into every contract.",
      "Their patrons in the East are a rival power of the US. They fund Blackline to bleed the US without ever putting their own uniforms on the ground. Every Regiment casualty is a win for them. That's why Blackline gets the best gear and the most deniability. Not just contractors. A proxy knife.",
      "Their reputation scares both sides. They still supply gear to The Regiment and take their cut from whoever is left standing. When something happens that nobody will claim, people already know who did it.",
      "To Blackline, the Regiment is competition for contracts and a liability: too many witnesses, too many rules. Kin of the Hollow is worse, the one force out there that actually fights back.",
    ],
    sections: [
      {
        title: "Why they sign",
        paras: [
          "Poverty is the engine. Blackline Group recruits from Eastern Europe, Latin America and parts of Africa, from places where the local economy collapsed and a steady paycheck stopped existing.",
          "The recruiting posters sell tactical gear and brotherhood. They leave out the fine print about deniable ops.",
          "Adventure is the story recruits tell themselves after the first payday.",
        ],
      },
      {
        title: "Who they are",
        paras: [
          "Some are true believers who think they're protecting something. Some are professionals who just do the job. Some joined because nowhere else would take them.",
          "That mix is what makes them scary. There's no single villain to point at, just a payroll.",
        ],
      },
    ],
    quotes: {
      them: "We go where others can't. Or won't.",
      others: "If Blackline Group shows up, you're already out of options.",
    },
  },
];
