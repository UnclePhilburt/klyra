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

        // Initialize player multipliers
        this.initializePlayerMultipliers();
    }

    initializePlayerMultipliers() {
        const player = this.scene.localPlayer;
        if (!player) return;

        // Minion multipliers
        if (!player.minionHealthMultiplier) player.minionHealthMultiplier = 1;
        if (!player.minionDamageMultiplier) player.minionDamageMultiplier = 1;
        if (!player.minionSpeedMultiplier) player.minionSpeedMultiplier = 1;
        if (!player.minionAttackSpeedMultiplier) player.minionAttackSpeedMultiplier = 1;
        if (!player.minionAllStatsMultiplier) player.minionAllStatsMultiplier = 1;
        if (!player.minionSizeMultiplier) player.minionSizeMultiplier = 1;
        if (!player.minionDefenseMultiplier) player.minionDefenseMultiplier = 1;
        if (!player.minionArmor) player.minionArmor = 0;

        // Minion special stats
        if (!player.minionLifesteal) player.minionLifesteal = 0;
        if (!player.minionRegen) player.minionRegen = 0;
        if (!player.minionKnockback) player.minionKnockback = false;
        if (!player.minionStun) player.minionStun = 0;
        if (!player.minionCleave) player.minionCleave = false;
        if (!player.minionUnstoppable) player.minionUnstoppable = false;
        if (!player.minionCritChance) player.minionCritChance = 0;
        if (!player.minionCritDamage) player.minionCritDamage = 2.0;

        // Player multipliers
        if (!player.damageMultiplier) player.damageMultiplier = 1;
        if (!player.xpMultiplier) player.xpMultiplier = 1;

        // Player special stats
        if (!player.healPerKill) player.healPerKill = 0;
        if (!player.healOnKillPercent) player.healOnKillPercent = 0;
        if (!player.regenPerMinion) player.regenPerMinion = 0;
        if (!player.packDamageBonus) player.packDamageBonus = 0;
        if (!player.groupedDefense) player.groupedDefense = 0;
        if (!player.coordinatedDamage) player.coordinatedDamage = 0;
        if (!player.perMinionBonus) player.perMinionBonus = 0;
        if (!player.maxMinionBonus) player.maxMinionBonus = 2.0;

        // Special effects
        if (!player.berserkerDamage) player.berserkerDamage = 0;
        if (!player.berserkerThreshold) player.berserkerThreshold = 0.4;
        if (!player.executeThreshold) player.executeThreshold = 0;
        if (!player.executeDamage) player.executeDamage = 2.0;
        if (!player.bossDamage) player.bossDamage = 1.0;
        if (!player.armorPen) player.armorPen = 0;
        if (!player.chainAttack) player.chainAttack = null;
        if (!player.splashDamage) player.splashDamage = null;
        if (!player.dualWield) player.dualWield = false;
        if (!player.attacksPerStrike) player.attacksPerStrike = 1;
        if (!player.commandAura) player.commandAura = null;
        if (!player.flankDamage) player.flankDamage = 1.0;
        if (!player.killDamageStack) player.killDamageStack = 0;
        if (!player.maxKillStacks) player.maxKillStacks = 20;
        if (!player.currentKillStacks) player.currentKillStacks = 0;
        if (!player.reapersMarkThreshold) player.reapersMarkThreshold = 0;
        if (!player.reapersMarkDamage) player.reapersMarkDamage = 1.0;

        // God-tier effects
        if (!player.minionCap) player.minionCap = 20;
        if (!player.legionBuffMultiplier) player.legionBuffMultiplier = 1.0;
        if (!player.instantRevive) player.instantRevive = false;
        if (!player.shockwaveRadius) player.shockwaveRadius = 0;
        if (!player.deathAura) player.deathAura = null;
        if (!player.deathImmunity) player.deathImmunity = false;
    }

    // Get all current multipliers to send to server
    getAllMultipliers() {
        const player = this.scene.localPlayer;
        if (!player) return {};

        return {
            minionHealthMultiplier: player.minionHealthMultiplier,
            minionDamageMultiplier: player.minionDamageMultiplier,
            minionSpeedMultiplier: player.minionSpeedMultiplier,
            minionAttackSpeedMultiplier: player.minionAttackSpeedMultiplier,
            minionAllStatsMultiplier: player.minionAllStatsMultiplier,
            minionSizeMultiplier: player.minionSizeMultiplier,
            minionDefenseMultiplier: player.minionDefenseMultiplier,
            minionArmor: player.minionArmor,
            minionLifesteal: player.minionLifesteal,
            minionRegen: player.minionRegen,
            minionKnockback: player.minionKnockback,
            minionStun: player.minionStun,
            minionCleave: player.minionCleave,
            minionUnstoppable: player.minionUnstoppable,
            minionCritChance: player.minionCritChance,
            minionCritDamage: player.minionCritDamage,
            damageMultiplier: player.damageMultiplier,
            xpMultiplier: player.xpMultiplier,
            healPerKill: player.healPerKill,
            healOnKillPercent: player.healOnKillPercent,
            regenPerMinion: player.regenPerMinion,
            packDamageBonus: player.packDamageBonus,
            groupedDefense: player.groupedDefense,
            coordinatedDamage: player.coordinatedDamage,
            perMinionBonus: player.perMinionBonus,
            maxMinionBonus: player.maxMinionBonus,
            berserkerDamage: player.berserkerDamage,
            berserkerThreshold: player.berserkerThreshold,
            executeThreshold: player.executeThreshold,
            executeDamage: player.executeDamage,
            bossDamage: player.bossDamage,
            armorPen: player.armorPen,
            chainAttack: player.chainAttack,
            splashDamage: player.splashDamage,
            dualWield: player.dualWield,
            attacksPerStrike: player.attacksPerStrike,
            commandAura: player.commandAura,
            flankDamage: player.flankDamage,
            killDamageStack: player.killDamageStack,
            maxKillStacks: player.maxKillStacks,
            currentKillStacks: player.currentKillStacks,
            reapersMarkThreshold: player.reapersMarkThreshold,
            reapersMarkDamage: player.reapersMarkDamage,
            minionCap: player.minionCap,
            legionBuffMultiplier: player.legionBuffMultiplier,
            instantRevive: player.instantRevive,
            shockwaveRadius: player.shockwaveRadius,
            deathAura: player.deathAura,
            deathImmunity: player.deathImmunity
        };
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
        const cardWidth = 250;
        const cardHeight = 400;
        const spacing = 30;
        const totalWidth = (cardWidth * 3) + (spacing * 2);
        const startX = (width - totalWidth) / 2;

        // Cards poke out from bottom of screen
        const bottomY = height - 40; // Cards mostly off-screen, peeking up

        // Instruction text at bottom - modern glassmorphism style
        this.instructionText = this.scene.add.text(width / 2, height - cardHeight - 50, 'LEVEL UP! Press [1/2/3] to highlight, press again to select', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '16px',
            fontStyle: '600',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            backgroundColor: '#0a0a0fdd',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100000);

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
        bg.setDepth(100000);
        card.elements.push(bg);
        card.background = bg;

        // Add inner glow container (for glassmorphism effect simulation)
        const innerGlow = this.scene.add.rectangle(x, y, width - 4, height - 4, 0x8b5cf6, 0.05);
        innerGlow.setStrokeStyle(1, 0xffffff, 0.05);
        innerGlow.setScrollFactor(0);
        innerGlow.setDepth(100001);
        card.elements.push(innerGlow);
        card.innerGlow = innerGlow;

        // Skill name at TOP of card - modern gradient text
        const name = this.scene.add.text(x, y - 180, skill.name, {
            fontFamily: 'Inter, Space Grotesk, Arial, sans-serif',
            fontSize: '17px',
            fontStyle: '700',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: width - 30 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100002);
        name.setShadow(0, 0, 15, '#8b5cf6', false, true); // Purple glow
        card.elements.push(name);

        // Generate detailed description
        let detailedDescription = this.generateDetailedDescription(skill);

        // Skill description in CENTER of card
        const desc = this.scene.add.text(x, y, detailedDescription, {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '11px',
            fontStyle: '400',
            fill: '#a1a1aa',
            wordWrap: { width: width - 30 },
            align: 'left',
            lineSpacing: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100002);
        card.elements.push(desc);

        return card;
    }

    generateDetailedDescription(skill) {
        let details = [];

        // Basic description
        if (skill.description) {
            details.push(skill.description);
            details.push(''); // Empty line
        }

        // Subtitle (for paths)
        if (skill.subtitle) {
            details.push(`${skill.subtitle}`);
            details.push(''); // Empty line
        }

        // Stats (for path selection)
        if (skill.stats) {
            details.push('STATS:');
            if (skill.stats.playerDamage !== undefined) {
                details.push(`• Player Damage: ${skill.stats.playerDamage}`);
            }
            if (skill.stats.startingMinions !== undefined) {
                details.push(`• Starting Minions: ${skill.stats.startingMinions}`);
            }
            if (skill.stats.minionCap !== undefined) {
                details.push(`• Max Minions: ${skill.stats.minionCap}`);
            }
            if (skill.stats.minionHealth !== undefined) {
                details.push(`• Minion HP: ${skill.stats.minionHealth}`);
            }
            if (skill.stats.minionDamage !== undefined) {
                details.push(`• Minion Damage: ${skill.stats.minionDamage}`);
            }
            details.push(''); // Empty line
        }

        // Auto-attack (for paths)
        if (skill.autoAttack) {
            details.push(`AUTO: ${skill.autoAttack.name}`);
            details.push(`${skill.autoAttack.description}`);
            details.push(''); // Empty line
        }

        // Abilities (for paths)
        if (skill.abilities) {
            details.push('ABILITIES:');
            if (skill.abilities.q) {
                details.push(`Q - ${skill.abilities.q.name}`);
                details.push(`  ${skill.abilities.q.description}`);
            }
            if (skill.abilities.e) {
                details.push(`E - ${skill.abilities.e.name}`);
                details.push(`  ${skill.abilities.e.description}`);
            }
            if (skill.abilities.r) {
                details.push(`R - ${skill.abilities.r.name}`);
                details.push(`  ${skill.abilities.r.description}`);
            }
            details.push(''); // Empty line
        }

        // Modifications (for specializations)
        if (skill.modifications) {
            details.push('MODIFICATIONS:');
            const mods = skill.modifications;

            if (mods.minionCap !== undefined) {
                details.push(`• Minion Cap: ${mods.minionCap}`);
            }
            if (mods.minionHealth !== undefined) {
                details.push(`• Minion HP: x${mods.minionHealth}`);
            }
            if (mods.minionDamage !== undefined) {
                details.push(`• Minion Damage: x${mods.minionDamage}`);
            }

            // Ability modifications
            if (mods.q && mods.q.bonusEffect) {
                details.push(`Q Bonus:`);
                Object.entries(mods.q.bonusEffect).forEach(([key, value]) => {
                    details.push(`  • ${key}: ${value}`);
                });
            }
            if (mods.e && mods.e.bonusEffect) {
                details.push(`E Bonus:`);
                Object.entries(mods.e.bonusEffect).forEach(([key, value]) => {
                    details.push(`  • ${key}: ${value}`);
                });
            }
            if (mods.r && mods.r.bonusEffect) {
                details.push(`R Bonus:`);
                Object.entries(mods.r.bonusEffect).forEach(([key, value]) => {
                    details.push(`  • ${key}: ${value}`);
                });
            }

            if (mods.autoAttack) {
                details.push(`Auto-Attack:`);
                Object.entries(mods.autoAttack).forEach(([key, value]) => {
                    details.push(`  • ${key}: ${value}`);
                });
            }
        }

        // Endless upgrades (simple effects)
        if (skill.effect && typeof skill.effect === 'object') {
            details.push('EFFECT:');
            Object.entries(skill.effect).forEach(([key, value]) => {
                details.push(`• ${key}: ${value}`);
            });
        }

        return details.join('\n');
    }

    setupKeyboardControls() {
        // Create keyboard inputs for 1, 2, 3
        this.key1 = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.key2 = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.key3 = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

        // Listen for key presses - press once to highlight, press again to confirm
        this.key1.on('down', () => {
            if (this.isActive) {
                if (this.selectedIndex === 0) {
                    // Already selected, confirm it
                    this.confirmSelection();
                } else {
                    // Not selected, highlight it
                    this.selectCard(0);
                }
            }
        });

        this.key2.on('down', () => {
            if (this.isActive) {
                if (this.selectedIndex === 1) {
                    // Already selected, confirm it
                    this.confirmSelection();
                } else {
                    // Not selected, highlight it
                    this.selectCard(1);
                }
            }
        });

        this.key3.on('down', () => {
            if (this.isActive) {
                if (this.selectedIndex === 2) {
                    // Already selected, confirm it
                    this.confirmSelection();
                } else {
                    // Not selected, highlight it
                    this.selectCard(2);
                }
            }
        });
    }

    selectCard(index) {
        // Directly select a card by index
        if (index >= 0 && index < this.cards.length) {
            this.selectedIndex = index;
            // Update visuals
            this.updateCardSelection();
        }
    }

    updateCardSelection() {
        // Update all cards with modern effects
        this.cards.forEach((card, index) => {
            const isSelected = index === this.selectedIndex;

            if (isSelected) {
                // Selected card: raise up with glow and gradient border
                card.elements.forEach((element, i) => {
                    const targetY = i === 0 ? card.baseY - 100 : // background
                                   i === 1 ? card.baseY - 100 : // innerGlow
                                   i === 2 ? card.baseY - 100 - 180 : // name (180px above bg)
                                   card.baseY - 100; // description (at bg position)

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
                                   i === 2 ? card.baseY - 180 : // name (180px above bg)
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

        // Sync to server
        const multipliers = this.getAllMultipliers();
        networkManager.selectSkill(skill, multipliers);

        // Hide UI
        this.hide();

        // Game already running - no need to resume!
    }

    applySkill(skill) {
        const player = this.scene.localPlayer;
        if (!player) return;

        console.log(`🔮 Applying skill: ${skill.id} (${skill.name})`);

        // Initialize visual effects manager if needed
        if (!this.scene.visualEffectsManager) {
            this.scene.visualEffectsManager = new VisualEffectsManager(this.scene, player);
        }

        // Initialize passive ability manager if needed
        if (!this.scene.passiveAbilityManager) {
            this.scene.passiveAbilityManager = new PassiveAbilityManager(this.scene, player);
        }

        // ==== NEW SKILL TREE V2 SYSTEM ====
        // Handle path selection (tier 1) - sets up initial stats and abilities
        if (skill.stats) {
            console.log(`🎯 Applying initial path stats for ${skill.name}`);

            // Apply base stats
            if (skill.stats.playerDamage !== undefined) {
                player.baseDamage = skill.stats.playerDamage;
                console.log(`  ⚔️ Player damage: ${skill.stats.playerDamage}`);
            }
            if (skill.stats.minionCap !== undefined) {
                player.minionCap = skill.stats.minionCap;
                console.log(`  👥 Minion cap: ${skill.stats.minionCap}`);
            }
            if (skill.stats.startingMinions !== undefined) {
                console.log(`  🔮 Starting minions: ${skill.stats.startingMinions}`);
                // Spawn initial minions
                for (let i = 0; i < skill.stats.startingMinions; i++) {
                    const angle = (Math.PI * 2 * i) / skill.stats.startingMinions;
                    const distance = 100;
                    const spawnX = player.sprite.x + Math.cos(angle) * distance;
                    const spawnY = player.sprite.y + Math.sin(angle) * distance;

                    const minion = this.scene.spawnMinion(spawnX, spawnY, player.data.id, true);
                    if (minion && minion.minionId) {
                        networkManager.trackPermanentMinion(minion.minionId, 'add');
                    }
                }
            }
            if (skill.stats.minionHealth !== undefined) {
                player.baseMinionHealth = skill.stats.minionHealth;
                console.log(`  💚 Base minion health: ${skill.stats.minionHealth}`);
            }
            if (skill.stats.minionDamage !== undefined) {
                player.baseMinionDamage = skill.stats.minionDamage;
                console.log(`  ⚔️ Base minion damage: ${skill.stats.minionDamage}`);
            }
        }

        // Store auto-attack configuration
        if (skill.autoAttack) {
            player.autoAttackConfig = skill.autoAttack;
            console.log(`  🎯 Auto-attack: ${skill.autoAttack.name}`);
        }

        // Store Q/E/R abilities
        if (skill.abilities) {
            if (!player.abilities) player.abilities = {};
            if (skill.abilities.q) {
                player.abilities.q = skill.abilities.q;
                console.log(`  Q: ${skill.abilities.q.name}`);
            }
            if (skill.abilities.e) {
                player.abilities.e = skill.abilities.e;
                console.log(`  E: ${skill.abilities.e.name}`);
            }
            if (skill.abilities.r) {
                player.abilities.r = skill.abilities.r;
                console.log(`  R: ${skill.abilities.r.name}`);
            }
        }

        // Handle modifications (tier 2+)
        if (skill.modifications) {
            console.log(`🔧 Applying modifications for ${skill.name}`);
            const mods = skill.modifications;

            // Apply stat modifications
            if (mods.minionCap !== undefined) {
                player.minionCap = mods.minionCap;
                console.log(`  👥 Modified minion cap: ${mods.minionCap}`);
            }
            if (mods.minionHealth !== undefined) {
                player.minionHealthMultiplier = (player.minionHealthMultiplier || 1) * mods.minionHealth;
                console.log(`  💚 Minion health multiplier: ${player.minionHealthMultiplier}x`);
            }
            if (mods.minionDamage !== undefined) {
                player.minionDamageMultiplier = (player.minionDamageMultiplier || 1) * mods.minionDamage;
                console.log(`  ⚔️ Minion damage multiplier: ${player.minionDamageMultiplier}x`);
            }

            // Merge ability modifications
            if (mods.q && player.abilities && player.abilities.q) {
                player.abilities.q.bonusEffect = { ...player.abilities.q.bonusEffect, ...mods.q.bonusEffect };
                console.log(`  Q modified:`, mods.q.bonusEffect);
            }
            if (mods.e && player.abilities && player.abilities.e) {
                player.abilities.e.bonusEffect = { ...player.abilities.e.bonusEffect, ...mods.e.bonusEffect };
                console.log(`  E modified:`, mods.e.bonusEffect);
            }
            if (mods.r && player.abilities && player.abilities.r) {
                player.abilities.r.bonusEffect = { ...player.abilities.r.bonusEffect, ...mods.r.bonusEffect };
                console.log(`  R modified:`, mods.r.bonusEffect);
            }

            // Auto-attack modifications
            if (mods.autoAttack && player.autoAttackConfig) {
                player.autoAttackConfig = { ...player.autoAttackConfig, ...mods.autoAttack };
                console.log(`  Auto-attack modified`);
            }
        }

        // ==== OLD SKILL TREE SYSTEM (fallback) ====
        // Handle special case for spawn_minion effect (used throughout skill tree)
        if (skill.effect === 'spawn_minion') {
            const spawnX = player.sprite.x + 60;
            const spawnY = player.sprite.y;

            // Visual effect for summoning
            if (this.scene.visualEffectsManager) {
                this.scene.visualEffectsManager.createMinionSummonEffect(spawnX, spawnY);
            }

            // Spawn another permanent minion
            const minion = this.scene.spawnMinion(
                spawnX,
                spawnY,
                player.data.id,
                true // permanent
            );

            // Track permanent minion on server
            if (minion && minion.minionId) {
                networkManager.trackPermanentMinion(minion.minionId, 'add');
            }

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
                    const minion = this.scene.spawnMinion(
                        player.sprite.x + Phaser.Math.Between(-100, 100),
                        player.sprite.y + Phaser.Math.Between(-100, 100),
                        player.data.id,
                        true // permanent
                    );

                    // Track permanent minion on server
                    if (minion && minion.minionId) {
                        networkManager.trackPermanentMinion(minion.minionId, 'add');
                    }
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
        if (this.key1) {
            this.key1.removeAllListeners();
            this.key1 = null;
        }
        if (this.key2) {
            this.key2.removeAllListeners();
            this.key2 = null;
        }
        if (this.key3) {
            this.key3.removeAllListeners();
            this.key3 = null;
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
        console.log(`📊 window.getAvailableChoices exists: ${typeof window.getAvailableChoices === 'function'}`);

        // Load skills from MalacharSkillTree (only for Malachar class)
        // Check both the ID and display name variations
        const isMalachar = playerClass === 'MALACHAR' ||
                          playerClass === 'Malachar' ||
                          playerClass === 'Necromancer' ||
                          (this.scene.localPlayer && this.scene.localPlayer.data && this.scene.localPlayer.data.characterId === 'MALACHAR');

        console.log(`✔️ Is Malachar check: ${isMalachar}`);

        if (isMalachar && typeof MalacharSkillTree !== 'undefined' && typeof window.getAvailableChoices === 'function') {
            // Get unlocked skill IDs (just the IDs, in order)
            const unlockedSkillIds = this.selectedSkills.map(s => s.id);
            console.log(`📊 Unlocked skills:`, unlockedSkillIds);

            // Get skills for this specific level using new v2 API
            // Note: Function signature is (level, unlockedSkills)
            const levelSkills = window.getAvailableChoices(currentLevel, unlockedSkillIds);
            console.log(`✅ Found ${levelSkills ? levelSkills.length : 0} choices for level ${currentLevel}`);

            if (levelSkills && levelSkills.length > 0) {
                console.log(`✅ Returning skills:`, levelSkills.map(s => s.name));
                console.log(`======= END SKILL SELECTOR DEBUG =======\n`);
                return levelSkills;
            } else {
                console.warn(`⚠️ No skills found for level ${currentLevel} in MalacharSkillTree`);
                console.warn(`⚠️ Unlocked skills:`, unlockedSkillIds);
            }
        } else {
            console.log(`ℹ️ Not Malachar or skill tree not loaded - using fallback skills`);
            console.log(`ℹ️ Reason: ${!isMalachar ? 'Not Malachar' : typeof MalacharSkillTree === 'undefined' ? 'SkillTree not loaded' : 'getAvailableChoices not a function'}`);
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
        // Fisher-Yates shuffle algorithm for unbiased randomization
        const shuffled = [...skills];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
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
