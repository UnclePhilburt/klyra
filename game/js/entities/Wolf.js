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

        // Create wolf sprite
        this.sprite = this.scene.add.sprite(x, y, 'skullwolf', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(1.0); // 64x64 at 1:1 scale
        this.sprite.setDepth(2); // Above walkways (depth 1) but with walls (depth 2)
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(32, 32);

        // Play idle animation
        this.sprite.play('skullwolf_idle');

        // Track last position for movement detection
        this.lastX = x;

        // Add subtle red glow effect
        this.glow = this.scene.add.circle(x, y, 8, 0xff0000, 0.15);
        this.glow.setDepth(2); // Same depth as sprite
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
            targets: [this.sprite, this.glow],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                if (this.sprite) this.sprite.destroy();
                if (this.glow) this.glow.destroy();
            }
        });
    }

    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
    }

    updateInterpolation() {
        if (!this.targetPosition) return;

        const lerpSpeed = 0.2; // Smooth interpolation
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If very close, snap to target
        if (distance < 1) {
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
                // Play walk animation when moving
                if (this.sprite.anims.currentAnim?.key !== 'skullwolf_walk') {
                    this.sprite.play('skullwolf_walk');
                }

                // Flip sprite based on direction (defaults to left, flip when moving right)
                const movingRight = this.sprite.x > this.lastX;
                this.sprite.setFlipX(movingRight);
            } else {
                // Play idle animation when not moving
                if (this.sprite.anims.currentAnim?.key !== 'skullwolf_idle') {
                    this.sprite.play('skullwolf_idle');
                }
            }

            this.lastX = this.sprite.x;

            // Update glow position
            this.glow.setPosition(this.sprite.x, this.sprite.y);
        }
    }
}
