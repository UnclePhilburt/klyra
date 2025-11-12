// Player Entity - Core player logic and state management
class Player {
    constructor(scene, data) {
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
        this.isAlive = data.isAlive;
        this.currentDirection = 'down';

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
            yOffset: 105
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

        const dx = targetX - this.sprite.x;
        const dy = targetY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            const speed = GameConfig.PLAYER.SPEED;
            this.sprite.body.setVelocity(
                (dx / distance) * speed,
                (dy / distance) * speed
            );
        } else {
            this.sprite.body.setVelocity(0, 0);
            this.sprite.x = targetX;
            this.sprite.y = targetY;
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
