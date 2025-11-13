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

        // Enemy colors based on type
        const enemyColors = {
            goblin: 0x00ff00,
            orc: 0xff8800,
            skeleton: 0xaaaaaa,
            troll: 0x8b4513,
            demon: 0xff0000
        };

        const color = enemyColors[this.data.type] || 0xff0000;

        // Create sprite (triangle for now)
        this.sprite = this.scene.add.triangle(x, y, 0, 15, 10, -15, -10, -15, color);
        this.scene.physics.add.existing(this.sprite);

        // Add glow
        this.glow = this.scene.add.circle(x, y, 14, color, 0.2);

        // Type label
        this.label = this.scene.add.text(x, y - 25, this.data.type.toUpperCase(), {
            font: '8px monospace',
            fill: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);

        // Health bar
        this.healthBarBg = this.scene.add.rectangle(x, y - 18, 30, 3, 0x000000);
        this.healthBar = this.scene.add.rectangle(x, y - 18, 30, 3, color);

        this.updateHealthBar();
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }

        // Damage flash (use fillColor for triangles since they don't have setTint)
        const originalColor = this.sprite.fillColor;
        this.sprite.setFillStyle(0xffffff);
        this.scene.time.delayedCall(100, () => {
            this.sprite.setFillStyle(originalColor);
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
                this.sprite.fillColor
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
                this.sprite.destroy();
                this.glow.destroy();
                this.label.destroy();
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

    update() {
        // Update positions of UI elements
        if (this.sprite && this.sprite.active) {
            this.glow.setPosition(this.sprite.x, this.sprite.y);
            this.label.setPosition(this.sprite.x, this.sprite.y - 25);
            this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 18);
            this.healthBar.setPosition(this.sprite.x - 15 + (30 * (this.health / this.maxHealth) / 2), this.sprite.y - 18);
        }
    }
}
