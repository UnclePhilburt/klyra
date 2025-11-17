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
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.shield = 0; // Shield absorbs damage before health
        this.level = data.level;
        this.experience = data.experience || 0;
        this.class = data.class;
        this.stats = data.stats;
        this.isAlive = data.isAlive !== undefined ? data.isAlive : true; // Default to true
        this.currentDirection = 'down';

        // Debug: Log if isAlive is false on spawn
        if (!this.isAlive && isLocalPlayer) {
            console.warn(`⚠️ Player spawned with isAlive: false! Data:`, data);
        }

        // Network throttling
        this.lastUpdate = 0;

        // Create modular components
        this.spriteRenderer = new PlayerSprite(scene, data.position, this.class);

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
        const speed = GameConfig.PLAYER.SPEED;
        const body = this.sprite.body;

        body.setVelocity(velocityX * speed, velocityY * speed);

        // Update visual sprite positions
        if (this.usingSprite) {
            this.spriteRenderer.updateSpritePositions();
        }

        // Update animation state based on movement
        this.spriteRenderer.updateMovementState(velocityX, velocityY);

        // Update weapon rotation for fallback
        if (!this.usingSprite && (velocityX !== 0 || velocityY !== 0)) {
            const angle = Math.atan2(velocityY, velocityX);
            this.spriteRenderer.setWeaponRotation(angle);
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
    }

    // Smooth interpolation instead of instant teleport
    updateInterpolation() {
        if (!this.targetPosition) {
            // No target - play idle animation
            if (this.spriteRenderer && this.spriteRenderer.updateMovementState) {
                this.spriteRenderer.updateMovementState(0, 0);
            }
            return;
        }

        const lerpSpeed = 0.5; // Aggressive interpolation for smooth movement (same as minions)
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If very close, snap to target
        if (distance < 1) {
            this.sprite.x = this.targetPosition.x;
            this.sprite.y = this.targetPosition.y;
            this.sprite.body.setVelocity(0, 0);
            this.targetPosition = null;

            // Stop moving - play idle animation
            if (this.spriteRenderer && this.spriteRenderer.updateMovementState) {
                this.spriteRenderer.updateMovementState(0, 0);
            }
        } else {
            // Smooth interpolation
            this.sprite.x += dx * lerpSpeed;
            this.sprite.y += dy * lerpSpeed;

            // Update animation based on movement direction
            if (this.spriteRenderer && this.spriteRenderer.updateMovementState) {
                // Normalize direction for animation
                const normalizedVelX = dx / distance;
                const normalizedVelY = dy / distance;
                this.spriteRenderer.updateMovementState(normalizedVelX, normalizedVelY);
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
                // Calculate damage based on player stats
                const baseDamage = this.stats?.damage || 10;
                networkManager.hitEnemy(enemy.data.id, baseDamage, this.data.id, playerPos);
            }
        });

        // Note: Auto-attacks now happen automatically in update() loop
        // No need to trigger manually here
    }

    executeAutoAttack() {
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

        // Handle different auto-attack types
        if (config.target === 'minion_or_ally' || config.target === 'minion_lowest_hp') {
            // Command Bolt: Buff nearest minion OR ally
            this.commandBolt();
        } else if (config.target === 'enemy') {
            // Attack nearest enemy
            this.autoAttackEnemy(config);
        }
    }

    autoAttackEnemy(config) {
        // Find all enemies in front of Kelise within range
        const range = (config.range || 3) * GameConfig.GAME.TILE_SIZE;
        const playerPos = { x: this.spriteRenderer.sprite.x, y: this.spriteRenderer.sprite.y };

        // Determine facing direction based on sprite flip
        const facingLeft = this.spriteRenderer.sprite && this.spriteRenderer.sprite.flipX;

        // Get all enemies
        const allEnemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.swordDemons || {}),
            ...Object.values(this.scene.minotaurs || {}),
            ...Object.values(this.scene.mushrooms || {})
        ];

        const enemiesInFront = [];

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

        // Attack all enemies in front
        if (enemiesInFront.length > 0) {
            const damage = config.damage || 10;

            // Play attack animation once
            this.spriteRenderer.playAttackAnimation();

            enemiesInFront.forEach(enemy => {
                // Stun enemy for 1000ms (1 second)
                const stunDuration = 1000;

                // Deal damage with stun effect
                networkManager.hitEnemy(enemy.data.id, damage, this.data.id, playerPos, {
                    stun: stunDuration,
                    knockback: {
                        distance: 50,
                        sourceX: playerPos.x,
                        sourceY: playerPos.y
                    }
                });

                // Apply client-side stun immediately for responsiveness
                enemy.isStunned = true;
                enemy.stunnedUntil = Date.now() + stunDuration;

                // Store velocity before stunning
                if (enemy.sprite.body) {
                    enemy.preStunVelocity = {
                        x: enemy.sprite.body.velocity.x,
                        y: enemy.sprite.body.velocity.y
                    };
                    enemy.sprite.body.setVelocity(0, 0);
                }

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
                            if (enemy.setTargetPosition) {
                                enemy.setTargetPosition(enemy.sprite.x, enemy.sprite.y);
                            } else if (enemy.targetX !== undefined) {
                                enemy.targetX = enemy.sprite.x;
                                enemy.targetY = enemy.sprite.y;
                            }
                        }
                    });
                }

                // Visual stun indicator - stars/sparkles
                const stunEffect = this.scene.add.text(
                    enemy.sprite.x,
                    enemy.sprite.y - 40,
                    '★',
                    {
                        fontSize: '24px',
                        color: '#FFFF00'
                    }
                );
                stunEffect.setOrigin(0.5);
                stunEffect.setDepth(10001);

                this.scene.tweens.add({
                    targets: stunEffect,
                    y: enemy.sprite.y - 50,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => stunEffect.destroy()
                });

                // Remove stun after duration
                this.scene.time.delayedCall(stunDuration, () => {
                    enemy.isStunned = false;
                    enemy.stunnedUntil = 0;
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
        // Shield absorbs damage first
        if (this.shield > 0) {
            if (this.shield >= amount) {
                // Shield absorbs all damage
                this.shield -= amount;
                console.log(`🛡️ Shield absorbed ${amount} damage (${this.shield} shield remaining)`);

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
                const overflow = amount - this.shield;
                console.log(`🛡️ Shield absorbed ${this.shield} damage, ${overflow} overflow to health`);
                this.shield = 0;
                amount = overflow;
            }
        }

        // Apply remaining damage to health
        this.health -= amount;
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

        // AUTO-ATTACK: Execute automatically on cooldown
        if (this.autoAttackConfig) {
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
