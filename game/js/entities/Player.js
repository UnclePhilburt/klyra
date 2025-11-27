// Player Entity - Core player logic and state management
class Player {
    constructor(scene, data, isLocalPlayer = false) {
        // Defensive checks for required dependencies
        if (typeof PlayerSprite === 'undefined') {
            console.error('❌ PlayerSprite is not defined! Make sure PlayerSprite.js is loaded before Player.js');
            throw new Error('PlayerSprite class not found. Check script loading order in index.html');
        }
        if (typeof PlayerUI === 'undefined') {
            console.error('❌ PlayerUI is not defined! Make sure PlayerUI.js is loaded before Player.js');
            throw new Error('PlayerUI class not found. Check script loading order in index.html');
        }

        this.scene = scene;
        this.data = data;

        // Player state
        this.username = data.username || 'Player';
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.shield = data.shield || 0; // Shield absorbs damage before health
        this.level = data.level;
        this.experience = data.experience || 0;
        this.currency = data.currency || 0; // Earned souls from killing enemies (for blackjack)
        this.souls = data.souls || 0; // Banked souls (separate system)
        console.log(`🔍 SOULS DEBUG: Player ${this.username} initialized with souls=${this.souls} (from data.souls=${data.souls})`);
        console.log(`🔍 SOULS DEBUG: Full data received:`, JSON.stringify({ souls: data.souls, currency: data.currency, level: data.level }));
        this.class = data.class;
        this.stats = data.stats;
        this.isAlive = data.isAlive !== undefined ? data.isAlive : true; // Default to true
        this.currentDirection = 'down';
        this.lastMovementDirection = { x: 0, y: -1 }; // Default to down direction for abilities
        this.hasActiveBoomerang = false; // Track boomerang projectile for Lunare

        // Debug: Log if isAlive is false on spawn
        if (!this.isAlive && isLocalPlayer) {
            console.warn(`⚠️ Player spawned with isAlive: false! Data:`, data);
        }

        // Network throttling
        this.lastUpdate = 0;

        // Create modular components
        this.spriteRenderer = new PlayerSprite(scene, data.position, this.class, isLocalPlayer);

        // Expose sprite for backward compatibility (MUST be set before creating UI!)
        this.sprite = this.spriteRenderer.getPhysicsBody();
        this.usingSprite = this.spriteRenderer.isUsingSprite();

        // Now create UI (needs this.sprite to exist first)
        this.ui = new PlayerUI(scene, this, {
            useSprite: this.spriteRenderer.isUsingSprite(),
            visualOffsetX: 32,
            visualOffsetY: 55,
            yOffset: 105,
            isLocalPlayer: isLocalPlayer
        });
    }

    // ==================== MOVEMENT ====================

    move(velocityX, velocityY) {
        // Use character-specific moveSpeed stat, fallback to config if not set
        const speed = this.stats?.moveSpeed || GameConfig.PLAYER.SPEED;
        const body = this.sprite.body;

        body.setVelocity(velocityX * speed, velocityY * speed);

        // Update visual sprite positions
        if (this.usingSprite) {
            this.spriteRenderer.updateSpritePositions();
        }

        // Update animation state based on movement
        this.spriteRenderer.updateMovementState(velocityX, velocityY, this);

        // Update weapon rotation for fallback
        if (!this.usingSprite && (velocityX !== 0 || velocityY !== 0)) {
            const angle = Math.atan2(velocityY, velocityX);
            this.spriteRenderer.setWeaponRotation(angle);
        }

        // Track last movement direction for abilities (like Kelise's dash)
        if (velocityX !== 0 || velocityY !== 0) {
            const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            this.lastMovementDirection = {
                x: velocityX / magnitude,
                y: velocityY / magnitude
            };
        }

        // Send position to server (throttled)
        if (velocityX !== 0 || velocityY !== 0) {
            this.sendPositionUpdate();
        }
    }

    moveToPosition(position) {
        // Position is now in PIXELS, use directly for smooth movement
        this.targetPosition = {
            x: position.x,
            y: position.y
        };
        // Track when we last received a position update
        this.lastPositionUpdateTime = Date.now();
    }

    // Smooth interpolation instead of instant teleport
    updateInterpolation() {
        if (!this.targetPosition) {
            // No target - check if we should play idle animation
            // Only switch to idle if we haven't received a position update in 200ms
            const timeSinceLastUpdate = this.lastPositionUpdateTime ? Date.now() - this.lastPositionUpdateTime : 999;
            if (timeSinceLastUpdate > 200) {
                if (this.spriteRenderer && this.spriteRenderer.updateMovementState) {
                    this.spriteRenderer.updateMovementState(0, 0, this);
                }
            }
            return;
        }

        const lerpSpeed = 0.35; // Balanced interpolation for smooth movement
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If very close, snap to target
        if (distance < 1) {
            this.sprite.x = this.targetPosition.x;
            this.sprite.y = this.targetPosition.y;
            this.sprite.body.setVelocity(0, 0);
            this.targetPosition = null;

            // Don't immediately switch to idle - wait to see if another update arrives
            // If we keep receiving updates, we're still moving
            const timeSinceLastUpdate = this.lastPositionUpdateTime ? Date.now() - this.lastPositionUpdateTime : 0;
            if (timeSinceLastUpdate > 200) {
                // It's been a while since last update - actually stopped moving
                if (this.spriteRenderer && this.spriteRenderer.updateMovementState) {
                    this.spriteRenderer.updateMovementState(0, 0, this);
                }
            }
            // Otherwise keep the walking animation playing
        } else {
            // Smooth interpolation
            this.sprite.x += dx * lerpSpeed;
            this.sprite.y += dy * lerpSpeed;

            // Update animation based on movement direction
            if (this.spriteRenderer && this.spriteRenderer.updateMovementState) {
                // Normalize direction for animation
                const normalizedVelX = dx / distance;
                const normalizedVelY = dy / distance;
                this.spriteRenderer.updateMovementState(normalizedVelX, normalizedVelY, this);
            }
        }

        if (this.usingSprite) {
            this.spriteRenderer.updateSpritePositions();
        }
    }

