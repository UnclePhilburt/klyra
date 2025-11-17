// Malachar Skill Tree - Tier 1 Only
// 4 Core Builds: Test before expanding

const MalacharSkillTree = {
    
    // =================================================================
    // TIER 1 - CHOOSE YOUR BUILD (Level 1)
    // =================================================================
    
    tier1: {
        level: 1,
        title: "Choose Your Path",
        description: "Define your identity",
        choices: [
            {
                id: 'bone_commander',
                name: 'BONE COMMANDER',
                subtitle: 'Co-op + Permanent Minions',
                description: 'Your power multiplies with allies. Command elite undead.',
                path: 'coop',
                minionType: 'permanent',
                
                stats: {
                    playerDamage: 5, // Weak personal damage
                    startingMinions: 5,
                    minionCap: 5,
                    minionHealth: 100,
                    minionDamage: 20,
                    allyScaling: 0.20 // +20% minion stats per ally in 8 tiles
                },
                
                autoAttack: {
                    name: 'Command Bolt',
                    description: 'Shoots a bone projectile at lowest HP minion, healing and buffing it',
                    target: 'minion_lowest_hp', // Targets lowest HP minion
                    range: 10,
                    cooldown: 3000, // 3 seconds instead of 1
                    projectileSpeed: 400, // Pixels per second
                    effects: {
                        onMinion: {
                            damageBonus: 0.25, // 25% damage boost (down from 40%)
                            heal: 15, // Heal 15 HP
                            duration: 3000
                        },
                        onAlly: {
                            damageBonus: 0.20,
                            duration: 3000
                        }
                    }
                },
                
                abilities: {
                    q: {
                        name: 'Unified Front',
                        description: 'Minions teleport to nearest ally. That ally gains shield. Minions deal +50% damage near allies for 6s.',
                        cooldown: 12000,
                        duration: 6000,
                        effect: {
                            teleportToAlly: true,
                            allyShield: 80,
                            minionDamageBonus: 0.50,
                            requireNearAlly: true,
                            nearRange: 6
                        }
                    },
                    e: {
                        name: 'Pact of Bones',
                        description: 'All minions explode dealing massive AOE damage, then instantly respawn at your position ready to fight.',
                        cooldown: 15000,
                        effect: {
                            explodeMinions: true,
                            explosionDamage: 250,
                            explosionRadius: 3,
                            instantRespawn: true,
                            respawnInvulnDuration: 1000
                        }
                    },
                    r: {
                        name: "Legion's Call",
                        description: 'Revive all dead minions. Spawn 2 temps at each ally position. All minions +40% damage for 10s.',
                        cooldown: 60000,
                        duration: 10000,
                        effect: {
                            reviveAll: true,
                            spawnPerAlly: 2,
                            tempDuration: 15000,
                            tempStats: { health: 80, damage: 18 },
                            allMinionBonus: 0.40
                        }
                    }
                }
            },
            
            {
                id: 'death_caller',
                name: 'DEATH CALLER',
                subtitle: 'Co-op + Temporary Minions',
                description: 'Ally kills fuel your army. Sacrifice minions to empower teammates.',
                path: 'coop',
                minionType: 'temporary',
                
                stats: {
                    playerDamage: 12,
                    startingMinions: 3,
                    minionCap: 3, // Permanent cap
                    tempMinionCap: 15, // Temp cap
                    minionHealth: 80,
                    minionDamage: 16,
                    spawnChance: 0.15, // Your kills
                    allySpawnChance: 0.10, // Ally kills
                    allySpawnRange: 10,
                    tempDuration: 10000,
                    tempStats: { health: 50, damage: 14 }
                },
                
                autoAttack: {
                    name: 'Death Bolt',
                    description: 'Shadow bolt that kills enemies',
                    target: 'enemy',
                    damage: 12,
                    cooldown: 1000
                },
                
                abilities: {
                    q: {
                        name: 'Harvest Bond',
                        description: 'For 8s: Ally kills spawn your temps (30% chance). You gain +5% damage per ally nearby.',
                        cooldown: 8000,
                        duration: 8000,
                        effect: {
                            allyKillSpawnChance: 0.30,
                            damagePerAlly: 0.05,
                            maxAllyBonus: 0.20, // Cap at 4 allies
                            allyRange: 12,
                            tempDuration: 15000
                        }
                    },
                    e: {
                        name: 'Sacrificial Surge',
                        description: 'All temps explode. Allies in explosions gain +30% attack speed and heal 25 HP.',
                        cooldown: 20000,
                        effect: {
                            explodeAllTemps: true,
                            explosionDamage: 50,
                            explosionRadius: 4,
                            allyAttackSpeedBonus: 0.30,
                            allyHeal: 25,
                            buffDuration: 6000
                        }
                    },
                    r: {
                        name: "Death's Blessing",
                        description: 'For 12s: Every death spawns a temp. Temps deal +50% damage. Spawn 3 elites at each ally.',
                        cooldown: 60000,
                        duration: 12000,
                        effect: {
                            everyKillSpawns: true,
                            tempDamageBonus: 0.50,
                            spawnElitesPerAlly: 3,
                            eliteStats: { health: 100, damage: 25 },
                            eliteDuration: 20000
                        }
                    }
                }
            },
            
            {
                id: 'warlord',
                name: 'WARLORD',
                subtitle: 'Solo + Permanent Minions',
                description: 'YOU are the weapon. Elite minions guard you. Self-sufficient warrior.',
                path: 'solo',
                minionType: 'permanent',
                
                stats: {
                    playerDamage: 28, // Strong personal damage
                    startingMinions: 4,
                    minionCap: 4,
                    minionHealth: 120, // Tanky
                    minionDamage: 12, // Low damage
                    minionTauntRange: 4 // Minions taunt enemies
                },
                
                autoAttack: {
                    name: 'Shadow Lance',
                    description: 'Strong shadow bolt',
                    target: 'enemy',
                    damage: 28,
                    cooldown: 1000
                },
                
                abilities: {
                    q: {
                        name: 'Dominate',
                        description: 'You gain +70% damage for 5s. Minions taunt all enemies in 6 tiles.',
                        cooldown: 10000,
                        duration: 5000,
                        effect: {
                            playerDamageBonus: 0.70,
                            minionTauntAll: true,
                            tauntRadius: 6
                        }
                    },
                    e: {
                        name: 'Blood Pact',
                        description: 'Sacrifice 25% minion HP. You gain +50% damage, 40% lifesteal, +20% speed for 8s.',
                        cooldown: 18000,
                        duration: 8000,
                        effect: {
                            minionHPSacrifice: 0.25,
                            playerDamageBonus: 0.50,
                            playerLifesteal: 0.40,
                            playerMoveSpeed: 0.20
                        }
                    },
                    r: {
                        name: 'Death Defiance',
                        description: 'Invulnerable for 5s. Lethal damage kills nearest minion instead. Minions auto-revive after 25s.',
                        cooldown: 60000,
                        duration: 5000,
                        effect: {
                            playerInvulnerable: true,
                            redirectToMinion: true,
                            minionAutoRevive: true,
                            reviveDelay: 25000
                        }
                    }
                }
            },
            
            {
                id: 'reaper',
                name: 'REAPER',
                subtitle: 'Solo + Temporary Minions',
                description: 'Kill to spawn. Consume minions for power. Exponential scaling.',
                path: 'solo',
                minionType: 'temporary',
                
                stats: {
                    playerDamage: 24,
                    startingMinions: 2, // Weak permanent minions
                    minionCap: 2,
                    tempMinionCap: 20,
                    minionHealth: 60,
                    minionDamage: 10,
                    spawnChance: 0.25,
                    tempDuration: 8000,
                    tempStats: { health: 45, damage: 20 }
                },
                
                autoAttack: {
                    name: 'Soul Bolt',
                    description: 'Shadow bolt that scales with kills',
                    target: 'enemy',
                    damage: 24,
                    cooldown: 1000
                },
                
                abilities: {
                    q: {
                        name: 'Death Frenzy',
                        description: 'For 5s: Spawn chance 25% → 60%. Temps +50% damage. You gain +10% damage per temp alive.',
                        cooldown: 8000,
                        duration: 5000,
                        effect: {
                            spawnChanceBonus: 0.60,
                            tempDamageBonus: 0.50,
                            playerDamagePerTemp: 0.10
                        }
                    },
                    e: {
                        name: 'Soul Feast',
                        description: 'Consume all temps. Per temp: +8% damage (10s), heal 15 HP, explode for 30 damage.',
                        cooldown: 15000,
                        effect: {
                            consumeAllTemps: true,
                            damagePerTemp: 0.08,
                            damageStackDuration: 10000,
                            healPerTemp: 15,
                            explosionDamagePerTemp: 30
                        }
                    },
                    r: {
                        name: 'Harvest God',
                        description: 'For 10s: Every kill spawns 3 temps. You +100% damage. Temps explode on death (40 damage).',
                        cooldown: 60000,
                        duration: 10000,
                        effect: {
                            spawnsPerKill: 3,
                            playerDamageBonus: 1.00,
                            tempExplodeOnDeath: true,
                            explosionDamage: 40,
                            explosionRadius: 3
                        }
                    }
                }
            }
        ]
    }
};

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Get available choices for a given level
 * @param {number} level - The level to get choices for
 * @param {array} unlockedSkills - Array of unlocked skill IDs
 * @returns {array} - Array of skill choices (empty if no choices for this level)
 */
