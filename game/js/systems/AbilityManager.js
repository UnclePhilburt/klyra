// Ability Manager - Handles Q/E/R ability activation and cooldowns
class AbilityManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Cooldown tracking
        this.cooldowns = {
            q: 0,
            e: 0,
            r: 0
        };

        // Cooldown UI elements
        this.cooldownUI = null;

        // Create minimal testing UI
        this.createCooldownUI();
    }

    createCooldownUI() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Position at bottom center
        const centerX = width / 2;
        const bottomY = height - 80;

        // Unique color themes for each ability
        const colorThemes = {
            q: {
                primary: 0x06b6d4,    // Cyan
                secondary: 0x0891b2,  // Dark cyan
                glow: 0x22d3ee,       // Light cyan
                particle: 0x67e8f9    // Bright cyan
            },
            e: {
                primary: 0xa855f7,    // Purple
                secondary: 0x7c3aed,  // Dark purple
                glow: 0xc084fc,       // Light purple
                particle: 0xd8b4fe    // Bright purple
            },
            r: {
                primary: 0xf97316,    // Orange (ultimate)
                secondary: 0xea580c,  // Dark orange
                glow: 0xfb923c,       // Light orange
                particle: 0xfed7aa    // Bright orange
            }
        };

        // Create UI with color themes
        this.cooldownUI = {
            q: this.createMinimalDisplay(centerX - 180, bottomY, 'Q', colorThemes.q),
            e: this.createMinimalDisplay(centerX, bottomY, 'E', colorThemes.e),
            r: this.createMinimalDisplay(centerX + 180, bottomY, 'R', colorThemes.r)
        };
    }

    createMinimalDisplay(x, y, key, colorTheme) {
        const container = this.scene.add.container(x, y);
        container.setScrollFactor(0);
        container.setDepth(10000);

        // STUNNING GRADIENT DESIGN
        const boxWidth = 170;
        const boxHeight = 55;
        const circleRadius = 22;

        // Outer glow layers (multiple for depth)
        const outerGlow1 = this.scene.add.graphics();
        outerGlow1.setAlpha(0);
        container.add(outerGlow1);

        const outerGlow2 = this.scene.add.graphics();
        outerGlow2.setAlpha(0);
        container.add(outerGlow2);

        // Shimmer effect layer
        const shimmer = this.scene.add.graphics();
        shimmer.setAlpha(0);
        container.add(shimmer);

        // Main background with gradient
        const bg = this.scene.add.graphics();
        container.add(bg);

        // Circular progress ring (around key)
        const progressRing = this.scene.add.graphics();
        container.add(progressRing);

        // Secondary progress ring (inner)
        const progressRingInner = this.scene.add.graphics();
        container.add(progressRingInner);

        // Key circle (left side)
        const keyCircle = this.scene.add.circle(-boxWidth/2 + circleRadius + 10, 0, circleRadius, 0x1a1a2e, 0.9);
        keyCircle.setStrokeStyle(2, 0x374151, 0.8);
        container.add(keyCircle);

        // Inner key circle for gradient effect
        const keyCircleInner = this.scene.add.circle(-boxWidth/2 + circleRadius + 10, 0, circleRadius - 4, 0x0a0a0f, 0);
        container.add(keyCircleInner);

        const keyText = this.scene.add.text(-boxWidth/2 + circleRadius + 10, 0, key, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontStyle: 'bold',
            fill: '#6b7280',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        container.add(keyText);

        // Ability name (center-right)
        const label = this.scene.add.text(-boxWidth/2 + 62, -10, '...', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fontStyle: 'bold',
            fill: '#f3f4f6',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        container.add(label);

        // Cooldown/Status text (below name)
        const cooldownText = this.scene.add.text(-boxWidth/2 + 62, 10, 'READY', {
            fontFamily: 'Arial',
            fontSize: '11px',
            fontStyle: 'bold',
            fill: '#10b981',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        container.add(cooldownText);

        // Animated particles (more for dramatic effect)
        const particles = [];
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(0, 0, 2.5, colorTheme.particle, 0);
            container.add(particle);
            particles.push(particle);
        }

        // Sparkle effects
        const sparkles = [];
        for (let i = 0; i < 3; i++) {
            const sparkle = this.scene.add.circle(0, 0, 1.5, 0xffffff, 0);
            container.add(sparkle);
            sparkles.push(sparkle);
        }

        // Add invisible interactive area for touch/click (on top of everything)
        const touchArea = this.scene.add.rectangle(0, 0, boxWidth, boxHeight, 0xffffff, 0.001);
        touchArea.setInteractive({ useHandCursor: true });
        touchArea.setScrollFactor(0);
        container.add(touchArea);

        // Touch/click handler to use ability
        touchArea.on('pointerdown', () => {
            this.useAbility(key);
        });

        // Visual feedback on hover (desktop)
        touchArea.on('pointerover', () => {
            container.setScale(1.05);
        });

        touchArea.on('pointerout', () => {
            container.setScale(1);
        });

        return {
            container,
            bg,
            outerGlow1,
            outerGlow2,
            shimmer,
            keyCircle,
            keyCircleInner,
            progressRing,
            progressRingInner,
            keyText,
            label,
            cooldownText,
            particles,
            sparkles,
            touchArea,
            boxWidth,
            boxHeight,
            circleRadius,
            colorTheme,
            readyPulse: null,
            shimmerTween: null,
            particleTweens: [],
            sparkleTweens: []
        };
    }

    createAbilityButton(x, y, key) {
        const container = this.scene.add.container(x, y);
        container.setScrollFactor(0);
        container.setDepth(10000);

        // Background circle
        const bg = this.scene.add.circle(0, 0, 35, 0x1a1a2e, 0.9);
        bg.setStrokeStyle(3, 0x6B4FFF, 0.8);
        container.add(bg);

        // Cooldown overlay (starts hidden)
        const cooldownOverlay = this.scene.add.circle(0, 0, 35, 0x000000, 0.7);
        cooldownOverlay.setVisible(false);
        container.add(cooldownOverlay);

        // Key text
        const keyText = this.scene.add.text(0, 0, key, {
            fontFamily: 'Press Start 2P, monospace',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add(keyText);

        // Cooldown text (seconds remaining)
        const cooldownText = this.scene.add.text(0, 0, '', {
            fontFamily: 'Press Start 2P, monospace',
            fontSize: '16px',
            fill: '#FF4444'
        }).setOrigin(0.5);
        cooldownText.setVisible(false);
        container.add(cooldownText);

        // Ability name (shown on hover or when available)
        const abilityName = this.scene.add.text(0, -55, '', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '12px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            backgroundColor: '#0a0a0fdd',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5);
        abilityName.setVisible(false);
        container.add(abilityName);

        return {
            container,
            bg,
            cooldownOverlay,
            keyText,
            cooldownText,
            abilityName
        };
    }

    update(time, delta) {
        // Update cooldowns
        Object.keys(this.cooldowns).forEach(key => {
            if (this.cooldowns[key] > 0) {
                this.cooldowns[key] -= delta;
                if (this.cooldowns[key] < 0) {
                    this.cooldowns[key] = 0;
                }
            }
        });

        // Update fire damage (Pact of Bones)
        if (this.scene.malacharAbilityHandler && this.scene.malacharAbilityHandler.updateFireDamage) {
            this.scene.malacharAbilityHandler.updateFireDamage();
        }

        // Update UI
        this.updateCooldownUI();
    }

    updateCooldownUI() {
        if (!this.cooldownUI) return;

        Object.keys(this.cooldownUI).forEach(key => {
            const ui = this.cooldownUI[key];
            const cooldown = this.cooldowns[key];
            const ability = this.player.abilities ? this.player.abilities[key] : null;
            const colors = ui.colorTheme;

            const centerX = -ui.boxWidth/2 + ui.circleRadius + 10;

            // Update ability name
            if (ability) {
                ui.label.setText(ability.name);
            } else {
                ui.label.setText('...');
            }

            // COOLDOWN STATE
            if (cooldown > 0 && ability) {
                const totalCooldown = ability.cooldown;
                const remaining = cooldown / 1000;
                const progress = 1 - (cooldown / totalCooldown);

                // Stop all ready animations
                if (ui.readyPulse) {
                    ui.readyPulse.stop();
                    ui.readyPulse = null;
                }
                if (ui.shimmerTween) {
                    ui.shimmerTween.stop();
                    ui.shimmerTween = null;
                }
                ui.particleTweens.forEach(t => t.stop());
                ui.particleTweens = [];
                ui.sparkleTweens.forEach(t => t.stop());
                ui.sparkleTweens = [];
                ui.particles.forEach(p => p.setAlpha(0));
                ui.sparkles.forEach(s => s.setAlpha(0));

                // GRADIENT BACKGROUND (cooldown state)
                ui.bg.clear();

                // Subtle dark gradient
                ui.bg.fillStyle(0x18181b, 0.85);
                ui.bg.fillRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);

                // Gradient border using multiple layers
                ui.bg.lineStyle(2, colors.secondary, 0.3);
                ui.bg.strokeRoundedRect(-ui.boxWidth/2 - 1, -ui.boxHeight/2 - 1, ui.boxWidth + 2, ui.boxHeight + 2, 8);

                ui.bg.lineStyle(2, 0x3f3f46, 0.6);
                ui.bg.strokeRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);

                // DUAL CIRCULAR PROGRESS RINGS (gradient effect)
                ui.progressRing.clear();
                ui.progressRingInner.clear();

                const startAngle = -Math.PI / 2;
                const endAngle = startAngle + (Math.PI * 2 * progress);

                // Outer ring (colored)
                ui.progressRing.lineStyle(3, colors.secondary, 0.8);
                ui.progressRing.beginPath();
                ui.progressRing.arc(centerX, 0, ui.circleRadius + 5, startAngle, endAngle, false);
                ui.progressRing.strokePath();

                // Inner ring (brighter)
                ui.progressRingInner.lineStyle(2, colors.primary, 1);
                ui.progressRingInner.beginPath();
                ui.progressRingInner.arc(centerX, 0, ui.circleRadius + 3, startAngle, endAngle, false);
                ui.progressRingInner.strokePath();

                // Gradient key circle
                ui.keyCircle.setStrokeStyle(3, colors.secondary, 0.5);
                ui.keyCircle.setFillStyle(0x1a1a2e, 0.9);
                ui.keyCircleInner.setAlpha(0.3);
                ui.keyCircleInner.setFillStyle(colors.primary, 0.15);

                // Update texts with themed colors
                ui.cooldownText.setText(remaining.toFixed(1) + 's');
                ui.cooldownText.setColor(Phaser.Display.Color.RGBToString(
                    Phaser.Display.Color.IntegerToRGB(colors.primary).r,
                    Phaser.Display.Color.IntegerToRGB(colors.primary).g,
                    Phaser.Display.Color.IntegerToRGB(colors.primary).b
                ));
                ui.keyText.setColor('#9ca3af');
                ui.label.setColor('#d1d5db');

                ui.outerGlow1.clear();
                ui.outerGlow2.clear();
                ui.shimmer.clear();

            // READY STATE - STUNNING GRADIENT ANIMATIONS
            } else if (ability) {
                // Clear progress rings
                ui.progressRing.clear();
                ui.progressRingInner.clear();

                // GORGEOUS GRADIENT BACKGROUND
                ui.bg.clear();

                // Multi-layer gradient glow (outer to inner)
                ui.bg.fillStyle(colors.glow, 0.15);
                ui.bg.fillRoundedRect(-ui.boxWidth/2 - 4, -ui.boxHeight/2 - 4, ui.boxWidth + 8, ui.boxHeight + 8, 10);

                ui.bg.fillStyle(colors.primary, 0.08);
                ui.bg.fillRoundedRect(-ui.boxWidth/2 - 2, -ui.boxHeight/2 - 2, ui.boxWidth + 4, ui.boxHeight + 4, 9);

                // Main background with gradient
                ui.bg.fillStyle(0x0a0a0f, 0.95);
                ui.bg.fillRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);

                // Inner gradient layer
                ui.bg.fillStyle(colors.primary, 0.05);
                ui.bg.fillRoundedRect(-ui.boxWidth/2 + 2, -ui.boxHeight/2 + 2, ui.boxWidth - 4, ui.boxHeight - 4, 6);

                // VIBRANT GRADIENT BORDER (triple layer)
                ui.bg.lineStyle(3, colors.glow, 0.6);
                ui.bg.strokeRoundedRect(-ui.boxWidth/2 - 2, -ui.boxHeight/2 - 2, ui.boxWidth + 4, ui.boxHeight + 4, 9);

                ui.bg.lineStyle(2, colors.primary, 1);
                ui.bg.strokeRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);

                ui.bg.lineStyle(1, colors.glow, 0.8);
                ui.bg.strokeRoundedRect(-ui.boxWidth/2 + 2, -ui.boxHeight/2 + 2, ui.boxWidth - 4, ui.boxHeight - 4, 6);

                // GLOWING KEY CIRCLE with gradient
                ui.keyCircle.setStrokeStyle(4, colors.primary, 1);
                ui.keyCircle.setFillStyle(colors.primary, 0.2);
                ui.keyCircleInner.setAlpha(0.5);
                ui.keyCircleInner.setFillStyle(colors.glow, 0.3);

                // Update texts with themed colors
                const colorStr = '#' + colors.primary.toString(16).padStart(6, '0');
                ui.cooldownText.setText('⚡ READY');
                ui.cooldownText.setColor(colorStr);
                ui.keyText.setColor(colorStr);
                ui.label.setColor('#ffffff');

                // ANIMATED MULTI-LAYER GLOWS
                if (!ui.readyPulse) {
                    // Outer glow layer 1 (large slow pulse)
                    ui.outerGlow1.clear();
                    ui.outerGlow1.fillStyle(colors.glow, 0.2);
                    ui.outerGlow1.fillCircle(centerX, 0, ui.circleRadius + 16);

                    // Outer glow layer 2 (medium fast pulse)
                    ui.outerGlow2.clear();
                    ui.outerGlow2.fillStyle(colors.primary, 0.25);
                    ui.outerGlow2.fillCircle(centerX, 0, ui.circleRadius + 10);

                    // Pulsing animations (different speeds for depth)
                    ui.readyPulse = this.scene.tweens.add({
                        targets: ui.outerGlow1,
                        alpha: { from: 0.25, to: 0 },
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        repeat: -1,
                        yoyo: true
                    });

                    this.scene.tweens.add({
                        targets: ui.outerGlow2,
                        alpha: { from: 0.35, to: 0.05 },
                        duration: 1200,
                        ease: 'Sine.easeInOut',
                        repeat: -1,
                        yoyo: true
                    });

                    // SHIMMER EFFECT (sweeping light)
                    ui.shimmer.clear();
                    ui.shimmer.lineStyle(2, colors.glow, 0.5);
                    ui.shimmer.strokeRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);

                    ui.shimmerTween = this.scene.tweens.add({
                        targets: ui.shimmer,
                        alpha: { from: 0, to: 0.8 },
                        x: { from: -20, to: 20 },
                        duration: 1500,
                        ease: 'Sine.easeInOut',
                        repeat: -1,
                        yoyo: true
                    });

                    // ORBITING PARTICLES (colored)
                    ui.particles.forEach((particle, i) => {
                        const angle = (i / ui.particles.length) * Math.PI * 2;
                        const radius = ui.circleRadius + 12;

                        particle.setPosition(
                            centerX + Math.cos(angle) * radius,
                            Math.sin(angle) * radius
                        );
                        particle.setAlpha(0.9);
                        particle.setFillStyle(colors.particle);

                        const tween = this.scene.tweens.add({
                            targets: particle,
                            angle: angle + Math.PI * 2,
                            duration: 3000,
                            repeat: -1,
                            onUpdate: () => {
                                const currentAngle = Phaser.Math.DegToRad(particle.angle);
                                particle.setPosition(
                                    centerX + Math.cos(currentAngle) * radius,
                                    Math.sin(currentAngle) * radius
                                );
                            }
                        });
                        ui.particleTweens.push(tween);
                    });

                    // SPARKLES (random twinkling)
                    ui.sparkles.forEach((sparkle, i) => {
                        const angle = Math.random() * Math.PI * 2;
                        const radius = ui.circleRadius + 6 + Math.random() * 8;

                        sparkle.setPosition(
                            centerX + Math.cos(angle) * radius,
                            Math.sin(angle) * radius
                        );
                        sparkle.setFillStyle(0xffffff);

                        const tween = this.scene.tweens.add({
                            targets: sparkle,
                            alpha: { from: 0, to: 1 },
                            scale: { from: 0.5, to: 1.5 },
                            duration: 800 + Math.random() * 400,
                            delay: i * 300,
                            ease: 'Sine.easeInOut',
                            repeat: -1,
                            yoyo: true
                        });
                        ui.sparkleTweens.push(tween);
                    });
                }

            // NO ABILITY EQUIPPED
            } else {
                // Stop animations
                if (ui.readyPulse) {
                    ui.readyPulse.stop();
                    ui.readyPulse = null;
                }
                if (ui.shimmerTween) {
                    ui.shimmerTween.stop();
                    ui.shimmerTween = null;
                }
                ui.particleTweens.forEach(t => t.stop());
                ui.particleTweens = [];
                ui.sparkleTweens.forEach(t => t.stop());
                ui.sparkleTweens = [];
                ui.particles.forEach(p => p.setAlpha(0));
                ui.sparkles.forEach(s => s.setAlpha(0));

                ui.progressRing.clear();
                ui.progressRingInner.clear();
                ui.outerGlow1.clear();
                ui.outerGlow2.clear();
                ui.shimmer.clear();

                // Dim inactive background
                ui.bg.clear();
                ui.bg.fillStyle(0x0a0a0f, 0.6);
                ui.bg.fillRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);
                ui.bg.lineStyle(2, 0x1a1a1f, 0.5);
                ui.bg.strokeRoundedRect(-ui.boxWidth/2, -ui.boxHeight/2, ui.boxWidth, ui.boxHeight, 8);

                ui.keyCircle.setStrokeStyle(2, 0x27272a, 0.6);
                ui.keyCircle.setFillStyle(0x18181b, 0.8);
                ui.keyCircleInner.setAlpha(0);

                ui.cooldownText.setText('---');
                ui.cooldownText.setColor('#3f3f46');
                ui.keyText.setColor('#52525b');
                ui.label.setColor('#52525b');
            }
        });
    }

    canUseAbility(key) {
        // Check if ability exists
        if (!this.player.abilities || !this.player.abilities[key]) {
            return false;
        }

        // Check cooldown
        if (this.cooldowns[key] > 0) {
            return false;
        }

        return true;
    }

    useAbility(key) {
        if (!this.canUseAbility(key)) {
            console.log(`❌ Ability ${key.toUpperCase()} not ready`);
            return false;
        }

        const ability = this.player.abilities[key];
        console.log(`✨ Using ability: ${ability.name} (${key.toUpperCase()})`);

        // Start cooldown
        this.cooldowns[key] = ability.cooldown;

        // Execute ability effect
        this.executeAbility(key, ability);

        // Flash the UI button
        this.flashButton(key);

        return true;
    }

    flashButton(key) {
        if (!this.cooldownUI || !this.cooldownUI[key]) return;

        const ui = this.cooldownUI[key];

        // Simple flash effect
        this.scene.tweens.add({
            targets: ui.bg,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
    }

    executeAbility(key, ability) {
        console.log(`🔥 Executing ${key.toUpperCase()}: ${ability.name}`);

        // MALACHAR: Delegate to ability handler if it exists
        if (this.scene.malacharAbilityHandler) {
            const methodName = `use${key.toUpperCase()}`;
            if (typeof this.scene.malacharAbilityHandler[methodName] === 'function') {
                console.log(`  🔮 Delegating to MalacharAbilityHandler.${methodName}()`);
                const success = this.scene.malacharAbilityHandler[methodName]();
                if (success) {
                    return; // Handler executed successfully
                }
            }
        }

        // LEGACY: Fallback to old system
        console.log(`   Effect:`, ability.effect);
        console.log(`   Bonus Effect:`, ability.bonusEffect);

        // Get combined effects
        const effect = { ...ability.effect, ...ability.bonusEffect };

        // ==== NECROMANCER ABILITIES ====

        // Q - Rally Command / Variants
        if (effect.minionAttackSpeed) {
            console.log(`  💨 Minion attack speed boost: ${effect.minionAttackSpeed}x`);
            this.createNecromancerQEffect();
            // TODO: Apply temporary attack speed buff to all minions

            // Bonus: Spawn temps
            if (effect.spawnTemps) {
                console.log(`  👥 Spawning ${effect.spawnTemps} temporary minions`);
                for (let i = 0; i < effect.spawnTemps; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 100;
                    const x = this.player.sprite.x + Math.cos(angle) * distance;
                    const y = this.player.sprite.y + Math.sin(angle) * distance;

                    const minion = this.scene.spawnMinion(x, y, this.player.data.id, false);
                    // TODO: Apply elite stats if tempElite is true

                    // Auto-remove after duration
                    if (effect.tempDuration) {
                        setTimeout(() => {
                            if (minion && minion.sprite) {
                                minion.health = 0;
                                // Death will be handled by normal minion death logic
                            }
                        }, effect.tempDuration);
                    }
                }
            }

            // Bonus: Teleport to player
            if (effect.teleportToPlayer) {
                console.log(`  📍 Teleporting minions to player`);
                // TODO: Teleport all minions to player position in radial pattern
            }
        }

        // E - Skeletal Fury / Variants
        if (effect.minionHPSacrifice) {
            console.log(`  💀 Sacrificing ${effect.minionHPSacrifice * 100}% minion HP`);
            console.log(`  ⚔️ Damage bonus: ${effect.minionDamageBonus}x`);
            console.log(`  📏 Size bonus: ${effect.minionSizeBonus}x`);
            this.createNecromancerEEffect();
            // TODO: Sacrifice minion HP, apply damage/size buff temporarily
        }

        // R - Mass Resurrection / Variants
        if (effect.reviveAll) {
            console.log(`  ⚰️ Reviving all dead minions`);
            this.createNecromancerREffect();
            // TODO: Track dead minions and revive them
        }

        // ==== SHADOWCASTER ABILITIES ====

        // Q - Shadowbolt Storm
        if (effect.waves && effect.boltsPerWave) {
            console.log(`  💫 Firing ${effect.waves} waves of ${effect.boltsPerWave} bolts`);
            this.createShadowcasterQEffect(effect.waves, effect.boltsPerWave);
            // TODO: Fire shadow bolt waves in all directions
        }

        // E - Blink Strike
        if (effect.teleportDistance) {
            console.log(`  🌀 Teleporting ${effect.teleportDistance} tiles`);
            this.createShadowcasterEEffect(effect.teleportDistance);
            // TODO: Teleport player in movement direction, leave void zone
        }

        // R - Oblivion Beam
        if (effect.beamDPS) {
            console.log(`  ⚡ Channeling beam: ${effect.beamDPS} DPS for ${ability.duration}ms`);
            this.createShadowcasterREffect(ability.duration);
            // TODO: Create beam targeting nearest enemy
        }

        // ==== BLOOD RITUALIST ABILITIES ====

        // Q - Blood Boil
        if (effect.damagePercent && effect.usePlayerHP) {
            const damage = this.player.health * effect.damagePercent;
            console.log(`  🩸 Dealing ${damage} damage in ${effect.radius} tile radius`);
            this.createBloodRitualistQEffect(effect.radius);
            // TODO: Damage all enemies in radius based on player HP
        }

        // E - Crimson Harvest
        if (effect.lifestealPercent) {
            console.log(`  💉 Lifesteal: ${effect.lifestealPercent * 100}% for ${ability.duration}ms`);
            this.createBloodRitualistEEffect(ability.duration);
            // TODO: Apply temporary lifesteal to player and minions
        }

        // R - Blood Moon Ritual
        if (effect.playerHPSacrifice) {
            const sacrifice = this.player.health * effect.playerHPSacrifice;
            this.player.health = Math.max(1, this.player.health - sacrifice);
            console.log(`  💔 Sacrificed ${sacrifice} HP`);
            console.log(`  💪 Minion stats: ${effect.minionStatsBonus}x for ${ability.duration}ms`);
            this.createBloodRitualistREffect();
            // TODO: Apply temporary minion stat boost
        }

        console.log(`✅ Ability ${key.toUpperCase()} executed`);
    }

    // ==== VISUAL EFFECTS ====

    createNecromancerQEffect() {
        // Green wave expanding from player (Rally Command)
        const wave = this.scene.add.circle(
            this.player.sprite.x,
            this.player.sprite.y,
            10,
            0x00ff00,
            0.3
        );
        wave.setStrokeStyle(4, 0x00ff00, 0.8);
        wave.setDepth(9000);

        this.scene.tweens.add({
            targets: wave,
            radius: 300,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => wave.destroy()
        });

        // Sparkles around player
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = this.player.sprite.x + Math.cos(angle) * 50;
            const y = this.player.sprite.y + Math.sin(angle) * 50;

            const sparkle = this.scene.add.circle(x, y, 4, 0x88ff88);
            sparkle.setDepth(9001);

            this.scene.tweens.add({
                targets: sparkle,
                alpha: 0,
                y: y - 30,
                duration: 600,
                ease: 'Power2',
                onComplete: () => sparkle.destroy()
            });
        }
    }

    createNecromancerEEffect() {
        // Red pulsing effect (Skeletal Fury)
        const pulse = this.scene.add.circle(
            this.player.sprite.x,
            this.player.sprite.y,
            80,
            0xff0000,
            0.4
        );
        pulse.setDepth(9000);

        this.scene.tweens.add({
            targets: pulse,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => pulse.destroy()
        });

        // Screen flash
        this.flashScreen(0xff0000, 0.2, 200);
    }

    createNecromancerREffect() {
        // Purple resurrection circles (Mass Resurrection)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const distance = 120;
            const x = this.player.sprite.x + Math.cos(angle) * distance;
            const y = this.player.sprite.y + Math.sin(angle) * distance;

            const circle = this.scene.add.circle(x, y, 30, 0x9900ff, 0.5);
            circle.setStrokeStyle(3, 0xcc66ff);
            circle.setDepth(9000);

            this.scene.tweens.add({
                targets: circle,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => circle.destroy()
            });
        }
    }

    createShadowcasterQEffect(waves, boltsPerWave) {
        // Purple shadow bolts (Shadowbolt Storm)
        for (let wave = 0; wave < waves; wave++) {
            this.scene.time.delayedCall(wave * 200, () => {
                for (let i = 0; i < boltsPerWave; i++) {
                    const angle = (i / boltsPerWave) * Math.PI * 2;
                    const bolt = this.scene.add.circle(
                        this.player.sprite.x,
                        this.player.sprite.y,
                        8,
                        0x6600ff,
                        0.8
                    );
                    bolt.setDepth(9000);

                    const targetX = this.player.sprite.x + Math.cos(angle) * 400;
                    const targetY = this.player.sprite.y + Math.sin(angle) * 400;

                    this.scene.tweens.add({
                        targets: bolt,
                        x: targetX,
                        y: targetY,
                        duration: 600,
                        ease: 'Power2',
                        onComplete: () => bolt.destroy()
                    });
                }
            });
        }
    }

    createShadowcasterEEffect(distance) {
        // Dark purple teleport effect (Blink Strike)
        const startX = this.player.sprite.x;
        const startY = this.player.sprite.y;

        // Void zone at starting position
        const voidZone = this.scene.add.circle(startX, startY, 40, 0x220044, 0.6);
        voidZone.setDepth(9000);

        this.scene.tweens.add({
            targets: voidZone,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => voidZone.destroy()
        });

        // Purple flash
        this.flashScreen(0x6600ff, 0.3, 150);
    }

    createShadowcasterREffect(duration) {
        // Purple beam effect (Oblivion Beam)
        const beam = this.scene.add.rectangle(
            this.player.sprite.x,
            this.player.sprite.y,
            400,
            20,
            0x8800ff,
            0.7
        );
        beam.setDepth(9000);

        // Pulsing animation
        this.scene.tweens.add({
            targets: beam,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            repeat: Math.floor(duration / 400),
            onComplete: () => beam.destroy()
        });

        // Auto-destroy after duration
        this.scene.time.delayedCall(duration, () => {
            if (beam && beam.scene) {
                beam.destroy();
            }
        });
    }

    createBloodRitualistQEffect(radius) {
        // Red explosion (Blood Boil)
        const explosion = this.scene.add.circle(
            this.player.sprite.x,
            this.player.sprite.y,
            radius * 32,
            0xff0000,
            0.4
        );
        explosion.setDepth(9000);

        this.scene.tweens.add({
            targets: explosion,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 600,
            ease: 'Power3',
            onComplete: () => explosion.destroy()
        });

        // Blood particles
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 32;
            const x = this.player.sprite.x + Math.cos(angle) * dist;
            const y = this.player.sprite.y + Math.sin(angle) * dist;

            const particle = this.scene.add.circle(x, y, 6, 0xcc0000);
            particle.setDepth(9001);

            this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                y: y + 30,
                duration: 800,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    createBloodRitualistEEffect(duration) {
        // Red aura (Crimson Harvest)
        const aura = this.scene.add.circle(
            this.player.sprite.x,
            this.player.sprite.y,
            60,
            0xff3333,
            0.3
        );
        aura.setDepth(8999);

        // Follow player
        const updateAura = () => {
            if (aura && aura.scene && this.player.sprite) {
                aura.setPosition(this.player.sprite.x, this.player.sprite.y);
            }
        };

        const auraInterval = setInterval(updateAura, 16);

        // Pulsing effect
        this.scene.tweens.add({
            targets: aura,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.15,
            duration: 500,
            yoyo: true,
            repeat: Math.floor(duration / 1000),
            onComplete: () => {
                clearInterval(auraInterval);
                aura.destroy();
            }
        });
    }

    createBloodRitualistREffect() {
        // Dark red ritual circle (Blood Moon Ritual)
        const ritualCircle = this.scene.add.circle(
            this.player.sprite.x,
            this.player.sprite.y,
            150,
            0x440000,
            0.5
        );
        ritualCircle.setStrokeStyle(5, 0xff0000, 0.8);
        ritualCircle.setDepth(9000);

        this.scene.tweens.add({
            targets: ritualCircle,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => ritualCircle.destroy()
        });

        // Red screen flash
        this.flashScreen(0x880000, 0.4, 300);

        // Rotating runes
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = this.player.sprite.x + Math.cos(angle) * 100;
            const y = this.player.sprite.y + Math.sin(angle) * 100;

            const rune = this.scene.add.circle(x, y, 8, 0xff6666);
            rune.setDepth(9001);

            this.scene.tweens.add({
                targets: rune,
                alpha: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => rune.destroy()
            });
        }
    }

    flashScreen(color, intensity, duration) {
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2,
            this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            color,
            intensity
        );
        flash.setScrollFactor(0);
        flash.setDepth(10001);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: duration,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
    }

    destroy() {
        if (this.cooldownUI) {
            Object.values(this.cooldownUI).forEach(ui => {
                // Stop all animations
                if (ui.readyPulse) {
                    ui.readyPulse.stop();
                    ui.readyPulse = null;
                }
                if (ui.shimmerTween) {
                    ui.shimmerTween.stop();
                    ui.shimmerTween = null;
                }
                if (ui.particleTweens) {
                    ui.particleTweens.forEach(t => t.stop());
                    ui.particleTweens = [];
                }
                if (ui.sparkleTweens) {
                    ui.sparkleTweens.forEach(t => t.stop());
                    ui.sparkleTweens = [];
                }
                if (ui.container) {
                    ui.container.destroy();
                }
            });
            this.cooldownUI = null;
        }
    }
}
