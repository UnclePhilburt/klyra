// Player Entity
class Player {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.level = data.level;
        this.experience = data.experience || 0;
        this.class = data.class;
        this.stats = data.stats;
        this.isAlive = data.isAlive;

        this.createSprite();
        this.createNameTag();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Get character config from new system
        const character = CHARACTERS[this.class] || CHARACTERS.ALDRIC;
        const classConfig = { color: character.display.color };

        // Convert class to lowercase for texture key (sprites are loaded as lowercase)
        const textureKey = this.class.toLowerCase();

        // Check if sprite sheet exists for this character
        if (this.scene.textures.exists(textureKey)) {
            // Create 2x2 tile character (multi-sprite)
            const spriteSize = 32; // Half of 64px frames

            // Create 4 sprites for 2x2 grid
            this.topLeft = this.scene.add.sprite(x - spriteSize/2, y - spriteSize, textureKey, 0);
            this.topRight = this.scene.add.sprite(x + spriteSize/2, y - spriteSize, textureKey, 0);
            this.bottomLeft = this.scene.add.sprite(x - spriteSize/2, y, textureKey, 0);
            this.bottomRight = this.scene.add.sprite(x + spriteSize/2, y, textureKey, 0);

            // Set origin to center-bottom for consistent ground alignment
            [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].forEach(s => {
                s.setOrigin(0.5, 1.0);
                s.setScale(0.5);
                s.setDepth(y + 1000);
            });

            // Use main sprite reference (center point for physics)
            this.sprite = this.scene.add.rectangle(x, y, tileSize, tileSize, 0x000000, 0);
            this.sprite.setDepth(y + 1000);
            this.scene.physics.add.existing(this.sprite);

            // Animation state
            this.currentAnimFrame = 0;
            this.animTimer = 0;
            this.animState = 'idle';

            console.log(`✅ Created 2x2 sprite for ${this.data.username} using ${textureKey}, depth: ${y + 1000}`);
            this.usingSprite = true;
        } else {
            // Fallback to circle placeholder
            console.log(`⚠️ No sprite for ${textureKey}, using placeholder for ${this.data.username}`);
            this.sprite = this.scene.add.circle(x, y, 12, classConfig.color);
            this.sprite.setDepth(y + 1000); // Set initial depth with offset
            this.scene.physics.add.existing(this.sprite);

            // Add glow effect
            this.glow = this.scene.add.circle(x, y, 14, classConfig.color, 0.3);
            this.glow.setDepth(y + 999);

            // Add weapon indicator
            this.weapon = this.scene.add.rectangle(x + 15, y, 20, 4, 0xffffff);
            this.weapon.setOrigin(0, 0.5);
            this.weapon.setDepth(y + 1000);

            this.container = this.scene.add.container(0, 0, [this.glow, this.sprite, this.weapon]);
            this.usingSprite = false;
        }

        this.currentDirection = 'down';

