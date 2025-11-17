// Malachar Ability Handler - Implements all Malachar Q/E/R abilities
class MalacharAbilityHandler {
    constructor(scene, player, buildData) {
        this.scene = scene;
        this.player = player;
        this.buildData = buildData;
        this.abilities = buildData.abilities;

        // Cooldown tracking
        this.cooldowns = {
            q: 0,
            e: 0,
            r: 0
        };

        // Active buffs
        this.activeBuffs = new Map();

        // Dead minion tracking for revival
        this.deadMinions = [];

        console.log(`✨ Malachar Ability Handler initialized for build: ${buildData.name}`);
    }

    // Check if ability is ready
    isAbilityReady(key) {
        return this.cooldowns[key] <= Date.now();
    }

    // Start cooldown
    startCooldown(key, duration) {
        this.cooldowns[key] = Date.now() + duration;
    }

    // Get remaining cooldown
    getRemainingCooldown(key) {
        const remaining = this.cooldowns[key] - Date.now();
        return Math.max(0, remaining);
    }

    // Track a dead permanent minion for potential revival
    trackDeadMinion(minionData) {
        // Only track permanent minions
        if (!minionData.isPermanent) return;

        // Store minion data for revival
        this.deadMinions.push({
            position: { x: minionData.x, y: minionData.y },
            isPermanent: true,
            timestamp: Date.now()
        });

        console.log(`💀 Tracked dead minion for revival (total: ${this.deadMinions.length})`);
    }

    // Use Q ability (cooldown handled by AbilityManager)
    useQ() {
        const ability = this.abilities.q;
        console.log(`✨ Using ${ability.name}`);

        // Execute based on build
        switch(this.buildData.id) {
            case 'bone_commander':
                this.useUnifiedFront(ability);
                break;
            case 'death_caller':
                this.useHarvestBond(ability);
                break;
            case 'warlord':
                this.useDominate(ability);
                break;
            case 'reaper':
                this.useDeathFrenzy(ability);
                break;
        }

        return true;
    }

    // Use E ability (cooldown handled by AbilityManager)
    useE() {
        const ability = this.abilities.e;
        console.log(`✨ Using ${ability.name}`);

        // Execute based on build
        switch(this.buildData.id) {
            case 'bone_commander':
                this.usePactOfBones(ability);
                break;
            case 'death_caller':
                this.useSacrificialSurge(ability);
                break;
            case 'warlord':
                this.useBloodPact(ability);
                break;
            case 'reaper':
                this.useSoulFeast(ability);
                break;
        }

        return true;
    }

    // Use R ability (cooldown handled by AbilityManager)
    useR() {
        const ability = this.abilities.r;
        console.log(`✨ Using ${ability.name}`);

        // Execute based on build
        switch(this.buildData.id) {
            case 'bone_commander':
                this.useLegionsCall(ability);
                break;
            case 'death_caller':
                this.useDeathsBlessing(ability);
                break;
            case 'warlord':
                this.useDeathDefiance(ability);
                break;
            case 'reaper':
                this.useHarvestGod(ability);
                break;
        }

        return true;
    }

    // ===================================================================
    // BONE COMMANDER ABILITIES
    // ===================================================================

    useUnifiedFront(ability) {
        const allyMgr = this.scene.allyManager;
        const nearestAlly = allyMgr.getNearestAlly(this.player.sprite.x, this.player.sprite.y, 15);

        if (!nearestAlly) {
            console.log('❌ No allies nearby for Unified Front');
            return;
        }

        // Send to server for multiplayer sync
        const networkManager = this.scene.game.registry.get('networkManager');
        console.log('🔍 NetworkManager found:', !!networkManager);
        console.log('🎯 Target ally:', nearestAlly.data.username, nearestAlly.data.id);

        if (networkManager) {
            console.log('📤 Sending ability to server...');
            networkManager.useAbility('q', ability.name, nearestAlly.data.id, {
                shield: ability.effect.allyShield,
                minionDamageBonus: ability.effect.minionDamageBonus,
                duration: ability.duration
            });
        } else {
            console.error('❌ NetworkManager not found in registry!');
        }

        // Apply locally
        this.applyUnifiedFrontEffects(ability, nearestAlly);
    }

