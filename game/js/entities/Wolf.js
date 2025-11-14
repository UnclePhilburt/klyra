// Wolf Enemy Entity
class Wolf {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive;
        this.damage = data.damage || 8;

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Get variant data from server (defaults for backwards compatibility)
        const scale = this.data.scale || 1.0;
        const glowColor = this.data.glowColor || 0xff0000;
        const glowSize = this.data.glowSize || 8;
        const variant = this.data.variant || 'normal';

        // Create wolf sprite
        this.sprite = this.scene.add.sprite(x, y, 'skullwolf', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(scale); // Use variant scale
        this.sprite.setDepth(2); // Above walkways (depth 1) but with walls (depth 2)
        this.scene.physics.add.existing(this.sprite);

        // Scale hitbox based on wolf size
        const hitboxSize = 32 * scale;
        this.sprite.body.setSize(hitboxSize, hitboxSize);

        // Prevent camera culling from making wolves flicker/disappear
        this.sprite.setScrollFactor(1, 1); // Follow camera normally

        // Play idle animation
        this.sprite.play('skullwolf_idle');

        // Track last position for movement detection
        this.lastX = x;

        // Add variant-colored glow effect
        this.glow = this.scene.add.circle(x, y, glowSize, glowColor, 0.15);
        this.glow.setDepth(1); // Below sprite to avoid z-fighting
        this.glow.setScrollFactor(1, 1); // Make glow follow camera too
        this.glow.visible = true;

        // Store variant for reference
        this.variant = variant;
        this.scale = scale;

        // Add boss crown indicator for boss wolves
        if (variant === 'boss') {
            this.crownText = this.scene.add.text(x, y - 40 * scale, '👑', {
                font: '20px Arial',
                fill: '#FFD700'
            });
            this.crownText.setOrigin(0.5);
            this.crownText.setDepth(3);
            this.crownText.setScrollFactor(1, 1);
        }
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

        // Damage number
        this.showDamageNumber(amount);
    }

    showDamageNumber(amount) {
        const x = this.sprite.x + Phaser.Math.Between(-10, 10);
        const y = this.sprite.y - 30;

        const damageText = this.scene.add.text(x, y, `-${amount}`, {
            font: 'bold 14px monospace',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: damageText,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });
    }

    die() {
        this.isAlive = false;

        // Death animation - explosion effect with variant-colored particles
        const particleColor = this.data.glowColor || 0xff0000;
        const particles = [];
        const particleCount = this.variant === 'boss' ? 16 : 8; // More particles for boss

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = this.variant === 'boss' ? 70 : 50;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                this.variant === 'boss' ? 5 : 3,
                particleColor
            );

            particles.push(particle);

            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * distance,
                y: this.sprite.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: this.variant === 'boss' ? 800 : 500,
                onComplete: () => particle.destroy()
            });
        }

        // Fade out main sprite, glow, and crown
        const targets = [this.sprite, this.glow];
        if (this.crownText) targets.push(this.crownText);

        this.scene.tweens.add({
            targets: targets,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                if (this.sprite) this.sprite.destroy();
                if (this.glow) this.glow.destroy();
                if (this.crownText) this.crownText.destroy();
            }
        });
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

            // Update glow position
            if (this.glow && this.glow.active) {
                this.glow.setPosition(this.sprite.x, this.sprite.y);
            }

            // Update crown position for boss wolves
            if (this.crownText && this.crownText.active) {
                this.crownText.setPosition(this.sprite.x, this.sprite.y - 40 * this.scale);
            }
        }
    }
}
