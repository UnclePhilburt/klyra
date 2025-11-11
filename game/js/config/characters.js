// Character System - Modular and easy to extend
// Based on klyra2 character definitions

const CHARACTERS = {
    ALDRIC: {
        id: "ALDRIC",
        display: {
            name: "Aldric",
            description: "Armored defender with unwavering resolve",
            class: "Tank/Warrior",
            color: 0x4169E1,
            locked: false,
            avatar: null  // Will use color fallback
        },
        equipment: {
            startingWeapon: "iron_sword"
        },
        stats: {
            base: {
                maxHP: 120,
                damage: 10,
                moveSpeed: 180,
                attackSpeed: 1.0,
                critChance: 0.05,
                critDamage: 1.5,
                armor: 10
            },
            growth: {
                hpPerLevel: 12,
                damagePerLevel: 2
            }
        },
        passives: [
            { id: "iron_will", name: "Iron Will", description: "Respawn once per run at 25% HP" },
            { id: "stalwart", name: "Stalwart", description: "Reduce all incoming damage by 3" },
            { id: "coin_guard", name: "Coin Guard", description: "+20% gold from enemies" }
        ],
        lore: {
            title: "The Shield of Hope",
            background: "Sir Aldric Thornheart, decorated knight of the realm, stands as the last defense against the darkness. His unwavering resolve has saved countless lives.",
            quote: "While I draw breath, evil shall not pass."
        }
    },

    NYX: {
        id: "NYX",
        display: {
            name: "Nyx",
            description: "Swift assassin who strikes from shadows",
            class: "Rogue/Assassin",
            color: 0x228B22,
            locked: false,
            avatar: null
        },
        equipment: {
            startingWeapon: "shadow_daggers"
        },
        stats: {
            base: {
                maxHP: 80,
                damage: 15,
                moveSpeed: 220,
                attackSpeed: 1.5,
                critChance: 0.20,
                critDamage: 2.0,
                armor: 3
            },
            growth: {
                hpPerLevel: 8,
                damagePerLevel: 3
            }
        },
        passives: [
            { id: "shadow_step", name: "Shadow Step", description: "First attack after dodge always crits" },
            { id: "quick_reflexes", name: "Quick Reflexes", description: "20% chance to dodge attacks" },
            { id: "backstab", name: "Backstab", description: "+50% crit damage" }
        ],
        lore: {
            title: "Shadow's Whisper",
            background: "Nyx moves through darkness like a phantom, her twin blades claiming enemies before they know she's there. A master of stealth and precision.",
            quote: "You never see me coming. You only see me leaving."
        }
    },

    MALACHAR: {
        id: "MALACHAR",
        display: {
            name: "Malachar",
            description: "Dark summoner who commands the dead",
            class: "Necromancer",
            color: 0x8B008B,
            locked: false,
            avatar: "assets/sprites/malachar.png"
        },
        equipment: {
            startingWeapon: "necro_staff"
        },
        stats: {
            base: {
                maxHP: 70,
                damage: 8,
                moveSpeed: 170,
                attackSpeed: 0.8,
                critChance: 0.05,
                critDamage: 1.5,
                armor: 2,
                lifesteal: 0.05
            },
            growth: {
                hpPerLevel: 7,
                damagePerLevel: 2
            }
        },
        passives: [
            { id: "blood_pact", name: "Blood Pact", description: "Lifesteal 5% of damage dealt" },
            { id: "dark_harvest", name: "Dark Harvest", description: "15% chance to summon minion on kill" },
            { id: "cursed_power", name: "Cursed Power", description: "+25% damage, +15% damage taken" }
        ],
        lore: {
            title: "The Shadow Summoner",
            background: "Malachar commands the forces of death itself. Once a noble mage, he embraced forbidden necromancy to save his kingdom - only to become the very thing he fought against.",
            quote: "Death is not the end. It is merely a new beginning under my command."
        }
    },

    THRAIN: {
        id: "THRAIN",
        display: {
            name: "Thrain",
            description: "Dwarven berserker with explosive damage",
            class: "Berserker",
            color: 0xDC143C,
            locked: false,
            avatar: null
        },
        equipment: {
            startingWeapon: "battle_axe"
        },
        stats: {
            base: {
                maxHP: 100,
                damage: 18,
                moveSpeed: 160,
                attackSpeed: 0.7,
                critChance: 0.15,
                critDamage: 1.8,
                armor: 7
            },
            growth: {
                hpPerLevel: 10,
                damagePerLevel: 4
            }
        },
        passives: [
            { id: "rage", name: "Rage", description: "+5% damage per 10% missing HP" },
            { id: "bloodlust", name: "Bloodlust", description: "Gain attack speed on kill (stacks)" },
            { id: "tough_skin", name: "Tough Skin", description: "Reduce damage taken by 10%" }
        ],
        lore: {
            title: "The Mountain's Fury",
            background: "Thrain Ironbeard, last of the Mountain Kings, channels ancestral rage into devastating strikes. Each battle fuels his fury, making him unstoppable.",
            quote: "You want a fight? I'll give you a war!"
        }
    },

    ZEPHIRA: {
        id: "ZEPHIRA",
        display: {
            name: "Zephira",
            description: "Wind mage with devastating spells",
            class: "Mage/Sorcerer",
            color: 0xFF4500,
            locked: false,
            avatar: null
        },
        equipment: {
            startingWeapon: "storm_wand"
        },
        stats: {
            base: {
                maxHP: 60,
                damage: 20,
                moveSpeed: 190,
                attackSpeed: 1.2,
                critChance: 0.10,
                critDamage: 2.5,
                armor: 1
            },
            growth: {
                hpPerLevel: 6,
                damagePerLevel: 4
            }
        },
        passives: [
            { id: "glass_cannon", name: "Glass Cannon", description: "+40% damage, -20% HP" },
            { id: "chain_lightning", name: "Chain Lightning", description: "Attacks bounce to nearby enemies" },
            { id: "arcane_power", name: "Arcane Power", description: "+15% damage per kill (resets on hit)" }
        ],
        lore: {
            title: "Storm's Daughter",
            background: "Zephira commands the very winds themselves. Born during a raging tempest, she wields elemental power that few can match - at the cost of her own frailty.",
            quote: "I am the storm. Witness my fury."
        }
    },

    HIROSHI: {
        id: "HIROSHI",
        display: {
            name: "Hiroshi",
            description: "Exiled blade dancer seeking redemption through the way of the sword",
            class: "Samurai Swordmaster",
            color: 0xDC143C,
            locked: false,
            avatar: null
        },
        equipment: {
            startingWeapon: "katana"
        },
        stats: {
            base: {
                maxHP: 100,
                damage: 18,
                moveSpeed: 210,
                attackSpeed: 1.4,
                critChance: 0.25,
                critDamage: 2.0,
                armor: 8
            },
            growth: {
                hpPerLevel: 10,
                damagePerLevel: 3
            }
        },
        passives: [
            { id: "blade_dancer", name: "Blade Dancer", description: "Every 3rd attack strikes twice" },
            { id: "perfect_parry", name: "Perfect Parry", description: "30% chance to reflect damage back" },
            { id: "way_of_the_sword", name: "Way of the Sword", description: "+10% crit chance, +25% crit damage" }
        ],
        lore: {
            title: "The Exiled Blade",
            background: "Once a master swordsman of the Imperial Guard, Hiroshi was exiled after refusing a dishonorable order. Now he wanders the realm, seeking redemption through perfect mastery of the blade.",
            quote: "Honor is not given. It is earned with every swing of the blade."
        }
    }
};

const MINIONS = {
    SKELETON: {
        id: "SKELETON",
        display: { name: "Skeleton", color: 0xCCCCCC },
        stats: { maxHP: 20, damage: 5, moveSpeed: 140, attackSpeed: 1.0 }
    }
};

// Export for custom menu system
if (typeof window !== 'undefined') {
    window.CharacterSystem = {
        CHARACTERS: CHARACTERS,
        MINIONS: MINIONS
    };
}