    sendPositionUpdate() {
        const now = Date.now();
        if (!this.lastUpdate || now - this.lastUpdate > 50) {
            this.lastUpdate = now;

            // Send PIXEL position instead of grid for smooth multiplayer movement
            const pixelPos = {
                x: Math.round(this.sprite.x),
                y: Math.round(this.sprite.y)
            };

            // DEBUG: Log position updates occasionally
            if (Math.random() < 0.05) {
                console.log(`📍 CLIENT: Sending pixel position (${pixelPos.x}, ${pixelPos.y}), isAlive=${this.isAlive}`);
            }

            networkManager.movePlayer(pixelPos);
        }
    }

    // ==================== COMBAT ====================

    attack(targetX, targetY) {
        this.spriteRenderer.animateAttack(targetX, targetY);

        // Safety check
        if (!this.spriteRenderer || !this.spriteRenderer.sprite) return;

        // Find and damage nearby enemies
        const attackRange = 50; // Attack range in pixels
        const playerPos = { x: this.spriteRenderer.sprite.x, y: this.spriteRenderer.sprite.y };

        // Check all enemies (sword demons, minotaurs, and mushrooms)
        const allEnemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.swordDemons || {}),
            ...Object.values(this.scene.minotaurs || {}),
            ...Object.values(this.scene.mushrooms || {})
        ];

        allEnemies.forEach(enemy => {
            if (!enemy.isAlive || !enemy.sprite) return;

            const dx = enemy.sprite.x - targetX;
            const dy = enemy.sprite.y - targetY;
            const distSquared = dx * dx + dy * dy;

            // If enemy is within attack range of click position
            if (distSquared < attackRange * attackRange) {
                // Calculate damage based on player stats (strength)
                const baseDamage = this.stats?.strength || 10;
                networkManager.hitEnemy(enemy.data.id, baseDamage, this.data.id, playerPos);
            }
        });

        // Note: Auto-attacks now happen automatically in update() loop
        // No need to trigger manually here
    }

    executeAutoAttack(forceAnimation = false, customDirection = null) {
        // Safety check: ensure player sprite exists before attempting auto-attack
        if (!this.spriteRenderer || !this.spriteRenderer.sprite) {
            return; // Silently skip until player is ready
        }

        const config = this.autoAttackConfig;
        if (!config) {
            return; // No config, nothing to do
        }

        // Check cooldown
        const now = Date.now();
        if (this.lastAutoAttackTime && (now - this.lastAutoAttackTime) < (config.cooldown || 1000)) {
            return; // Still on cooldown
        }

        this.lastAutoAttackTime = now;

        // Trigger vibration for automatic attacks (not from controller right stick)
        // Controller right stick attacks already vibrate in ControllerManager
        if (!customDirection && this.scene.controllerManager) {
            this.scene.controllerManager.vibrateAttack();
        }

        // Handle different auto-attack types
        if (config.target === 'minion_or_ally' || config.target === 'minion_lowest_hp') {
            // Command Bolt: Buff nearest minion OR ally
            this.commandBolt();
        } else if (config.target === 'enemy') {
            // Attack nearest enemy
            this.autoAttackEnemy(config, forceAnimation, customDirection);
        }
    }

    autoAttackEnemy(config, forceAnimation = false, customDirection = null) {
        // Check if this is a projectile-based attack (like Orion)
        if (config.projectile) {
            return this.autoAttackWithProjectile(config, forceAnimation, customDirection);
        }

        // Find all enemies in front of Kelise within range
        const range = (config.range || 3) * GameConfig.GAME.TILE_SIZE;
        const playerPos = { x: this.spriteRenderer.sprite.x, y: this.spriteRenderer.sprite.y };

        // Get all enemies dynamically (automatically includes all enemy types)
        const allEnemies = this.scene.getAllEnemies();

        const enemiesInFront = [];

        // Use custom direction if provided (from controller), otherwise use facing direction
        if (customDirection) {
            // Controller mode: Attack in the direction of the right stick
            const attackAngle = Math.atan2(customDirection.y, customDirection.x);

            allEnemies.forEach(enemy => {
                if (!enemy.isAlive || !enemy.sprite) return;

                const dx = enemy.sprite.x - playerPos.x;
                const dy = enemy.sprite.y - playerPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if enemy is within range
                if (distance > range) return;

                // Check if enemy is in the direction of the stick (120-degree cone)
                const enemyAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(attackAngle - enemyAngle);
                const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

                // 120 degrees = ~2.09 radians, so half cone is ~1.05 radians
                if (normalizedDiff < 1.05) {
                    enemiesInFront.push(enemy);
                }
            });
        } else {
            // Normal mode: Attack based on sprite facing direction
            const facingLeft = this.spriteRenderer.sprite && this.spriteRenderer.sprite.flipX;

            allEnemies.forEach(enemy => {
                if (!enemy.isAlive || !enemy.sprite) return;

                const dx = enemy.sprite.x - playerPos.x;
                const dy = enemy.sprite.y - playerPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if enemy is within range
                if (distance > range) return;

                // Check if enemy is in front based on facing direction
                // Front cone: 120 degrees in the facing direction
                if (facingLeft && dx >= 0) return; // Facing left but enemy is on right
                if (!facingLeft && dx <= 0) return; // Facing right but enemy is on left

                enemiesInFront.push(enemy);
            });
        }

        // If forceAnimation is true (manual controller mode), always play animation
        // Otherwise, only play if enemies are found
        if (forceAnimation || enemiesInFront.length > 0) {
            // If custom direction is provided, orient the sprite in that direction
            if (customDirection) {
                // Flip sprite based on horizontal direction of stick
                if (customDirection.x < 0) {
                    this.spriteRenderer.sprite.setFlipX(true); // Face left
                } else if (customDirection.x > 0) {
                    this.spriteRenderer.sprite.setFlipX(false); // Face right
                }
            }

            this.spriteRenderer.playAttackAnimation();
        }

        // Play sword sound effects for Zenryu, Aldric, and Kelise
        const characterClass = (this.class || this.data?.class || '').toLowerCase();
        if (characterClass === 'zenryu' || characterClass === 'aldric' || characterClass === 'kelise') {
            if (enemiesInFront.length > 0) {
                // Play hit sound
                const hitSounds = ['zenryu_swordhit1', 'zenryu_swordhit2', 'zenryu_swordhit3'];
                const randomHit = hitSounds[Math.floor(Math.random() * hitSounds.length)];
                if (this.scene.sound) {
                    this.scene.sound.play(randomHit, { volume: 0.5 });
                }
            } else if (forceAnimation) {
                // Play miss sound (only if attack was manually triggered but no enemies hit)
                const missSounds = ['zenryu_swordmiss1', 'zenryu_swordmiss2', 'zenryu_swordmiss3'];
                const randomMiss = missSounds[Math.floor(Math.random() * missSounds.length)];
                if (this.scene.sound) {
                    this.scene.sound.play(randomMiss, { volume: 0.5 });
                }
            }
        }

        // Attack all enemies in front (damage only if enemies found)
        if (enemiesInFront.length > 0) {
            let damage = config.damage || 10;

            enemiesInFront.forEach(enemy => {
                // Calculate critical hit
                const critChance = this.stats?.critChance || 0.05;
                const critDamage = this.stats?.critDamage || 1.5;
                const isCrit = Math.random() < critChance;

                // Apply crit multiplier
                let finalDamage = damage;
                if (isCrit) {
                    finalDamage = damage * critDamage;
                }

                // Apply bleed stack (stackable DoT)
                const bleedDamagePerStack = 2; // Damage per tick per stack
                const bleedTickRate = 500; // Damage every 500ms
                const bleedDuration = 5000; // 5 seconds

                // Build effects object based on character class
                const effects = {
                    bleed: {
                        damagePerStack: bleedDamagePerStack,
                        tickRate: bleedTickRate,
                        duration: bleedDuration
                    },
                    knockback: {
                        distance: 50,
                        sourceX: playerPos.x,
                        sourceY: playerPos.y
                    },
                    isCrit: isCrit,
                    damageType: 'physical'
                };

                // ALDRIC: Stronger knockback, less damage
                if (this.data.characterClass === 'aldric') {
                    effects.knockback.distance = 96; // 3 tiles (96 pixels)
                }

                // Deal damage with effects
                networkManager.hitEnemy(enemy.data.id, finalDamage, this.data.id, playerPos, effects);

                // Apply client-side bleed stack immediately for responsiveness
                if (!enemy.bleedStacks) {
                    enemy.bleedStacks = 0;
                    enemy.bleedTimers = [];
                }

                enemy.bleedStacks = Math.min((enemy.bleedStacks || 0) + 1, 10); // Max 10 stacks

                // Start bleed damage timer
                const bleedTimer = setInterval(() => {
                    // CRITICAL FIX: Clear timer immediately if enemy is dead
                    if (!enemy.isAlive) {
                        clearInterval(bleedTimer);
                        const index = enemy.bleedTimers?.indexOf(bleedTimer);
                        if (index > -1) enemy.bleedTimers.splice(index, 1);
                        return;
                    }

                    if (enemy.isAlive && enemy.bleedStacks > 0) {
                        const bleedDamage = bleedDamagePerStack * enemy.bleedStacks;
                        networkManager.hitEnemy(enemy.data.id, bleedDamage, this.data.id, playerPos, { isBleedDamage: true });

                        // Blood Harvest: Heal for bleed damage dealt
                        if (this.bloodHarvestActive) {
                            const healAmount = bleedDamage;
                            this.health = Math.min(this.health + healAmount, this.maxHealth);

                            // Update health bar
                            if (this.ui && this.ui.updateHealthBar) {
                                this.ui.updateHealthBar();
                            }

                            // Visual healing feedback
                            const healText = this.scene.add.text(
                                this.sprite.x,
                                this.sprite.y - 60,
                                `+${healAmount}`,
                                {
                                    font: 'bold 18px Arial',
                                    fill: '#FF0000',  // Red to match Blood Harvest theme
                                    stroke: '#000000',
                                    strokeThickness: 3
                                }
                            );
                            healText.setOrigin(0.5);
                            healText.setDepth(this.sprite.depth + 100);

                            this.scene.tweens.add({
                                targets: healText,
                                y: healText.y - 40,
                                alpha: 0,
                                duration: 1000,
                                onComplete: () => healText.destroy()
                            });
                        }
                    }
                }, bleedTickRate);

                enemy.bleedTimers.push(bleedTimer);

                // Remove this bleed stack after duration
                this.scene.time.delayedCall(bleedDuration, () => {
                    if (enemy.bleedStacks > 0) {
                        enemy.bleedStacks--;
                    }
                    clearInterval(bleedTimer);
                    const index = enemy.bleedTimers.indexOf(bleedTimer);
                    if (index > -1) enemy.bleedTimers.splice(index, 1);
                });

                // Apply client-side knockback immediately for instant feedback
                // Server will sync the authoritative position
                const knockbackDistance = 50; // pixels
                const dx = enemy.sprite.x - playerPos.x;
                const dy = enemy.sprite.y - playerPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0 && enemy.sprite) {
                    const knockbackX = (dx / distance) * knockbackDistance;
                    const knockbackY = (dy / distance) * knockbackDistance;

                    // Smooth knockback tween
                    this.scene.tweens.add({
                        targets: enemy.sprite,
                        x: enemy.sprite.x + knockbackX,
                        y: enemy.sprite.y + knockbackY,
                        duration: 150,
                        ease: 'Power2',
                        onComplete: () => {
                            // Update target positions after tween
                            if (enemy && enemy.sprite) {
                                if (enemy.setTargetPosition) {
                                    enemy.setTargetPosition(enemy.sprite.x, enemy.sprite.y);
                                } else if (enemy.targetX !== undefined) {
                                    enemy.targetX = enemy.sprite.x;
                                    enemy.targetY = enemy.sprite.y;
                                }
                            }
                        }
                    });
                }

                // Visual bleed indicator - red droplets
                const bleedEffect = this.scene.add.text(
                    enemy.sprite.x,
                    enemy.sprite.y - 40,
                    `🩸x${enemy.bleedStacks}`,
                    {
                        fontSize: '20px',
                        color: '#FF0000',
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                );
                bleedEffect.setOrigin(0.5);
                bleedEffect.setDepth(10001);

                this.scene.tweens.add({
                    targets: bleedEffect,
                    y: enemy.sprite.y - 50,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => bleedEffect.destroy()
                });

                // Visual effect - slash at enemy
                const slashEffect = this.scene.add.circle(
                    enemy.sprite.x,
                    enemy.sprite.y,
                    20,
                    0xFF6B9D,
                    0.6
                );
                slashEffect.setDepth(10000);

                this.scene.tweens.add({
                    targets: slashEffect,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => slashEffect.destroy()
                });
            });

            console.log(`⚔️ ${config.name}: ${damage} damage to ${enemiesInFront.length} enemies + knockback`);
        }
    }

    commandBolt() {
        // Safety check: ensure player sprite exists
        if (!this.spriteRenderer || !this.spriteRenderer.sprite) {
            return; // Silently skip
        }

        // Find lowest HP minion owned by this player
        let lowestHPMinion = null;
        let lowestHPPercent = 1.0; // Start at 100%
        const range = this.autoAttackConfig.range * GameConfig.GAME.TILE_SIZE || 10 * GameConfig.GAME.TILE_SIZE;

        Object.values(this.scene.minions || {}).forEach(minion => {
            // Safety check: ensure minion and sprite exist
            if (!minion || !minion.sprite || !minion.isAlive) return;
            if (minion.ownerId !== this.data.id) return;

            const dx = minion.sprite.x - this.spriteRenderer.sprite.x;
            const dy = minion.sprite.y - this.spriteRenderer.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= range) {
                const healthPercent = minion.health / minion.maxHealth;
                if (healthPercent < lowestHPPercent) {
                    lowestHPPercent = healthPercent;
                    lowestHPMinion = minion;
                }
            }
        });

        // Fire projectile at lowest HP minion
        if (lowestHPMinion && lowestHPMinion.sprite) {
            const targetMinion = lowestHPMinion;
            const buffEffect = this.autoAttackConfig.effects.onMinion;
            const duration = buffEffect.duration || 3000;

            // Broadcast to other players so they see the visual effect
            if (networkManager && networkManager.connected) {
                networkManager.broadcastAutoAttack('Command Bolt', targetMinion.minionId);
            }

            // Create bone projectile sprite
            const projectile = this.scene.add.sprite(
                this.spriteRenderer.sprite.x,
                this.spriteRenderer.sprite.y - 10, // Start slightly above player
                'autoattackbonecommander'
            );
            projectile.setOrigin(0.5, 0.5);
            projectile.setScale(0.6); // Smaller for projectile
            projectile.setDepth(this.spriteRenderer.sprite.depth + 1);
            projectile.setAlpha(0.9);

            // Play bone commander aura animation on projectile
            projectile.play('bone_commander_aura');

            // Calculate projectile travel
            const dx = targetMinion.sprite.x - projectile.x;
            const dy = targetMinion.sprite.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = this.autoAttackConfig.projectileSpeed || 400;
            const travelTime = (distance / speed) * 1000; // Convert to ms

            // Animate projectile to target
            this.scene.tweens.add({
                targets: projectile,
                x: targetMinion.sprite.x,
                y: targetMinion.sprite.y,
                duration: travelTime,
                ease: 'Linear',
                onComplete: () => {
                    // Apply effects when projectile hits
                    this.applyCommandBoltEffects(targetMinion, buffEffect, duration);

                    // Destroy projectile
                    projectile.destroy();
                }
            });

            // Rotate projectile towards target
            const angle = Math.atan2(dy, dx);
            projectile.setRotation(angle);
        }
    }

    autoAttackWithProjectile(config, forceAnimation = false, customDirection = null) {
        const playerPos = { x: this.spriteRenderer.sprite.x, y: this.spriteRenderer.sprite.y };

        // MANUAL MODE: Shoot in the direction of the stick
        if (customDirection) {
            // Play attack animation
            this.spriteRenderer.playAttackAnimation();

            // Face towards stick direction
            if (customDirection.x < 0) {
                this.spriteRenderer.sprite.setFlipX(true); // Face left
            } else if (customDirection.x > 0) {
                this.spriteRenderer.sprite.setFlipX(false); // Face right
            }

            // Fire projectile in the direction of the stick
            this.createProjectileInDirection(customDirection, config);
            return;
        }

        // AUTO MODE: Find nearest enemy within range
        const range = (config.range || 6) * GameConfig.GAME.TILE_SIZE;
        const allEnemies = this.scene.getAllEnemies();

        // Find closest enemy
        let closestEnemy = null;
        let closestDistance = range;

        allEnemies.forEach(enemy => {
            if (!enemy.isAlive || !enemy.sprite) return;

            const dx = enemy.sprite.x - playerPos.x;
            const dy = enemy.sprite.y - playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= range && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        // Play attack animation if enemy found or forced
        if (closestEnemy || forceAnimation) {
            this.spriteRenderer.playAttackAnimation();

            // Face towards target
            if (closestEnemy) {
                const dx = closestEnemy.sprite.x - playerPos.x;
                if (dx < 0) {
                    this.spriteRenderer.sprite.setFlipX(true); // Face left
                } else if (dx > 0) {
                    this.spriteRenderer.sprite.setFlipX(false); // Face right
                }
            }
        }

        // Fire projectile if enemy found
        if (closestEnemy) {
            this.createProjectile(closestEnemy, config);
        }
    }

    createProjectile(targetEnemy, config) {
        const playerPos = { x: this.spriteRenderer.sprite.x, y: this.spriteRenderer.sprite.y };

        // Determine projectile texture based on character
        const characterClass = (this.class || this.data?.class || '').toLowerCase();

        // Special handling for Lunare's boomerang star
        if (characterClass === 'lunare') {
            // Check if E ability is active (boomerang is away)
            if (this.eAbilityActive) {
                console.log(`🚫 Cannot auto-attack - E ability active (boomerang is away)`);
                return; // Cannot auto-attack while boomerang is away
            }

            // Calculate direction to target
            const dx = targetEnemy.sprite.x - playerPos.x;
            const dy = targetEnemy.sprite.y - playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const direction = { x: dx / distance, y: dy / distance };
            this.createBoomerangStar(direction, config, playerPos, targetEnemy);
            return;
        }

        let projectileTexture = 'orion_projectile'; // Default

        if (characterClass === 'orion') {
            projectileTexture = 'orion_projectile';
        }

        // Create projectile sprite
        const projectile = this.scene.add.sprite(
            playerPos.x,
            playerPos.y - 10, // Start slightly above player
            projectileTexture
        );
        projectile.setOrigin(0.5, 0.5);
        projectile.setScale(1.0); // Bigger projectile
        projectile.setDepth(this.spriteRenderer.sprite.depth + 1);

        // Calculate angle to target
        const dx = targetEnemy.sprite.x - playerPos.x;
        const dy = targetEnemy.sprite.y - playerPos.y;
        const angle = Math.atan2(dy, dx);
        projectile.setRotation(angle);

        // Calculate travel time with constant fast speed
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 800; // Fixed fast speed in pixels/second
        const travelTime = (distance / speed) * 1000; // Convert to ms

        // Animate projectile to target
        this.scene.tweens.add({
            targets: projectile,
            x: targetEnemy.sprite.x,
            y: targetEnemy.sprite.y,
            duration: travelTime,
            ease: 'Linear',
            onComplete: () => {
                // Check if enemy is still alive and in range when projectile hits
                if (targetEnemy.isAlive && targetEnemy.sprite) {
                    // Deal damage
                    let damage = config.damage || 35;

                    // Calculate critical hit
                    const critChance = this.stats?.critChance || 0.05;
                    const critDamage = this.stats?.critDamage || 1.5;
                    const isCrit = Math.random() < critChance;

                    if (isCrit) {
                        damage = Math.floor(damage * critDamage);
                    }

                    const effects = {
                        isCrit: isCrit,
                        damageType: 'arcane'
                    };

                    // Deal damage with effects
                    networkManager.hitEnemy(targetEnemy.data.id, damage, this.data.id, playerPos, effects);

                    // Visual hit effect
                    const hitEffect = this.scene.add.circle(
                        targetEnemy.sprite.x,
                        targetEnemy.sprite.y,
                        20,
                        0x9370DB, // Purple arcane color
                        0.8
                    );
                    hitEffect.setDepth(10000);

                    this.scene.tweens.add({
                        targets: hitEffect,
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => hitEffect.destroy()
                    });
                }

                // Destroy projectile
                projectile.destroy();
            }
        });

        console.log(`🏹 ${config.name}: Fired projectile at enemy`);
    }

    createProjectileInDirection(direction, config) {
        const playerPos = { x: this.spriteRenderer.sprite.x, y: this.spriteRenderer.sprite.y };

        // Determine projectile texture based on character
        const characterClass = (this.class || this.data?.class || '').toLowerCase();

        // Special handling for Lunare's boomerang star
        if (characterClass === 'lunare') {
            // Check if E ability is active (boomerang is away)
            if (this.eAbilityActive) {
                console.log(`🚫 Cannot auto-attack (manual) - E ability active (boomerang is away)`);
                return; // Cannot auto-attack while boomerang is away
            }

            this.createBoomerangStar(direction, config, playerPos);
            return;
        }

        let projectileTexture = 'orion_projectile'; // Default

        if (characterClass === 'orion') {
            projectileTexture = 'orion_projectile';
        }

        // Create projectile sprite
        const projectile = this.scene.add.sprite(
            playerPos.x,
            playerPos.y - 10, // Start slightly above player
            projectileTexture
        );
        projectile.setOrigin(0.5, 0.5);
        projectile.setScale(1.0); // Bigger projectile
        projectile.setDepth(this.spriteRenderer.sprite.depth + 1);

        // Calculate angle from direction
        const angle = Math.atan2(direction.y, direction.x);
        projectile.setRotation(angle);

        // Calculate end point (shoot max range in that direction)
        const range = (config.range || 6) * GameConfig.GAME.TILE_SIZE;
        const endX = playerPos.x + (direction.x * range);
        const endY = playerPos.y + (direction.y * range);

        // Calculate travel time with constant fast speed
        const speed = 800; // Fixed fast speed in pixels/second
        const travelTime = (range / speed) * 1000; // Convert to ms

        // Store projectile data for collision detection
        const projectileData = {
            damage: config.damage || 35,
            owner: this,
            hasHit: false
        };

        // Update function to check for enemy collisions during flight
        const checkCollisions = () => {
            if (projectileData.hasHit || !projectile.active) return;

            const allEnemies = this.scene.getAllEnemies();
            const hitRadius = 20; // Collision radius

            for (const enemy of allEnemies) {
                if (!enemy.isAlive || !enemy.sprite) continue;

                const dx = enemy.sprite.x - projectile.x;
                const dy = enemy.sprite.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < hitRadius) {
                    // Hit detected!
                    projectileData.hasHit = true;

                    // Calculate damage with crit
                    let damage = projectileData.damage;
                    const critChance = this.stats?.critChance || 0.05;
                    const critDamage = this.stats?.critDamage || 1.5;
                    const isCrit = Math.random() < critChance;

                    if (isCrit) {
                        damage = Math.floor(damage * critDamage);
                    }

                    const effects = {
                        isCrit: isCrit,
                        damageType: 'arcane'
                    };

                    // Deal damage
                    networkManager.hitEnemy(enemy.data.id, damage, this.data.id, playerPos, effects);

                    // Visual hit effect
                    const hitEffect = this.scene.add.circle(
                        enemy.sprite.x,
                        enemy.sprite.y,
                        20,
                        0x9370DB, // Purple arcane color
                        0.8
                    );
                    hitEffect.setDepth(10000);

                    this.scene.tweens.add({
                        targets: hitEffect,
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => hitEffect.destroy()
                    });

                    // Destroy projectile
                    projectile.destroy();
                    break;
                }
            }
        };

        // Animate projectile in direction
        this.scene.tweens.add({
            targets: projectile,
            x: endX,
            y: endY,
            duration: travelTime,
            ease: 'Linear',
            onUpdate: checkCollisions,
            onComplete: () => {
                // Destroy projectile if it didn't hit anything
                if (projectile.active) {
                    projectile.destroy();
                }
            }
        });

        console.log(`🏹 ${config.name}: Fired projectile in direction (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)})`);
    }

    createBoomerangStar(direction, config, playerPos, targetEnemy = null) {
        // Only allow one boomerang at a time
        if (this.hasActiveBoomerang) {
            console.log(`⭐ Boomerang already active, skipping`);
            return;
        }

        this.hasActiveBoomerang = true;

        // Broadcast boomerang throw to other players
        const networkManager = this.scene.game.registry.get('networkManager');
        if (networkManager && networkManager.connected) {
            networkManager.useAbility('autoattack', 'Boomerang Star', null, {
                type: 'lunare_boomerang',
                playerId: this.data.id,
                position: { x: playerPos.x, y: playerPos.y },
                direction: direction,
                targetEnemy: targetEnemy ? { x: targetEnemy.sprite.x, y: targetEnemy.sprite.y } : null,
                range: (config.range || 6) * GameConfig.GAME.TILE_SIZE,
                duration: ((config.range || 6) * GameConfig.GAME.TILE_SIZE / 250) * 1000
            });
        }

        // Get reference to Lunare's underglow and disable auto-follow
        const underglow = this.spriteRenderer.underglow;
        if (underglow) {
            this.spriteRenderer.underglowFollowsPlayer = false;

            // Force animation switch to "without boomerang" animations
            const body = this.sprite.body;
            if (body && this.spriteRenderer.sprite) {
                const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
                const animKey = isMoving ? 'lunare_running_noboomerang' : 'lunare_idle_noboomerang';
                if (this.scene.anims.exists(animKey)) {
                    this.spriteRenderer.sprite.play(animKey, true);
                }
            }
        }

        // Create red glowing star graphic
        const star = this.scene.add.graphics();
        star.x = playerPos.x;
        star.y = playerPos.y - 10;

        // Draw a 4-pointed star
        const starSize = 12;
        star.fillStyle(0xFF0000, 1); // Red color
        star.beginPath();

        // Create star shape (4 points)
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = (i % 2 === 0) ? starSize : starSize * 0.4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                star.moveTo(x, y);
            } else {
                star.lineTo(x, y);
            }
        }
        star.closePath();
        star.fillPath();

        // Add glow effect
        const glow = this.scene.add.circle(star.x, star.y, starSize * 1.5, 0xFF6B6B, 0.3);
        glow.setDepth(this.spriteRenderer.sprite.depth);

        star.setDepth(this.spriteRenderer.sprite.depth + 1);

        // Calculate end point
        const range = targetEnemy
            ? Math.sqrt(Math.pow(targetEnemy.sprite.x - playerPos.x, 2) + Math.pow(targetEnemy.sprite.y - playerPos.y, 2))
            : (config.range || 6) * GameConfig.GAME.TILE_SIZE;

        const endX = playerPos.x + (direction.x * range);
        const endY = playerPos.y + (direction.y * range);

        // Calculate travel time (slower for boomerang effect)
        const speed = 250; // Slower speed for realistic boomerang
        const outwardTime = (range / speed) * 1000;
        const returnTime = outwardTime * 0.9; // Return slightly faster

        // Calculate curve control points for boomerang arc
        // The boomerang curves perpendicular to the throw direction
        const perpX = -direction.y; // Perpendicular vector
        const perpY = direction.x;

        // Arc distance (how far to curve sideways) - much wider arc
        const arcOffset = range * 0.8; // 80% of range to the side for wide sweeping arc

        // Control point for the outward arc
        const midX = playerPos.x + (direction.x * range * 0.5) + (perpX * arcOffset);
        const midY = playerPos.y + (direction.y * range * 0.5) + (perpY * arcOffset);

        // Store projectile data
        const projectileData = {
            damage: config.damage || 28,
            owner: this,
            hasHit: false,
            hitEnemies: new Map() // Track enemy hits with timestamps for cooldown
        };

        // Collision detection function
        const checkCollisions = () => {
            if (!star.active) return;

            const allEnemies = this.scene.getAllEnemies();
            const hitRadius = 30; // Slightly larger radius for sweeping hits
            const hitCooldown = 400; // 400ms cooldown before same enemy can be hit again
            const currentTime = Date.now();

            for (const enemy of allEnemies) {
                if (!enemy.isAlive || !enemy.sprite) continue;

                // Check if this enemy was hit recently
                const lastHitTime = projectileData.hitEnemies.get(enemy.data.id);
                if (lastHitTime && (currentTime - lastHitTime) < hitCooldown) continue;

                const dx = enemy.sprite.x - star.x;
                const dy = enemy.sprite.y - star.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < hitRadius) {
                    // Hit detected! Record hit time
                    projectileData.hitEnemies.set(enemy.data.id, currentTime);

                    // Calculate damage with crit
                    let damage = projectileData.damage;
                    const critChance = this.stats?.critChance || 0.05;
                    const critDamage = this.stats?.critDamage || 1.5;
                    const isCrit = Math.random() < critChance;

                    if (isCrit) {
                        damage = Math.floor(damage * critDamage);
                    }

                    const effects = {
                        isCrit: isCrit,
                        damageType: 'shadow'
                    };

                    // Deal damage
                    networkManager.hitEnemy(enemy.data.id, damage, this.data.id, playerPos, effects);

                    // Visual hit effect (dark red/shadow effect)
                    const hitEffect = this.scene.add.circle(
                        enemy.sprite.x,
                        enemy.sprite.y,
                        20,
                        0x8B0000, // Dark red
                        0.8
                    );
                    hitEffect.setDepth(10000);

                    this.scene.tweens.add({
                        targets: hitEffect,
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => hitEffect.destroy()
                    });
                }
            }
        };

        // Spinning animation (more rotations for slower travel)
        this.scene.tweens.add({
            targets: star,
            rotation: Math.PI * 6, // 3 full rotations
            duration: outwardTime + returnTime,
            ease: 'Linear'
        });

        // Smooth bezier curve for outward path
        const startTime = Date.now();
        this.scene.tweens.add({
            targets: { t: 0 },
            t: 1,
            duration: outwardTime,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const t = tween.getValue();

                // Quadratic bezier curve: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
                const oneMinusT = 1 - t;
                const x = oneMinusT * oneMinusT * playerPos.x +
                         2 * oneMinusT * t * midX +
                         t * t * endX;
                const y = oneMinusT * oneMinusT * playerPos.y +
                         2 * oneMinusT * t * midY +
                         t * t * endY;

                star.x = x;
                star.y = y;
                glow.x = x;
                glow.y = y;

                // Move underglow with boomerang
                if (underglow) {
                    underglow.setPosition(x, y);
                }

                checkCollisions();
            },
            onComplete: () => {
                // Return tween - track to player's current position with smooth curve
                const returnTween = this.scene.tweens.add({
                    targets: [star, glow],
                    x: this.spriteRenderer.sprite.x,
                    y: this.spriteRenderer.sprite.y,
                    duration: returnTime,
                    ease: 'Sine.easeIn',
                    onUpdate: () => {
                        // Continuously update destination to follow player
                        if (this.spriteRenderer && this.spriteRenderer.sprite) {
                            returnTween.updateTo('x', this.spriteRenderer.sprite.x, true);
                            returnTween.updateTo('y', this.spriteRenderer.sprite.y, true);
                        }

                        // Move underglow with boomerang on return
                        if (underglow) {
                            underglow.setPosition(star.x, star.y);
                        }

                        checkCollisions();
                    },
                    onComplete: () => {
                        // Destroy when it returns
                        if (star.active) {
                            star.destroy();
                            glow.destroy();
                        }

                        // Return underglow to Lunare's feet and re-enable auto-follow
                        if (underglow && this.spriteRenderer && this.spriteRenderer.sprite) {
                            underglow.setPosition(
                                this.spriteRenderer.sprite.x,
                                this.spriteRenderer.sprite.y + 20
                            );
                            this.spriteRenderer.underglowFollowsPlayer = true;

                            // Force animation switch back to "with boomerang" animations
                            const body = this.sprite.body;
                            if (body) {
                                const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
                                const animKey = isMoving ? 'lunare_running' : 'lunare_idle';
                                if (this.scene.anims.exists(animKey)) {
                                    this.spriteRenderer.sprite.play(animKey, true);
                                }
                            }
                        }

                        // Allow new boomerang to be thrown
                        this.hasActiveBoomerang = false;
                    }
                });
            }
        });

        console.log(`⭐ ${config.name}: Fired boomerang star`);
    }

    applyCommandBoltEffects(minion, buffEffect, duration) {
        if (!minion || !minion.sprite || !minion.isAlive) return;

        // Apply healing
        if (buffEffect.heal) {
            minion.health = Math.min(minion.maxHealth, minion.health + buffEffect.heal);

            // Show heal number
            const healText = this.scene.add.text(
                minion.sprite.x,
                minion.sprite.y - 30,
                `+${buffEffect.heal}`,
                {
                    fontFamily: 'Arial',
                    fontSize: '16px',
                    fontStyle: 'bold',
                    fill: '#10b981',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            );
            healText.setOrigin(0.5);
            healText.setDepth(99999);

            // Animate heal text
            this.scene.tweens.add({
                targets: healText,
                y: healText.y - 30,
                alpha: 0,
                duration: 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => healText.destroy()
            });

            console.log(`💚 Command Bolt healed ${minion.minionId} for ${buffEffect.heal} HP (${minion.health}/${minion.maxHealth})`);
        }

        // Apply damage buff
        if (buffEffect.damageBonus) {
            if (!minion.damageBuffs) minion.damageBuffs = [];

            const buffId = `command_bolt_${Date.now()}`;
            const buff = {
                id: buffId,
                bonus: buffEffect.damageBonus,
                endTime: Date.now() + duration
            };

            minion.damageBuffs.push(buff);

            // Visual buff indicator - smaller aura at minion's feet
            const buffAura = this.scene.add.sprite(
                minion.sprite.x,
                minion.sprite.y,
                'autoattackbonecommander'
            );
            buffAura.setOrigin(0.5, 0.5);
            buffAura.setScale(0.8);
            buffAura.setDepth(minion.sprite.depth - 1);
            buffAura.setAlpha(0.6);
            buffAura.play('bone_commander_aura');

            // Follow minion during animation
            const updateAuraPosition = () => {
                if (buffAura && buffAura.active && minion && minion.sprite) {
                    buffAura.setPosition(minion.sprite.x, minion.sprite.y);
                    buffAura.setDepth(minion.sprite.depth - 1);
                }
            };

            this.scene.events.on('update', updateAuraPosition);

            buffAura.on('animationcomplete', () => {
                this.scene.events.off('update', updateAuraPosition);
                buffAura.destroy();
            });

            // Remove buff after duration
            this.scene.time.delayedCall(duration, () => {
                const index = minion.damageBuffs.findIndex(b => b.id === buffId);
                if (index !== -1) {
                    minion.damageBuffs.splice(index, 1);
                }
            });

            console.log(`⚔️ Command Bolt buffed ${minion.minionId} damage by ${buffEffect.damageBonus * 100}% for ${duration}ms`);
        }
    }

    takeDamage(amount) {
        // Check for invincibility (e.g., during Orion's Shadow Roll)
        if (this.isInvincible) {
            console.log('🛡️ Damage blocked - player is invincible');
            return;
        }

        // Apply defense reduction using diminishing returns formula
        // Formula: damage * (100 / (100 + defense))
        // This matches the server-side calculation
        const defense = this.stats?.defense || 0;
        const damageMultiplier = 100 / (100 + defense);
        let reducedAmount = Math.max(1, Math.floor(amount * damageMultiplier));

        // Shield absorbs damage first
        if (this.shield > 0) {
            if (this.shield >= reducedAmount) {
                // Shield absorbs all damage
                this.shield -= reducedAmount;
                console.log(`🛡️ Shield absorbed ${reducedAmount} damage (${this.shield} shield remaining)`);

                // Update UI to show shield decrease (PlayerUI for other players)
                if (this.ui && this.ui.updateHealthBar) {
                    this.ui.updateHealthBar();
                }

                // Update HUD for local player (ModernHUD)
                if (this === this.scene.localPlayer) {
                    const hud = this.scene.hud || this.scene.modernHUD;
                    if (hud && hud.updateHealthBar) {
                        hud.updateHealthBar();
                    }
                }

                // Blue flash for shield damage
                this.spriteRenderer.tint(0x3b82f6);
                this.scene.time.delayedCall(100, () => {
                    this.spriteRenderer.clearTint();
                });

                return; // No health damage taken
            } else {
                // Shield absorbs partial damage, overflow goes to health
                const overflow = reducedAmount - this.shield;
                console.log(`🛡️ Shield absorbed ${this.shield} damage, ${overflow} overflow to health`);
                this.shield = 0;
                reducedAmount = overflow;
            }
        }

        // Log defense reduction (only for significant reductions)
        if (defense > 0 && amount !== reducedAmount) {
            console.log(`🛡️ Defense reduced ${amount} damage to ${reducedAmount} (defense: ${defense})`);
        }

        // Apply remaining damage to health
        this.health -= reducedAmount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }

        // Damage flash (red for health damage)
        this.spriteRenderer.tint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.spriteRenderer.clearTint();
        });

        this.ui.updateHealthBar();
    }

    addExperience(amount) {
        this.experience += amount;

        // Check for level up
        const requiredExp = GameConfig.getXPRequired(this.level);

        if (this.experience >= requiredExp) {
            this.levelUp();
        }

        // Update HUD for local player
        if (this === this.scene.localPlayer) {
            const hud = this.scene.hud || this.scene.modernHUD;
            if (hud && hud.updateLevelBar) {
                hud.updateLevelBar();
            }
        }
    }

    levelUp() {
        this.level++;
        this.experience = 0; // Reset experience for next level

        console.log(`🎉 Level Up! Now level ${this.level}`);

        // Play level up sound for local player
        if (this === this.scene.localPlayer && this.scene.sound) {
            try {
                this.scene.sound.play('levelup', { volume: 0.4 });
            } catch (e) {
                console.warn('Could not play level up sound:', e);
            }
        }

        // Check for ability unlocks (Malachar's Q/E/R abilities)
        if (this.scene && this.scene.checkAndUnlockAbilities && this === this.scene.localPlayer) {
            this.scene.checkAndUnlockAbilities(this, this.level);
        }

        // Show level up notification
        if (this === this.scene.localPlayer) {
            const levelUpText = this.scene.add.text(
                this.scene.cameras.main.centerX,
                this.scene.cameras.main.scrollY + 200,
                `LEVEL UP! ${this.level}`,
                {
                    font: 'bold 24px monospace',
                    fill: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5).setScrollFactor(0);

            this.scene.tweens.add({
                targets: levelUpText,
                y: this.scene.cameras.main.scrollY + 150,
                scale: 1.5,
                alpha: 0,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => levelUpText.destroy()
            });

            // Update HUD
            const hud = this.scene.hud || this.scene.modernHUD;
            if (hud && hud.updateLevelBar) {
                hud.updateLevelBar();
            }
        }
    }

    die(killedBy = 'unknown') {
        // Only die once - prevent multiple death reports
        if (!this.isAlive) {
            return; // Already dead
        }

        this.isAlive = false;

        // Report death to server
        if (networkManager && networkManager.connected) {
            networkManager.reportDeath(killedBy);
            console.log(`💀 Player died, reporting to server (killed by: ${killedBy})`);
        } else {
            console.error('❌ Cannot report death - network manager not connected');
        }

        // Play death animation
        this.spriteRenderer.playDeathAnimation();

        // Fade out after animation
        this.spriteRenderer.fadeOut(1000);
        this.ui.setAlpha(0.5);
    }

    // Play death animation without reporting to server (for other players)
    playDeathAnimationOnly() {
        // Only die once
        if (!this.isAlive) {
            return; // Already dead
        }

        this.isAlive = false;

        // Play death animation
        if (this.spriteRenderer) {
            this.spriteRenderer.playDeathAnimation();
            this.spriteRenderer.fadeOut(1000);
        }

        if (this.ui) {
            this.ui.setAlpha(0.5);
        }
    }

    // ==================== UPDATE LOOP ====================

    updateAnimation(delta) {
        // Stub for animation updates
        // Current implementation uses static sprite frames
        // Future: Implement walk/run animations here
        // Could delegate to: this.spriteRenderer.updateAnimation(delta, velocityX, velocityY)
    }

    updateElements() {
        // Update sprite rendering
        if (this.usingSprite) {
            this.spriteRenderer.updateSpritePositions();
        } else {
            this.spriteRenderer.updateFallbackPositions();
        }

        // Update depth for Y-sorting
        const spriteDepth = this.spriteRenderer.updateDepth();

        // Update UI (handles its own position caching)
        this.ui.update(spriteDepth);

        // AUTO-ATTACK: Execute automatically on cooldown (unless disabled by controller)
        if (this.autoAttackConfig && !this.disableAutoAttack) {
            const now = Date.now();
            const cooldown = this.autoAttackConfig.cooldown || 1000;

            // Check if cooldown has passed
            if (!this.lastAutoAttackTime || (now - this.lastAutoAttackTime) >= cooldown) {
                this.executeAutoAttack();
            }
        }
    }

    // ==================== CLEANUP ====================

    destroy() {
        this.spriteRenderer.destroy();
        this.ui.destroy();
    }
}