    applyUnifiedFrontEffects(ability, nearestAlly) {
        // Visual: Purple beam from player to ally
        this.createBeam(this.player.sprite, nearestAlly.sprite, 0x9b59d6, 2000);

        // Teleport minions to ally
        const myMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive
        );

        myMinions.forEach(minion => {
            // Visual: Teleport particles
            this.createTeleportEffect(minion.sprite, nearestAlly.sprite);

            // Teleport
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 100;
            minion.sprite.setPosition(
                nearestAlly.sprite.x + offsetX,
                nearestAlly.sprite.y + offsetY
            );

            // Apply damage buff
            this.applyMinionBuff(minion, 'unified_front_damage', ability.effect.minionDamageBonus, ability.duration);
        });

        // Shield ally
        this.applyShield(nearestAlly, ability.effect.allyShield);

        console.log(`✅ Unified Front: ${myMinions.length} minions teleported to ally`);
    }

    usePactOfBones(ability) {
        // Get all player's minions
        const myMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive
        );

        if (myMinions.length === 0) {
            console.log('❌ No minions to explode');
            return;
        }

        const explosionRadius = ability.effect.explosionRadius * 32; // Convert tiles to pixels
        let totalEnemiesHit = 0;

        // Store minion data for respawning
        const minionDataToRespawn = [];

        // Explode each minion
        myMinions.forEach(minion => {
            // Store minion data before explosion
            minionDataToRespawn.push({
                isPermanent: minion.isPermanent,
                maxHealth: minion.maxHealth,
                damage: minion.damage
            });

            // Deal damage to enemies in radius
            const enemiesHit = this.getEnemiesInRadius(minion.sprite.x, minion.sprite.y, explosionRadius);
            enemiesHit.forEach(enemy => {
                if (enemy.takeDamage) {
                    enemy.takeDamage(ability.effect.explosionDamage);
                }
            });
            totalEnemiesHit += enemiesHit.length;

            // Spawn fire at explosion location
            this.spawnFireAtLocation(minion.sprite.x, minion.sprite.y);

            // Destroy the minion sprite/entity
            if (minion.sprite) {
                minion.sprite.destroy();
            }
            minion.isAlive = false;
        });

        // Instantly respawn all minions at player position
        setTimeout(() => {
            minionDataToRespawn.forEach((minionData, index) => {
                const offsetX = (index % 3 - 1) * 40; // Spread them out slightly
                const offsetY = Math.floor(index / 3) * 40;

                this.scene.spawnMinion(
                    this.player.sprite.x + offsetX,
                    this.player.sprite.y + offsetY,
                    this.player.data.id,
                    minionData.isPermanent
                );
            });

            console.log(`✅ Pact of Bones: ${myMinions.length} minions exploded (${totalEnemiesHit} enemies hit), respawned at player`);
        }, 100); // Small delay for visual effect
    }

    useLegionsCall(ability) {
        const allyMgr = this.scene.allyManager;

        // Visual: Legion's Call animation under player
        const legionSprite = this.scene.add.sprite(
            this.player.sprite.x,
            this.player.sprite.y,
            'legionscall'
        );
        legionSprite.setOrigin(0.5, 0.5);
        legionSprite.setScale(2.5); // Make it bigger for ultimate effect
        legionSprite.setDepth(this.player.sprite.depth - 1); // Behind player
        legionSprite.setAlpha(0.9);
        legionSprite.play('legions_call');

        // Destroy sprite after animation completes
        legionSprite.on('animationcomplete', () => {
            legionSprite.destroy();
        });

        // Revive dead permanent minions up to cap
        let revivedCount = 0;

        // Count current alive permanent minions
        const currentMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive && m.isPermanent
        ).length;

        // Get minion cap from build
        const minionCap = this.buildData.stats.minionCap || 5;

        // Calculate how many we can revive
        const slotsAvailable = minionCap - currentMinions;
        const minionsToRevive = Math.min(slotsAvailable, this.deadMinions.length);

        if (minionsToRevive > 0) {
            console.log(`💀 Reviving ${minionsToRevive} minions (${currentMinions}/${minionCap} alive, ${this.deadMinions.length} dead)`);

            // Revive only up to the available slots
            for (let i = 0; i < minionsToRevive; i++) {
                const deadMinion = this.deadMinions[i];

                // Respawn minion near player with random offset
                const offsetX = (Math.random() - 0.5) * 150;
                const offsetY = (Math.random() - 0.5) * 150;
                const spawnX = this.player.sprite.x + offsetX;
                const spawnY = this.player.sprite.y + offsetY;

                // Spawn minion - server will handle broadcasting
                this.scene.spawnMinion(
                    spawnX,
                    spawnY,
                    this.player.data.id,
                    true // isPermanent
                );

                // Visual: Resurrection effect
                this.createExplosion(spawnX, spawnY, 0x00ff00, 80);
                revivedCount++;
            }

            // Remove revived minions from dead list
            this.deadMinions.splice(0, minionsToRevive);
        }

        // Spawn temps at each ally
        const allies = allyMgr.getAllAllies();
        allies.forEach(ally => {
            for (let i = 0; i < ability.effect.spawnPerAlly; i++) {
                this.scene.spawnTempMinion(
                    ally.sprite.x + (Math.random() - 0.5) * 100,
                    ally.sprite.y + (Math.random() - 0.5) * 100,
                    ability.effect.tempStats,
                    ability.effect.tempDuration
                );
            }
        });

        // Buff all minions
        const myMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive
        );
        myMinions.forEach(minion => {
            this.applyMinionBuff(minion, 'legion_damage', ability.effect.allMinionBonus, ability.duration);
        });

        console.log(`✅ Legion's Call: Revived ${revivedCount} minions, spawned ${allies.length * ability.effect.spawnPerAlly} temps, buffed ${myMinions.length} minions`);
    }

    // ===================================================================
    // DEATH CALLER ABILITIES
    // ===================================================================

    useHarvestBond(ability) {
        // Visual: Dark red aura
        this.createAura(this.player.sprite, 0xdc143c, ability.duration);

        // Apply buff
        this.applyPlayerBuff('harvest_bond', ability.effect, ability.duration);

        console.log(`✅ Harvest Bond activated for ${ability.duration / 1000}s`);
    }

    useSacrificialSurge(ability) {
        const temps = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive && !m.isPermanent
        );

        const allyMgr = this.scene.allyManager;

        temps.forEach(minion => {
            // Explode visual
            this.createExplosion(minion.sprite.x, minion.sprite.y, 0xff0000, ability.effect.explosionRadius * 32);

            // Damage enemies
            const enemies = this.getEnemiesInRadius(minion.sprite.x, minion.sprite.y, ability.effect.explosionRadius * 32);
            enemies.forEach(enemy => {
                enemy.takeDamage(ability.effect.explosionDamage);
            });

            // Find allies in explosion
            const alliesInBlast = allyMgr.getAlliesInRange(minion.sprite.x, minion.sprite.y, ability.effect.explosionRadius);
            alliesInBlast.forEach(ally => {
                // TODO: Apply attack speed buff and heal to ally
                console.log(`💥 Buffed ally: ${ally.data.username}`);
            });

            // Remove minion
            minion.despawn();
        });

        console.log(`✅ Sacrificial Surge: Exploded ${temps.length} minions`);
    }

    useDeathsBlessing(ability) {
        // Visual: Massive dark aura
        this.createAura(this.player.sprite, 0x8b008b, ability.duration, 200);

        // Apply buff
        this.applyPlayerBuff('deaths_blessing', ability.effect, ability.duration);

        // Spawn elites at each ally
        const allyMgr = this.scene.allyManager;
        const allies = allyMgr.getAllAllies();

        allies.forEach(ally => {
            for (let i = 0; i < ability.effect.spawnElitesPerAlly; i++) {
                this.scene.spawnTempMinion(
                    ally.sprite.x + (Math.random() - 0.5) * 100,
                    ally.sprite.y + (Math.random() - 0.5) * 100,
                    ability.effect.eliteStats,
                    ability.effect.eliteDuration
                );
            }
        });

        console.log(`✅ Death's Blessing: Spawned ${allies.length * ability.effect.spawnElitesPerAlly} elites`);
    }

    // ===================================================================
    // WARLORD ABILITIES
    // ===================================================================

    useDominate(ability) {
        // Visual: Red aura
        this.createAura(this.player.sprite, 0xff0000, ability.duration);

        // Apply damage buff
        this.applyPlayerBuff('dominate_damage', ability.effect.playerDamageBonus, ability.duration);

        // Make minions taunt
        const myMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive
        );

        myMinions.forEach(minion => {
            const enemies = this.getEnemiesInRadius(minion.sprite.x, minion.sprite.y, ability.effect.tauntRadius * 32);
            enemies.forEach(enemy => {
                enemy.target = minion; // Taunt enemy to minion
            });
        });

        console.log(`✅ Dominate: +70% damage, minions taunting`);
    }

    useBloodPact(ability) {
        // Sacrifice minion HP
        const myMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive
        );

        myMinions.forEach(minion => {
            const sacrifice = minion.maxHealth * ability.effect.minionHPSacrifice;
            minion.health = Math.max(1, minion.health - sacrifice);
            if (minion.ui) minion.ui.updateHealth(minion.health, minion.maxHealth);
        });

        // Visual: Blood red aura
        this.createAura(this.player.sprite, 0x8b0000, ability.duration);

        // Apply buffs
        this.applyPlayerBuff('blood_pact', ability.effect, ability.duration);

        console.log(`✅ Blood Pact: +50% damage, 40% lifesteal, +20% speed`);
    }

    useDeathDefiance(ability) {
        // Visual: Golden shield
        this.createShieldVisual(this.player.sprite, 0xffd700, ability.duration);

        // Apply invulnerability
        this.applyPlayerBuff('death_defiance', ability.effect, ability.duration);

        console.log(`✅ Death Defiance: Invulnerable for 5s`);
    }

    // ===================================================================
    // REAPER ABILITIES
    // ===================================================================

    useDeathFrenzy(ability) {
        // Visual: Dark purple aura
        this.createAura(this.player.sprite, 0x4b0082, ability.duration);

        // Apply buff
        this.applyPlayerBuff('death_frenzy', ability.effect, ability.duration);

        console.log(`✅ Death Frenzy: 60% spawn chance, +50% temp damage`);
    }

    useSoulFeast(ability) {
        const temps = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.player.data.id && m.isAlive && !m.isPermanent
        );

        const tempCount = temps.length;

        temps.forEach(minion => {
            // Explode visual
            this.createExplosion(minion.sprite.x, minion.sprite.y, 0x800080, 60);

            // Damage enemies
            const enemies = this.getEnemiesInRadius(minion.sprite.x, minion.sprite.y, 60);
            enemies.forEach(enemy => {
                enemy.takeDamage(ability.effect.explosionDamagePerTemp);
            });

            // Remove minion
            minion.despawn();
        });

        // Heal player
        const heal = tempCount * ability.effect.healPerTemp;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
        if (this.player.ui) this.player.ui.updateHealth(this.player.health, this.player.maxHealth);

        // Apply stacking damage buff
        const totalDamageBonus = tempCount * ability.effect.damagePerTemp;
        this.applyPlayerBuff('soul_feast_stacks', totalDamageBonus, ability.effect.damageStackDuration);

        console.log(`✅ Soul Feast: Consumed ${tempCount} temps, +${(totalDamageBonus * 100).toFixed(0)}% damage, healed ${heal} HP`);
    }

    useHarvestGod(ability) {
        // Visual: Massive dark explosion
        this.createExplosion(this.player.sprite.x, this.player.sprite.y, 0x4b0082, 400);

        // Apply buff
        this.applyPlayerBuff('harvest_god', ability.effect, ability.duration);

        console.log(`✅ Harvest God: Every kill spawns 3 temps, +100% damage`);
    }

    // ===================================================================
    // VISUAL EFFECTS
    // ===================================================================

    createBeam(fromSprite, toSprite, color, duration) {
        const beam = this.scene.add.line(
            0, 0,
            fromSprite.x, fromSprite.y,
            toSprite.x, toSprite.y,
            color
        );
        beam.setOrigin(0, 0);
        beam.setLineWidth(3);
        beam.setAlpha(0.7);

        this.scene.tweens.add({
            targets: beam,
            alpha: 0,
            duration: duration,
            onComplete: () => beam.destroy()
        });
    }

    createLink(fromSprite, toSprite, color, duration) {
        // Create pulsing link
        const link = this.scene.add.line(
            0, 0,
            fromSprite.x, fromSprite.y,
            toSprite.x, toSprite.y,
            color
        );
        link.setOrigin(0, 0);
        link.setLineWidth(4);

        this.scene.tweens.add({
            targets: link,
            alpha: { from: 0.8, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: Math.floor(duration / 1000)
        });

        this.scene.time.delayedCall(duration, () => link.destroy());
    }

    createTeleportEffect(fromSprite, toSprite) {
        // Particles at source
        this.createBurst(fromSprite.x, fromSprite.y, 0x9b59d6, 20);
        // Particles at destination
        this.scene.time.delayedCall(100, () => {
            this.createBurst(toSprite.x, toSprite.y, 0x9b59d6, 20);
        });
    }

    createExplosion(x, y, color, radius) {
        const circle = this.scene.add.circle(x, y, radius, color, 0.6);

        this.scene.tweens.add({
            targets: circle,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 500,
            onComplete: () => circle.destroy()
        });

        this.createBurst(x, y, color, 30);
    }

    createAura(sprite, color, duration, radius = 100) {
        const aura = this.scene.add.circle(sprite.x, sprite.y, radius, color, 0.3);

        // Follow player
        const updateAura = () => {
            if (aura && sprite) {
                aura.setPosition(sprite.x, sprite.y);
            }
        };

        const interval = this.scene.time.addEvent({
            delay: 16,
            callback: updateAura,
            loop: true
        });

        this.scene.tweens.add({
            targets: aura,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: { from: 0.3, to: 0.1 },
            duration: 1000,
            yoyo: true,
            repeat: Math.floor(duration / 2000)
        });

        this.scene.time.delayedCall(duration, () => {
            interval.destroy();
            aura.destroy();
        });
    }

    createShieldVisual(sprite, color, duration) {
        const shield = this.scene.add.circle(sprite.x, sprite.y, 40, color, 0.5);
        shield.setStrokeStyle(3, color);

        // Follow player
        const updateShield = () => {
            if (shield && sprite) {
                shield.setPosition(sprite.x, sprite.y);
            }
        };

        const interval = this.scene.time.addEvent({
            delay: 16,
            callback: updateShield,
            loop: true
        });

        this.scene.tweens.add({
            targets: shield,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.scene.time.delayedCall(duration, () => {
            interval.destroy();
            shield.destroy();
        });
    }

    createBurst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const dist = 20 + Math.random() * 40;

            const particle = this.scene.add.circle(x, y, 3, color, 0.8);

            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                duration: 500,
                onComplete: () => particle.destroy()
            });
        }
    }

    // ===================================================================
    // BUFF SYSTEM
    // ===================================================================

    applyPlayerBuff(buffId, effect, duration) {
        this.activeBuffs.set(buffId, {
            effect: effect,
            endTime: Date.now() + duration
        });

        this.scene.time.delayedCall(duration, () => {
            this.activeBuffs.delete(buffId);
            console.log(`⏱️ Buff expired: ${buffId}`);
        });
    }

    applyMinionBuff(minion, buffId, damageBonus, duration) {
        if (!minion.damageBuffs) minion.damageBuffs = [];

        const buff = {
            id: buffId,
            bonus: damageBonus,
            endTime: Date.now() + duration
        };

        minion.damageBuffs.push(buff);

        this.scene.time.delayedCall(duration, () => {
            if (minion.damageBuffs) {
                const index = minion.damageBuffs.findIndex(b => b.id === buffId);
                if (index !== -1) {
                    minion.damageBuffs.splice(index, 1);
                }
            }
        });
    }

    applyShield(player, amount) {
        if (!player) return;

        // Add shield to player
        player.shield = (player.shield || 0) + amount;

        // Update UI if it exists (for other players' overhead bars)
        if (player.ui && player.ui.updateHealthBar) {
            player.ui.updateHealthBar();
        }

        // If this is the local player, update the HUD
        if (player === this.player) {
            const hud = this.scene.hud || this.scene.modernHUD;
            if (hud && hud.updateHealthBar) {
                hud.updateHealthBar();
                console.log(`🛡️ Updated local player HUD with shield: ${player.shield}`);
            }
        }

        console.log(`🛡️ Applied ${amount} shield to ${player.data.username} (Total: ${player.shield})`);
    }

    // Get player damage multiplier from all active buffs
    getPlayerDamageMultiplier() {
        let multiplier = 1.0;

        for (const [buffId, buff] of this.activeBuffs) {
            if (buff.effect.playerDamageBonus !== undefined) {
                multiplier += buff.effect.playerDamageBonus;
            }
            if (typeof buff.effect === 'number') {
                multiplier += buff.effect;
            }
        }

        return multiplier;
    }

    // ===================================================================
    // HELPER FUNCTIONS
    // ===================================================================

    getEnemiesInRadius(x, y, radius) {
        const allEnemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        return allEnemies.filter(enemy => {
            if (!enemy || !enemy.sprite || !enemy.isAlive) return false;
            const dist = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);
            return dist <= radius;
        });
    }

    // ===================================================================
    // FIRE SYSTEM (Pact of Bones)
    // ===================================================================

    spawnFireAtLocation(x, y, shouldSpread = true) {
        // Initialize fire tracking if needed
        if (!this.activeFires) {
            this.activeFires = [];
        }

        // Random fire sprite selection
        const fireSprites = ['4_2', '4_4', '4_5', '5_1', '5_2', '5_4', '5_5', '6_1', '6_2', '6_4', '6_5', '7_1', '7_2', '7_4', '7_5'];
        const randomSprite = Phaser.Utils.Array.GetRandom(fireSprites);

        // Create fire sprite
        const fireSprite = this.scene.add.sprite(x, y, `fire_${randomSprite}`);
        fireSprite.play(`fire_${randomSprite}_anim`);
        fireSprite.setDepth(5); // Above ground, below players

        // Fire data
        const fireData = {
            sprite: fireSprite,
            x: x,
            y: y,
            spawnTime: Date.now(),
            lifetime: 2500, // Individual fire lasts 2.5 seconds
            damageRadius: 32, // 1 tile radius
            damage: 25, // 25 DPS
            lastDamageTick: Date.now()
        };

        this.activeFires.push(fireData);

        // Only spread from original explosion fires, not from spread fires
        if (shouldSpread) {
            this.startFireSpreading(x, y);
        }

        // Clean up this fire after its lifetime
        this.scene.time.delayedCall(fireData.lifetime, () => {
            const index = this.activeFires.indexOf(fireData);
            if (index !== -1) {
                this.activeFires.splice(index, 1);
            }
            if (fireSprite && fireSprite.scene) {
                fireSprite.destroy();
            }
        });
    }

    startFireSpreading(originX, originY) {
        const spreadInterval = 1200; // New fire every 1.2 seconds
        const spreadRadius = 48; // 1.5 tiles
        const maxNewFires = 3; // Spawn max 3 additional fires per explosion

        const spreadTimer = this.scene.time.addEvent({
            delay: spreadInterval,
            repeat: maxNewFires - 1,
            callback: () => {
                // Random position near origin
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const newX = originX + Math.cos(angle) * distance;
                const newY = originY + Math.sin(angle) * distance;

                // Spawn new fire WITHOUT spreading (false parameter)
                this.spawnFireAtLocation(newX, newY, false);
            }
        });
    }

    updateFireDamage() {
        if (!this.activeFires || this.activeFires.length === 0) return;

        const now = Date.now();
        const damageInterval = 1000; // Damage every 1 second

        this.activeFires.forEach(fire => {
            // Check if it's time to deal damage
            if (now - fire.lastDamageTick < damageInterval) return;

            fire.lastDamageTick = now;

            // Get enemies in fire radius
            const enemies = this.getEnemiesInRadius(fire.x, fire.y, fire.damageRadius);

            enemies.forEach(enemy => {
                // Mark enemies in fire to prevent stacking
                if (!enemy.inFire) {
                    enemy.inFire = true;

                    // Deal damage
                    if (enemy.takeDamage) {
                        enemy.takeDamage(fire.damage);
                    }

                    // Remove fire flag after damage tick
                    this.scene.time.delayedCall(damageInterval, () => {
                        if (enemy) {
                            enemy.inFire = false;
                        }
                    });
                }
            });
        });
    }
}
