// Emberclaw Enemy Entity - Flying ranged attacker with kiting behavior
class Emberclaw {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive !== false;
        this.damage = data.damage || 15; // Higher damage - glass cannon
        this.isAttacking = false;
        this.lastAttackTime = 0;
        this.projectiles = []; // Track active projectiles

        // Kiting behavior settings
        this.preferredDistance = 200; // Pixels - stay this far from players
        this.fleeDistance = 150; // Flee if player gets closer than this
        this.attackRange = 250; // Can shoot from this distance

        if (!this.isAlive) {
            console.warn(`⚠️ Emberclaw ${data.id} created with isAlive: false`);
        }

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Emberclaw is 64x64 pixels
        const scale = 1.0;

        // Create sprite
        this.sprite = this.scene.add.sprite(x, y, 'emberclaw-idle', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(scale);
        this.sprite.setDepth(3); // Flies above ground enemies

        // Add physics
        this.scene.physics.add.existing(this.sprite);

        if (!this.sprite.body) {
            console.error(`❌ Emberclaw ${this.data.id}: Physics body failed to create!`);
            return;
        }

        // Set smaller hitbox - glass cannon
        const hitboxSize = 40;
        this.sprite.body.setSize(hitboxSize, hitboxSize);
        this.sprite.body.setCollideWorldBounds(false);
        this.sprite.body.setImmovable(true);

        // Store reference for collision detection
        this.sprite.enemyEntity = this;
        this.sprite.emberclawEntity = this;

        // Prevent camera culling
        this.sprite.setScrollFactor(1, 1);

        // Play flying animation by default (hovering)
        if (this.scene.anims.exists('emberclaw_flying')) {
            this.sprite.play('emberclaw_flying');
        } else {
            console.warn('⚠️ Animation emberclaw_flying does not exist yet');
        }

        // Track movement
        this.lastX = x;
        this.targetX = x;
        this.targetY = y;

        // Health bar - hidden until damaged
        this.healthBarBg = this.scene.add.rectangle(x, y - 40, 30, 3, 0x000000);
        this.healthBarBg.setDepth(4);
        this.healthBarBg.setScrollFactor(1, 1);
        this.healthBarBg.setVisible(false);

        this.healthBar = this.scene.add.rectangle(x, y - 40, 30, 3, 0xff0000);
        this.healthBar.setDepth(4);
        this.healthBar.setScrollFactor(1, 1);
        this.healthBar.setVisible(false);

        this.updateHealthBar();
    }

    // Shoot projectile at target
    shootProjectile(targetX, targetY) {
        const now = Date.now();

        // Attack cooldown - 2 seconds between shots
        if (this.isAttacking || now - this.lastAttackTime < 2000) {
            return;
        }

        console.log(`🔥 Emberclaw shooting at (${targetX}, ${targetY})`);

        // Face target
        const dx = targetX - this.sprite.x;
        if (Math.abs(dx) > 5) {
            this.sprite.setFlipX(dx < 0); // Flip left if target is to the left
        }

        this.isAttacking = true;
        this.lastAttackTime = now;

        // Play attack animation
        if (this.scene.anims.exists('emberclaw_attack')) {
            this.sprite.play('emberclaw_attack');
        }

        // Create projectile after short delay (animation windup)
        this.scene.time.delayedCall(400, () => {
            if (this.sprite && this.sprite.active && this.isAlive) {
                this.createProjectile(targetX, targetY);
            }
        });

        // Return to flying animation after attack
        this.scene.time.delayedCall(1000, () => {
            this.isAttacking = false;
            if (this.sprite && this.sprite.active && this.isAlive) {
                if (this.scene.anims.exists('emberclaw_flying')) {
                    this.sprite.play('emberclaw_flying', true);
                }
            }
        });
    }

    createProjectile(targetX, targetY) {
        const startX = this.sprite.x;
        const startY = this.sprite.y;

        // Calculate direction
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Create projectile sprite
        const projectile = this.scene.add.sprite(startX, startY, 'emberclaw-projectile');
        projectile.setScale(1.0);
        projectile.setDepth(3);
        projectile.setRotation(Math.atan2(dy, dx)); // Face direction of travel

        // Add physics
        this.scene.physics.add.existing(projectile);
        projectile.body.setSize(16, 16);

        // Projectile speed
        const speed = 300;
        projectile.body.setVelocity(dirX * speed, dirY * speed);

        // Store projectile data
        const projectileData = {
            sprite: projectile,
            damage: this.damage,
            ownerId: this.data.id,
            startTime: Date.now()
        };

        this.projectiles.push(projectileData);

        console.log(`🔥 Created flame projectile traveling at ${speed}px/s`);

        // Destroy projectile after 3 seconds
        this.scene.time.delayedCall(3000, () => {
            if (projectile && projectile.active) {
                projectile.destroy();
                this.projectiles = this.projectiles.filter(p => p.sprite !== projectile);
            }
        });
    }

