// Enemy Entity
class Enemy {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive;

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Create sprite (skullwolf)
        this.sprite = this.scene.add.sprite(x, y, 'skullwolf', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(1.0); // 64x64 at 1:1 scale
        this.sprite.setDepth(2); // Above walkways (depth 1) but with walls (depth 2)
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(32, 32);

        // Prevent camera culling from making enemies flicker/disappear
        this.sprite.setScrollFactor(1, 1); // Follow camera normally

        // Play idle animation
        this.sprite.play('skullwolf_idle');

        // Track last position for movement detection
        this.lastX = x;

        // PERFORMANCE: Removed glow circle (saves 1 object per enemy)
        // PERFORMANCE: Removed name label (saves 1 object per enemy)

        // Health bar - only shown when damaged
        this.healthBarBg = this.scene.add.rectangle(x, y - 32, 30, 3, 0x000000);
        this.healthBarBg.setDepth(2);
        this.healthBarBg.setScrollFactor(1, 1);
        this.healthBarBg.setVisible(false); // Hidden by default

        this.healthBar = this.scene.add.rectangle(x, y - 32, 30, 3, 0xff0000);
        this.healthBar.setDepth(2);
        this.healthBar.setScrollFactor(1, 1);
        this.healthBar.setVisible(false); // Hidden by default

        this.updateHealthBar();
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }

        // Damage flash
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });

        // PERFORMANCE: Removed damage numbers (saves text objects + tweens)

        // Show health bar when damaged
        this.healthBar.setVisible(true);
        this.healthBarBg.setVisible(true);
        this.updateHealthBar();
    }

    die() {
        this.isAlive = false;

        // Death animation - explosion effect
        const particles = [];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                3,
                0xff0000 // Red particles
            );

            particles.push(particle);

            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * 50,
                y: this.sprite.y + Math.sin(angle) * 50,
                alpha: 0,
                duration: 500,
                onComplete: () => particle.destroy()
            });
        }

        // Fade out main sprite
        this.scene.tweens.add({
            targets: [this.sprite, this.healthBar, this.healthBarBg],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.sprite.destroy();
                this.healthBar.destroy();
                this.healthBarBg.destroy();
            }
        });
    }

    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.width = 30 * healthPercent;

        const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.setFillStyle(color);
    }

    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
    }

    updateInterpolation() {
        if (!this.targetPosition) return;

        const lerpSpeed = 0.3; // Smooth interpolation (increased from 0.2 for better sync)
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If very close, snap to target
        if (distance < 2) {
            this.sprite.x = this.targetPosition.x;
            this.sprite.y = this.targetPosition.y;
            this.targetPosition = null;
        } else {
            // Smooth interpolation
            this.sprite.x += dx * lerpSpeed;
            this.sprite.y += dy * lerpSpeed;
        }
    }

    update() {
        // Interpolate to target position
        this.updateInterpolation();

        // Update positions of UI elements
        if (this.sprite && this.sprite.active) {
            // Track movement and update animation
            const isMoving = Math.abs(this.sprite.x - this.lastX) > 0.5;

            if (isMoving) {
                // Play walk animation when moving (ignoreIfPlaying prevents restart flicker)
                if (this.sprite.anims.currentAnim?.key !== 'skullwolf_walk') {
                    this.sprite.play('skullwolf_walk', true); // true = ignoreIfPlaying
                }

                // Flip sprite based on direction (defaults to left, flip when moving right)
                const movingRight = this.sprite.x > this.lastX;
                this.sprite.setFlipX(movingRight);
            } else {
                // Play idle animation when not moving (ignoreIfPlaying prevents restart flicker)
                if (this.sprite.anims.currentAnim?.key !== 'skullwolf_idle') {
                    this.sprite.play('skullwolf_idle', true); // true = ignoreIfPlaying
                }
            }

            this.lastX = this.sprite.x;

            // Update health bar positions (only if visible)
            if (this.healthBarBg && this.healthBarBg.active && this.healthBarBg.visible) {
                this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 32);
            }
            if (this.healthBar && this.healthBar.active && this.healthBar.visible) {
                this.healthBar.setPosition(this.sprite.x - 15 + (30 * (this.health / this.maxHealth) / 2), this.sprite.y - 32);
            }
        }
    }
}
