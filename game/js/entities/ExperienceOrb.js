// Experience Orb Entity
class ExperienceOrb {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.collected = false;
        this.expValue = data.expValue || 10; // Default 10 XP per orb

        this.createSprite();
    }

    createSprite() {
        const x = this.data.x;
        const y = this.data.y;

        // Experience orb color (cyan/blue)
        const color = 0x00ffff;

        // Create orb sprite (circle)
        this.sprite = this.scene.add.circle(x, y, 6, color);

        // Inner glow
        this.innerGlow = this.scene.add.circle(x, y, 4, 0xffffff, 0.8);

        // Outer glow effect
        this.glow = this.scene.add.circle(x, y, 12, color, 0.3);

        // Floating animation
        this.scene.tweens.add({
            targets: [this.sprite, this.glow, this.innerGlow],
            y: y - 3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Pulse glow
        this.scene.tweens.add({
            targets: this.glow,
            scale: 1.5,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Sparkle effect
        this.scene.tweens.add({
            targets: this.innerGlow,
            alpha: 0.4,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    checkCollision(playerX, playerY) {
        if (this.collected) return false;

        const dist = Phaser.Math.Distance.Between(
            playerX,
            playerY,
            this.sprite.x,
            this.sprite.y
        );

        return dist < 25; // Pickup radius - all on-screen players get XP when collected
    }

    collect() {
        if (this.collected) return;
        this.collected = true;

        // Collection animation - fly to player
        const targetX = this.scene.cameras.main.centerX;
        const targetY = this.scene.cameras.main.centerY;

        this.scene.tweens.add({
            targets: [this.sprite, this.glow, this.innerGlow],
            x: targetX,
            y: targetY,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.sprite.destroy();
                this.glow.destroy();
                this.innerGlow.destroy();
            }
        });

        // Show XP text
        this.showExpText();
    }

    showExpText() {
        const expText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.scrollY + 150,
            `+${this.expValue} XP`,
            {
                font: 'bold 14px monospace',
                fill: '#00ffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setScrollFactor(0);

        this.scene.tweens.add({
            targets: expText,
            y: this.scene.cameras.main.scrollY + 120,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => expText.destroy()
        });
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.glow) this.glow.destroy();
        if (this.innerGlow) this.innerGlow.destroy();
    }
}
