// Malachar Skill Tree - 100 Levels
// Three build paths: 🔵 LEGION, 🔴 CHAMPION, 🟣 REAPER

const MalacharSkillTree = {
    // Level 1: First Steps
    1: [
        {
            id: 'summon_shade',
            name: 'Summon Shade',
            description: 'Gain a 2nd permanent minion',
            icon: '👻',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'dark_empowerment',
            name: 'Dark Empowerment',
            description: 'All minions gain +50% HP and damage',
            icon: '💪',
            path: 'champion',
            rarity: 'uncommon',
            effect: { minionHealth: 1.5, minionDamage: 1.5 }
        },
        {
            id: 'siphon_life',
            name: 'Siphon Life',
            description: 'Malachar heals 5 HP per enemy kill',
            icon: '🩸',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { healPerKill: 5 }
        }
    ],

    // Level 2: Growing Power
    2: [
        {
            id: 'pack_mentality',
            name: 'Pack Mentality',
            description: 'All minions deal +5% damage per nearby minion',
            icon: '🐺',
            path: 'legion',
            rarity: 'uncommon',
            effect: { packDamageBonus: 0.05 }
        },
        {
            id: 'titans_constitution',
            name: "Titan's Constitution",
            description: 'All minions gain +100% HP',
            icon: '🛡️',
            path: 'champion',
            rarity: 'rare',
            effect: { minionHealth: 2.0 }
        },
        {
            id: 'shadow_volley',
            name: 'Shadow Volley',
            description: 'Auto-fire shadow bolts at nearest enemy every 3s (15 damage)',
            icon: '⚡',
            path: 'reaper',
            rarity: 'rare',
            effect: { shadowVolley: { damage: 15, cooldown: 3000 } }
        }
    ],

    // Level 3: Third Force
    3: [
        {
            id: 'third_shadow',
            name: 'Third Shadow',
            description: 'Gain a 3rd permanent minion',
            icon: '👤',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'crushing_blows',
            name: 'Crushing Blows',
            description: 'All minions deal +40% damage',
            icon: '💥',
            path: 'champion',
            rarity: 'uncommon',
            effect: { minionDamage: 1.4 }
        },
        {
            id: 'blood_pact',
            name: 'Blood Pact',
            description: 'Malachar gains +2 HP regen per living minion',
            icon: '🔮',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { regenPerMinion: 2 }
        }
    ],

    // Level 4: Tactical Edge
    4: [
        {
            id: 'coordinated_assault',
            name: 'Coordinated Assault',
            description: 'All minions focus the same target automatically, +15% damage',
            icon: '🎯',
            path: 'legion',
            rarity: 'rare',
            effect: { coordinatedDamage: 1.15 }
        },
        {
            id: 'guardians_resolve',
            name: "Guardian's Resolve",
            description: 'All minions take 20% less damage',
            icon: '🛡️',
            path: 'champion',
            rarity: 'uncommon',
            effect: { minionDefense: 0.8 }
        },
        {
            id: 'deaths_embrace',
            name: "Death's Embrace",
            description: 'Killing blows restore 8% of Malachar max HP',
            icon: '💀',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { healOnKillPercent: 0.08 }
        }
    ],

    // Level 5: Swift Strike
    5: [
        {
            id: 'swift_swarm',
            name: 'Swift Swarm',
            description: 'All minions gain +20% movement speed',
            icon: '💨',
            path: 'legion',
            rarity: 'common',
            effect: { minionSpeed: 1.2 }
        },
        {
            id: 'colossal_form',
            name: 'Colossal Form',
            description: 'All minions grow 50% larger, +30% all stats',
            icon: '🦍',
            path: 'champion',
            rarity: 'rare',
            effect: { minionSize: 1.5, minionAllStats: 1.3 }
        },
        {
            id: 'curse_aura',
            name: 'Curse Aura',
            description: 'Enemies near Malachar are slowed by 30%',
            icon: '🌀',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { curseAura: { slowPercent: 0.3, radius: 4 } }
        }
    ],

    // Level 6: Fourth Shadow
    6: [
        {
            id: 'fourth_minion',
            name: 'Fourth Minion',
            description: 'Gain a 4th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'regenerating_flesh',
            name: 'Regenerating Flesh',
            description: 'All minions regenerate 2% HP per second',
            icon: '💚',
            path: 'champion',
            rarity: 'rare',
            effect: { minionRegen: 0.02 }
        },
        {
            id: 'soul_harvest',
            name: 'Soul Harvest',
            description: 'Gain +10% XP from all kills',
            icon: '✨',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { xpBonus: 1.1 }
        }
    ],

    // Level 7: Relentless Assault
    7: [
        {
            id: 'swarming_tactics',
            name: 'Swarming Tactics',
            description: 'All minions attack 15% faster',
            icon: '⚔️',
            path: 'legion',
            rarity: 'uncommon',
            effect: { minionAttackSpeed: 1.15 }
        },
        {
            id: 'berserker_rage',
            name: 'Berserker Rage',
            description: 'All minions gain +50% damage when below 40% HP',
            icon: '😡',
            path: 'champion',
            rarity: 'rare',
            effect: { berserkerDamage: 1.5, berserkerThreshold: 0.4 }
        },
        {
            id: 'dark_resilience',
            name: 'Dark Resilience',
            description: 'Malachar gains +25 max HP',
            icon: '❤️',
            path: 'reaper',
            rarity: 'common',
            effect: { maxHealth: 25 }
        }
    ],

    // Level 8: Overwhelming Force
    8: [
        {
            id: 'strength_in_numbers',
            name: 'Strength in Numbers',
            description: '+10% damage and defense per minion alive (max 200%)',
            icon: '💪',
            path: 'legion',
            rarity: 'rare',
            effect: { perMinionBonus: 0.1, maxBonus: 2.0 }
        },
        {
            id: 'unstoppable_force',
            name: 'Unstoppable Force',
            description: 'All minions cannot be slowed or stunned',
            icon: '🚀',
            path: 'champion',
            rarity: 'rare',
            effect: { unstoppable: true }
        },
        {
            id: 'withering_aura',
            name: 'Withering Aura',
            description: 'Enemies near Malachar lose 5 HP/sec',
            icon: '☠️',
            path: 'reaper',
            rarity: 'rare',
            effect: { damageAura: { dps: 5, radius: 4 } }
        }
    ],

    // Level 9: Fifth Legion
    9: [
        {
            id: 'fifth_minion',
            name: 'Fifth Minion',
            description: 'Gain a 5th permanent minion',
            icon: '👪',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'cleaving_strikes',
            name: 'Cleaving Strikes',
            description: "All minions' attacks hit multiple enemies in a cone",
            icon: '🌊',
            path: 'champion',
            rarity: 'rare',
            effect: { cleave: true }
        },
        {
            id: 'shadow_dash',
            name: 'Shadow Dash',
            description: 'Automatically dash away when hit by melee attack (5s cooldown)',
            icon: '💨',
            path: 'reaper',
            rarity: 'rare',
            effect: { shadowDash: { cooldown: 5000 } }
        }
    ],

    // Level 10: Defensive Tactics
    10: [
        {
            id: 'unified_front',
            name: 'Unified Front',
            description: 'All minions gain +30% defense when grouped together',
            icon: '🛡️',
            path: 'legion',
            rarity: 'uncommon',
            effect: { groupedDefense: 1.3, groupRadius: 4 }
        },
        {
            id: 'bloodlust',
            name: 'Bloodlust',
            description: 'All minions gain +3% damage per kill (stacks to +60%)',
            icon: '🩸',
            path: 'champion',
            rarity: 'rare',
            effect: { killDamageStack: 0.03, maxStacks: 20 }
        },
        {
            id: 'reapers_mark',
            name: "Reaper's Mark",
            description: 'Automatically mark low-HP enemies to take +25% damage from all sources',
            icon: '💀',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { reapersMarkThreshold: 0.3, reapersMarkDamage: 1.25 }
        }
    ],

    // Level 11: Accelerated Growth
    11: [
        {
            id: 'rapid_deployment',
            name: 'Rapid Deployment',
            description: "Dark Harvest spawns minions 50% more often (15% → 22.5% chance)",
            icon: '⚡',
            path: 'legion',
            rarity: 'uncommon',
            effect: { darkHarvestBonus: 1.5 }
        },
        {
            id: 'vampiric_strikes',
            name: 'Vampiric Strikes',
            description: 'All minions heal 25% of damage dealt',
            icon: '🩸',
            path: 'champion',
            rarity: 'rare',
            effect: { minionLifesteal: 0.25 }
        },
        {
            id: 'piercing_bolts',
            name: 'Piercing Bolts',
            description: 'Shadow Volley now pierces enemies and deals +10 damage',
            icon: '⚡',
            path: 'reaper',
            rarity: 'rare',
            effect: { shadowVolleyPierce: true, shadowVolleyDamageBonus: 10 }
        }
    ],

    // Level 12: Resilience
    12: [
        {
            id: 'expendable_forces',
            name: 'Expendable Forces',
            description: 'Temporary minions from Dark Harvest last 50% longer',
            icon: '⏱️',
            path: 'legion',
            rarity: 'common',
            effect: { tempMinionDuration: 1.5 }
        },
        {
            id: 'iron_hide',
            name: 'Iron Hide',
            description: 'All minions gain +15 armor (flat damage reduction)',
            icon: '🛡️',
            path: 'champion',
            rarity: 'uncommon',
            effect: { minionArmor: 15 }
        },
        {
            id: 'corpse_detonation',
            name: 'Corpse Detonation',
            description: 'Enemies automatically explode on death (30 AOE damage, 4 tile radius)',
            icon: '💥',
            path: 'reaper',
            rarity: 'rare',
            effect: { corpseExplosion: { damage: 30, radius: 4 } }
        }
    ],

    // Level 13: Sixth Shadow
    13: [
        {
            id: 'sixth_minion',
            name: 'Sixth Minion',
            description: 'Gain a 6th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'stunning_blows',
            name: 'Stunning Blows',
            description: "All minions' attacks stun enemies for 0.5s (3s cooldown per minion)",
            icon: '💫',
            path: 'champion',
            rarity: 'rare',
            effect: { minionStun: { duration: 500, cooldown: 3000 } }
        },
        {
            id: 'dark_mastery',
            name: 'Dark Mastery',
            description: 'Shadow Volley fires 20% faster',
            icon: '🌑',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { shadowVolleySpeed: 1.2 }
        }
    ],

    // Level 14: Tactical Superiority
    14: [
        {
            id: 'overwhelming_numbers',
            name: 'Overwhelming Numbers',
            description: 'Enemies are slowed by 5% per nearby minion (stacks)',
            icon: '🐺',
            path: 'legion',
            rarity: 'rare',
            effect: { enemySlowPerMinion: 0.05 }
        },
        {
            id: 'immovable_object',
            name: 'Immovable Object',
            description: 'All minions gain +100% knockback resistance',
            icon: '⚓',
            path: 'champion',
            rarity: 'uncommon',
            effect: { minionKnockbackResist: 2.0 }
        },
        {
            id: 'life_drain_aura',
            name: 'Life Drain Aura',
            description: 'Malachar drains 10 HP/sec from nearby enemies (4 tile radius)',
            icon: '💀',
            path: 'reaper',
            rarity: 'rare',
            effect: { lifeDrainAura: { dps: 10, radius: 4 } }
        }
    ],

    // Level 15: Battle Fury
    15: [
        {
            id: 'frenzied_attack',
            name: 'Frenzied Attack',
            description: 'All minions gain +25% attack speed',
            icon: '⚔️',
            path: 'legion',
            rarity: 'uncommon',
            effect: { minionAttackSpeed: 1.25 }
        },
        {
            id: 'critical_mass',
            name: 'Critical Mass',
            description: 'All minions have 20% chance for critical hits (3x damage)',
            icon: '💥',
            path: 'champion',
            rarity: 'rare',
            effect: { minionCritChance: 0.2, minionCritDamage: 3.0 }
        },
        {
            id: 'shadow_veil',
            name: 'Shadow Veil',
            description: 'Become invisible for 2s after killing an enemy (5s cooldown)',
            icon: '👻',
            path: 'reaper',
            rarity: 'rare',
            effect: { invisOnKill: { duration: 2000, cooldown: 5000 } }
        }
    ],

    // Level 16: Seventh Legion
    16: [
        {
            id: 'seventh_minion',
            name: 'Seventh Minion',
            description: 'Gain a 7th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'executioner',
            name: 'Executioner',
            description: 'All minions deal +100% damage to enemies below 25% HP',
            icon: '⚔️',
            path: 'champion',
            rarity: 'rare',
            effect: { executeThreshold: 0.25, executeDamage: 2.0 }
        },
        {
            id: 'necromantic_surge',
            name: 'Necromantic Surge',
            description: 'Malachar gains +5% damage per dead minion this run (permanent)',
            icon: '💀',
            path: 'reaper',
            rarity: 'epic',
            effect: { damagePerDeadMinion: 0.05 }
        }
    ],

    // Level 17: Flanking Strike
    17: [
        {
            id: 'flanking_maneuvers',
            name: 'Flanking Maneuvers',
            description: 'All minions deal +30% damage when attacking from behind',
            icon: '🗡️',
            path: 'legion',
            rarity: 'uncommon',
            effect: { flankDamage: 1.3 }
        },
        {
            id: 'siege_breaker',
            name: 'Siege Breaker',
            description: 'All minions deal +50% damage to bosses and elites',
            icon: '🔨',
            path: 'champion',
            rarity: 'rare',
            effect: { bossDamage: 1.5 }
        },
        {
            id: 'soul_barrier',
            name: 'Soul Barrier',
            description: 'Automatically absorb 100 damage when hit (10s cooldown)',
            icon: '🛡️',
            path: 'reaper',
            rarity: 'rare',
            effect: { soulBarrier: { damage: 100, cooldown: 10000 } }
        }
    ],

    // Level 18: Fortification
    18: [
        {
            id: 'resilient_horde',
            name: 'Resilient Horde',
            description: 'All minions gain +50% max HP',
            icon: '❤️',
            path: 'legion',
            rarity: 'uncommon',
            effect: { minionHealth: 1.5 }
        },
        {
            id: 'behemoth',
            name: 'Behemoth',
            description: 'All minions become massive (+100% size), +50% all stats',
            icon: '🦍',
            path: 'champion',
            rarity: 'epic',
            effect: { minionSize: 2.0, minionAllStats: 1.5 }
        },
        {
            id: 'plague_spreader',
            name: 'Plague Spreader',
            description: 'Spread disease dealing 10 damage/sec in 5 tile radius',
            icon: '☠️',
            path: 'reaper',
            rarity: 'rare',
            effect: { plagueAura: { dps: 10, radius: 5 } }
        }
    ],

    // Level 19: Eighth Shadow
    19: [
        {
            id: 'eighth_minion',
            name: 'Eighth Minion',
            description: 'Gain an 8th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'last_stand',
            name: 'Last Stand',
            description: 'All minions cannot drop below 1 HP for 5s (60s cooldown per minion)',
            icon: '💪',
            path: 'champion',
            rarity: 'epic',
            effect: { lastStand: { duration: 5000, cooldown: 60000 } }
        },
        {
            id: 'blood_sacrifice',
            name: 'Blood Sacrifice',
            description: 'Sacrifice 20% max HP for +50% damage (permanent trade-off)',
            icon: '🩸',
            path: 'reaper',
            rarity: 'legendary',
            effect: { sacrificeHealth: -0.2, sacrificeDamage: 1.5 }
        }
    ],

    // Level 20: Commander's Presence
    20: [
        {
            id: 'legion_commander',
            name: 'Legion Commander',
            description: 'All minions gain +20% all stats when near Malachar (6 tile radius)',
            icon: '👑',
            path: 'legion',
            rarity: 'rare',
            effect: { commandAura: { bonus: 1.2, radius: 6 } }
        },
        {
            id: 'apex_predator',
            name: 'Apex Predator',
            description: 'All minions gain +10% all stats per unique enemy type killed (max 50%)',
            icon: '🦁',
            path: 'champion',
            rarity: 'epic',
            effect: { adaptiveStats: { perType: 0.1, maxBonus: 0.5 } }
        },
        {
            id: 'shadow_form',
            name: 'Shadow Form',
            description: 'Automatically transform into shadow for 5s when below 30% HP (60s cooldown, invulnerable, +100% damage)',
            icon: '👤',
            path: 'reaper',
            rarity: 'legendary',
            effect: { shadowForm: { threshold: 0.3, duration: 5000, cooldown: 60000, damageBonus: 2.0 } }
        }
    ],

    // Level 21: Ninth Legion
    21: [
        {
            id: 'ninth_minion',
            name: 'Ninth Minion',
            description: 'Gain a 9th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'impact_strikes',
            name: 'Impact Strikes',
            description: "All minions' attacks knock enemies back",
            icon: '💨',
            path: 'champion',
            rarity: 'uncommon',
            effect: { minionKnockback: true }
        },
        {
            id: 'void_eruption',
            name: 'Void Eruption',
            description: 'Periodically release AOE explosion (every 15s, 8 tile radius, 200 damage)',
            icon: '💥',
            path: 'reaper',
            rarity: 'epic',
            effect: { voidEruption: { interval: 15000, radius: 8, damage: 200 } }
        }
    ],

    // Level 22: Hive Mind
    22: [
        {
            id: 'swarm_intelligence',
            name: 'Swarm Intelligence',
            description: 'All minions share vision and target priority threats automatically (+20% accuracy)',
            icon: '🧠',
            path: 'legion',
            rarity: 'rare',
            effect: { sharedVision: true, accuracy: 1.2 }
        },
        {
            id: 'lifesteal_mastery',
            name: 'Lifesteal Mastery',
            description: 'Minion lifesteal increased to 40% of damage dealt',
            icon: '🩸',
            path: 'champion',
            rarity: 'rare',
            effect: { minionLifesteal: 0.4 }
        },
        {
            id: 'cursed_ground',
            name: 'Cursed Ground',
            description: 'Leave damaging trail behind Malachar (20 damage/sec, lasts 5s)',
            icon: '🌑',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { cursedTrail: { dps: 20, duration: 5000 } }
        }
    ],

    // Level 23: Sacrifice
    23: [
        {
            id: 'sacrifice_play',
            name: 'Sacrifice Play',
            description: 'Minions automatically body-block projectiles aimed at Malachar',
            icon: '🛡️',
            path: 'legion',
            rarity: 'rare',
            effect: { bodyBlock: true }
        },
        {
            id: 'demon_form',
            name: 'Demon Form',
            description: 'All minions grow horns/wings, +40% all stats, gain flight over obstacles',
            icon: '👹',
            path: 'champion',
            rarity: 'epic',
            effect: { demonForm: true, minionAllStats: 1.4, flight: true }
        },
        {
            id: 'soul_collector',
            name: 'Soul Collector',
            description: 'Souls automatically orbit Malachar (+5 damage each, max 10 souls, collect on kill)',
            icon: '✨',
            path: 'reaper',
            rarity: 'rare',
            effect: { soulCollector: { damagePerSoul: 5, maxSouls: 10 } }
        }
    ],

    // Level 24: Tenth Shadow
    24: [
        {
            id: 'tenth_minion',
            name: 'Tenth Minion',
            description: 'Gain a 10th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'shockwave_strikes',
            name: 'Shockwave Strikes',
            description: 'All minions create shockwaves on attack (4 tile radius, 20 damage)',
            icon: '💫',
            path: 'champion',
            rarity: 'rare',
            effect: { shockwaveAttack: { radius: 4, damage: 20 } }
        },
        {
            id: 'lich_form',
            name: 'Lich Form',
            description: 'Become undead (immune to poison/disease/bleed, -50% healing received)',
            icon: '💀',
            path: 'reaper',
            rarity: 'epic',
            effect: { lichForm: true, statusImmune: ['poison', 'disease', 'bleed'], healingReduction: 0.5 }
        }
    ],

    // Level 25: Power Surge
    25: [
        {
            id: 'synchronized_strikes',
            name: 'Synchronized Strikes',
            description: 'All minions attack in perfect sync every 5 seconds (coordinated burst)',
            icon: '⚡',
            path: 'legion',
            rarity: 'epic',
            effect: { syncAttack: { interval: 5000 } }
        },
        {
            id: 'juggernaut',
            name: 'Juggernaut',
            description: 'All minions gain +200% HP, -20% movement speed, unstoppable',
            icon: '🚂',
            path: 'champion',
            rarity: 'epic',
            effect: { minionHealth: 3.0, minionSpeed: 0.8, unstoppable: true }
        },
        {
            id: 'essence_theft',
            name: 'Essence Theft',
            description: 'Steal 5% of enemy max HP on hit (max 50 damage per hit)',
            icon: '💀',
            path: 'reaper',
            rarity: 'rare',
            effect: { essenceTheft: { percent: 0.05, maxDamage: 50 } }
        }
    ],

    // Level 26: Mass Resurrection
    26: [
        {
            id: 'phoenix_legion',
            name: 'Phoenix Legion',
            description: 'All dead minions automatically return to life after 10 seconds',
            icon: '🔥',
            path: 'legion',
            rarity: 'legendary',
            effect: { autoResurrect: { delay: 10000 } }
        },
        {
            id: 'elemental_weapons',
            name: 'Elemental Weapons',
            description: 'All minions gain flaming/frost/poison weapons (+30 elemental damage)',
            icon: '🔥',
            path: 'champion',
            rarity: 'epic',
            effect: { elementalDamage: 30 }
        },
        {
            id: 'retaliatory_nova',
            name: 'Retaliatory Nova',
            description: 'Automatically emit explosion when damaged (50 damage, 5 tile radius, 8s cooldown)',
            icon: '💥',
            path: 'reaper',
            rarity: 'rare',
            effect: { retaliationNova: { damage: 50, radius: 5, cooldown: 8000 } }
        }
    ],

    // Level 27: Eleventh Legion
    27: [
        {
            id: 'eleventh_minion',
            name: 'Eleventh Minion',
            description: 'Gain an 11th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'brutal_efficiency',
            name: 'Brutal Efficiency',
            description: 'All minions have 25% chance to instantly kill enemies below 30% HP',
            icon: '⚔️',
            path: 'champion',
            rarity: 'epic',
            effect: { executeChance: 0.25, executeThreshold: 0.3 }
        },
        {
            id: 'shadow_evasion',
            name: 'Shadow Evasion',
            description: 'Gain +50% evasion when in shadows/darkness',
            icon: '👻',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { shadowEvasion: 0.5 }
        }
    ],

    // Level 28: Regeneration
    28: [
        {
            id: 'pack_regeneration',
            name: 'Pack Regeneration',
            description: 'All minions heal 3% HP/sec when grouped (3+ minions within 4 tiles)',
            icon: '💚',
            path: 'legion',
            rarity: 'uncommon',
            effect: { packRegen: { rate: 0.03, minCount: 3, radius: 4 } }
        },
        {
            id: 'boss_killer',
            name: 'Boss Killer',
            description: 'All minions deal +150% damage to boss enemies',
            icon: '👑',
            path: 'champion',
            rarity: 'rare',
            effect: { bossDamage: 2.5 }
        },
        {
            id: 'hex_master',
            name: 'Hex Master',
            description: 'Automatically apply random curse to nearby enemies (every 8s, 6 tile radius)',
            icon: '🔮',
            path: 'reaper',
            rarity: 'rare',
            effect: { hexAura: { interval: 8000, radius: 6 } }
        }
    ],

    // Level 29: Tactical Retreat
    29: [
        {
            id: 'hit_and_run',
            name: 'Hit and Run',
            description: 'Minions below 30% HP automatically flee and heal 5% HP/sec',
            icon: '💨',
            path: 'legion',
            rarity: 'uncommon',
            effect: { tacticalRetreat: { threshold: 0.3, regenRate: 0.05 } }
        },
        {
            id: 'dragons_breath',
            name: "Dragon's Breath",
            description: 'All minions breathe fire in a cone (6 tile length, 40 damage, 10s cooldown)',
            icon: '🐲',
            path: 'champion',
            rarity: 'epic',
            effect: { fireBreath: { range: 6, damage: 40, cooldown: 10000 } }
        },
        {
            id: 'life_for_power',
            name: 'Life for Power',
            description: 'Passively convert 1% HP per second to +2% damage (stops at 50% HP)',
            icon: '⚡',
            path: 'reaper',
            rarity: 'rare',
            effect: { lifeToDamage: { hpRate: 0.01, damageRate: 0.02, minHP: 0.5 } }
        }
    ],

    // Level 30: Twelfth Shadow
    30: [
        {
            id: 'twelfth_minion',
            name: 'Twelfth Minion',
            description: 'Gain a 12th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'armor_penetration',
            name: 'Armor Penetration',
            description: 'All minions ignore 50% of enemy armor',
            icon: '🗡️',
            path: 'champion',
            rarity: 'rare',
            effect: { armorPen: 0.5 }
        },
        {
            id: 'reapers_fury',
            name: "Reaper's Fury",
            description: 'Automatically enter fury mode when enemy dies nearby (+100% damage for 5s, 10s cooldown)',
            icon: '😡',
            path: 'reaper',
            rarity: 'rare',
            effect: { furyOnKill: { damageBonus: 2.0, duration: 5000, cooldown: 10000 } }
        }
    ],

    // Level 31: Formation Fighting
    31: [
        {
            id: 'phalanx_formation',
            name: 'Phalanx Formation',
            description: 'Minions automatically form defensive formation, take -30% damage when grouped',
            icon: '🛡️',
            path: 'legion',
            rarity: 'uncommon',
            effect: { phalanxDefense: 0.7, groupRadius: 4 }
        },
        {
            id: 'rapid_strikes',
            name: 'Rapid Strikes',
            description: 'All minions attack 50% faster',
            icon: '⚔️',
            path: 'champion',
            rarity: 'rare',
            effect: { minionAttackSpeed: 1.5 }
        },
        {
            id: 'cooldown_reduction',
            name: 'Cooldown Reduction',
            description: 'Damaging enemies reduces all passive cooldowns by 0.5s',
            icon: '⏱️',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { cdrOnHit: 500 }
        }
    ],

    // Level 32: Summoning Power
    32: [
        {
            id: 'expendable_army',
            name: 'Expendable Army',
            description: 'Automatically summon 3 temporary weak minions every 30s',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: { autoSummon: { count: 3, interval: 30000 } }
        },
        {
            id: 'impenetrable_hide',
            name: 'Impenetrable Hide',
            description: 'All minions gain +50 armor (flat damage reduction)',
            icon: '🛡️',
            path: 'champion',
            rarity: 'rare',
            effect: { minionArmor: 50 }
        },
        {
            id: 'shadow_barrage',
            name: 'Shadow Barrage',
            description: 'Shadow Volley fires 5 bolts in spread pattern (instead of 1)',
            icon: '⚡',
            path: 'reaper',
            rarity: 'epic',
            effect: { shadowVolleyCount: 5 }
        }
    ],

    // Level 33: Thirteenth Legion
    33: [
        {
            id: 'thirteenth_minion',
            name: 'Thirteenth Minion',
            description: 'Gain a 13th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'leap_attack',
            name: 'Leap Attack',
            description: 'All minions periodically leap to distant enemies (8 tile range, stuns on landing, 15s cooldown)',
            icon: '🦘',
            path: 'champion',
            rarity: 'rare',
            effect: { leapAttack: { range: 8, cooldown: 15000, stun: true } }
        },
        {
            id: 'mind_control',
            name: 'Mind Control',
            description: 'Periodically control a random enemy for 5s (60s cooldown)',
            icon: '🧠',
            path: 'reaper',
            rarity: 'epic',
            effect: { mindControl: { duration: 5000, cooldown: 60000 } }
        }
    ],

    // Level 34: Shared Pain
    34: [
        {
            id: 'hive_retaliation',
            name: 'Hive Retaliation',
            description: 'When one minion takes damage, all gain +20% damage for 5s',
            icon: '⚡',
            path: 'legion',
            rarity: 'rare',
            effect: { hiveRetribution: { damageBonus: 1.2, duration: 5000 } }
        },
        {
            id: 'apocalypse_form',
            name: 'Apocalypse Form',
            description: 'All minions wreathed in dark energy (+80% all stats, leave burning trail)',
            icon: '🔥',
            path: 'champion',
            rarity: 'legendary',
            effect: { apocalypseForm: true, minionAllStats: 1.8, burningTrail: true }
        },
        {
            id: 'pain_link',
            name: 'Pain Link',
            description: 'Automatically link to damaged enemy, both share 50% of damage taken (15s duration)',
            icon: '🔗',
            path: 'reaper',
            rarity: 'rare',
            effect: { painLink: { sharePercent: 0.5, duration: 15000 } }
        }
    ],

    // Level 35: Blitz
    35: [
        {
            id: 'charge_formation',
            name: 'Charge Formation',
            description: 'All minions automatically charge at distant enemies (stuns on hit, 20s cooldown)',
            icon: '🚀',
            path: 'legion',
            rarity: 'uncommon',
            effect: { chargeAttack: { cooldown: 20000, stun: true } }
        },
        {
            id: 'savage_frenzy',
            name: 'Savage Frenzy',
            description: 'Below 30% HP, all minions gain +100% attack speed and lifesteal',
            icon: '😡',
            path: 'champion',
            rarity: 'rare',
            effect: { savageFrenzy: { threshold: 0.3, attackSpeed: 2.0, lifesteal: 0.5 } }
        },
        {
            id: 'doom_mark',
            name: 'Doom Mark',
            description: 'Periodically mark enemy for death (instant kill in 10s if mark not removed, 90s cooldown)',
            icon: '☠️',
            path: 'reaper',
            rarity: 'legendary',
            effect: { doomMark: { delay: 10000, cooldown: 90000 } }
        }
    ],

    // Level 36: Fourteenth Shadow
    36: [
        {
            id: 'fourteenth_minion',
            name: 'Fourteenth Minion',
            description: 'Gain a 14th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'chain_lightning',
            name: 'Chain Lightning',
            description: "All minions' attacks chain to 3 nearby enemies (50% damage to chained)",
            icon: '⚡',
            path: 'champion',
            rarity: 'epic',
            effect: { chainAttack: { targets: 3, damagePercent: 0.5 } }
        },
        {
            id: 'second_chance',
            name: 'Second Chance',
            description: 'Automatically survive lethal damage once per run (full heal when triggered)',
            icon: '💚',
            path: 'reaper',
            rarity: 'legendary',
            effect: { secondChance: true }
        }
    ],

    // Level 37: Wall of Flesh
    37: [
        {
            id: 'living_barrier',
            name: 'Living Barrier',
            description: 'Minions automatically form protective barrier around Malachar (-50% damage taken)',
            icon: '🛡️',
            path: 'legion',
            rarity: 'rare',
            effect: { livingBarrier: 0.5 }
        },
        {
            id: 'momentum',
            name: 'Momentum',
            description: 'All minions gain +5% damage per consecutive hit on same target (max +100%)',
            icon: '💥',
            path: 'champion',
            rarity: 'rare',
            effect: { momentumDamage: { perHit: 0.05, maxStacks: 20 } }
        },
        {
            id: 'dark_pact',
            name: 'Dark Pact',
            description: 'Permanently sacrifice 50 max HP for +25% permanent damage',
            icon: '💀',
            path: 'reaper',
            rarity: 'epic',
            effect: { sacrificeHealth: -50, sacrificeDamage: 1.25 }
        }
    ],

    // Level 38: Replication
    38: [
        {
            id: 'split_legion',
            name: 'Split Legion',
            description: '10% chance to spawn an extra temporary minion on kill (15s duration)',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: { splitChance: 0.1, splitDuration: 15000 }
        },
        {
            id: 'dispel_strikes',
            name: 'Dispel Strikes',
            description: 'All minions automatically dispel enemy buffs on hit',
            icon: '✨',
            path: 'champion',
            rarity: 'uncommon',
            effect: { dispelOnHit: true }
        },
        {
            id: 'phase_walk',
            name: 'Phase Walk',
            description: 'Passively phase through enemies while moving',
            icon: '👻',
            path: 'reaper',
            rarity: 'uncommon',
            effect: { phaseWalk: true }
        }
    ],

    // Level 39: Fifteenth Legion
    39: [
        {
            id: 'fifteenth_minion',
            name: 'Fifteenth Minion',
            description: 'Gain a 15th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'meteor_rain',
            name: 'Meteor Rain',
            description: 'All minions automatically call meteors around themselves (6 tile radius, 80 damage, 20s cooldown)',
            icon: '☄️',
            path: 'champion',
            rarity: 'epic',
            effect: { meteorRain: { radius: 6, damage: 80, cooldown: 20000 } }
        },
        {
            id: 'soulbound',
            name: 'Soulbound',
            description: 'Cannot die while any minion is alive (damage transfers to minions instead)',
            icon: '🔗',
            path: 'reaper',
            rarity: 'legendary',
            effect: { soulbound: true }
        }
    ],

    // Level 40: Harmony
    40: [
        {
            id: 'perfect_harmony',
            name: 'Perfect Harmony',
            description: 'All legion-specific buffs increased by 50%',
            icon: '✨',
            path: 'legion',
            rarity: 'epic',
            effect: { legionBuffMultiplier: 1.5 }
        },
        {
            id: 'mythic_ascension',
            name: 'Mythic Ascension',
            description: 'All minions become legendary tier (glowing aura, +60% all stats)',
            icon: '⭐',
            path: 'champion',
            rarity: 'legendary',
            effect: { mythicTier: true, minionAllStats: 1.6 }
        },
        {
            id: 'dark_sovereign',
            name: 'Dark Sovereign',
            description: 'Automatically command nearby undead enemies (6 tile radius, 15s control)',
            icon: '👑',
            path: 'reaper',
            rarity: 'epic',
            effect: { darkSovereign: { radius: 6, duration: 15000 } }
        }
    ],

    // MID GAME (Levels 41-60)

    // Level 41: Sixteenth Shadow
    41: [
        {
            id: 'sixteenth_minion',
            name: 'Sixteenth Minion',
            description: 'Gain a 16th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'crater_strikes',
            name: 'Crater Strikes',
            description: "All minions' attacks create craters that slow enemies (3s duration)",
            icon: '💥',
            path: 'champion',
            rarity: 'uncommon',
            effect: { craterSlowDuration: 3000 }
        },
        {
            id: 'fear_aura',
            name: 'Fear Aura',
            description: 'Enemies near Malachar have 50% chance to flee (4 tile radius)',
            icon: '😱',
            path: 'reaper',
            rarity: 'rare',
            effect: { fearAura: { chance: 0.5, radius: 4 } }
        }
    ],

    // Level 42: Intelligence
    42: [
        {
            id: 'advanced_tactics',
            name: 'Advanced Tactics',
            description: 'Minions automatically prioritize wounded enemies and protect Malachar',
            icon: '🧠',
            path: 'legion',
            rarity: 'rare',
            effect: { advancedAI: true }
        },
        {
            id: 'adaptive_defense',
            name: 'Adaptive Defense',
            description: 'All minions gain 30% resistance to last damage type they took',
            icon: '🛡️',
            path: 'champion',
            rarity: 'rare',
            effect: { adaptiveResist: 0.3 }
        },
        {
            id: 'lunar_power',
            name: 'Lunar Power',
            description: 'All passive abilities trigger 200% faster during nighttime/darkness',
            icon: '🌙',
            path: 'reaper',
            rarity: 'epic',
            effect: { lunarBonus: 3.0 }
        }
    ],

    // Level 43: Deployment
    43: [
        {
            id: 'tactical_summon',
            name: 'Tactical Summon',
            description: 'New minions spawn at optimal combat positions',
            icon: '🎯',
            path: 'legion',
            rarity: 'uncommon',
            effect: { tacticalSpawn: true }
        },
        {
            id: 'auto_resurrection',
            name: 'Auto-Resurrection',
            description: 'All minions automatically resurrect once (120s cooldown per minion)',
            icon: '💚',
            path: 'champion',
            rarity: 'epic',
            effect: { autoRevive: { cooldown: 120000 } }
        },
        {
            id: 'corpse_army',
            name: 'Corpse Army',
            description: 'Automatically raise 5 skeleton warriors from nearby corpses (30s duration, 40s cooldown)',
            icon: '💀',
            path: 'reaper',
            rarity: 'rare',
            effect: { raiseUndead: { count: 5, duration: 30000, cooldown: 40000 } }
        }
    ],

    // Level 44: Seventeenth Shadow
    44: [
        {
            id: 'seventeenth_minion',
            name: 'Seventeenth Minion',
            description: 'Gain a 17th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'dual_wield',
            name: 'Dual Wield',
            description: 'All minions dual-wield weapons, attacks hit twice',
            icon: '⚔️',
            path: 'champion',
            rarity: 'epic',
            effect: { dualWield: true, attacksPerStrike: 2 }
        },
        {
            id: 'immortal_moment',
            name: 'Immortal Moment',
            description: 'Automatically gain invulnerability at 1 HP for 3 seconds (once per encounter)',
            icon: '✨',
            path: 'reaper',
            rarity: 'legendary',
            effect: { lastStand: { duration: 3000 } }
        }
    ],

    // Level 45: Capstone Powers
    45: [
        {
            id: 'endless_horde',
            name: 'Endless Horde',
            description: 'Automatically summon 10 weak minions when outnumbered (20s duration, 90s cooldown)',
            icon: '👥',
            path: 'legion',
            rarity: 'legendary',
            effect: { emergencySwarm: { count: 10, duration: 20000, cooldown: 90000 } }
        },
        {
            id: 'colossus_core',
            name: 'Colossus Core',
            description: 'All minions become raid-boss size (+200% all stats, +150% size)',
            icon: '🦍',
            path: 'champion',
            rarity: 'legendary',
            effect: { minionSize: 2.5, minionAllStats: 3.0 }
        },
        {
            id: 'eclipse_zone',
            name: 'Eclipse Zone',
            description: 'Automatically create darkness zone when surrounded (10 tile radius, +100% damage inside, 20s duration, 60s cooldown)',
            icon: '🌑',
            path: 'reaper',
            rarity: 'legendary',
            effect: { eclipseZone: { radius: 10, damageBonus: 2.0, duration: 20000, cooldown: 60000 } }
        }
    ],

    // Level 46: Execution
    46: [
        {
            id: 'synchronized_kill',
            name: 'Synchronized Kill',
            description: 'All minions perform automatic execution on enemies below 15% HP',
            icon: '⚔️',
            path: 'legion',
            rarity: 'rare',
            effect: { syncExecute: { threshold: 0.15 } }
        },
        {
            id: 'guardian_shield',
            name: 'Guardian Shield',
            description: 'Strongest minion automatically intercepts damage to Malachar (5s duration, 60s cooldown)',
            icon: '🛡️',
            path: 'champion',
            rarity: 'epic',
            effect: { guardianShield: { duration: 5000, cooldown: 60000 } }
        },
        {
            id: 'soul_rend',
            name: 'Soul Rend',
            description: 'Automatically rip soul from low-HP enemy (instant kill if below 40% HP, 45s cooldown)',
            icon: '💀',
            path: 'reaper',
            rarity: 'epic',
            effect: { soulRend: { threshold: 0.4, cooldown: 45000 } }
        }
    ],

    // Level 47: Eighteenth Shadow
    47: [
        {
            id: 'eighteenth_minion',
            name: 'Eighteenth Minion',
            description: 'Gain an 18th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'instant_death',
            name: 'Instant Death',
            description: "All minions' attacks have 10% chance to instantly kill non-boss enemies",
            icon: '💀',
            path: 'champion',
            rarity: 'legendary',
            effect: { instakillChance: 0.1 }
        },
        {
            id: 'dread_aura',
            name: 'Dread Aura',
            description: "Malachar's presence reduces enemy damage by 30% (8 tile radius)",
            icon: '😱',
            path: 'reaper',
            rarity: 'rare',
            effect: { dreadAura: { damageReduction: 0.3, radius: 8 } }
        }
    ],

    // Level 48: Rampage
    48: [
        {
            id: 'killing_spree',
            name: 'Killing Spree',
            description: 'Each minion kill gives all minions +5% damage for 10s (stacks to +100%)',
            icon: '⚡',
            path: 'legion',
            rarity: 'rare',
            effect: { killSpree: { damagePerKill: 0.05, duration: 10000, maxStacks: 20 } }
        },
        {
            id: 'massacre',
            name: 'Massacre',
            description: 'All minions gain +10% damage for each enemy killed in last 5s (max +200%)',
            icon: '🔥',
            path: 'champion',
            rarity: 'epic',
            effect: { massacre: { damagePerKill: 0.1, window: 5000, maxBonus: 3.0 } }
        },
        {
            id: 'death_spiral',
            name: 'Death Spiral',
            description: 'Automatically spin attack periodically (6 tile radius, 100 damage, 12s cooldown)',
            icon: '🌀',
            path: 'reaper',
            rarity: 'rare',
            effect: { deathSpiral: { radius: 6, damage: 100, cooldown: 12000 } }
        }
    ],

    // Level 49: Nineteenth Shadow
    49: [
        {
            id: 'nineteenth_minion',
            name: 'Nineteenth Minion',
            description: 'Gain a 19th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'unbreakable_fury',
            name: 'Unbreakable Fury',
            description: 'All minions enter auto-berserk below 50% HP (+150% damage, cannot be stopped)',
            icon: '😡',
            path: 'champion',
            rarity: 'epic',
            effect: { berserkThreshold: 0.5, berserkDamage: 2.5, unstoppable: true }
        },
        {
            id: 'pain_empowerment',
            name: 'Pain Empowerment',
            description: 'Malachar gains +3% damage per 1% missing HP (max +300%)',
            icon: '💪',
            path: 'reaper',
            rarity: 'epic',
            effect: { painEmpowerment: { perPercent: 0.03, maxBonus: 3.0 } }
        }
    ],

    // Level 50: Overwhelming Power
    50: [
        {
            id: 'unstoppable_legion',
            name: 'Unstoppable Legion',
            description: 'All minions immune to crowd control, gain +40% movement speed',
            icon: '🚀',
            path: 'legion',
            rarity: 'legendary',
            effect: { ccImmune: true, minionSpeed: 1.4 }
        },
        {
            id: 'titans_reach',
            name: "Titan's Reach",
            description: 'All minions gain double attack range and +100% attack size',
            icon: '🗡️',
            path: 'champion',
            rarity: 'epic',
            effect: { attackRange: 2.0, attackSize: 2.0 }
        },
        {
            id: 'apocalypse_wave',
            name: 'Apocalypse Wave',
            description: 'Automatically pulse massive AOE damage when at low HP (activates at 25% HP, immune during, 120s cooldown)',
            icon: '💥',
            path: 'reaper',
            rarity: 'legendary',
            effect: { apocalypseWave: { threshold: 0.25, cooldown: 120000 } }
        }
    ],

    // Level 51: Twentieth Shadow
    51: [
        {
            id: 'twentieth_minion',
            name: 'Twentieth Minion',
            description: 'Gain a 20th permanent minion',
            icon: '👥',
            path: 'legion',
            rarity: 'uncommon',
            effect: 'spawn_minion'
        },
        {
            id: 'perfect_accuracy',
            name: 'Perfect Accuracy',
            description: 'All minions gain +100% accuracy and cannot miss',
            icon: '🎯',
            path: 'champion',
            rarity: 'rare',
            effect: { perfectAccuracy: true }
        },
        {
            id: 'vampire_lord',
            name: 'Vampire Lord',
            description: 'Malachar heals for 50% of all damage dealt (personal and minion damage)',
            icon: '🩸',
            path: 'reaper',
            rarity: 'legendary',
            effect: { vampireLord: 0.5 }
        }
    ],

    // Level 52: Supremacy
    52: [
        {
            id: 'supreme_legion',
            name: 'Supreme Legion',
            description: 'All minions gain +5% all stats per character level (retroactive)',
            icon: '⭐',
            path: 'legion',
            rarity: 'epic',
            effect: { statsPerLevel: 0.05 }
        },
        {
            id: 'immortal_champions',
            name: 'Immortal Champions',
            description: 'All minions automatically resurrect after 5 seconds (no cooldown)',
            icon: '💚',
            path: 'champion',
            rarity: 'legendary',
            effect: { instantRevive: { delay: 5000 } }
        },
        {
            id: 'shadow_dominion',
            name: 'Shadow Dominion',
            description: 'Malachar gains +100% damage in darkness, creates permanent darkness aura (10 tile radius)',
            icon: '🌑',
            path: 'reaper',
            rarity: 'epic',
            effect: { shadowDominion: { damageBonus: 2.0, darknessRadius: 10 } }
        }
    ],

    // Level 53: Domination
    53: [
        {
            id: 'instant_teleport',
            name: 'Instant Teleport',
            description: 'Minions instantly teleport to targets, ignore pathing',
            icon: '✨',
            path: 'legion',
            rarity: 'rare',
            effect: { instantTeleport: true }
        },
        {
            id: 'true_damage',
            name: 'True Damage',
            description: 'All minions deal true damage (ignores all resistances/armor)',
            icon: '⚡',
            path: 'champion',
            rarity: 'legendary',
            effect: { trueDamage: true }
        },
        {
            id: 'life_eater',
            name: 'Life Eater',
            description: 'Malachar steals 10% max HP from enemies on hit (max 100 per hit)',
            icon: '💀',
            path: 'reaper',
            rarity: 'epic',
            effect: { lifeSteal: { percent: 0.1, maxPerHit: 100 } }
        }
    ],

    // Level 54: Mastery
    54: [
        {
            id: 'legion_mastery',
            name: 'Legion Mastery',
            description: 'Pack Mentality bonus doubled (10% per minion instead of 5%)',
            icon: '👑',
            path: 'legion',
            rarity: 'epic',
            effect: { packMentalityBonus: 2.0 }
        },
        {
            id: 'champion_mastery',
            name: 'Champion Mastery',
            description: 'All stat bonuses to minions increased by 50%',
            icon: '⚔️',
            path: 'champion',
            rarity: 'epic',
            effect: { championMastery: 1.5 }
        },
        {
            id: 'reaper_mastery',
            name: 'Reaper Mastery',
            description: "All Malachar's passive abilities trigger 50% faster and are 50% more effective",
            icon: '💀',
            path: 'reaper',
            rarity: 'epic',
            effect: { reaperMastery: { speed: 1.5, effectiveness: 1.5 } }
        }
    ],

    // Level 55: Transcendence
    55: [
        {
            id: 'transcendent_army',
            name: 'Transcendent Army',
            description: 'Minions phase through each other and obstacles',
            icon: '👻',
            path: 'legion',
            rarity: 'rare',
            effect: { phaseMovement: true }
        },
        {
            id: 'ascended_form',
            name: 'Ascended Form',
            description: 'All minions gain wings, flight, and +80% all stats',
            icon: '🕊️',
            path: 'champion',
            rarity: 'legendary',
            effect: { ascended: true, minionAllStats: 1.8, flight: true }
        },
        {
            id: 'shadow_god',
            name: 'Shadow God',
            description: 'Malachar becomes semi-transparent, gains 75% evasion',
            icon: '👤',
            path: 'reaper',
            rarity: 'legendary',
            effect: { evasion: 0.75, transparency: true }
        }
    ],

    // Level 56: Retribution
    56: [
        {
            id: 'vengeful_swarm',
            name: 'Vengeful Swarm',
            description: 'When a minion dies, all others automatically gain +50% damage for 10s',
            icon: '⚡',
            path: 'legion',
            rarity: 'rare',
            effect: { vengeance: { damageBonus: 1.5, duration: 10000 } }
        },
        {
            id: 'retribution_aura',
            name: 'Retribution Aura',
            description: 'All minions automatically reflect 50% of damage taken back to attackers',
            icon: '🛡️',
            path: 'champion',
            rarity: 'epic',
            effect: { reflectDamage: 0.5 }
        },
        {
            id: 'deaths_vengeance',
            name: "Death's Vengeance",
            description: 'When Malachar is hit, automatically unleash 3 homing shadow bolts',
            icon: '💀',
            path: 'reaper',
            rarity: 'rare',
            effect: { retaliationBolts: 3 }
        }
    ],

    // Level 57: Amplification
    57: [
        {
            id: 'exponential_growth',
            name: 'Exponential Growth',
            description: 'Every 5th minion spawned from Dark Harvest automatically becomes permanent',
            icon: '📈',
            path: 'legion',
            rarity: 'epic',
            effect: { permanentConversion: 5 }
        },
        {
            id: 'exponential_power',
            name: 'Exponential Power',
            description: 'All minion buffs stack multiplicatively instead of additively',
            icon: '💥',
            path: 'champion',
            rarity: 'legendary',
            effect: { multiplicativeStacking: true }
        },
        {
            id: 'exponential_dark',
            name: 'Exponential Dark',
            description: "Malachar's damage automatically doubles every 10 seconds in combat (resets out of combat)",
            icon: '⚡',
            path: 'reaper',
            rarity: 'legendary',
            effect: { exponentialDamage: { interval: 10000 } }
        }
    ],

    // Level 58: Unity
    58: [
        {
            id: 'legion_unity',
            name: 'Legion Unity',
            description: 'All minions share HP pool (damage distributed evenly among living minions)',
            icon: '💚',
            path: 'legion',
            rarity: 'epic',
            effect: { sharedHP: true }
        },
        {
            id: 'champion_unity',
            name: 'Champion Unity',
            description: 'All minions automatically gain the highest stat value among them (HP, damage, etc.)',
            icon: '⚡',
            path: 'champion',
            rarity: 'epic',
            effect: { statSharing: true }
        },
        {
            id: 'master_unity',
            name: 'Master Unity',
            description: 'Malachar and all minions gain +20% all stats',
            icon: '⭐',
            path: 'reaper',
            rarity: 'rare',
            effect: { unityBonus: 1.2 }
        }
    ],

    // Level 59: Devastation
    59: [
        {
            id: 'explosive_death',
            name: 'Explosive Death',
            description: 'Minions automatically explode on death (damage equal to their max HP, 6 tile radius)',
            icon: '💥',
            path: 'legion',
            rarity: 'epic',
            effect: { deathExplosion: { radius: 6 } }
        },
        {
            id: 'splash_damage',
            name: 'Splash Damage',
            description: 'All minion attacks automatically deal AOE splash (4 tile radius, 50% of attack)',
            icon: '💧',
            path: 'champion',
            rarity: 'rare',
            effect: { splashDamage: { radius: 4, percent: 0.5 } }
        },
        {
            id: 'void_zones',
            name: 'Void Zones',
            description: "Malachar's attacks automatically create void zones (last 5s, 30 damage/sec)",
            icon: '🌑',
            path: 'reaper',
            rarity: 'rare',
            effect: { voidZone: { duration: 5000, dps: 30 } }
        }
    ],

    // Level 60: Ultimate Power
    60: [
        {
            id: 'infinite_legion',
            name: 'Infinite Legion',
            description: 'No cap on minion count, Dark Harvest chance increased to 25%',
            icon: '♾️',
            path: 'legion',
            rarity: 'legendary',
            effect: { infiniteMinions: true, darkHarvestChance: 0.25 }
        },
        {
            id: 'divine_champions',
            name: 'Divine Champions',
            description: 'All minions gain +300% all stats, become massive',
            icon: '👑',
            path: 'champion',
            rarity: 'legendary',
            effect: { minionAllStats: 4.0, minionSize: 2.0 }
        },
        {
            id: 'true_reaper',
            name: 'True Reaper',
            description: 'Malachar automatically kills any enemy below 50% HP (10s cooldown)',
            icon: '💀',
            path: 'reaper',
            rarity: 'legendary',
            effect: { executeThreshold: 0.5, executeCooldown: 10000 }
        }
    ],

    // LATE GAME (Levels 61-80)

    // Level 61: Reality Bending
    61: [
        { id: 'endless_spawn', name: 'Endless Spawn', description: 'Automatically spawn 1 temporary minion every 2 seconds during combat', icon: '♾️', path: 'legion', rarity: 'epic', effect: { autoSpawnInterval: 2000 } },
        { id: 'reality_break', name: 'Reality Break', description: 'All minions ignore game physics (fly, phase, teleport freely)', icon: '🌀', path: 'champion', rarity: 'legendary', effect: { ignorePhysics: true } },
        { id: 'time_dilation', name: 'Time Dilation', description: 'Passively slow time for enemies by 50% around Malachar (10 tile radius)', icon: '⏱️', path: 'reaper', rarity: 'epic', effect: { timeSlow: { percent: 0.5, radius: 10 } } }
    ],

    // Level 62: Overwhelming Might
    62: [
        { id: 'tidal_wave', name: 'Tidal Wave', description: 'All minions automatically charge in wave formation when far from enemies (stuns all hit, 30s cooldown)', icon: '🌊', path: 'legion', rarity: 'rare', effect: { tidalWave: { cooldown: 30000 } } },
        { id: 'invincible_offense', name: 'Invincible Offense', description: 'All minions cannot be damaged while attacking', icon: '⚔️', path: 'champion', rarity: 'legendary', effect: { invincibleWhileAttacking: true } },
        { id: 'gravity_well', name: 'Gravity Well', description: "Malachar's attacks automatically create singularities that pull enemies in", icon: '🌑', path: 'reaper', rarity: 'rare', effect: { gravityWell: true } }
    ],

    // Level 63: Perfection
    63: [
        { id: 'perfect_legion', name: 'Perfect Legion', description: 'All minions automatically dodge attacks (50% chance)', icon: '👻', path: 'legion', rarity: 'epic', effect: { dodgeChance: 0.5 } },
        { id: 'perfect_champions', name: 'Perfect Champions', description: 'All minions have guaranteed critical hits on every attack', icon: '⭐', path: 'champion', rarity: 'legendary', effect: { guaranteedCrit: true } },
        { id: 'perfect_reaper', name: 'Perfect Reaper', description: 'Malachar cannot take more than 10% max HP damage from a single hit', icon: '🛡️', path: 'reaper', rarity: 'epic', effect: { maxDamagePercent: 0.1 } }
    ],

    // Level 64: Chaos
    64: [
        { id: 'chaotic_swarm', name: 'Chaotic Swarm', description: 'Minions randomly gain buffs every 5s (+100% to random stat)', icon: '🎲', path: 'legion', rarity: 'rare', effect: { randomBuffs: { interval: 5000, bonus: 2.0 } } },
        { id: 'chaotic_champions', name: 'Chaotic Champions', description: "Minions' attacks have random powerful effects (freeze, burn, explode, etc.)", icon: '💥', path: 'champion', rarity: 'epic', effect: { randomEffects: true } },
        { id: 'chaos_magic', name: 'Chaos Magic', description: "Malachar's passive abilities have random bonus effects", icon: '✨', path: 'reaper', rarity: 'rare', effect: { chaosMagic: true } }
    ],

    // Level 65: Eternity
    65: [
        { id: 'eternal_legion', name: 'Eternal Legion', description: 'Minions never truly die (ghost form for 5s, then resurrect)', icon: '👻', path: 'legion', rarity: 'legendary', effect: { ghostRevive: { delay: 5000 } } },
        { id: 'eternal_champions', name: 'Eternal Champions', description: 'Minions become immortal during boss fights', icon: '👑', path: 'champion', rarity: 'legendary', effect: { bossImmortality: true } },
        { id: 'eternal_reaper', name: 'Eternal Reaper', description: 'Malachar gains +1% all stats per second alive (caps at +500%)', icon: '⭐', path: 'reaper', rarity: 'epic', effect: { statsPerSecond: 0.01, statsCap: 5.0 } }
    ],

    // Level 66: Synergy
    66: [
        { id: 'legion_synergy', name: 'Legion Synergy', description: 'Each different minion buff multiplies with others (+50% effectiveness per unique buff)', icon: '🔗', path: 'legion', rarity: 'epic', effect: { synergyBonus: 0.5 } },
        { id: 'champion_synergy', name: 'Champion Synergy', description: 'Minions grant each other their buffs', icon: '⚡', path: 'champion', rarity: 'epic', effect: { shareBuffs: true } },
        { id: 'reaper_synergy', name: 'Reaper Synergy', description: 'Malachar gains 10% of all minion stats', icon: '💀', path: 'reaper', rarity: 'rare', effect: { inheritMinion Stats: 0.1 } }
    ],

    // Level 67: Nova
    67: [
        { id: 'legion_nova', name: 'Legion Nova', description: 'All minions simultaneously emit shockwave (8 tile radius, 200 damage, 45s cooldown)', icon: '💥', path: 'legion', rarity: 'epic', effect: { legionNova: { radius: 8, damage: 200, cooldown: 45000 } } },
        { id: 'champion_nova', name: 'Champion Nova', description: 'All minions release energy burst when damaged (6 tile radius, 80 damage)', icon: '⚡', path: 'champion', rarity: 'rare', effect: { damageNova: { radius: 6, damage: 80 } } },
        { id: 'reaper_nova', name: 'Reaper Nova', description: "Malachar explodes periodically (10s interval, 10 tile radius, 150 damage, doesn't hurt self)", icon: '💥', path: 'reaper', rarity: 'rare', effect: { periodicExplosion: { interval: 10000, radius: 10, damage: 150 } } }
    ],

    // Level 68: Adaptation
    68: [
        { id: 'adaptive_legion', name: 'Adaptive Legion', description: 'Minions automatically counter enemy types (+100% damage to their counter)', icon: '🎯', path: 'legion', rarity: 'epic', effect: { autoCounter: 2.0 } },
        { id: 'adaptive_champions', name: 'Adaptive Champions', description: 'Minions evolve based on enemies killed (gain their abilities)', icon: '🧬', path: 'champion', rarity: 'legendary', effect: { absorbAbilities: true } },
        { id: 'adaptive_reaper', name: 'Adaptive Reaper', description: 'Malachar becomes immune to damage types after being hit 3 times', icon: '🛡️', path: 'reaper', rarity: 'epic', effect: { adaptiveImmunity: { hitsRequired: 3 } } }
    ],

    // Level 69: Cosmic
    69: [
        { id: 'cosmic_legion', name: 'Cosmic Legion', description: 'Minions attack from orbit (ranged attacks from anywhere on map)', icon: '🌌', path: 'legion', rarity: 'legendary', effect: { orbitalStrikes: true } },
        { id: 'cosmic_champions', name: 'Cosmic Champions', description: 'Minions grow to screen-filling size (+500% all stats)', icon: '🌟', path: 'champion', rarity: 'legendary', effect: { minionSize: 10.0, minionAllStats: 6.0 } },
        { id: 'cosmic_reaper', name: 'Cosmic Reaper', description: 'Malachar bends space (teleport anywhere on map automatically when hit, 8s cooldown)', icon: '🌀', path: 'reaper', rarity: 'epic', effect: { autoTeleport: { cooldown: 8000 } } }
    ],

    // Level 70: Singularity
    70: [
        { id: 'legion_singularity', name: 'Legion Singularity', description: 'All minions can combine into one mega-minion temporarily (combined stats of all, 20s duration, 90s cooldown)', icon: '⚫', path: 'legion', rarity: 'legendary', effect: { megaMinion: { duration: 20000, cooldown: 90000 } } },
        { id: 'champion_singularity', name: 'Champion Singularity', description: 'All buffs focus on strongest minion (+1000% all stats)', icon: '⭐', path: 'champion', rarity: 'legendary', effect: { focusBuffs: 11.0 } },
        { id: 'reaper_singularity', name: 'Reaper Singularity', description: 'Malachar can absorb all minions temporarily, gaining their combined power (30s duration, 120s cooldown)', icon: '🌑', path: 'reaper', rarity: 'legendary', effect: { absorbMinions: { duration: 30000, cooldown: 120000 } } }
    ],

    // Level 71-80: Simplified for brevity
    71: [
        { id: 'overflow_legion', name: 'Overflow Legion', description: 'Minions can stack infinitely in same position (no collision with each other)', icon: '📚', path: 'legion', rarity: 'rare', effect: { infiniteStacking: true } },
        { id: 'overflow_power', name: 'Overflow Power', description: 'Minion stats have no maximum cap (infinite scaling)', icon: '♾️', path: 'champion', rarity: 'legendary', effect: { noStatCap: true } },
        { id: 'overflow_magic', name: 'Overflow Magic', description: "Malachar's passive abilities have no cooldown limits", icon: '⚡', path: 'reaper', rarity: 'epic', effect: { noCooldowns: true } }
    ],

    72: [
        { id: 'total_dominion', name: 'Total Dominion', description: 'Automatically control all entities on screen (enemies fight each other)', icon: '👑', path: 'legion', rarity: 'legendary', effect: { massControl: true } },
        { id: 'champion_dominion', name: 'Champion Dominion', description: 'Minions automatically command their own mini-armies', icon: '⚔️', path: 'champion', rarity: 'epic', effect: { minionArmies: true } },
        { id: 'reaper_dominion', name: 'Reaper Dominion', description: 'Malachar controls life and death (auto-revive allies/kill enemies, 20s cooldown)', icon: '💀', path: 'reaper', rarity: 'legendary', effect: { lifeControl: { cooldown: 20000 } } }
    ],

    73: [
        { id: 'legion_multiplication', name: 'Legion Multiplication', description: 'Minions duplicate on kill (50% chance, temporary duplicates, 15s duration)', icon: '👥', path: 'legion', rarity: 'epic', effect: { duplicateChance: 0.5, duplicateDuration: 15000 } },
        { id: 'champion_multiplication', name: 'Champion Multiplication', description: 'Minions attack multiple times per swing (x5 attacks)', icon: '⚔️', path: 'champion', rarity: 'legendary', effect: { attacksPerSwing: 5 } },
        { id: 'reaper_multiplication', name: 'Reaper Multiplication', description: "Malachar's attacks hit 10 times simultaneously", icon: '💥', path: 'reaper', rarity: 'epic', effect: { multiHit: 10 } }
    ],

    74: [
        { id: 'legion_resonance', name: 'Legion Resonance', description: 'Minions create chain reactions (kills trigger explosions that trigger more)', icon: '💥', path: 'legion', rarity: 'epic', effect: { chainReaction: true } },
        { id: 'champion_resonance', name: 'Champion Resonance', description: 'Minion attacks resonate, dealing damage again after 1s (echo attacks)', icon: '🔊', path: 'champion', rarity: 'rare', effect: { echoAttacks: { delay: 1000 } } },
        { id: 'reaper_resonance', name: 'Reaper Resonance', description: "Malachar's abilities bounce between enemies infinitely until all are dead", icon: '⚡', path: 'reaper', rarity: 'legendary', effect: { infiniteBounce: true } }
    ],

    75: [
        { id: 'legion_nexus', name: 'Legion Nexus', description: 'Create nexus that spawns minions automatically (1 per second, permanent structure)', icon: '🏛️', path: 'legion', rarity: 'legendary', effect: { nexusSpawn: { rate: 1000 } } },
        { id: 'champion_nexus', name: 'Champion Nexus', description: 'Minions orbit around nexus point, gaining +200% all stats', icon: '⭐', path: 'champion', rarity: 'epic', effect: { nexusOrbit: { statsBonus: 3.0 } } },
        { id: 'reaper_nexus', name: 'Reaper Nexus', description: 'Malachar becomes a nexus of death (10 tile instant-kill aura)', icon: '💀', path: 'reaper', rarity: 'legendary', effect: { deathNexus: { radius: 10 } } }
    ],

    76: [
        { id: 'divine_legion', name: 'Divine Legion', description: 'Minions become divine entities (immune to all negative effects)', icon: '✨', path: 'legion', rarity: 'legendary', effect: { divineImmunity: true } },
        { id: 'divine_champions', name: 'Divine Champions', description: 'Minions gain holy powers (auto-heal allies, smite enemies for true damage)', icon: '🕊️', path: 'champion', rarity: 'legendary', effect: { holyPowers: true } },
        { id: 'divine_reaper', name: 'Divine Reaper', description: 'Malachar ascends to godhood (+200% all stats, golden aura, flight)', icon: '👑', path: 'reaper', rarity: 'legendary', effect: { godhood: { statsBonus: 3.0, flight: true } } }
    ],

    77: [
        { id: 'legion_storm', name: 'Legion Storm', description: 'Minions move like a hurricane (massive AOE damage while moving)', icon: '🌪️', path: 'legion', rarity: 'epic', effect: { hurricaneMovement: true } },
        { id: 'champion_storm', name: 'Champion Storm', description: 'Minions summon lightning strikes (auto-targeting, 100 damage, 2s interval)', icon: '⚡', path: 'champion', rarity: 'rare', effect: { lightning: { damage: 100, interval: 2000 } } },
        { id: 'reaper_storm', name: 'Reaper Storm', description: 'Malachar summons permanent dark storm (covers entire map, 20 damage/sec to enemies)', icon: '🌩️', path: 'reaper', rarity: 'legendary', effect: { darkStorm: { dps: 20 } } }
    ],

    78: [
        { id: 'legion_fusion', name: 'Legion Fusion', description: 'Minions can temporarily fuse (2 minions = 1 mega minion with combined stats, 30s duration, 60s cooldown)', icon: '🔗', path: 'legion', rarity: 'epic', effect: { fusion: { duration: 30000, cooldown: 60000 } } },
        { id: 'champion_fusion', name: 'Champion Fusion', description: 'Minions fuse all buffs together (multiplicative stacking on all buffs)', icon: '⚡', path: 'champion', rarity: 'legendary', effect: { buffFusion: true } },
        { id: 'reaper_fusion', name: 'Reaper Fusion', description: 'Malachar fuses with shadow realm (phase between dimensions freely, immune while phased)', icon: '🌑', path: 'reaper', rarity: 'epic', effect: { dimensionPhase: true } }
    ],

    79: [
        { id: 'infinite_swarm', name: 'Infinite Swarm', description: 'Minion visual count becomes infinite (100 active minions shown as thousands)', icon: '♾️', path: 'legion', rarity: 'epic', effect: { visualMultiplier: 10 } },
        { id: 'infinite_power', name: 'Infinite Power', description: 'Minion damage scales infinitely with time (+10% per second in combat)', icon: '⚡', path: 'champion', rarity: 'legendary', effect: { infiniteScaling: { perSecond: 0.1 } } },
        { id: 'infinite_death', name: 'Infinite Death', description: "Malachar's kills grant permanent stacking damage (+1% per kill, no cap)", icon: '💀', path: 'reaper', rarity: 'legendary', effect: { killDamageStacking: 0.01 } }
    ],

    80: [
        { id: 'omega_legion', name: 'Omega Legion', description: 'All minions gain all legion buffs simultaneously (+50% effectiveness each)', icon: '⭐', path: 'legion', rarity: 'legendary', effect: { omegaLegion: 1.5 } },
        { id: 'omega_champions', name: 'Omega Champions', description: 'All minions become raid-boss tier (+300% all stats, immunity to stuns)', icon: '👑', path: 'champion', rarity: 'legendary', effect: { raidBoss: { statsBonus: 4.0, stunImmune: true } } },
        { id: 'omega_reaper', name: 'Omega Reaper', description: 'Malachar becomes death incarnate (death aura 8 tiles, 50 damage/sec)', icon: '💀', path: 'reaper', rarity: 'legendary', effect: { deathIncarnate: { radius: 8, dps: 50 } } }
    ],

    // END GAME (Levels 81-100)

    81: [
        { id: 'quantum_legion', name: 'Quantum Legion', description: 'Minions attack from multiple angles simultaneously (attacks hit 3 times)', icon: '🌀', path: 'legion', rarity: 'epic', effect: { quantumAttacks: 3 } },
        { id: 'quantum_champions', name: 'Quantum Champions', description: "Minions' attacks ignore 75% armor and resistances", icon: '⚡', path: 'champion', rarity: 'rare', effect: { armorPen: 0.75 } },
        { id: 'quantum_reaper', name: 'Quantum Reaper', description: 'Malachar automatically rewinds position 3s back when taking lethal damage (10s cooldown)', icon: '⏮️', path: 'reaper', rarity: 'legendary', effect: { timeRewind: { seconds: 3, cooldown: 10000 } } }
    ],

    82: [
        { id: 'absolute_numbers', name: 'Absolute Numbers', description: 'Gain 5 additional permanent minions immediately', icon: '👥', path: 'legion', rarity: 'legendary', effect: { instantMinions: 5 } },
        { id: 'absolute_power', name: 'Absolute Power', description: 'All minions deal true damage (cannot be reduced)', icon: '⚔️', path: 'champion', rarity: 'legendary', effect: { absoluteDamage: true } },
        { id: 'absolute_death', name: 'Absolute Death', description: "Malachar's attacks deal +10% of enemy max HP as bonus damage", icon: '💀', path: 'reaper', rarity: 'epic', effect: { percentDamage: 0.1 } }
    ],

    83: [
        { id: 'star_legion', name: 'Star Legion', description: 'Minions leave burning trails (30 damage/sec, 3s duration)', icon: '⭐', path: 'legion', rarity: 'rare', effect: { starTrail: { dps: 30, duration: 3000 } } },
        { id: 'star_champions', name: 'Star Champions', description: 'Minions explode on death (screen-wide 200 damage)', icon: '💥', path: 'champion', rarity: 'epic', effect: { massiveExplosion: { damage: 200 } } },
        { id: 'star_reaper', name: 'Star Reaper', description: 'Malachar creates gravity well (pulls all enemies in 10 tile radius)', icon: '🌟', path: 'reaper', rarity: 'rare', effect: { massGravity: { radius: 10 } } }
    ],

    84: [
        { id: 'paradox_legion', name: 'Paradox Legion', description: 'When a minion dies, automatically summon 2 temporary copies (15s duration)', icon: '👥', path: 'legion', rarity: 'epic', effect: { paradoxRevive: { copies: 2, duration: 15000 } } },
        { id: 'paradox_champions', name: 'Paradox Champions', description: 'Minions below 1 HP become invulnerable for 5s, then fully heal (60s cooldown per minion)', icon: '✨', path: 'champion', rarity: 'legendary', effect: { paradoxHeal: { duration: 5000, cooldown: 60000 } } },
        { id: 'paradox_reaper', name: 'Paradox Reaper', description: 'Malachar survives lethal damage 3 times per encounter (auto-trigger)', icon: '🛡️', path: 'reaper', rarity: 'legendary', effect: { tripleRevive: true } }
    ],

    85: [
        { id: 'mythic_legion', name: 'Mythic Legion', description: 'Minions evolve into legendary creatures (dragons, phoenixes - +150% all stats, flight)', icon: '🐉', path: 'legion', rarity: 'legendary', effect: { mythicEvolution: { statsBonus: 2.5, flight: true } } },
        { id: 'mythic_champions', name: 'Mythic Champions', description: 'Minions gain mythical weapons (chain lightning, frost nova, flame waves)', icon: '⚔️', path: 'champion', rarity: 'legendary', effect: { mythicWeapons: true } },
        { id: 'mythic_reaper', name: 'Mythic Reaper', description: 'Malachar phases through enemies (50% evasion, phase through units)', icon: '👻', path: 'reaper', rarity: 'epic', effect: { mythicPhase: { evasion: 0.5 } } }
    ],

    86: [
        { id: 'legion_genesis', name: 'Legion Genesis', description: 'Automatically spawn 1 elite minion every 30s (double stats, permanent)', icon: '⭐', path: 'legion', rarity: 'epic', effect: { eliteSpawn: { interval: 30000, statsBonus: 2.0 } } },
        { id: 'champion_genesis', name: 'Champion Genesis', description: 'Each minion spawns a smaller minion that inherits 50% of their stats', icon: '👥', path: 'champion', rarity: 'rare', effect: { inheritanceSpawn: 0.5 } },
        { id: 'reaper_genesis', name: 'Reaper Genesis', description: 'Malachar can reshape terrain (destroy obstacles, 20s cooldown)', icon: '🏔️', path: 'reaper', rarity: 'epic', effect: { terrainControl: { cooldown: 20000 } } }
    ],

    87: [
        { id: 'eternal_army', name: 'Eternal Army', description: 'Minions respawn instantly (no death timer)', icon: '♾️', path: 'legion', rarity: 'legendary', effect: { instantRespawn: true } },
        { id: 'eternal_champions', name: 'Eternal Champions', description: 'Minions gain +1% all stats per second alive (caps at +200%)', icon: '⏱️', path: 'champion', rarity: 'epic', effect: { timeBonus: { perSecond: 0.01, cap: 2.0 } } },
        { id: 'eternal_reaper', name: 'Eternal Reaper', description: 'Malachar gains +1% damage per kill this session (caps at +500%)', icon: '💀', path: 'reaper', rarity: 'epic', effect: { sessionKills: { perKill: 0.01, cap: 5.0 } } }
    ],

    88: [
        { id: 'void_legion', name: 'Void Legion', description: 'Minions become shadow entities (50% damage reduction, phase through units)', icon: '🌑', path: 'legion', rarity: 'epic', effect: { voidForm: { damageReduction: 0.5, phase: true } } },
        { id: 'void_champions', name: 'Void Champions', description: 'Minions deal void damage (ignores shields, bypasses invulnerability)', icon: '⚫', path: 'champion', rarity: 'legendary', effect: { voidDamage: true } },
        { id: 'void_reaper', name: 'Void Reaper', description: 'Malachar creates void zones on hit (5 tile radius, 40 damage/sec, 5s duration)', icon: '💀', path: 'reaper', rarity: 'rare', effect: { voidZoneOnHit: { radius: 5, dps: 40, duration: 5000 } } }
    ],

    89: [
        { id: 'multiverse_legion', name: 'Multiverse Legion', description: 'Summon alternate versions of your minions (duplicate current army for 20s, 120s cooldown)', icon: '🌌', path: 'legion', rarity: 'legendary', effect: { armyDuplicate: { duration: 20000, cooldown: 120000 } } },
        { id: 'multiverse_champions', name: 'Multiverse Champions', description: 'Minions gain random legendary effects each attack (freeze, burn, stun, explode, etc.)', icon: '✨', path: 'champion', rarity: 'epic', effect: { randomLegendary: true } },
        { id: 'multiverse_reaper', name: 'Multiverse Reaper', description: 'Malachar splits into 3 copies for 10s (90s cooldown)', icon: '👥', path: 'reaper', rarity: 'legendary', effect: { triplicate: { duration: 10000, cooldown: 90000 } } }
    ],

    90: [
        { id: 'zenith_legion', name: 'Zenith Legion', description: 'Minions gain +10% stats per unique buff they have (retroactive)', icon: '📈', path: 'legion', rarity: 'epic', effect: { buffMultiplier: 0.1 } },
        { id: 'zenith_champions', name: 'Zenith Champions', description: 'Minions become unstoppable (immune to damage while attacking)', icon: '⚡', path: 'champion', rarity: 'legendary', effect: { zenithUnstoppable: true } },
        { id: 'zenith_reaper', name: 'Zenith Reaper', description: 'Malachar gains +100% damage, +100% HP, +50% movement speed permanently', icon: '👑', path: 'reaper', rarity: 'legendary', effect: { zenithPower: { damage: 2.0, hp: 2.0, speed: 1.5 } } }
    ],

    91: [
        { id: 'legion_tactician', name: 'Legion Tactician', description: 'Command minions with perfect precision (instant target switching, no collision)', icon: '🧠', path: 'legion', rarity: 'epic', effect: { perfectControl: true } },
        { id: 'champion_tactician', name: 'Champion Tactician', description: 'Minions gain combat intelligence (auto-dodge attacks, block projectiles, counter-attack)', icon: '⚔️', path: 'champion', rarity: 'epic', effect: { combatAI: true } },
        { id: 'reaper_tactician', name: 'Reaper Tactician', description: "Malachar's abilities cost no cooldowns for 10s after a kill", icon: '⚡', path: 'reaper', rarity: 'rare', effect: { killCDR: { duration: 10000 } } }
    ],

    92: [
        { id: 'manifest_legion', name: 'Manifest Legion', description: 'Automatically summon 10 temporary minions at optimal locations (30s duration, 45s cooldown)', icon: '👥', path: 'legion', rarity: 'epic', effect: { manifestSwarm: { count: 10, duration: 30000, cooldown: 45000 } } },
        { id: 'manifest_champions', name: 'Manifest Champions', description: 'Minions can instantly teleport to enemies (6s cooldown per minion)', icon: '✨', path: 'champion', rarity: 'rare', effect: { combatTeleport: { cooldown: 6000 } } },
        { id: 'manifest_reaper', name: 'Manifest Reaper', description: 'Malachar automatically teleports away from danger (5s cooldown)', icon: '💨', path: 'reaper', rarity: 'uncommon', effect: { dangerTeleport: { cooldown: 5000 } } }
    ],

    93: [
        { id: 'primordial_swarm', name: 'Primordial Swarm', description: 'Dark Harvest chance increased to 30%, spawned minions are 50% stronger', icon: '🌪️', path: 'legion', rarity: 'epic', effect: { darkHarvestChance: 0.3, darkHarvestBonus: 1.5 } },
        { id: 'primordial_champions', name: 'Primordial Champions', description: 'Minions enter primal rage (double size, +200% damage, AOE attacks)', icon: '🦍', path: 'champion', rarity: 'legendary', effect: { primalRage: { size: 2.0, damage: 3.0, aoe: true } } },
        { id: 'primordial_reaper', name: 'Primordial Reaper', description: 'Malachar channels primordial death (10 tile instant-kill aura for 8s, 90s cooldown)', icon: '💀', path: 'reaper', rarity: 'legendary', effect: { primordialDeath: { radius: 10, duration: 8000, cooldown: 90000 } } }
    ],

    94: [
        { id: 'legion_convergence', name: 'Legion Convergence', description: "Gain 3 random Champion and 3 random Reaper upgrades you don't have", icon: '🔗', path: 'legion', rarity: 'legendary', effect: { crossPathUpgrades: { champion: 3, reaper: 3 } } },
        { id: 'champion_convergence', name: 'Champion Convergence', description: "Gain 3 random Legion and 3 random Reaper upgrades you don't have", icon: '⭐', path: 'champion', rarity: 'legendary', effect: { crossPathUpgrades: { legion: 3, reaper: 3 } } },
        { id: 'reaper_convergence', name: 'Reaper Convergence', description: "Gain 3 random Legion and 3 random Champion upgrades you don't have", icon: '💀', path: 'reaper', rarity: 'legendary', effect: { crossPathUpgrades: { legion: 3, champion: 3 } } }
    ],

    95: [
        { id: 'unfathomable_legion', name: 'Unfathomable Legion', description: "Minions phase between reality (+75% evasion, can't be targeted)", icon: '👻', path: 'legion', rarity: 'legendary', effect: { phaseReality: { evasion: 0.75, untargetable: true } } },
        { id: 'unfathomable_champions', name: 'Unfathomable Champions', description: 'Minions break damage cap (no maximum damage limit)', icon: '♾️', path: 'champion', rarity: 'legendary', effect: { noDamageCap: true } },
        { id: 'unfathomable_reaper', name: 'Unfathomable Reaper', description: 'Malachar ignores all debuffs and crowd control permanently', icon: '✨', path: 'reaper', rarity: 'epic', effect: { permanentImmunity: true } }
    ],

    96: [
        { id: 'inevitable_legion', name: 'Inevitable Legion', description: 'Minions cannot be stopped (immune to knockback, stuns, slows, roots)', icon: '🚀', path: 'legion', rarity: 'epic', effect: { totalImmunity: true } },
        { id: 'inevitable_champions', name: 'Inevitable Champions', description: 'Minions gain +50% damage for each second in combat (caps at +500%)', icon: '⚡', path: 'champion', rarity: 'legendary', effect: { combatRamp: { perSecond: 0.5, cap: 5.0 } } },
        { id: 'inevitable_death', name: 'Inevitable Death', description: 'Enemies near death (below 20% HP) are automatically marked (take +100% damage from all sources)', icon: '💀', path: 'reaper', rarity: 'epic', effect: { deathMark: { threshold: 0.2, damageBonus: 2.0 } } }
    ],

    97: [
        { id: 'supreme_legion', name: 'Supreme Legion', description: 'Command 30 minions total (increased cap), all gain +100% stats', icon: '👑', path: 'legion', rarity: 'legendary', effect: { minionCap: 30, statsBonus: 2.0 } },
        { id: 'supreme_champions', name: 'Supreme Champions', description: 'All minions gain supremacy aura (8 tile radius, allies gain +50% damage)', icon: '⭐', path: 'champion', rarity: 'legendary', effect: { supremacyAura: { radius: 8, damageBonus: 1.5 } } },
        { id: 'supreme_reaper', name: 'Supreme Reaper', description: 'Malachar gains supreme dominion (control enemy units for 10s, 45s cooldown)', icon: '👁️', path: 'reaper', rarity: 'epic', effect: { supremeDominion: { duration: 10000, cooldown: 45000 } } }
    ],

    98: [
        { id: 'transcendent_legion', name: 'Transcendent Legion', description: 'Minions ascend to higher plane (+200% all stats, ethereal glow)', icon: '✨', path: 'legion', rarity: 'legendary', effect: { transcendence: { statsBonus: 3.0, ethereal: true } } },
        { id: 'transcendent_champions', name: 'Transcendent Champions', description: 'Minions achieve perfection (guaranteed crits, cannot miss, 100% lifesteal)', icon: '⭐', path: 'champion', rarity: 'legendary', effect: { perfection: { crit: true, accuracy: true, lifesteal: 1.0 } } },
        { id: 'transcendent_reaper', name: 'Transcendent Reaper', description: 'Malachar transcends mortality (death aura doubled, immune to death once per 30s)', icon: '👑', path: 'reaper', rarity: 'legendary', effect: { transcendMortality: { auraBonus: 2.0, immuneInterval: 30000 } } }
    ],

    99: [
        { id: 'final_legion', name: 'Final Legion', description: 'The ultimate army (all minion stats +300%, army size +10)', icon: '♾️', path: 'legion', rarity: 'legendary', effect: { finalLegion: { statsBonus: 4.0, sizeBonus: 10 } } },
        { id: 'final_champions', name: 'Final Champions', description: 'The ultimate warriors (minions become immortal for 30s after taking lethal damage, 60s cooldown per minion)', icon: '⚔️', path: 'champion', rarity: 'legendary', effect: { finalForm: { immortalDuration: 30000, cooldown: 60000 } } },
        { id: 'final_reaper', name: 'Final Reaper', description: "The true death (Malachar's damage +500%, all kills heal full HP)", icon: '💀', path: 'reaper', rarity: 'legendary', effect: { trueDeath: { damageBonus: 6.0, fullHeal: true } } }
    ],

    100: [
        { id: 'legion_god', name: 'LEGION GOD', description: 'Unlock max 40 permanent minions. All legion buffs doubled. Minions respawn instantly at full power.', icon: '👑', path: 'legion', rarity: 'legendary', effect: { legionGod: { minionCap: 40, buffMultiplier: 2.0, instantRevive: true } } },
        { id: 'champion_god', name: 'CHAMPION GOD', description: 'All minions gain +1000% all stats. Become massive titans. Attacks create shockwaves (10 tile AOE).', icon: '⭐', path: 'champion', rarity: 'legendary', effect: { championGod: { statsBonus: 11.0, size: 3.0, shockwaveRadius: 10 } } },
        { id: 'reaper_god', name: 'REAPER GOD', description: 'Malachar becomes a god of death. +500% all stats. 15 tile death aura (100 damage/sec). Cannot die for 10s after taking lethal damage (60s cooldown).', icon: '💀', path: 'reaper', rarity: 'legendary', effect: { reaperGod: { statsBonus: 6.0, deathAura: { radius: 15, dps: 100 }, deathImmunity: { duration: 10000, cooldown: 60000 } } } }
    ]
};

// Helper function to get skills for a specific level
function getSkillsForLevel(level) {
    return MalacharSkillTree[level] || [];
}

// Helper function to get skill by ID
function getSkillById(skillId) {
    for (let level in MalacharSkillTree) {
        const skills = MalacharSkillTree[level];
        const skill = skills.find(s => s.id === skillId);
        if (skill) return skill;
    }
    return null;
}

// Export for global access
if (typeof window !== 'undefined') {
    window.MalacharSkillTree = MalacharSkillTree;
    window.getSkillsForLevel = getSkillsForLevel;
    window.getSkillById = getSkillById;
    console.log('✅ MalacharSkillTree loaded with', Object.keys(MalacharSkillTree).length, 'levels');
}
