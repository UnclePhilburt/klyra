// SkillSelector - Roguelike skill selection system on level up
class SkillSelector {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.selectedSkills = []; // Skills the player has chosen

        // UI elements
        this.cards = [];
        this.selectedIndex = 1; // Start with middle card selected
        this.keyboardControls = null;
        this.instructionText = null;
    }

    show(playerClass, currentLevel) {
        if (this.isActive) return;
        this.isActive = true;

        // DON'T pause the game - let gameplay continue!

        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Get available skills for this class and level
        const availableSkills = this.getAvailableSkills(playerClass, currentLevel);

        // Show 3 random skill cards
        const skillChoices = this.selectRandomSkills(availableSkills, 3);
        const cardWidth = 220;
        const cardHeight = 300;
        const spacing = 40;
        const totalWidth = (cardWidth * 3) + (spacing * 2);
        const startX = (width - totalWidth) / 2;

        // Cards poke out from bottom of screen
        const bottomY = height - 40; // Cards mostly off-screen, peeking up

        // Instruction text at bottom - modern glassmorphism style
        this.instructionText = this.scene.add.text(width / 2, height - cardHeight - 50, 'LEVEL UP! [Q/E] Move | [SPACE] Select', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '16px',
            fontStyle: '600',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            backgroundColor: '#0a0a0fdd',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        // Add subtle glow to instruction text
        this.instructionText.setShadow(0, 0, 20, '#8b5cf6', true, true);

        skillChoices.forEach((skill, index) => {
            const x = startX + (cardWidth / 2) + (index * (cardWidth + spacing));
            const y = bottomY;

            const card = this.createSkillCard(skill, x, y, cardWidth, cardHeight, index);
            this.cards.push(card);
        });

        // Setup keyboard controls
        this.setupKeyboardControls();

        // Highlight the initially selected card (middle one)
        this.updateCardSelection();
    }

    createSkillCard(skill, x, y, width, height, index) {
        const card = {
            skill: skill,
            elements: [],
            index: index,
            baseY: y,
            baseX: x
        };

        // Card background - modern glassmorphism with transparency
        const bg = this.scene.add.rectangle(x, y, width, height, 0x0a0a0f, 0.85);
        bg.setStrokeStyle(2, 0x8b5cf6, 0.3); // Purple border with transparency
        bg.setScrollFactor(0);
        bg.setDepth(2001);
        card.elements.push(bg);
        card.background = bg;

        // Add inner glow container (for glassmorphism effect simulation)
        const innerGlow = this.scene.add.rectangle(x, y, width - 4, height - 4, 0x8b5cf6, 0.05);
        innerGlow.setStrokeStyle(1, 0xffffff, 0.05);
        innerGlow.setScrollFactor(0);
        innerGlow.setDepth(2001);
        card.elements.push(innerGlow);
        card.innerGlow = innerGlow;

        // Skill name at TOP of card - modern gradient text
        const name = this.scene.add.text(x, y - 130, skill.name, {
            fontFamily: 'Inter, Space Grotesk, Arial, sans-serif',
            fontSize: '19px',
            fontStyle: '700',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: width - 30 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        name.setShadow(0, 0, 15, '#8b5cf6', false, true); // Purple glow
        card.elements.push(name);

        // Skill description in CENTER of card
        const desc = this.scene.add.text(x, y, skill.description, {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '13px',
            fontStyle: '400',
            fill: '#a1a1aa',
            wordWrap: { width: width - 35 },
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        card.elements.push(desc);

        return card;
    }

    setupKeyboardControls() {
        // Create keyboard inputs
        this.keyQ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyE = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Listen for key presses
        this.keyQ.on('down', () => {
            if (this.isActive) {
                this.moveSelection(-1); // Move left
            }
        });

        this.keyE.on('down', () => {
            if (this.isActive) {
                this.moveSelection(1); // Move right
            }
        });

        this.keySpace.on('down', () => {
            if (this.isActive) {
                this.confirmSelection();
            }
        });
    }

    moveSelection(direction) {
        // Update selected index
        this.selectedIndex += direction;

        // Wrap around
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.cards.length - 1;
        } else if (this.selectedIndex >= this.cards.length) {
            this.selectedIndex = 0;
        }

        // Update visuals
        this.updateCardSelection();
    }

    updateCardSelection() {
        // Update all cards with modern effects
        this.cards.forEach((card, index) => {
            const isSelected = index === this.selectedIndex;

            if (isSelected) {
                // Selected card: raise up with glow and gradient border
                card.elements.forEach((element, i) => {
                    const targetY = i === 0 ? card.baseY - 80 : // background
                                   i === 1 ? card.baseY - 80 : // innerGlow
                                   i === 2 ? card.baseY - 80 - 130 : // name (130px above bg)
                                   card.baseY - 80; // description (at bg position)

                    this.scene.tweens.add({
                        targets: element,
                        y: targetY,
                        duration: 250,
                        ease: 'Cubic.easeOut' // Smooth cubic-bezier easing
                    });
                });

                // Modern gradient border glow
                card.background.setStrokeStyle(3, 0xec4899, 0.9); // Pink gradient accent
                this.scene.tweens.add({
                    targets: card.background,
                    scaleX: 1.03,
                    scaleY: 1.03,
                    duration: 250,
                    ease: 'Cubic.easeOut'
                });

                // Inner glow effect for glassmorphism
                card.innerGlow.setFillStyle(0xec4899, 0.15);
                card.innerGlow.setStrokeStyle(1, 0xec4899, 0.4);

            } else {
                // Unselected card: lower down with subtle style
                card.elements.forEach((element, i) => {
                    const targetY = i === 0 ? card.baseY : // background
                                   i === 1 ? card.baseY : // innerGlow
                                   i === 2 ? card.baseY - 130 : // name (130px above bg)
                                   card.baseY; // description (at bg position)

                    this.scene.tweens.add({
                        targets: element,
                        y: targetY,
                        duration: 250,
                        ease: 'Cubic.easeOut'
                    });
                });

                // Subtle purple border
                card.background.setStrokeStyle(2, 0x8b5cf6, 0.3);
                this.scene.tweens.add({
                    targets: card.background,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 250,
                    ease: 'Cubic.easeOut'
                });

                // Reset inner glow
                card.innerGlow.setFillStyle(0x8b5cf6, 0.05);
                card.innerGlow.setStrokeStyle(1, 0xffffff, 0.05);
            }
        });
    }

    confirmSelection() {
        const selectedCard = this.cards[this.selectedIndex];
        if (selectedCard) {
            this.selectSkill(selectedCard.skill);
        }
    }

    selectSkill(skill) {
        console.log(`✨ Selected skill: ${skill.name}`);

        // Add to player's skills
        this.selectedSkills.push(skill);

        // Apply skill effect
        this.applySkill(skill);

        // Hide UI
        this.hide();

        // Game already running - no need to resume!
    }

    applySkill(skill) {
        const player = this.scene.localPlayer;
        if (!player) return;

        console.log(`🔮 Applying skill: ${skill.id} (${skill.name})`);

        // Initialize passive ability manager if needed
        if (!this.scene.passiveAbilityManager) {
            this.scene.passiveAbilityManager = new PassiveAbilityManager(this.scene, player);
        }

        // Handle special case for spawn_minion effect (used throughout skill tree)
        if (skill.effect === 'spawn_minion') {
            // Spawn another permanent minion
            this.scene.spawnMinion(
                player.sprite.x + 60,
                player.sprite.y,
                player.data.id,
                true // permanent
            );
            console.log(`👹 ${skill.name}: Summoned additional permanent minion!`);
            return;
        }

        // Handle complex effect objects
        if (typeof skill.effect === 'object') {
            const effect = skill.effect;

            // ==== MINION STAT MULTIPLIERS ====
            if (effect.minionHealth) {
                if (!player.minionHealthMultiplier) player.minionHealthMultiplier = 1;
                player.minionHealthMultiplier *= effect.minionHealth;
                // Update existing minions
                Object.values(this.scene.minions).forEach(minion => {
                    minion.maxHealth = Math.floor(minion.maxHealth * effect.minionHealth);
                    minion.health = Math.floor(minion.health * effect.minionHealth);
                });
                console.log(`💚 Minion health: ${player.minionHealthMultiplier}x`);
            }

            if (effect.minionDamage) {
                if (!player.minionDamageMultiplier) player.minionDamageMultiplier = 1;
                player.minionDamageMultiplier *= effect.minionDamage;
                Object.values(this.scene.minions).forEach(minion => {
                    minion.damage *= effect.minionDamage;
                });
                console.log(`⚔️ Minion damage: ${player.minionDamageMultiplier}x`);
            }

            if (effect.minionSpeed) {
                if (!player.minionSpeedMultiplier) player.minionSpeedMultiplier = 1;
                player.minionSpeedMultiplier *= effect.minionSpeed;
                console.log(`💨 Minion speed: ${player.minionSpeedMultiplier}x`);
            }

            if (effect.minionAttackSpeed) {
                if (!player.minionAttackSpeedMultiplier) player.minionAttackSpeedMultiplier = 1;
                player.minionAttackSpeedMultiplier *= effect.minionAttackSpeed;
                console.log(`⚡ Minion attack speed: ${player.minionAttackSpeedMultiplier}x`);
            }

            if (effect.minionAllStats) {
                if (!player.minionAllStatsMultiplier) player.minionAllStatsMultiplier = 1;
                player.minionAllStatsMultiplier *= effect.minionAllStats;
                // Apply to existing minions
                Object.values(this.scene.minions).forEach(minion => {
                    minion.damage *= effect.minionAllStats;
                    minion.maxHealth = Math.floor(minion.maxHealth * effect.minionAllStats);
                    minion.health = Math.floor(minion.health * effect.minionAllStats);
                });
                console.log(`⭐ Minion all stats: ${player.minionAllStatsMultiplier}x`);
            }

            if (effect.minionSize) {
                if (!player.minionSizeMultiplier) player.minionSizeMultiplier = 1;
                player.minionSizeMultiplier *= effect.minionSize;
                Object.values(this.scene.minions).forEach(minion => {
                    if (minion.sprite) {
                        minion.sprite.setScale(player.minionSizeMultiplier);
                    }
                });
                console.log(`📏 Minion size: ${player.minionSizeMultiplier}x`);
            }

            if (effect.minionDefense) {
                if (!player.minionDefenseMultiplier) player.minionDefenseMultiplier = 1;
                player.minionDefenseMultiplier *= effect.minionDefense;
                console.log(`🛡️ Minion defense: ${player.minionDefenseMultiplier}x`);
            }

            if (effect.minionArmor) {
                if (!player.minionArmor) player.minionArmor = 0;
                player.minionArmor += effect.minionArmor;
                console.log(`🛡️ Minion armor: +${player.minionArmor}`);
            }

            if (effect.minionLifesteal) {
                player.minionLifesteal = effect.minionLifesteal;
                console.log(`🩸 Minion lifesteal: ${(player.minionLifesteal * 100).toFixed(0)}%`);
            }

            if (effect.minionRegen) {
                player.minionRegen = effect.minionRegen;
                console.log(`💚 Minion regen: ${(player.minionRegen * 100).toFixed(0)}%/sec`);
            }

            // ==== MINION SPECIAL ABILITIES ====
            if (effect.minionKnockback) {
                player.minionKnockback = true;
                console.log(`💥 Minions knock back enemies`);
            }

            if (effect.minionStun) {
                player.minionStun = effect.minionStun;
                console.log(`💫 Minions can stun enemies`);
            }

            if (effect.cleave) {
                player.minionCleave = true;
                console.log(`🌊 Minions cleave in a cone`);
            }

            if (effect.berserkerDamage) {
                player.berserkerDamage = effect.berserkerDamage;
                player.berserkerThreshold = effect.berserkerThreshold || 0.4;
                console.log(`😡 Berserker rage when below ${(player.berserkerThreshold * 100).toFixed(0)}% HP`);
            }

            if (effect.unstoppable) {
                player.minionUnstoppable = true;
                console.log(`🚀 Minions are unstoppable`);
            }

            if (effect.executeThreshold) {
                player.executeThreshold = effect.executeThreshold;
                player.executeDamage = effect.executeDamage || 2.0;
                console.log(`⚔️ Execute enemies below ${(player.executeThreshold * 100).toFixed(0)}% HP`);
            }

            if (effect.bossDamage) {
                player.bossDamage = effect.bossDamage;
                console.log(`👑 +${((effect.bossDamage - 1) * 100).toFixed(0)}% damage to bosses`);
            }

            if (effect.minionCritChance) {
                player.minionCritChance = effect.minionCritChance;
                player.minionCritDamage = effect.minionCritDamage || 3.0;
                console.log(`💥 ${(effect.minionCritChance * 100).toFixed(0)}% crit chance`);
            }

            if (effect.armorPen) {
                player.armorPen = effect.armorPen;
                console.log(`🗡️ ${(effect.armorPen * 100).toFixed(0)}% armor penetration`);
            }

            if (effect.chainAttack) {
                player.chainAttack = effect.chainAttack;
                console.log(`⚡ Attacks chain to ${effect.chainAttack.targets} enemies`);
            }

            if (effect.splashDamage) {
                player.splashDamage = effect.splashDamage;
                console.log(`💧 ${(effect.splashDamage.percent * 100).toFixed(0)}% splash damage`);
            }

            if (effect.dualWield) {
                player.dualWield = true;
                player.attacksPerStrike = effect.attacksPerStrike || 2;
                console.log(`⚔️ Dual wield - ${player.attacksPerStrike} attacks per strike`);
            }

            // ==== PLAYER STATS ====
            if (effect.maxHealth) {
                player.maxHealth += effect.maxHealth;
                player.health += effect.maxHealth;
                console.log(`❤️ Max health: +${effect.maxHealth}`);
            }

            if (effect.healPerKill) {
                player.healPerKill = effect.healPerKill;
                console.log(`🩸 Heal ${effect.healPerKill} HP per kill`);
            }

            if (effect.healOnKillPercent) {
                player.healOnKillPercent = effect.healOnKillPercent;
                console.log(`💚 Heal ${(effect.healOnKillPercent * 100).toFixed(0)}% max HP per kill`);
            }

            if (effect.regenPerMinion) {
                player.regenPerMinion = effect.regenPerMinion;
                console.log(`🔮 +${effect.regenPerMinion} HP/sec per minion`);
            }

            if (effect.xpBonus) {
                if (!player.xpMultiplier) player.xpMultiplier = 1;
                player.xpMultiplier *= effect.xpBonus;
                console.log(`✨ XP multiplier: ${player.xpMultiplier}x`);
            }

            if (effect.sacrificeHealth) {
                const sacrifice = typeof effect.sacrificeHealth === 'number' && effect.sacrificeHealth < 0 ?
                    Math.abs(effect.sacrificeHealth) : effect.sacrificeHealth * player.maxHealth;
                player.maxHealth -= sacrifice;
                player.health = Math.min(player.health, player.maxHealth);
                console.log(`🩸 Sacrificed ${sacrifice} max HP`);
            }

            if (effect.sacrificeDamage) {
                if (!player.damageMultiplier) player.damageMultiplier = 1;
                player.damageMultiplier *= effect.sacrificeDamage;
                console.log(`💀 Damage multiplier: ${player.damageMultiplier}x`);
            }

            // ==== SPECIAL EFFECTS ====
            if (effect.packDamageBonus) {
                player.packDamageBonus = effect.packDamageBonus;
                console.log(`🐺 +${(effect.packDamageBonus * 100).toFixed(0)}% damage per nearby minion`);
            }

            if (effect.groupedDefense) {
                player.groupedDefense = effect.groupedDefense;
                player.groupRadius = effect.groupRadius || 4;
                console.log(`🛡️ +${((1 - effect.groupedDefense) * 100).toFixed(0)}% defense when grouped`);
            }

            if (effect.coordinatedDamage) {
                player.coordinatedDamage = effect.coordinatedDamage;
                console.log(`🎯 Coordinated assault: ${((effect.coordinatedDamage - 1) * 100).toFixed(0)}% bonus damage`);
            }

            if (effect.perMinionBonus) {
                player.perMinionBonus = effect.perMinionBonus;
                player.maxMinionBonus = effect.maxBonus || 2.0;
                console.log(`💪 +${(effect.perMinionBonus * 100).toFixed(0)}% per minion (max ${(effect.maxBonus * 100).toFixed(0)}%)`);
            }

            if (effect.commandAura) {
                player.commandAura = effect.commandAura;
                console.log(`👑 Command aura: +${((effect.commandAura.bonus - 1) * 100).toFixed(0)}% all stats in ${effect.commandAura.radius} tiles`);
            }

            if (effect.flankDamage) {
                player.flankDamage = effect.flankDamage;
                console.log(`🗡️ +${((effect.flankDamage - 1) * 100).toFixed(0)}% damage from behind`);
            }

            if (effect.killDamageStack) {
                player.killDamageStack = effect.killDamageStack;
                player.maxKillStacks = effect.maxStacks || 20;
                console.log(`🩸 +${(effect.killDamageStack * 100).toFixed(0)}% damage per kill (max ${effect.maxStacks} stacks)`);
            }

            if (effect.reapersMarkThreshold) {
                player.reapersMarkThreshold = effect.reapersMarkThreshold;
                player.reapersMarkDamage = effect.reapersMarkDamage;
                console.log(`💀 Reaper's Mark: enemies below ${(effect.reapersMarkThreshold * 100).toFixed(0)}% HP take +${((effect.reapersMarkDamage - 1) * 100).toFixed(0)}% damage`);
            }

            // ==== PASSIVE ABILITIES (Handled by PassiveAbilityManager) ====
            const passiveEffects = [
                'shadowVolley', 'curseAura', 'lifeDrainAura', 'damageAura', 'corpseExplosion',
                'voidEruption', 'cursedTrail', 'soulCollector', 'retaliationNova', 'plagueAura',
                'shadowDash', 'invisOnKill', 'soulBarrier', 'mindControl', 'doomMark',
                'secondChance', 'eclipseZone', 'darkSovereign', 'fearAura', 'lunarBonus',
                'autoRevive', 'raiseUndead', 'lastStand', 'deathSpiral', 'hexAura',
                'furyOnKill', 'cdrOnHit', 'autoSummon', 'shadowVolleyCount', 'leapAttack',
                'hiveRetribution', 'apocalypseForm', 'painLink', 'chargeAttack', 'savageFrenzy',
                'emergencySwarm', 'colossusCore', 'syncExecute', 'guardianShield', 'soulRend',
                'instakillChance', 'dreadAura', 'killSpree', 'massacre', 'berserkThreshold',
                'painEmpowerment', 'ccImmune', 'attackRange', 'attackSize', 'apocalypseWave',
                'perfectAccuracy', 'vampireLord', 'statsPerLevel', 'instantRevive', 'shadowDominion',
                'instantTeleport', 'trueDamage', 'lifeSteal', 'packMentalityBonus', 'championMastery',
                'reaperMastery', 'phaseMovement', 'ascended', 'evasion', 'vengeance', 'reflectDamage',
                'retaliationBolts', 'permanentConversion', 'multiplicativeStacking', 'exponentialDamage',
                'sharedHP', 'statSharing', 'unityBonus', 'deathExplosion', 'voidZone', 'infiniteMinions',
                'darkHarvestChance', 'executeThreshold', 'executeCooldown', 'autoSpawnInterval',
                'ignorePhysics', 'timeSlow', 'tidalWave', 'invincibleWhileAttacking', 'gravityWell',
                'dodgeChance', 'guaranteedCrit', 'maxDamagePercent', 'randomBuffs', 'randomEffects',
                'chaosMagic', 'ghostRevive', 'bossImmortality', 'statsPerSecond', 'synergyBonus',
                'shareBuffs', 'inheritMinionStats', 'legionNova', 'damageNova', 'periodicExplosion',
                'autoCounter', 'absorbAbilities', 'adaptiveImmunity', 'orbitalStrikes', 'autoTeleport',
                'megaMinion', 'focusBuffs', 'absorbMinions'
            ];

            // Check if this skill has any passive abilities
            let hasPassive = false;
            for (const passiveKey of passiveEffects) {
                if (effect[passiveKey] !== undefined) {
                    hasPassive = true;
                    break;
                }
            }

            if (hasPassive) {
                this.scene.passiveAbilityManager.addPassiveAbility(skill);
                console.log(`✨ Added passive ability: ${skill.name}`);
            }

            // ==== INSTANT EFFECTS ====
            if (effect.instantMinions) {
                for (let i = 0; i < effect.instantMinions; i++) {
                    this.scene.spawnMinion(
                        player.sprite.x + Phaser.Math.Between(-100, 100),
                        player.sprite.y + Phaser.Math.Between(-100, 100),
                        player.data.id,
                        true // permanent
                    );
                }
                console.log(`👥 Summoned ${effect.instantMinions} permanent minions`);
            }

            // ==== GOD-TIER CAPSTONE EFFECTS ====
            if (effect.legionGod) {
                player.minionCap = effect.legionGod.minionCap || 40;
                player.legionBuffMultiplier = effect.legionGod.buffMultiplier || 2.0;
                player.instantRevive = effect.legionGod.instantRevive || true;
                console.log(`👑 LEGION GOD: Max ${player.minionCap} minions, all buffs x${player.legionBuffMultiplier}`);
            }

            if (effect.championGod) {
                const bonus = effect.championGod.statsBonus || 11.0;
                player.minionAllStatsMultiplier = (player.minionAllStatsMultiplier || 1) * bonus;
                player.minionSizeMultiplier = (player.minionSizeMultiplier || 1) * (effect.championGod.size || 3.0);
                player.shockwaveRadius = effect.championGod.shockwaveRadius || 10;
                console.log(`⭐ CHAMPION GOD: +${((bonus - 1) * 100).toFixed(0)}% all stats, shockwaves`);
            }

            if (effect.reaperGod) {
                player.damageMultiplier = (player.damageMultiplier || 1) * (effect.reaperGod.statsBonus || 6.0);
                player.maxHealth = Math.floor(player.maxHealth * (effect.reaperGod.statsBonus || 6.0));
                player.deathAura = effect.reaperGod.deathAura;
                player.deathImmunity = effect.reaperGod.deathImmunity;
                console.log(`💀 REAPER GOD: +${((effect.reaperGod.statsBonus - 1) * 100).toFixed(0)}% all stats, death aura`);
            }
        }

        // Legacy skill IDs for backward compatibility
        switch(skill.id) {
            case 'minion_power':
                Object.values(this.scene.minions).forEach(minion => {
                    minion.damage *= 2;
                });
                if (!player.minionDamageMultiplier) player.minionDamageMultiplier = 1;
                player.minionDamageMultiplier *= 2;
                console.log('⚡ All minion damage doubled!');
                break;

            case 'health_boost':
                player.maxHealth += 50;
                player.health += 50;
                console.log(`❤️ Max health increased to ${player.maxHealth}`);
                break;

            case 'damage_boost':
                player.stats.strength = Math.floor(player.stats.strength * 1.5);
                console.log(`⚔️ Strength increased to ${player.stats.strength}`);
                break;
        }
    }

    hide() {
        // Destroy instruction text
        if (this.instructionText) {
            this.instructionText.destroy();
            this.instructionText = null;
        }

        // Destroy all cards
        this.cards.forEach(card => {
            card.elements.forEach(element => element.destroy());
        });

        // Cleanup keyboard controls
        if (this.keyQ) {
            this.keyQ.removeAllListeners();
            this.keyQ = null;
        }
        if (this.keyE) {
            this.keyE.removeAllListeners();
            this.keyE = null;
        }
        if (this.keySpace) {
            this.keySpace.removeAllListeners();
            this.keySpace = null;
        }

        this.cards = [];
        this.selectedIndex = 1;
        this.isActive = false;
    }

    getAvailableSkills(playerClass, currentLevel) {
        // Debug logging
        console.log(`\n🔍 ======= SKILL SELECTOR DEBUG =======`);
        console.log(`📊 Player Class: "${playerClass}" (type: ${typeof playerClass})`);
        console.log(`📊 Current Level: ${currentLevel}`);
        console.log(`📊 Local Player Data:`, this.scene.localPlayer ? {
            class: this.scene.localPlayer.class,
            dataClass: this.scene.localPlayer.data ? this.scene.localPlayer.data.class : 'no data',
            characterId: this.scene.localPlayer.data ? this.scene.localPlayer.data.characterId : 'no data'
        } : 'no local player');
        console.log(`📊 MalacharSkillTree exists: ${typeof MalacharSkillTree !== 'undefined'}`);
        console.log(`📊 window.getSkillsForLevel exists: ${typeof window.getSkillsForLevel === 'function'}`);

        // Load skills from MalacharSkillTree (only for Malachar class)
        // Check both the ID and display name variations
        const isMalachar = playerClass === 'MALACHAR' ||
                          playerClass === 'Malachar' ||
                          playerClass === 'Necromancer' ||
                          (this.scene.localPlayer && this.scene.localPlayer.data && this.scene.localPlayer.data.characterId === 'MALACHAR');

        console.log(`✔️ Is Malachar check: ${isMalachar}`);

        if (isMalachar && typeof MalacharSkillTree !== 'undefined' && typeof window.getSkillsForLevel === 'function') {
            // Get skills for this specific level
            const levelSkills = window.getSkillsForLevel(currentLevel);
            console.log(`✅ Found ${levelSkills ? levelSkills.length : 0} skills for level ${currentLevel}`);

            if (levelSkills && levelSkills.length > 0) {
                console.log(`✅ Returning skills:`, levelSkills.map(s => s.name));
                console.log(`======= END SKILL SELECTOR DEBUG =======\n`);
                return levelSkills;
            } else {
                console.warn(`⚠️ No skills found for level ${currentLevel} in MalacharSkillTree`);
                console.warn(`⚠️ Available levels in skill tree:`, Object.keys(MalacharSkillTree));
            }
        } else {
            console.log(`ℹ️ Not Malachar or skill tree not loaded - using fallback skills`);
            console.log(`ℹ️ Reason: ${!isMalachar ? 'Not Malachar' : typeof MalacharSkillTree === 'undefined' ? 'SkillTree not loaded' : 'getSkillsForLevel not a function'}`);
        }
        console.log(`======= END SKILL SELECTOR DEBUG =======\n`);

        // Fallback to basic skills if no skill tree available
        const allSkills = {
            // Malachar-specific skills
            summon_minion: {
                id: 'summon_minion',
                name: 'Dark Summoning',
                description: 'Summon another permanent minion to fight alongside you. Build your undead army!',
                icon: '👹',
                rarity: 'uncommon',
                classes: ['MALACHAR'],
                maxStacks: 5 // Can take this skill multiple times
            },
            minion_power: {
                id: 'minion_power',
                name: 'Abyssal Empowerment',
                description: 'Your minions deal 100% more damage. Make them unstoppable!',
                icon: '💀',
                rarity: 'rare',
                classes: ['MALACHAR'],
                maxStacks: 3
            },

            // Universal skills
            health_boost: {
                id: 'health_boost',
                name: 'Vitality Surge',
                description: 'Increase maximum health by 50. Survive longer in battle.',
                icon: '❤️',
                rarity: 'common',
                classes: ['ALL'],
                maxStacks: 10
            },
            damage_boost: {
                id: 'damage_boost',
                name: 'Power Strike',
                description: 'Increase your attack damage by 50%. Hit harder!',
                icon: '⚔️',
                rarity: 'common',
                classes: ['ALL'],
                maxStacks: 5
            }
        };

        // Filter skills by class and how many times they've been taken
        const available = [];
        for (let skillId in allSkills) {
            const skill = allSkills[skillId];

            // Check class requirement
            if (!skill.classes.includes('ALL') && !skill.classes.includes(playerClass)) {
                continue;
            }

            // Check max stacks
            const timesTaken = this.selectedSkills.filter(s => s.id === skill.id).length;
            if (timesTaken >= skill.maxStacks) {
                continue;
            }

            available.push(skill);
        }

        return available;
    }

    selectRandomSkills(skills, count) {
        // Shuffle and take first N
        const shuffled = [...skills].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, skills.length));
    }

    hasSkill(skillId) {
        return this.selectedSkills.some(s => s.id === skillId);
    }

    getSkillCount(skillId) {
        return this.selectedSkills.filter(s => s.id === skillId).length;
    }

    destroy() {
        this.hide();
    }
}
