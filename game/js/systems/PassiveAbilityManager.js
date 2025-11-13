// PassiveAbilityManager - Handles all passive skill effects and periodic abilities
class PassiveAbilityManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Track active passive abilities
        this.passiveAbilities = [];

        // Cooldown tracking
        this.cooldowns = new Map();

        // Aura damage tracking (to avoid spamming network)
        // Format: "enemyId_auraType" -> lastDamageTime
        this.auraDamageCooldowns = new Map();

        // Combat state tracking
        this.inCombat = false;
        this.lastCombatTime = 0;
        this.combatDuration = 0;

        // Track which auras are currently active (for visuals)
        this.activeAuras = new Set();

        // Initialize periodic update
        this.updateInterval = this.scene.time.addEvent({
            delay: 100, // Update every 100ms
            callback: () => this.update(),
            loop: true
        });

        console.log('✅ PassiveAbilityManager initialized for player:', player.data.username);
    }

    getVisualEffects() {
        // Get or create visual effects manager
        if (!this.scene.visualEffectsManager) {
            this.scene.visualEffectsManager = new VisualEffectsManager(this.scene, this.player);
        }
        return this.scene.visualEffectsManager;
    }

    addPassiveAbility(skill) {
        this.passiveAbilities.push({
            id: skill.id,
            name: skill.name,
            effect: skill.effect,
            path: skill.path
        });
        console.log(`✨ Added passive ability: ${skill.name}`, skill.effect);
        console.log(`📊 Total passive abilities: ${this.passiveAbilities.length}`);

        // Create visual effects for auras
        const effect = skill.effect;
        const vfx = this.getVisualEffects();

        // Curse Aura - Purple slow aura
        if (effect.curseAura && !this.activeAuras.has('curse')) {
            vfx.createAura('curse', {
                radius: (effect.curseAura.radius || 4) * 32,
                color: 0x8b5cf6,
                alpha: 0.15,
                strokeColor: 0x8b5cf6,
                strokeAlpha: 0.4,
                pulseSpeed: 2000
            });
            this.activeAuras.add('curse');
        }

        // Life Drain Aura - Green drain aura
        if (effect.lifeDrainAura && !this.activeAuras.has('lifedrain')) {
            vfx.createAura('lifedrain', {
                radius: (effect.lifeDrainAura.radius || 4) * 32,
                color: 0x10b981,
                alpha: 0.2,
                strokeColor: 0x10b981,
                strokeAlpha: 0.5,
                pulseSpeed: 1500
            });
            this.activeAuras.add('lifedrain');
        }

        // Damage Aura - Red damage aura
        if (effect.damageAura && !this.activeAuras.has('damage')) {
            vfx.createAura('damage', {
                radius: (effect.damageAura.radius || 4) * 32,
                color: 0xef4444,
                alpha: 0.18,
                strokeColor: 0xef4444,
                strokeAlpha: 0.6,
                pulseSpeed: 1000
            });
            this.activeAuras.add('damage');
        }

        // Plague Aura - Toxic green aura
        if (effect.plagueAura && !this.activeAuras.has('plague')) {
            vfx.createAura('plague', {
                radius: (effect.plagueAura.radius || 3) * 32,
                color: 0x84cc16,
                alpha: 0.2,
                strokeColor: 0x84cc16,
                strokeAlpha: 0.5,
                pulseSpeed: 1800
            });
            this.activeAuras.add('plague');
        }

        // Hex Aura - Dark purple hex aura
        if (effect.hexAura && !this.activeAuras.has('hex')) {
            vfx.createAura('hex', {
                radius: (effect.hexAura.radius || 5) * 32,
                color: 0x5b21b6,
                alpha: 0.16,
                strokeColor: 0x5b21b6,
                strokeAlpha: 0.4,
                pulseSpeed: 2200
            });
            this.activeAuras.add('hex');
        }

        // Time Slow Aura - Cyan time dilation
        if (effect.timeSlow && !this.activeAuras.has('timeslow')) {
            vfx.createAura('timeslow', {
                radius: (effect.timeSlow.radius || 5) * 32,
                color: 0x06b6d4,
                alpha: 0.14,
                strokeColor: 0x06b6d4,
                strokeAlpha: 0.3,
                pulseSpeed: 3000
            });
            this.activeAuras.add('timeslow');
        }

        // Dread Aura - Black fear aura
        if (effect.dreadAura && !this.activeAuras.has('dread')) {
            vfx.createAura('dread', {
                radius: (effect.dreadAura.radius || 6) * 32,
                color: 0x1f1f1f,
                alpha: 0.25,
                strokeColor: 0x4b5563,
                strokeAlpha: 0.5,
                pulseSpeed: 2500
            });
            this.activeAuras.add('dread');
        }
    }

    update() {
        const now = Date.now();

        // Update combat state
        this.updateCombatState();

        // Update visual effects
        if (this.scene.visualEffectsManager) {
            this.scene.visualEffectsManager.update();
        }

        // Process each passive ability
        this.passiveAbilities.forEach(ability => {
            this.processAbility(ability, now);
        });
    }

    updateCombatState() {
        // Check if player is in combat (enemies nearby)
        // Combine both enemies and wolves
        const enemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        const nearbyEnemies = enemies.filter(enemy => {
            if (!enemy || !enemy.sprite) return false;
            const dist = Phaser.Math.Distance.Between(
                this.player.sprite.x,
                this.player.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );
            return dist < 500; // 500 pixels = combat range
        });

        const wasInCombat = this.inCombat;
        this.inCombat = nearbyEnemies.length > 0;

        if (this.inCombat) {
            this.lastCombatTime = Date.now();
            if (wasInCombat) {
                this.combatDuration += 100; // Add 100ms
            } else {
                this.combatDuration = 0; // Reset when entering combat
            }
        }
    }

    processAbility(ability, now) {
        const effect = ability.effect;

        // Shadow Volley - Auto-fire shadow bolts
        if (effect.shadowVolley) {
            this.processShadowVolley(ability, now);
        }

        // Curse Aura - Slow nearby enemies
        if (effect.curseAura) {
            this.processCurseAura(effect.curseAura);
        }

        // Life Drain Aura - Drain HP from nearby enemies
        if (effect.lifeDrainAura) {
            this.processLifeDrainAura(effect.lifeDrainAura);
        }

        // Withering Aura - Damage nearby enemies
        if (effect.damageAura) {
            this.processDamageAura(effect.damageAura);
        }

        // Corpse Explosion - Enemies explode on death
        if (effect.corpseExplosion) {
            // Handled by enemy death event
        }

        // Void Eruption - Periodic AOE explosion
        if (effect.voidEruption) {
            this.processVoidEruption(ability, now);
        }

        // Cursed Ground - Leave damaging trail
        if (effect.cursedTrail) {
            this.processCursedTrail(effect.cursedTrail);
        }

        // Soul Collector - Collect souls on kill
        if (effect.soulCollector) {
            // Handled by kill event
        }

        // Retaliatory Nova - Explode when damaged
        if (effect.retaliationNova) {
            // Handled by damage event
        }

        // Plague Spreader - Spread disease
        if (effect.plagueAura) {
            this.processPlagueAura(effect.plagueAura);
        }

        // Death Spiral - Periodic spin attack
        if (effect.deathSpiral) {
            this.processDeathSpiral(ability, now);
        }

        // Reaper's Fury - Fury mode on kill
        if (effect.furyOnKill) {
            // Handled by kill event
        }

        // Hex Master - Apply random curses
        if (effect.hexAura) {
            this.processHexAura(ability, now);
        }

        // Eclipse Zone - Create darkness zone
        if (effect.eclipseZone) {
            // Triggered when surrounded
        }

        // Exponential Dark - Damage doubles over time
        if (effect.exponentialDamage && this.inCombat) {
            this.processExponentialDamage(ability, now);
        }

        // Periodic Explosion (Reaper Nova)
        if (effect.periodicExplosion) {
            this.processPeriodicExplosion(ability, now);
        }

        // Auto spawn minions during combat
        if (effect.autoSpawnInterval && this.inCombat) {
            this.processAutoSpawn(ability, now);
        }

        // Time Dilation - Slow nearby enemies
        if (effect.timeSlow) {
            this.processTimeSlow(effect.timeSlow);
        }

        // Stats per second alive
        if (effect.statsPerSecond) {
            this.processStatsPerSecond(effect, now);
        }

        // Endless spawn
        if (effect.autoSummon) {
            this.processAutoSummon(ability, now);
        }

        // Raise undead from corpses
        if (effect.raiseUndead) {
            this.processRaiseUndead(ability, now);
        }
    }

    processShadowVolley(ability, now) {
        const cooldownKey = `${ability.id}_shadowVolley`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const cooldown = ability.effect.shadowVolley.cooldown || 3000;

        if (now - lastCast >= cooldown) {
            // Find nearest enemy
            const nearestEnemy = this.findNearestEnemy();
            if (nearestEnemy) {
                const damage = ability.effect.shadowVolley.damage || 15;
                console.log(`⚡ Shadow Volley firing! Damage: ${damage}, Target:`, nearestEnemy);

                // Use new visual effects manager
                const vfx = this.getVisualEffects();
                vfx.createShadowBolt(
                    this.player.sprite.x,
                    this.player.sprite.y,
                    nearestEnemy.sprite.x,
                    nearestEnemy.sprite.y,
                    damage,
                    (enemy, dmg) => {
                        // Hit callback - deal damage
                        if (enemy.data && enemy.data.id && typeof networkManager !== 'undefined') {
                            const playerPosition = {
                                x: Math.floor(this.player.sprite.x / 32),
                                y: Math.floor(this.player.sprite.y / 32)
                            };
                            networkManager.hitEnemy(enemy.data.id, dmg, this.player.data.id, playerPosition);
                        }
                    }
                );

                this.cooldowns.set(cooldownKey, now);
            } else {
                console.log(`⚡ Shadow Volley ready but no enemies found`);
            }
        }
    }

    processCurseAura(curseAura) {
        const enemies = this.getEnemiesInRadius(curseAura.radius || 4);
        enemies.forEach(enemy => {
            if (enemy.cursed !== true) {
                enemy.cursed = true;
                enemy.curseSlowPercent = curseAura.slowPercent || 0.3;
                // Apply slow to enemy movement
                if (enemy.speed) {
                    enemy.speed *= (1 - enemy.curseSlowPercent);
                }
            }
        });
    }

    processLifeDrainAura(lifeDrainAura) {
        const enemies = this.getEnemiesInRadius(lifeDrainAura.radius || 4);
        const dps = lifeDrainAura.dps || 10;
        const now = Date.now();
        const auraCooldown = 1000; // Deal damage once per second per enemy

        enemies.forEach(enemy => {
            if (!enemy.data || !enemy.data.id) return;

            const cooldownKey = `${enemy.data.id}_lifeDrain`;
            const lastDamage = this.auraDamageCooldowns.get(cooldownKey) || 0;

            // Only damage each enemy once per second
            if (now - lastDamage >= auraCooldown) {
                // Deal 1 second worth of damage
                const damage = dps;

                // Send damage through network
                if (typeof networkManager !== 'undefined') {
                    const playerPosition = {
                        x: Math.floor(this.player.sprite.x / 32),
                        y: Math.floor(this.player.sprite.y / 32)
                    };
                    networkManager.hitEnemy(enemy.data.id, damage, this.player.data.id, playerPosition);
                }

                // Heal player
                this.player.health = Math.min(this.player.maxHealth, this.player.health + damage);
                if (this.player.ui) {
                    this.player.ui.updateHealthBar();
                }

                // Visual feedback - green healing effect
                this.createAuraHitEffect(enemy.sprite.x, enemy.sprite.y, 0x00ff00);

                this.auraDamageCooldowns.set(cooldownKey, now);
            }
        });
    }

    processDamageAura(damageAura) {
        const enemies = this.getEnemiesInRadius(damageAura.radius || 4);
        const dps = damageAura.dps || 5;
        const now = Date.now();
        const auraCooldown = 1000; // Deal damage once per second per enemy

        enemies.forEach(enemy => {
            if (!enemy.data || !enemy.data.id) return;

            const cooldownKey = `${enemy.data.id}_damageAura`;
            const lastDamage = this.auraDamageCooldowns.get(cooldownKey) || 0;

            // Only damage each enemy once per second
            if (now - lastDamage >= auraCooldown) {
                // Deal 1 second worth of damage
                const damage = dps;

                // Send damage through network
                if (typeof networkManager !== 'undefined') {
                    const playerPosition = {
                        x: Math.floor(this.player.sprite.x / 32),
                        y: Math.floor(this.player.sprite.y / 32)
                    };
                    networkManager.hitEnemy(enemy.data.id, damage, this.player.data.id, playerPosition);
                }

                // Visual feedback - red damage effect
                this.createAuraHitEffect(enemy.sprite.x, enemy.sprite.y, 0xff0000);

                this.auraDamageCooldowns.set(cooldownKey, now);
            }
        });
    }

    processVoidEruption(ability, now) {
        const cooldownKey = `${ability.id}_voidEruption`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const interval = ability.effect.voidEruption.interval || 15000;

        if (now - lastCast >= interval) {
            const radius = ability.effect.voidEruption.radius || 8;
            const damage = ability.effect.voidEruption.damage || 200;

            // Use new visual effects
            const vfx = this.getVisualEffects();
            vfx.createVoidExplosion(
                this.player.sprite.x,
                this.player.sprite.y,
                radius * 32,
                damage
            );

            // Deal damage to all enemies in radius
            const enemies = this.getEnemiesInRadius(radius);
            enemies.forEach(enemy => {
                if (enemy.data && enemy.data.id && typeof networkManager !== 'undefined') {
                    const playerPosition = {
                        x: Math.floor(this.player.sprite.x / 32),
                        y: Math.floor(this.player.sprite.y / 32)
                    };
                    networkManager.hitEnemy(enemy.data.id, damage, this.player.data.id, playerPosition);
                }
            });

            this.cooldowns.set(cooldownKey, now);
        }
    }

    processCursedTrail(cursedTrail) {
        // Leave a damaging zone where player walks
        const x = this.player.sprite.x;
        const y = this.player.sprite.y;

        // Create visual effect (simple circle)
        const zone = this.scene.add.circle(x, y, 16, 0x4a1a4a, 0.5);
        zone.setDepth(0);

        // Store zone data
        if (!this.cursedZones) this.cursedZones = [];
        this.cursedZones.push({
            x, y,
            createdAt: Date.now(),
            duration: cursedTrail.duration || 5000,
            dps: cursedTrail.dps || 20,
            graphics: zone
        });

        // Damage enemies in zones
        this.cursedZones.forEach(zone => {
            const enemies = this.getEnemiesNear(zone.x, zone.y, 16);
            enemies.forEach(enemy => {
                if (enemy.health) {
                    enemy.health -= Math.floor(zone.dps / 10);
                }
            });

            // Remove expired zones
            if (Date.now() - zone.createdAt > zone.duration) {
                zone.graphics.destroy();
                this.cursedZones = this.cursedZones.filter(z => z !== zone);
            }
        });
    }

    processPlagueAura(plagueAura) {
        const enemies = this.getEnemiesInRadius(plagueAura.radius || 5);
        const dps = plagueAura.dps || 10;
        const damagePerTick = Math.floor(dps / 10);

        enemies.forEach(enemy => {
            if (enemy.health) {
                enemy.health -= damagePerTick;
                // Visual effect for plagued enemies
                if (enemy.sprite && !enemy.plagueEffect) {
                    enemy.plagueEffect = true;
                    enemy.sprite.setTint(0x00ff00);
                }
            }
        });
    }

    processDeathSpiral(ability, now) {
        const cooldownKey = `${ability.id}_deathSpiral`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const cooldown = ability.effect.deathSpiral.cooldown || 12000;

        if (now - lastCast >= cooldown) {
            const radius = ability.effect.deathSpiral.radius || 6;
            const damage = ability.effect.deathSpiral.damage || 100;

            // Spin attack visual
            this.createExplosion(this.player.sprite.x, this.player.sprite.y, radius, damage, 0x8b00ff);
            this.cooldowns.set(cooldownKey, now);
        }
    }

    processHexAura(ability, now) {
        const cooldownKey = `${ability.id}_hexAura`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const interval = ability.effect.hexAura.interval || 8000;

        if (now - lastCast >= interval) {
            const enemies = this.getEnemiesInRadius(ability.effect.hexAura.radius || 6);

            enemies.forEach(enemy => {
                // Apply random curse
                const curses = ['slow', 'weak', 'vulnerable'];
                const curse = curses[Math.floor(Math.random() * curses.length)];

                if (curse === 'slow' && enemy.speed) {
                    enemy.speed *= 0.5;
                } else if (curse === 'weak') {
                    enemy.damage = Math.floor(enemy.damage * 0.7);
                } else if (curse === 'vulnerable') {
                    enemy.defense = Math.floor((enemy.defense || 0) * 0.5);
                }

                enemy.hexed = curse;
            });

            this.cooldowns.set(cooldownKey, now);
        }
    }

    processExponentialDamage(ability, now) {
        const cooldownKey = `${ability.id}_exponentialDamage`;
        const lastProc = this.cooldowns.get(cooldownKey) || now;
        const interval = ability.effect.exponentialDamage.interval || 10000;

        if (now - lastProc >= interval) {
            if (!this.player.exponentialDamageBonus) {
                this.player.exponentialDamageBonus = 1;
            }
            this.player.exponentialDamageBonus *= 2;
            console.log(`⚡ Exponential damage: ${this.player.exponentialDamageBonus}x`);
            this.cooldowns.set(cooldownKey, now);
        }
    }

    processPeriodicExplosion(ability, now) {
        const cooldownKey = `${ability.id}_periodicExplosion`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const interval = ability.effect.periodicExplosion.interval || 10000;

        if (now - lastCast >= interval) {
            const radius = ability.effect.periodicExplosion.radius || 10;
            const damage = ability.effect.periodicExplosion.damage || 150;

            this.createExplosion(this.player.sprite.x, this.player.sprite.y, radius, damage, 0xff0000);
            this.cooldowns.set(cooldownKey, now);
        }
    }

    processAutoSpawn(ability, now) {
        const cooldownKey = `${ability.id}_autoSpawn`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const interval = ability.effect.autoSpawnInterval || 2000;

        if (now - lastCast >= interval) {
            // Spawn a temporary minion
            this.scene.spawnMinion(
                this.player.sprite.x + Phaser.Math.Between(-50, 50),
                this.player.sprite.y + Phaser.Math.Between(-50, 50),
                this.player.data.id,
                false // temporary
            );
            this.cooldowns.set(cooldownKey, now);
        }
    }

    processTimeSlow(timeSlow) {
        const enemies = this.getEnemiesInRadius(timeSlow.radius || 10);
        enemies.forEach(enemy => {
            if (!enemy.timeSlowed) {
                enemy.timeSlowed = true;
                if (enemy.speed) {
                    enemy.speed *= (1 - (timeSlow.percent || 0.5));
                }
            }
        });
    }

    processStatsPerSecond(effect, now) {
        if (!this.player.timeAlive) this.player.timeAlive = 0;
        this.player.timeAlive += 0.1; // 100ms = 0.1s

        const bonus = Math.min(
            this.player.timeAlive * (effect.statsPerSecond || 0.01),
            effect.statsCap || 5.0
        );

        this.player.passiveStatsBonus = 1 + bonus;
    }

    processAutoSummon(ability, now) {
        const cooldownKey = `${ability.id}_autoSummon`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const interval = ability.effect.autoSummon.interval || 30000;

        if (now - lastCast >= interval) {
            const count = ability.effect.autoSummon.count || 3;

            for (let i = 0; i < count; i++) {
                this.scene.spawnMinion(
                    this.player.sprite.x + Phaser.Math.Between(-100, 100),
                    this.player.sprite.y + Phaser.Math.Between(-100, 100),
                    this.player.data.id,
                    false // temporary
                );
            }

            this.cooldowns.set(cooldownKey, now);
        }
    }

    processRaiseUndead(ability, now) {
        const cooldownKey = `${ability.id}_raiseUndead`;
        const lastCast = this.cooldowns.get(cooldownKey) || 0;
        const cooldown = ability.effect.raiseUndead.cooldown || 40000;

        if (now - lastCast >= cooldown) {
            const count = ability.effect.raiseUndead.count || 5;

            // Spawn skeleton warriors
            for (let i = 0; i < count; i++) {
                this.scene.spawnMinion(
                    this.player.sprite.x + Phaser.Math.Between(-150, 150),
                    this.player.sprite.y + Phaser.Math.Between(-150, 150),
                    this.player.data.id,
                    false, // temporary
                    `skeleton_${Date.now()}_${i}`
                );
            }

            this.cooldowns.set(cooldownKey, now);
        }
    }

    // Utility functions

    findNearestEnemy(maxRange = 400) {
        // Combine both enemies and wolves
        const enemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        let nearest = null;
        let minDist = Infinity;

        enemies.forEach(enemy => {
            if (!enemy || !enemy.sprite) return;
            const dist = Phaser.Math.Distance.Between(
                this.player.sprite.x,
                this.player.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );
            // Only consider enemies within max range
            if (dist < minDist && dist <= maxRange) {
                minDist = dist;
                nearest = enemy;
            }
        });

        return nearest;
    }

    getEnemiesInRadius(tileRadius) {
        const pixelRadius = tileRadius * 32;
        return this.getEnemiesNear(this.player.sprite.x, this.player.sprite.y, pixelRadius);
    }

    getEnemiesNear(x, y, radius) {
        // Combine both enemies and wolves
        const enemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        return enemies.filter(enemy => {
            if (!enemy || !enemy.sprite) return false;
            const dist = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);
            return dist <= radius;
        });
    }

    fireShadowBolt(target, damage) {
        // Create visual projectile
        const bolt = this.scene.add.circle(
            this.player.sprite.x,
            this.player.sprite.y,
            8,
            0x9d4edd
        );
        bolt.setDepth(100);

        // Animate to target
        this.scene.tweens.add({
            targets: bolt,
            x: target.sprite.x,
            y: target.sprite.y,
            duration: 300,
            onComplete: () => {
                // Deal damage through network (proper multiplayer damage)
                if (target.data && target.data.id && typeof networkManager !== 'undefined') {
                    const playerPosition = {
                        x: Math.floor(this.player.sprite.x / 32), // Convert to grid coordinates
                        y: Math.floor(this.player.sprite.y / 32)
                    };
                    networkManager.hitEnemy(target.data.id, damage, this.player.data.id, playerPosition);
                    console.log(`💥 Shadow Volley hit ${target.data.id} for ${damage} damage!`);
                }
                bolt.destroy();

                // Hit effect
                this.createHitEffect(target.sprite.x, target.sprite.y);
            }
        });
    }

    createExplosion(x, y, tileRadius, damage, color = 0xff0000) {
        const pixelRadius = tileRadius * 32;

        // Visual effect
        const explosion = this.scene.add.circle(x, y, 10, color, 0.7);
        explosion.setDepth(100);

        this.scene.tweens.add({
            targets: explosion,
            scaleX: pixelRadius / 10,
            scaleY: pixelRadius / 10,
            alpha: 0,
            duration: 500,
            onComplete: () => explosion.destroy()
        });

        // Damage enemies through network
        const enemies = this.getEnemiesNear(x, y, pixelRadius);
        enemies.forEach(enemy => {
            if (enemy.data && enemy.data.id && typeof networkManager !== 'undefined') {
                const playerPosition = {
                    x: Math.floor(this.player.sprite.x / 32),
                    y: Math.floor(this.player.sprite.y / 32)
                };
                networkManager.hitEnemy(enemy.data.id, damage, this.player.data.id, playerPosition);
            }
        });
    }

    createHitEffect(x, y) {
        const effect = this.scene.add.circle(x, y, 16, 0xffffff, 0.8);
        effect.setDepth(100);

        this.scene.tweens.add({
            targets: effect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => effect.destroy()
        });
    }

    createAuraHitEffect(x, y, color) {
        // Smaller, more subtle effect for aura damage
        const effect = this.scene.add.circle(x, y, 8, color, 0.6);
        effect.setDepth(99);

        this.scene.tweens.add({
            targets: effect,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => effect.destroy()
        });
    }

    onKill(enemy) {
        this.passiveAbilities.forEach(ability => {
            const effect = ability.effect;

            // Soul Collector
            if (effect.soulCollector) {
                if (!this.player.souls) this.player.souls = 0;
                const maxSouls = effect.soulCollector.maxSouls || 10;
                if (this.player.souls < maxSouls) {
                    this.player.souls++;
                    this.player.soulDamageBonus = this.player.souls * (effect.soulCollector.damagePerSoul || 5);
                }
            }

            // Reaper's Fury - Enter fury mode
            if (effect.furyOnKill) {
                const now = Date.now();
                this.player.furyMode = true;
                this.player.furyDamageBonus = effect.furyOnKill.damageBonus || 2.0;

                // Clear fury after duration
                setTimeout(() => {
                    this.player.furyMode = false;
                    this.player.furyDamageBonus = 1.0;
                }, effect.furyOnKill.duration || 5000);
            }
        });
    }

    onDamaged(damage) {
        this.passiveAbilities.forEach(ability => {
            const effect = ability.effect;

            // Retaliatory Nova
            if (effect.retaliationNova) {
                const cooldownKey = `${ability.id}_retaliationNova`;
                const now = Date.now();
                const lastCast = this.cooldowns.get(cooldownKey) || 0;
                const cooldown = effect.retaliationNova.cooldown || 8000;

                if (now - lastCast >= cooldown) {
                    this.createExplosion(
                        this.player.sprite.x,
                        this.player.sprite.y,
                        effect.retaliationNova.radius || 5,
                        effect.retaliationNova.damage || 50,
                        0xff6b6b
                    );
                    this.cooldowns.set(cooldownKey, now);
                }
            }
        });
    }

    destroy() {
        if (this.updateInterval) {
            this.updateInterval.destroy();
        }
    }
}
