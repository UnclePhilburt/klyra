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
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(32, 32);

        // Play idle animation
        this.sprite.play('skullwolf_idle');

        // Track last position for movement detection
        this.lastX = x;

        // Add red glow effect
        this.glow = this.scene.add.circle(x, y, 8, 0xff0000, 0.15);

        // Wolf label
        this.label = this.scene.add.text(x, y - 40, 'SKULLWOLF', {
            font: '8px monospace',
            fill: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);

        // Health bar
        this.healthBarBg = this.scene.add.rectangle(x, y - 32, 30, 3, 0x000000);
        this.healthBar = this.scene.add.rectangle(x, y - 32, 30, 3, 0xff0000);

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

        // Damage number
        this.showDamageNumber(amount);
        this.updateHealthBar();
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
            targets: [this.sprite, this.glow, this.label, this.healthBar, this.healthBarBg],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                if (this.sprite) this.sprite.destroy();
                if (this.glow) this.glow.destroy();
                if (this.label) this.label.destroy();
                if (this.healthBar) this.healthBar.destroy();
                if (this.healthBarBg) this.healthBarBg.destroy();
            }
        });
    }

    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.width = 30 * healthPercent;

        const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.setFillStyle(color);
    }

    update() {
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

            // Update UI element positions
            this.glow.setPosition(this.sprite.x, this.sprite.y);
            this.label.setPosition(this.sprite.x, this.sprite.y - 40);
            this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 32);
            this.healthBar.setPosition(this.sprite.x - 15 + (30 * (this.health / this.maxHealth) / 2), this.sprite.y - 32);
        }
    }
}