        // Malachar idle animation frames (2x2 tiles per frame)
        this.idleFrames = [
            { topLeft: 57, topRight: 58, bottomLeft: 113, bottomRight: 114 },
            { topLeft: 60, topRight: 61, bottomLeft: 116, bottomRight: 117 },
            { topLeft: 63, topRight: 64, bottomLeft: 119, bottomRight: 120 },
            { topLeft: 67, topRight: 68, bottomLeft: 123, bottomRight: 124 },
            { topLeft: 70, topRight: 71, bottomLeft: 126, bottomRight: 127 },
            { topLeft: 74, topRight: 75, bottomLeft: 130, bottomRight: 131 },
            { topLeft: 77, topRight: 78, bottomLeft: 133, bottomRight: 134 },
            { topLeft: 80, topRight: 81, bottomLeft: 136, bottomRight: 137 }
        ];
    }

    updateSpriteFrames(frameData) {
        if (!this.usingSprite || !this.topLeft) return;

        this.topLeft.setFrame(frameData.topLeft);
        this.topRight.setFrame(frameData.topRight);
        this.bottomLeft.setFrame(frameData.bottomLeft);
        this.bottomRight.setFrame(frameData.bottomRight);
    }

    updateAnimation(delta) {
        if (!this.usingSprite || !this.topLeft) return;

        this.animTimer += delta;
        const frameTime = 125; // milliseconds per frame (8 fps)

        if (this.animTimer >= frameTime) {
            this.animTimer = 0;

            if (this.animState === 'idle') {
                this.currentAnimFrame = (this.currentAnimFrame + 1) % this.idleFrames.length;
                this.updateSpriteFrames(this.idleFrames[this.currentAnimFrame]);
            }
        }
    }

    createNameTag() {
        const x = this.sprite.x;
        const y = this.sprite.y - 25;

        this.nameTag = this.scene.add.text(x, y, this.data.username, {
            font: '10px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        // Health bar above name
        this.healthBarBg = this.scene.add.rectangle(x, y - 15, 40, 4, 0x000000);
        this.healthBar = this.scene.add.rectangle(x, y - 15, 40, 4, 0x00ff00);
    }

    move(velocityX, velocityY) {
        const speed = GameConfig.PLAYER.SPEED;
        const body = this.sprite.body;

        body.setVelocity(velocityX * speed, velocityY * speed);

        // Update animations and direction
        if (velocityX !== 0 || velocityY !== 0) {
            this.animState = 'moving';

            if (!this.usingSprite) {
                // Update weapon rotation for circle placeholder
                const angle = Math.atan2(velocityY, velocityX);
                this.weapon.setRotation(angle);
            }

            // Send position to server (throttled)
            const now = Date.now();
            if (!this.lastUpdate || now - this.lastUpdate > 50) {
                this.lastUpdate = now;
                const tileSize = GameConfig.GAME.TILE_SIZE;
                networkManager.movePlayer({
                    x: Math.floor(this.sprite.x / tileSize),
                    y: Math.floor(this.sprite.y / tileSize)
                });
            }
        } else {
            this.animState = 'idle';
        }

        this.updateElements();
    }

    moveToPosition(position) {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const targetX = position.x * tileSize + tileSize / 2;
        const targetY = position.y * tileSize + tileSize / 2;

        // Smooth movement
        this.scene.tweens.add({
            targets: this.sprite,
            x: targetX,
            y: targetY,
            duration: 100,
            ease: 'Linear'
        });
    }

    attack(targetX, targetY) {
        if (!this.usingSprite) {
            // Point weapon at target for circle placeholder
            const angle = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                targetX,
                targetY
            );
            this.weapon.setRotation(angle);

            // Attack animation
            this.scene.tweens.add({
                targets: this.weapon,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 100,
                yoyo: true
            });
        }

        // Flash effect for multi-sprite character
        if (this.usingSprite && this.topLeft) {
            const targets = [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight];
            this.scene.tweens.add({
                targets: targets,
                alpha: 0.5,
                duration: 50,
                yoyo: true
            });
        } else if (!this.usingSprite) {
            // Flash effect for placeholder
            this.scene.tweens.add({
                targets: this.sprite,
                alpha: 0.5,
                duration: 50,
                yoyo: true
            });
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }

        // Damage flash
        if (this.usingSprite && this.topLeft) {
            [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].forEach(s => {
                s.setTint(0xff0000);
            });
            this.scene.time.delayedCall(100, () => {
                [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].forEach(s => {
                    s.clearTint();
                });
            });
        } else if (!this.usingSprite) {
            this.sprite.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                this.sprite.clearTint();
            });
        }

        this.updateHealthBar();
    }

    die() {
        this.isAlive = false;

        // Death animation
        if (this.usingSprite && this.topLeft) {
            const targets = [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight];
            this.scene.tweens.add({
                targets: targets,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    targets.forEach(s => s.setVisible(false));
                }
            });
        } else if (!this.usingSprite) {
            this.scene.tweens.add({
                targets: [this.sprite, this.glow, this.weapon],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    this.sprite.setVisible(false);
                    if (this.glow) this.glow.setVisible(false);
                    if (this.weapon) this.weapon.setVisible(false);
                }
            });
        }

        this.nameTag.setAlpha(0.5);
    }

    updateElements() {
        // Update sprite depth for proper Y-sorting
        const spriteDepth = this.sprite.y + 1000;
        this.sprite.setDepth(spriteDepth);

        if (this.usingSprite && this.topLeft) {
            // Update all 4 sprite positions for 2x2 character
            const spriteSize = 32;
            const x = this.sprite.x;
            const y = this.sprite.y;

            // Position sprites with center-bottom origin
            this.topLeft.setPosition(x - spriteSize/2, y - spriteSize);
            this.topRight.setPosition(x + spriteSize/2, y - spriteSize);
            this.bottomLeft.setPosition(x - spriteSize/2, y);
            this.bottomRight.setPosition(x + spriteSize/2, y);

            [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].forEach(s => {
                s.setDepth(spriteDepth);
            });
        } else if (!this.usingSprite) {
            // Update glow position for circle placeholder
            this.glow.setPosition(this.sprite.x, this.sprite.y);
            this.glow.setDepth(spriteDepth - 1);

            // Update weapon position
            const angle = this.weapon.rotation;
            const distance = 15;
            this.weapon.setPosition(
                this.sprite.x + Math.cos(angle) * distance,
                this.sprite.y + Math.sin(angle) * distance
            );
            this.weapon.setDepth(spriteDepth);
        }

        // Update name tag and health bar (for all sprite types)
        this.nameTag.setPosition(this.sprite.x, this.sprite.y - 35);
        this.nameTag.setDepth(spriteDepth + 1); // Above player
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 25);
        this.healthBarBg.setDepth(spriteDepth + 1); // Above player
        this.healthBar.setPosition(this.sprite.x - 20 + (40 * (this.health / this.maxHealth) / 2), this.sprite.y - 25);
        this.healthBar.setDepth(spriteDepth + 2); // Above health bar bg

        this.updateHealthBar();
    }

    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.width = 40 * healthPercent;

        const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.setFillStyle(color);
    }
}
