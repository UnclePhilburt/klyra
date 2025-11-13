// Minion Entity - Malachar's Summoned Minion
class Minion {
    constructor(scene, x, y, ownerId, isPermanent = false) {
        this.scene = scene;
        this.ownerId = ownerId; // The player who summoned this minion
        this.isPermanent = isPermanent; // Permanent minions don't despawn
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 5;
        this.isAlive = true;
        this.moveSpeed = 150;
        this.attackRange = 100;
        this.attackCooldown = 1000; // 1 second between attacks
        this.lastAttackTime = 0;
        this.lifespan = 30000; // 30 seconds (only for temporary minions)
        this.spawnTime = Date.now();

        // AI state
        this.target = null;
        this.followDistance = 200; // Maximum distance from owner before returning
        this.roamRadius = 150; // How far to wander when exploring
        this.seekRadius = 250; // How far to look for enemies

        // Wandering behavior
        this.wanderTarget = null;
        this.wanderCooldown = 0;
        this.wanderDelay = 2000; // Change wander direction every 2 seconds

        // State machine
        this.state = 'idle'; // idle, wandering, seeking, attacking, following

        this.createSprite(x, y);
        this.setupAI();
    }

    createSprite(x, y) {
        const tileSize = GameConfig.GAME.TILE_SIZE;

        // Create minion sprite - purple/dark creature
        this.sprite = this.scene.add.sprite(x, y, 'malacharminion', 39);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(1.0); // 64x64 sprite at 1:1 scale
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(32, 32);

        // Play idle animation
        this.sprite.play('minion_idle');

        // Add dark aura glow (subtle effect)
        const glowAlpha = this.isPermanent ? 0.15 : 0.1;
        const glowSize = this.isPermanent ? 12 : 10;
        this.glow = this.scene.add.circle(x, y, glowSize, 0x8B008B, glowAlpha);

        // Minion label
        const labelText = this.isPermanent ? 'COMPANION' : 'MINION';
        this.label = this.scene.add.text(x, y - 25, labelText, {
            font: '7px monospace',
            fill: '#8B008B',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);

        // Health bar
        this.healthBarBg = this.scene.add.rectangle(x, y - 18, 24, 3, 0x000000);
        this.healthBar = this.scene.add.rectangle(x, y - 18, 24, 3, 0x8B008B);

        this.updateHealthBar();
    }

    setupAI() {
        // AI update every 100ms
        this.aiTimer = this.scene.time.addEvent({
            delay: 100,
            callback: this.updateAI,
            callbackScope: this,
            loop: true
        });
    }

    updateAI() {
        if (!this.isAlive) return;

        // DIAGNOSTIC: Track AI update time
        const aiStart = performance.now();

        // Check lifespan (only for temporary minions)
        if (!this.isPermanent && Date.now() - this.spawnTime > this.lifespan) {
            this.despawn();
            return;
        }

        // Find owner (could be local player or other player)
        const owner = this.scene.localPlayer && this.scene.localPlayer.data.id === this.ownerId
            ? this.scene.localPlayer
            : this.scene.otherPlayers[this.ownerId];

        // Safety check: Don't despawn permanent minions if owner not found yet
        if (!owner) {
            if (!this.isPermanent) {
                console.log(`🔮 Minion despawning: owner not found (permanent: ${this.isPermanent})`);
                this.despawn();
            }
            return;
        }

        // Only despawn if owner is explicitly dead
        if (owner && owner.isAlive === false) {
            console.log(`🔮 Minion despawning: owner is dead (owner.isAlive: ${owner.isAlive}, owner.health: ${owner.health})`);
            this.despawn();
            return;
        }

        // Verify owner is alive
        if (!owner.isAlive) {
            console.warn(`⚠️ Minion owner has isAlive: ${owner.isAlive} (should be true). Owner data:`, owner.data);
        }

        const distanceToOwner = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            owner.sprite.x,
            owner.sprite.y
        );

        // Priority 1: Return to owner if too far away
        if (distanceToOwner > this.followDistance) {
            this.state = 'following';
            this.returnToOwner(owner);
            return;
        }

        // Priority 2: Find and attack enemies
        this.target = this.findNearestEnemy(this.seekRadius);

        if (this.target) {
            this.state = 'attacking';
            this.attackEnemy(this.target);
        } else {
            // Priority 3: Explore and wander
            this.wanderAround(owner);
        }

        // DIAGNOSTIC: Log if AI update is slow
        const aiTime = performance.now() - aiStart;
        if (aiTime > 5) {
            console.warn(`⚠️ SLOW MINION AI: ${aiTime.toFixed(1)}ms (state: ${this.state}, permanent: ${this.isPermanent})`);
        }
    }

    findNearestEnemy(searchRadius) {
        // Combine both enemies and wolves
        const allEnemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        if (allEnemies.length === 0) {
            return null;
        }

        let nearestEnemy = null;
        let nearestDistance = searchRadius;

        allEnemies.forEach(enemy => {
            if (!enemy.isAlive) return;

            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        });

        return nearestEnemy;
    }

