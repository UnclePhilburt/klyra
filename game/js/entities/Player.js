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

        // Get character config
        const character = CHARACTERS[this.class] || CHARACTERS.ALDRIC;
        const classConfig = { color: character.display.color };
        const textureKey = this.class.toLowerCase();

        // Check if sprite sheet exists for this character
        if (this.scene.textures.exists(textureKey)) {
            console.log(`✅ Creating 2x2 static sprite: ${this.data.username} (${textureKey})`);

            // Static frames - no animation
            // Upper body: tile 64, 65
            // Lower body: tile 120, 121
            const frames = {
                topLeft: 64,
                topRight: 65,
                bottomLeft: 120,
                bottomRight: 121
            };

            // Each frame is 48x48, we want 48x48 per sprite (25% smaller than double)
            const scale = 48 / 48; // 1.0
            const collisionWidth = 48;
            const collisionHeight = 24; // Half height - bottom half only

            // Create invisible physics rectangle (this is what actually moves)
            // Position it lower since we only want bottom half collision
            this.physicsBody = this.scene.add.rectangle(x, y + 12, collisionWidth, collisionHeight, 0x000000, 0);
            this.scene.physics.add.existing(this.physicsBody);

            // Debug: visualize collision box
            this.collisionDebug = this.scene.add.rectangle(x, y + 12, collisionWidth, collisionHeight, 0x00ff00, 0);
            this.collisionDebug.setStrokeStyle(2, 0x00ff00, 1);
            this.collisionDebug.setDepth(9999); // Always on top
            // Respect dev settings visibility
            if (this.scene.devSettings) {
                this.collisionDebug.setVisible(this.scene.devSettings.showCollisionBoxes);
            }

            // This is our main "sprite" reference
            this.sprite = this.physicsBody;
            this.sprite.setDepth(y + 1000);

            // Create 4 visual sprites (static, no animation)
            this.topLeft = this.scene.add.sprite(0, 0, textureKey, frames.topLeft);
            this.topRight = this.scene.add.sprite(0, 0, textureKey, frames.topRight);
            this.bottomLeft = this.scene.add.sprite(0, 0, textureKey, frames.bottomLeft);
            this.bottomRight = this.scene.add.sprite(0, 0, textureKey, frames.bottomRight);

            // Set origin and scale
            [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].forEach(s => {
                s.setOrigin(0, 0);
                s.setScale(scale);
            });

            // Position them initially
            this.updateSpritePositions();

            this.usingSprite = true;

            console.log(`✅ Static 2x2 sprite created`);
            console.log(`  - Upper body: tiles ${frames.topLeft}, ${frames.topRight}`);
            console.log(`  - Lower body: tiles ${frames.bottomLeft}, ${frames.bottomRight}`);
            console.log(`  - Scale: ${scale} (48x48 per sprite, 96x96 total)`);
            console.log(`  - Collision box: ${collisionWidth}x${collisionHeight} rectangle (GREEN OUTLINE - bottom half only)`);

        } else {
            // Fallback to circle placeholder
            console.log(`⚠️ No sprite for ${textureKey}, using placeholder for ${this.data.username}`);

            this.sprite = this.scene.add.circle(x, y, 12, classConfig.color);
            this.sprite.setDepth(y + 1000);
            this.scene.physics.add.existing(this.sprite);

            // Add glow effect
            this.glow = this.scene.add.circle(x, y, 14, classConfig.color, 0.3);
            this.glow.setDepth(y + 999);

            // Add weapon indicator
            this.weapon = this.scene.add.rectangle(x + 15, y, 20, 4, 0xffffff);
            this.weapon.setOrigin(0, 0.5);
            this.weapon.setDepth(y + 1000);

            this.usingSprite = false;
        }

        this.currentDirection = 'down';
    }

    updateSpritePositions() {
        if (!this.usingSprite || !this.topLeft) return;

        const x = this.sprite.x;
        const y = this.sprite.y;
        const spriteSize = 48; // 25% smaller than double size

        // Offset to center character in collision box
        const offsetX = 32; // Move right 32px
        const offsetY = 55; // Move down 55px (was 48, moved down 7 more)

        // Calculate positions
        // Character is 96x96 total (2x2 @ 48px each)
        const left = x - spriteSize + offsetX;
        const right = x + offsetX;
        const top = y - spriteSize * 2 + offsetY;
        const bottom = y - spriteSize + offsetY;
        const depth = y + 1000;

        // Set positions
        this.topLeft.setPosition(left, top);
        this.topRight.setPosition(right, top);
        this.bottomLeft.setPosition(left, bottom);
        this.bottomRight.setPosition(right, bottom);

        // Set depth
        this.topLeft.setDepth(depth);
        this.topRight.setDepth(depth);
        this.bottomLeft.setDepth(depth);
        this.bottomRight.setDepth(depth);

        // Update collision debug box position (offset +12 for bottom half)
        if (this.collisionDebug) {
            this.collisionDebug.setPosition(x, y + 12);
        }
    }

    updateAnimation(delta) {
        // No animation - static sprite
    }

    createNameTag() {
        const x = this.sprite.x;
        const yOffset = this.usingSprite ? 105 : 25;

        // Offset to match visual sprite center (sprite is offset by 32px right)
        const offsetX = this.usingSprite ? 32 : 0;
        const offsetY = this.usingSprite ? 55 : 0;

        const nameX = x + offsetX;
        const nameY = this.sprite.y - yOffset + offsetY;

        // === ULTRA MODERN HEALTH BAR ===
        const healthBarWidth = 70;
        const healthBarHeight = 6;
        const healthBarY = nameY - 20;
        const barRadius = 3;

        // Subtle drop shadow for depth
        this.healthBarShadow = this.scene.add.graphics();
        this.healthBarShadow.fillStyle(0x000000, 0.3);
        this.healthBarShadow.fillRoundedRect(
            nameX - healthBarWidth/2 + 1,
            healthBarY - healthBarHeight/2 + 2,
            healthBarWidth,
            healthBarHeight,
            barRadius
        );

        // Health bar container/background (glass effect)
        this.healthBarContainer = this.scene.add.graphics();
        this.healthBarContainer.fillStyle(0x000000, 0.6);
        this.healthBarContainer.fillRoundedRect(
            nameX - healthBarWidth/2,
            healthBarY - healthBarHeight/2,
            healthBarWidth,
            healthBarHeight,
            barRadius
        );
        this.healthBarContainer.lineStyle(1, 0x444444, 0.8);
        this.healthBarContainer.strokeRoundedRect(
            nameX - healthBarWidth/2,
            healthBarY - healthBarHeight/2,
            healthBarWidth,
            healthBarHeight,
            barRadius
        );

        // Health bar fill (will be updated dynamically)
        this.healthBar = this.scene.add.graphics();
        
        // Glossy overlay for that AAA polish
        this.healthBarGloss = this.scene.add.graphics();
        this.healthBarGloss.fillStyle(0xffffff, 0.15);
        this.healthBarGloss.fillRoundedRect(
            nameX - healthBarWidth/2,
            healthBarY - healthBarHeight/2,
            healthBarWidth,
            healthBarHeight * 0.4,
            barRadius
        );

        // === SLEEK NAME TAG ===
        const nameWidth = Math.max(80, this.data.username.length * 8 + 20);
        const nameHeight = 20;
        
        // Drop shadow for name tag
        this.nameTagShadow = this.scene.add.graphics();
        this.nameTagShadow.fillStyle(0x000000, 0.4);
        this.nameTagShadow.fillRoundedRect(
            nameX - nameWidth/2 + 1,
            nameY - nameHeight/2 + 2,
            nameWidth,
            nameHeight,
            6
        );

        // Name tag background (glass morphism style)
        this.nameTagBg = this.scene.add.graphics();
        this.nameTagBg.fillStyle(0x0a0a0a, 0.85);
        this.nameTagBg.fillRoundedRect(
            nameX - nameWidth/2,
            nameY - nameHeight/2,
            nameWidth,
            nameHeight,
            6
        );
        
        // Subtle gradient overlay
        this.nameTagBg.lineStyle(1, 0x555555, 0.6);
        this.nameTagBg.strokeRoundedRect(
            nameX - nameWidth/2,
            nameY - nameHeight/2,
            nameWidth,
            nameHeight,
            6
        );

        // Level badge (optional - only if level > 1)
        if (this.level && this.level > 1) {
            this.levelBadge = this.scene.add.graphics();
            this.levelBadge.fillStyle(0x6366f1, 0.9);
            this.levelBadge.fillRoundedRect(
                nameX - nameWidth/2 + 4,
                nameY - nameHeight/2 + 4,
                22,
                12,
                4
            );
            
            this.levelText = this.scene.add.text(
                nameX - nameWidth/2 + 15,
                nameY,
                `${this.level}`,
                {
                    font: 'bold 9px Arial',
                    fill: '#ffffff'
                }
            ).setOrigin(0.5);
        }

        // Name text (clean, modern typography)
        this.nameTag = this.scene.add.text(nameX, nameY, this.data.username, {
            font: 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 0,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);

        // Store dimensions for updates
        this.healthBarWidth = healthBarWidth;
        this.healthBarHeight = healthBarHeight;
        this.healthBarY = healthBarY;
        this.nameX = nameX;
        this.barRadius = barRadius;

        // Initial health bar draw
        this.updateHealthBar();
    }


    move(velocityX, velocityY) {
        const speed = GameConfig.PLAYER.SPEED;
        const body = this.sprite.body;

        body.setVelocity(velocityX * speed, velocityY * speed);

        // Update sprite positions to follow physics body
        if (this.usingSprite) {
            this.updateSpritePositions();
        }

        if (!this.usingSprite && this.weapon && (velocityX !== 0 || velocityY !== 0)) {
            // Update weapon rotation for circle placeholder
            const angle = Math.atan2(velocityY, velocityX);
            this.weapon.setRotation(angle);
        }

        // Send position to server (throttled)
        if (velocityX !== 0 || velocityY !== 0) {
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
    }

    moveToPosition(position) {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const targetX = position.x * tileSize + tileSize / 2;
        const targetY = position.y * tileSize + tileSize / 2;

        // Use physics velocity for movement
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

        // Update sprite positions
        if (this.usingSprite) {
            this.updateSpritePositions();
        }
    }

    attack(targetX, targetY) {
        if (!this.usingSprite && this.weapon) {
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

        // Flash effect
        const targets = this.usingSprite && this.topLeft
            ? [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight]
            : [this.sprite];

        this.scene.tweens.add({
            targets: targets,
            alpha: 0.5,
            duration: 50,
            yoyo: true
        });
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }

        // Damage flash
        const targets = this.usingSprite && this.topLeft
            ? [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight]
            : [this.sprite];

        targets.forEach(s => s.setTint(0xff0000));
        this.scene.time.delayedCall(100, () => {
            targets.forEach(s => s.clearTint());
        });

        this.updateHealthBar();
    }

    die() {
        this.isAlive = false;

        // Death animation
        const targets = this.usingSprite && this.topLeft
            ? [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight]
            : [this.sprite, this.glow, this.weapon].filter(x => x);

        this.scene.tweens.add({
            targets: targets,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                targets.forEach(s => s.setVisible(false));
            }
        });

        this.nameTag.setAlpha(0.5);
    }

    updateElements() {
        // Update sprite positions
        if (this.usingSprite) {
            this.updateSpritePositions();
        }

        // Update depth for Y-sorting
        const spriteDepth = this.sprite.y + 1000;
        this.sprite.setDepth(spriteDepth);

        if (!this.usingSprite && this.glow && this.weapon) {
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

        // Calculate UI positions (properly centered above character)
        const yOffset = this.usingSprite ? 105 : 25;
        // Offset to match visual sprite center (sprite is offset by 32px right from physics body)
        const offsetX = this.usingSprite ? 32 : 0;
        const offsetY = this.usingSprite ? 55 : 0;
        const nameX = this.sprite.x + offsetX;
        const nameY = this.sprite.y - yOffset + offsetY;

        const healthBarY = nameY - 20;

        // Only redraw graphics if position has changed significantly (reduces stuttering)
        const posChanged = !this.lastUIX || !this.lastUIY ||
                          Math.abs(nameX - this.lastUIX) > 0.5 ||
                          Math.abs(nameY - this.lastUIY) > 0.5;

        if (posChanged) {
            this.lastUIX = nameX;
            this.lastUIY = nameY;

            const nameWidth = Math.max(80, this.data.username.length * 8 + 20);
            const nameHeight = 20;

            // Update health bar shadow
            if (this.healthBarShadow) {
                this.healthBarShadow.clear();
                this.healthBarShadow.fillStyle(0x000000, 0.3);
                this.healthBarShadow.fillRoundedRect(
                    nameX - this.healthBarWidth/2 + 1,
                    healthBarY - this.healthBarHeight/2 + 2,
                    this.healthBarWidth,
                    this.healthBarHeight,
                    this.barRadius
                );
                this.healthBarShadow.setDepth(spriteDepth);
            }

            // Update health bar container
            if (this.healthBarContainer) {
                this.healthBarContainer.clear();
                this.healthBarContainer.fillStyle(0x000000, 0.6);
                this.healthBarContainer.fillRoundedRect(
                    nameX - this.healthBarWidth/2,
                    healthBarY - this.healthBarHeight/2,
                    this.healthBarWidth,
                    this.healthBarHeight,
                    this.barRadius
                );
                this.healthBarContainer.lineStyle(1, 0x444444, 0.8);
                this.healthBarContainer.strokeRoundedRect(
                    nameX - this.healthBarWidth/2,
                    healthBarY - this.healthBarHeight/2,
                    this.healthBarWidth,
                    this.healthBarHeight,
                    this.barRadius
                );
                this.healthBarContainer.setDepth(spriteDepth + 1);
            }

            // Update glossy overlay
            if (this.healthBarGloss) {
                this.healthBarGloss.clear();
                this.healthBarGloss.fillStyle(0xffffff, 0.15);
                this.healthBarGloss.fillRoundedRect(
                    nameX - this.healthBarWidth/2,
                    healthBarY - this.healthBarHeight/2,
                    this.healthBarWidth,
                    this.healthBarHeight * 0.4,
                    this.barRadius
                );
                this.healthBarGloss.setDepth(spriteDepth + 3);
            }

            // Update name tag shadow
            if (this.nameTagShadow) {
                this.nameTagShadow.clear();
                this.nameTagShadow.fillStyle(0x000000, 0.4);
                this.nameTagShadow.fillRoundedRect(
                    nameX - nameWidth/2 + 1,
                    nameY - nameHeight/2 + 2,
                    nameWidth,
                    nameHeight,
                    6
                );
                this.nameTagShadow.setDepth(spriteDepth + 1);
            }

            // Update name tag background
            if (this.nameTagBg) {
                this.nameTagBg.clear();
                this.nameTagBg.fillStyle(0x0a0a0a, 0.85);
                this.nameTagBg.fillRoundedRect(
                    nameX - nameWidth/2,
                    nameY - nameHeight/2,
                    nameWidth,
                    nameHeight,
                    6
                );
                this.nameTagBg.lineStyle(1, 0x555555, 0.6);
                this.nameTagBg.strokeRoundedRect(
                    nameX - nameWidth/2,
                    nameY - nameHeight/2,
                    nameWidth,
                    nameHeight,
                    6
                );
                this.nameTagBg.setDepth(spriteDepth + 2);
            }

            // Update level badge
            if (this.levelBadge && this.level > 1) {
                this.levelBadge.clear();
                this.levelBadge.fillStyle(0x6366f1, 0.9);
                this.levelBadge.fillRoundedRect(
                    nameX - nameWidth/2 + 4,
                    nameY - nameHeight/2 + 4,
                    22,
                    12,
                    4
                );
                this.levelBadge.setDepth(spriteDepth + 3);
            }

            // Update level text
            if (this.levelText && this.level > 1) {
                this.levelText.setPosition(nameX - nameWidth/2 + 15, nameY);
                this.levelText.setDepth(spriteDepth + 4);
            }

            // Update name tag text
            this.nameTag.setPosition(nameX, nameY);
            this.nameTag.setDepth(spriteDepth + 4);

            // Update stored position for health bar
            this.nameX = nameX;
            this.healthBarY = healthBarY;
        }

        // Always update health bar depth
        if (this.healthBar) {
            this.healthBar.setDepth(spriteDepth + 2);
        }

        // Update health bar fill (only when health changes)
        if (!this.lastHealth || this.health !== this.lastHealth) {
            this.lastHealth = this.health;
            this.updateHealthBar();
        }
    }

    updateHealthBar() {
        if (!this.healthBar) return;

        const healthPercent = this.health / this.maxHealth;
        const currentWidth = this.healthBarWidth * healthPercent;
        
        // Clear and redraw health bar with smooth color transitions
        this.healthBar.clear();
        
        // Determine color with smooth gradient
        let color, glowColor;
        if (healthPercent > 0.6) {
            color = 0x10b981; // Modern emerald green
            glowColor = 0x34d399;
        } else if (healthPercent > 0.4) {
            color = 0xfbbf24; // Modern amber
            glowColor = 0xfcd34d;
        } else if (healthPercent > 0.25) {
            color = 0xf97316; // Modern orange
            glowColor = 0xfb923c;
        } else {
            color = 0xef4444; // Modern red
            glowColor = 0xf87171;
        }
        
        // Draw subtle glow underneath
        this.healthBar.fillStyle(glowColor, 0.3);
        this.healthBar.fillRoundedRect(
            this.nameX - this.healthBarWidth/2 - 1,
            this.healthBarY - this.healthBarHeight/2 - 1,
            currentWidth + 2,
            this.healthBarHeight + 2,
            this.barRadius
        );
        
        // Draw main health bar
        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRoundedRect(
            this.nameX - this.healthBarWidth/2,
            this.healthBarY - this.healthBarHeight/2,
            currentWidth,
            this.healthBarHeight,
            this.barRadius
        );
        
        // Add animated pulse on low health
        if (healthPercent <= 0.25) {
            this.scene.tweens.add({
                targets: this.healthBar,
                alpha: 0.7,
                duration: 500,
                yoyo: true,
                repeat: 0
            });
        }
    }
}