function getAvailableChoices(level, unlockedSkills = []) {
    // Only allow skill selection at level 1
    if (level === 1) {
        return MalacharSkillTree.tier1.choices;
    }

    // No skill selections after level 1
    console.log(`🔒 Malachar Tier 1 only - no skills available for level ${level}`);
    return [];
}

/**
 * Get build by ID
 */
function getBuildById(buildId) {
    return MalacharSkillTree.tier1.choices.find(b => b.id === buildId);
}

/**
 * Get build info summary
 */
function getBuildSummary(buildId) {
    const build = getBuildById(buildId);
    if (!build) return null;
    
    return {
        name: build.name,
        path: build.path,
        minionType: build.minionType,
        description: build.description,
        playstyle: `${build.path === 'coop' ? 'CO-OP FOCUSED' : 'SOLO FOCUSED'} - ${build.minionType === 'permanent' ? 'PERMANENT MINIONS' : 'TEMPORARY MINIONS'}`
    };
}

// =================================================================
// EXPORT
// =================================================================

if (typeof window !== 'undefined') {
    window.MalacharSkillTree = MalacharSkillTree;
    window.getAvailableChoices = getAvailableChoices;
    window.getBuildById = getBuildById;
    window.getBuildSummary = getBuildSummary;
    
    console.log('✅ Malachar Skill Tree - Tier 1 Only');
    console.log('📊 4 Core Builds:');
    console.log('  1. Bone Commander (Co-op + Permanent)');
    console.log('  2. Death Caller (Co-op + Temporary)');
    console.log('  3. Warlord (Solo + Permanent)');
    console.log('  4. Reaper (Solo + Temporary)');
    console.log('🎮 Ready for visual implementation and testing!');
}