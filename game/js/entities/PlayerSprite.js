// PlayerSprite - Handles all visual sprite rendering for a player
class PlayerSprite {
    constructor(scene, position, characterClass) {
        this.scene = scene;
        this.characterClass = characterClass;
        this.position = position;

        // Visual elements
        this.physicsBody = null;
        this.topLeft = null;
        this.topRight = null;
        this.bottomLeft = null;
        this.bottomRight = null;
        this.collisionDebug = null;

        // Fallback elements
        this.circle = null;
        this.glow = null;
        this.weapon = null;

        this.usingSprite = false;
        this.currentDirection = 'down';

        this.create();
    }

    create() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.position.x * tileSize + tileSize / 2;
        const y = this.position.y * tileSize + tileSize / 2;

        const character = CHARACTERS[this.characterClass] || CHARACTERS.ALDRIC;
        const textureKey = this.characterClass.toLowerCase();

        if (this.scene.textures.exists(textureKey)) {
            this.createSpriteCharacter(x, y, textureKey, character);
        } else {
            this.createFallbackCharacter(x, y, character);
        }
    }

    createSpriteCharacter(x, y, textureKey, character) {
        console.log(`✅ Creating 2x2 sprite for ${this.characterClass}`);

        // Static frames
        const frames = {
            topLeft: 64,
            topRight: 65,
            bottomLeft: 120,
            bottomRight: 121
        };

        const scale = 1.0;
        const collisionWidth = 48;
        const collisionHeight = 24; // Bottom half only

        // Create physics body (invisible rectangle)
        this.physicsBody = this.scene.add.rectangle(x, y + 12, collisionWidth, collisionHeight, 0x000000, 0);
        this.scene.physics.add.existing(this.physicsBody);

        // Debug collision box
        this.collisionDebug = this.scene.add.rectangle(x, y + 12, collisionWidth, collisionHeight, 0x00ff00, 0);
        this.collisionDebug.setStrokeStyle(2, 0x00ff00, 1);
        this.collisionDebug.setDepth(9999);

        if (this.scene.devSettings) {
            this.collisionDebug.setVisible(this.scene.devSettings.showCollisionBoxes);
        }

        // Create visual sprites (4 tiles for 2x2)
        this.topLeft = this.scene.add.sprite(0, 0, textureKey, frames.topLeft);
        this.topRight = this.scene.add.sprite(0, 0, textureKey, frames.topRight);
        this.bottomLeft = this.scene.add.sprite(0, 0, textureKey, frames.bottomLeft);
        this.bottomRight = this.scene.add.sprite(0, 0, textureKey, frames.bottomRight);

        [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].forEach(s => {
            s.setOrigin(0, 0);
            s.setScale(scale);
            s.setDepth(2); // Above walkways (depth 1) but with walls (depth 2)
        });

        this.updateSpritePositions();
        this.usingSprite = true;

        console.log(`✅ Sprite character created with collision box: ${collisionWidth}x${collisionHeight}`);
    }

    createFallbackCharacter(x, y, character) {
        console.log(`⚠️ No sprite found, using fallback for ${this.characterClass}`);

        this.circle = this.scene.add.circle(x, y, 12, character.display.color);
        this.circle.setDepth(y + 1000);
        this.scene.physics.add.existing(this.circle);
        this.physicsBody = this.circle;

        // Glow effect
        this.glow = this.scene.add.circle(x, y, 14, character.display.color, 0.3);
        this.glow.setDepth(y + 999);

        // Weapon indicator
        this.weapon = this.scene.add.rectangle(x + 15, y, 20, 4, 0xffffff);
        this.weapon.setOrigin(0, 0.5);
        this.weapon.setDepth(y + 1000);

        this.usingSprite = false;
    }

    updateSpritePositions() {
        if (!this.usingSprite || !this.topLeft) return;

        const x = this.physicsBody.x;
        const y = this.physicsBody.y;
        const spriteSize = 48;

        // Offset to center character visually
        const offsetX = 32;
        const offsetY = 55;

        const left = x - spriteSize + offsetX;
        const right = x + offsetX;
        const top = y - spriteSize * 2 + offsetY;
        const bottom = y - spriteSize + offsetY;
        const depth = y + 1000;

        this.topLeft.setPosition(left, top);
        this.topRight.setPosition(right, top);
        this.bottomLeft.setPosition(left, bottom);
        this.bottomRight.setPosition(right, bottom);

        this.topLeft.setDepth(depth);
        this.topRight.setDepth(depth);
        this.bottomLeft.setDepth(depth);
        this.bottomRight.setDepth(depth);

        if (this.collisionDebug) {
            this.collisionDebug.setPosition(x, y + 12);
        }
    }

    updateDepth() {
        const depth = this.physicsBody.y + 1000;

        if (this.usingSprite) {
            this.physicsBody.setDepth(depth);
            if (this.topLeft) {
                this.topLeft.setDepth(depth);
                this.topRight.setDepth(depth);
                this.bottomLeft.setDepth(depth);
                this.bottomRight.setDepth(depth);
            }
        } else {
            if (this.circle) this.circle.setDepth(depth);
            if (this.glow) this.glow.setDepth(depth - 1);
            if (this.weapon) this.weapon.setDepth(depth);
        }

        return depth;
    }

    updateFallbackPositions() {
        if (this.usingSprite || !this.physicsBody) return;

        const x = this.physicsBody.x;
        const y = this.physicsBody.y;

        if (this.glow) {
            this.glow.setPosition(x, y);
        }

        if (this.weapon) {
            const angle = this.weapon.rotation;
            const distance = 15;
            this.weapon.setPosition(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance
            );
        }
    }

    setWeaponRotation(angle) {
        if (!this.usingSprite && this.weapon) {
            this.weapon.setRotation(angle);
        }
    }

    flash() {
        const targets = this.getVisualTargets();

        this.scene.tweens.add({
            targets: targets,
            alpha: 0.5,
            duration: 50,
            yoyo: true
        });
    }

    tint(color) {
        const targets = this.getVisualTargets();
        targets.forEach(s => {
            if (s.setTint) s.setTint(color);
        });
    }

    clearTint() {
        const targets = this.getVisualTargets();
        targets.forEach(s => {
            if (s.clearTint) s.clearTint();
        });
    }

    fadeOut(duration = 500, onComplete = null) {
        const targets = this.getVisualTargets();

        this.scene.tweens.add({
            targets: targets,
            alpha: 0,
            duration: duration,
            onComplete: () => {
                targets.forEach(s => s.setVisible(false));
                if (onComplete) onComplete();
            }
        });
    }

    animateAttack(targetX, targetY) {
        if (!this.usingSprite && this.weapon) {
            const angle = Phaser.Math.Angle.Between(
                this.physicsBody.x,
                this.physicsBody.y,
                targetX,
                targetY
            );
            this.weapon.setRotation(angle);

            this.scene.tweens.add({
                targets: this.weapon,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 100,
                yoyo: true
            });
        }

        this.flash();
    }

    getVisualTargets() {
        if (this.usingSprite && this.topLeft) {
            return [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight];
        } else {
            return [this.circle, this.glow, this.weapon].filter(x => x);
        }
    }

    getPhysicsBody() {
        return this.physicsBody;
    }

    getX() {
        return this.physicsBody.x;
    }

    getY() {
        return this.physicsBody.y;
    }

    isUsingSprite() {
        return this.usingSprite;
    }

    destroy() {
        if (this.physicsBody) this.physicsBody.destroy();
        if (this.topLeft) this.topLeft.destroy();
        if (this.topRight) this.topRight.destroy();
        if (this.bottomLeft) this.bottomLeft.destroy();
        if (this.bottomRight) this.bottomRight.destroy();
        if (this.collisionDebug) this.collisionDebug.destroy();
        if (this.circle) this.circle.destroy();
        if (this.glow) this.glow.destroy();
        if (this.weapon) this.weapon.destroy();
    }
}
