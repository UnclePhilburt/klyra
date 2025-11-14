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
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const targetX = position.x * tileSize + tileSize / 2;
        const targetY = position.y * tileSize + tileSize / 2;

        // Store target for interpolation
        this.targetPosition = { x: targetX, y: targetY };
    }

    // Smooth interpolation instead of instant teleport
    updateInterpolation() {
        if (!this.targetPosition) return;

        const lerpSpeed = 0.3; // Smooth interpolation
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If very close, snap to target
        if (distance < 1) {
            this.sprite.x = this.targetPosition.x;
            this.sprite.y = this.targetPosition.y;
            this.sprite.body.setVelocity(0, 0);
            this.targetPosition = null;
        } else {
            // Smooth interpolation
            this.sprite.x += dx * lerpSpeed;
            this.sprite.y += dy * lerpSpeed;
        }

        if (this.usingSprite) {
            this.spriteRenderer.updateSpritePositions();
        }
    }

    sendPositionUpdate() {
        const now = Date.now();
        if (!this.lastUpdate || now - this.lastUpdate > 50) {
            this.lastUpdate = now;
            const tileSize = GameConfig.GAME.TILE_SIZE;
            networkManager.movePlayer({
                x: Math.floor(this.sprite.x / tileSize),
                y: Math.floor(this.sprite.y / tileSize)
            });
        }
    }

    // ==================== COMBAT ====================

    attack(targetX, targetY) {
        this.spriteRenderer.animateAttack(targetX, targetY);

        // Malachar (Bone Commander spec) heals minions with auto attacks
        if (this.class === 'malachar' && this.scene.selectedCharacter === 'bone_commander') {
            this.healNearestMinion();
        }
    }

    healNearestMinion() {
        // Find nearest minion owned by this player
        let nearestMinion = null;
        let nearestDistance = Infinity;

        Object.values(this.scene.minions).forEach(minion => {
            if (minion.ownerId === this.data.id && minion.isAlive) {
                const dx = minion.sprite.x - this.spriteRenderer.sprite.x;
                const dy = minion.sprite.y - this.spriteRenderer.sprite.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestMinion = minion;
                }
            }
        });

        // Heal the nearest minion
        if (nearestMinion) {
            // Send heal request to server
            networkManager.socket.emit('minion:heal', {
                minionId: nearestMinion.data.id,
                healAmount: 15, // From MalacharSkills.js autoAttack.heal
                position: {
                    x: nearestMinion.sprite.x,
                    y: nearestMinion.sprite.y
                }
            });

            // Show visual effect immediately (client prediction)
            this.scene.showMinionHealEffect(nearestMinion.sprite.x, nearestMinion.sprite.y);

            console.log(`💚 Healing minion ${nearestMinion.data.id} for 15 HP`);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }

        // Damage flash
        this.spriteRenderer.tint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.spriteRenderer.clearTint();
        });

        this.ui.updateHealthBar();
    }

    die() {
        this.isAlive = false;

        // Death animation
        this.spriteRenderer.fadeOut(500);
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
    }

    // ==================== CLEANUP ====================

    destroy() {
        this.spriteRenderer.destroy();
        this.ui.destroy();
    }
}