    attack(targetX = null, targetY = null) {
        // Emberclaw uses shootProjectile instead
        if (targetX !== null && targetY !== null) {
            this.shootProjectile(targetX, targetY);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }

        // Show health bar when damaged
        if (this.healthBarBg) {
            this.healthBarBg.setVisible(true);
            this.healthBar.setVisible(true);
        }

        // Show damage number
        this.showDamageNumber(amount);

        // Play hurt animation
        if (this.sprite && this.sprite.anims && this.health > 0) {
            if (this.scene.anims.exists('emberclaw_hurt')) {
                this.sprite.play('emberclaw_hurt');

                // Return to flying after hurt
                this.scene.time.delayedCall(400, () => {
                    if (this.sprite && this.sprite.active && this.isAlive) {
                        if (this.scene.anims.exists('emberclaw_flying')) {
                            this.sprite.play('emberclaw_flying');
                        }
                    }
                });
            } else {
                // Flash red if no hurt animation
                this.sprite.setTint(0xff0000);
                this.scene.time.delayedCall(200, () => {
                    if (this.sprite) this.sprite.clearTint();
                });
            }
        }

        this.updateHealthBar();
    }

    showDamageNumber(amount) {
        if (!this.sprite) return;

        const damageText = this.scene.add.text(
            this.sprite.x,
            this.sprite.y - 50,
            `-${amount}`,
            {
                font: 'bold 16px monospace',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        damageText.setOrigin(0.5);
        damageText.setDepth(10);

        this.scene.tweens.add({
            targets: damageText,
            y: damageText.y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });
    }

    updateHealthBar() {
        if (!this.healthBar || !this.sprite) return;

        const healthPercent = Math.max(0, this.health / this.maxHealth);
        this.healthBar.width = 30 * healthPercent;

        // Position above sprite
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 40);
        this.healthBar.setPosition(this.sprite.x - 15 + (30 * healthPercent) / 2, this.sprite.y - 40);
    }

    die() {
        if (!this.isAlive) return;

        this.isAlive = false;
        console.log(`💀 Emberclaw ${this.data.id} died`);

        // Play death animation
        if (this.sprite && this.scene.anims.exists('emberclaw_death')) {
            this.sprite.play('emberclaw_death');
        }

        // Fade out and destroy
        if (this.sprite) {
            this.scene.tweens.add({
                targets: this.sprite,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    if (this.sprite) this.sprite.destroy();
                }
            });
        }

        // Destroy health bars
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.healthBar) this.healthBar.destroy();

        // Destroy all projectiles
        this.projectiles.forEach(proj => {
            if (proj.sprite && proj.sprite.active) {
                proj.sprite.destroy();
            }
        });
        this.projectiles = [];
    }

    update() {
        if (!this.isAlive || !this.sprite || !this.sprite.active) return;

        // Update health bar position
        this.updateHealthBar();

        // Update projectiles - check collisions with players
        this.updateProjectiles();
    }

    updateProjectiles() {
        // Check each projectile for player collisions
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            if (!proj.sprite || !proj.sprite.active) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check collision with local player
            if (this.scene.localPlayer && this.scene.localPlayer.isAlive) {
                const dist = Phaser.Math.Distance.Between(
                    proj.sprite.x,
                    proj.sprite.y,
                    this.scene.localPlayer.sprite.x,
                    this.scene.localPlayer.sprite.y
                );

                if (dist < 30) {
                    // Hit!
                    console.log(`🔥 Emberclaw projectile hit player for ${proj.damage} damage`);

                    // Send damage to server
                    if (networkManager && networkManager.connected) {
                        networkManager.socket.emit('player:hit', {
                            playerId: this.scene.localPlayer.data.id,
                            damage: proj.damage,
                            attackerId: proj.ownerId
                        });
                    }

                    // Apply damage locally
                    this.scene.localPlayer.takeDamage(proj.damage);

                    // Destroy projectile
                    proj.sprite.destroy();
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }

    moveToPosition(position) {
        if (!this.sprite || !this.sprite.body) return;

        const tileSize = GameConfig.GAME.TILE_SIZE;
        this.targetX = position.x * tileSize + tileSize / 2;
        this.targetY = position.y * tileSize + tileSize / 2;

        // Smooth movement
        const currentX = this.sprite.x;
        const currentY = this.sprite.y;

        const dx = this.targetX - currentX;
        const dy = this.targetY - currentY;

        // Move gradually
        const lerpSpeed = 0.15;
        this.sprite.x += dx * lerpSpeed;
        this.sprite.y += dy * lerpSpeed;

        // Face movement direction
        if (Math.abs(dx) > 1) {
            this.sprite.setFlipX(dx < 0);
        }

        // Play flying animation while moving
        if (!this.isAttacking && this.scene.anims.exists('emberclaw_flying')) {
            this.sprite.play('emberclaw_flying', true);
        }
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.healthBar) this.healthBar.destroy();

        // Destroy all projectiles
        this.projectiles.forEach(proj => {
            if (proj.sprite && proj.sprite.active) {
                proj.sprite.destroy();
            }
        });
        this.projectiles = [];
    }
}
