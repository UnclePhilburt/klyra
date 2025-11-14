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

        // Simple text-based UI for testing
        this.cooldownUI = {
            q: this.createMinimalDisplay(centerX - 150, bottomY, 'Q'),
            e: this.createMinimalDisplay(centerX, bottomY, 'E'),
            r: this.createMinimalDisplay(centerX + 150, bottomY, 'R')
        };
    }

    createMinimalDisplay(x, y, key) {
        const container = this.scene.add.container(x, y);
        container.setScrollFactor(0);
        container.setDepth(10000);

        // Simple background box
        const bg = this.scene.add.rectangle(0, 0, 120, 40, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0x444444);
        container.add(bg);

        // Key + ability name
        const label = this.scene.add.text(0, -10, `[${key}] ...`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        container.add(label);

        // Cooldown text
        const cooldownText = this.scene.add.text(0, 8, 'Ready', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '10px',
            fill: '#00ff00',
            align: 'center'
        }).setOrigin(0.5);
        container.add(cooldownText);

        return {
            container,
            bg,
            label,
            cooldownText
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

        // Update UI
        this.updateCooldownUI();
    }

    updateCooldownUI() {
        if (!this.cooldownUI) return;

        Object.keys(this.cooldownUI).forEach(key => {
            const ui = this.cooldownUI[key];
            const cooldown = this.cooldowns[key];
            const ability = this.player.abilities ? this.player.abilities[key] : null;

            // Update ability name
            if (ability) {
                ui.label.setText(`[${key.toUpperCase()}] ${ability.name}`);
            } else {
                ui.label.setText(`[${key.toUpperCase()}] ...`);
            }

            // Update cooldown display
            if (cooldown > 0) {
                const seconds = Math.ceil(cooldown / 1000);
                ui.cooldownText.setText(`${seconds}s`);
                ui.cooldownText.setColor('#ff4444');
                ui.bg.setStrokeStyle(2, 0x444444);
            } else {
                if (ability) {
                    ui.cooldownText.setText('Ready');
                    ui.cooldownText.setColor('#00ff00');
                    ui.bg.setStrokeStyle(2, 0x00ff00);
                } else {
                    ui.cooldownText.setText('...');
                    ui.cooldownText.setColor('#666666');
                    ui.bg.setStrokeStyle(2, 0x333333);
                }
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
                if (ui.container) {
                    ui.container.destroy();
                }
            });
            this.cooldownUI = null;
        }
    }
}