    wanderAround(owner) {
        const now = Date.now();

        // Pick a new wander target periodically
        if (!this.wanderTarget || now - this.wanderCooldown > this.wanderDelay) {
            this.wanderCooldown = now;

            // Random point near owner
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.roamRadius;

            this.wanderTarget = {
                x: owner.sprite.x + Math.cos(angle) * distance,
                y: owner.sprite.y + Math.sin(angle) * distance
            };

            this.state = 'wandering';
        }

        // Move towards wander target
        const distToTarget = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            this.wanderTarget.x,
            this.wanderTarget.y
        );

        if (distToTarget > 20) {
            // Move at 70% speed when wandering (more casual)
            const wanderSpeed = this.moveSpeed * 0.7;
            this.scene.physics.moveToObject(this.sprite, this.wanderTarget, wanderSpeed);

            // Play walk animation
            if (this.sprite.anims.currentAnim?.key !== 'minion_walk') {
                this.sprite.play('minion_walk');
            }
        } else {
            // Reached target, idle for a moment
            this.sprite.body.setVelocity(0, 0);
            this.wanderTarget = null; // Will pick new target on next cycle

            // Play idle animation
            if (this.sprite.anims.currentAnim?.key !== 'minion_idle') {
                this.sprite.play('minion_idle');
            }
        }
    }

    returnToOwner(owner) {
        // Rush back to owner at full speed
        this.scene.physics.moveToObject(this.sprite, owner.sprite, this.moveSpeed);

        // Play walk animation
        if (this.sprite.anims.currentAnim?.key !== 'minion_walk') {
            this.sprite.play('minion_walk');
        }
    }

    attackEnemy(enemy) {
        // Check if enemy is still alive
        if (!enemy.isAlive) {
            this.target = null;
            return;
        }

        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y
        );

        // Move towards enemy if out of range
        if (distance > this.attackRange) {
            this.scene.physics.moveToObject(this.sprite, enemy.sprite, this.moveSpeed);
            // Play walk animation
            if (this.sprite.anims.currentAnim?.key !== 'minion_walk') {
                this.sprite.play('minion_walk');
            }
        } else {
            this.sprite.body.setVelocity(0, 0);

            // Attack if cooldown is ready
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.performAttack(enemy);
                this.lastAttackTime = now;
            } else {
                // Only play idle if not currently attacking
                const currentAnim = this.sprite.anims.currentAnim?.key;
                if (currentAnim !== 'minion_attack' && currentAnim !== 'minion_idle') {
                    this.sprite.play('minion_idle');
                }
            }
        }
    }

    performAttack(enemy) {
        // Play attack animation
        this.sprite.play('minion_attack');

        // When attack animation completes, return to idle
        this.sprite.once('animationcomplete', () => {
            if (this.isAlive && this.sprite && this.sprite.active) {
                this.sprite.play('minion_idle');
            }
        });

        // Visual attack effect
        const attackLine = this.scene.add.line(
            0, 0,
            this.sprite.x, this.sprite.y,
            enemy.sprite.x, enemy.sprite.y,
            0x8B008B, 0.5
        );
        attackLine.setLineWidth(2);

        this.scene.tweens.add({
            targets: attackLine,
            alpha: 0,
            duration: 200,
            onComplete: () => attackLine.destroy()
        });

        // Deal damage to enemy (emit to server)
        if (enemy.data && enemy.data.id) {
            networkManager.hitEnemy(enemy.data.id, this.damage);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
            return;
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
            font: 'bold 12px monospace',
            fill: '#ff0000',
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

    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.width = 24 * healthPercent;
    }

    die() {
        this.isAlive = false;

        // Debug log death
        console.log(`💀 Minion died (permanent: ${this.isPermanent}, health: ${this.health})`);

        // Death animation - fade out
        this.scene.tweens.add({
            targets: [this.sprite, this.glow, this.label, this.healthBar, this.healthBarBg],
            alpha: 0,
            scale: 0.5,
            duration: 300,
            ease: 'Power2',
            onComplete: () => this.destroy()
        });
    }

    despawn() {
        // Peaceful despawn (lifespan ended)
        this.isAlive = false;

        // Debug log despawn reason
        console.log(`🔮 Minion despawning (permanent: ${this.isPermanent})`);

        this.scene.tweens.add({
            targets: [this.sprite, this.glow, this.label, this.healthBar, this.healthBarBg],
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => this.destroy()
        });
    }

    update() {
        if (!this.isAlive) return;

        // Update sprite facing direction based on velocity
        if (this.sprite && this.sprite.body) {
            if (this.sprite.body.velocity.x < -10) {
                // Moving left - flip sprite
                this.sprite.setFlipX(true);
            } else if (this.sprite.body.velocity.x > 10) {
                // Moving right - don't flip
                this.sprite.setFlipX(false);
            }
        }

        // Update positions of UI elements
        if (this.sprite && this.sprite.active) {
            this.glow.setPosition(this.sprite.x, this.sprite.y);
            this.label.setPosition(this.sprite.x, this.sprite.y - 25);
            this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 18);
            this.healthBar.setPosition(this.sprite.x - (24 - this.healthBar.width) / 2, this.sprite.y - 18);
        }
    }

    destroy() {
        if (this.aiTimer) {
            this.aiTimer.remove();
        }

        if (this.sprite) this.sprite.destroy();
        if (this.glow) this.glow.destroy();
        if (this.label) this.label.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
    }
}
