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
        this.followDistance = 80; // Stay within this distance of owner

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

        // Check lifespan (only for temporary minions)
        if (!this.isPermanent && Date.now() - this.spawnTime > this.lifespan) {
            this.despawn();
            return;
        }

        // Find owner (could be local player or other player)
        const owner = this.scene.localPlayer && this.scene.localPlayer.data.id === this.ownerId
            ? this.scene.localPlayer
            : this.scene.otherPlayers[this.ownerId];

        if (!owner || !owner.isAlive) {
            this.despawn();
            return;
        }

        // Find nearest enemy
        this.target = this.findNearestEnemy();

        if (this.target) {
            this.attackEnemy(this.target);
        } else {
            this.followOwner(owner);
        }
    }

    findNearestEnemy() {
        if (!this.scene.enemies || Object.keys(this.scene.enemies).length === 0) {
            return null;
        }

        let nearestEnemy = null;
        let nearestDistance = this.attackRange * 2; // Search in extended range

        Object.values(this.scene.enemies).forEach(enemy => {
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

    followOwner(owner) {
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            owner.sprite.x,
            owner.sprite.y
        );

        // Follow if too far from owner (with smaller threshold for stopping)
        if (distance > this.followDistance) {
            this.scene.physics.moveToObject(this.sprite, owner.sprite, this.moveSpeed);
            // Play walk animation
            if (this.sprite.anims.currentAnim?.key !== 'minion_walk') {
                this.sprite.play('minion_walk');
            }
        } else if (distance < 40) {
            // Too close - stop completely
            this.sprite.body.setVelocity(0, 0);
            // Play idle animation
            if (this.sprite.anims.currentAnim?.key !== 'minion_idle') {
                this.sprite.play('minion_idle');
            }
        } else {
            // In sweet spot - match owner's velocity for smooth following
            if (owner.sprite.body.velocity.x !== 0 || owner.sprite.body.velocity.y !== 0) {
                this.sprite.body.setVelocity(owner.sprite.body.velocity.x * 0.9, owner.sprite.body.velocity.y * 0.9);
                if (this.sprite.anims.currentAnim?.key !== 'minion_walk') {
                    this.sprite.play('minion_walk');
                }
            } else {
                this.sprite.body.setVelocity(0, 0);
                if (this.sprite.anims.currentAnim?.key !== 'minion_idle') {
                    this.sprite.play('minion_idle');
                }
            }
        }
    }

    attackEnemy(enemy) {
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
            // Play idle animation when attacking
            if (this.sprite.anims.currentAnim?.key !== 'minion_idle') {
                this.sprite.play('minion_idle');
            }

            // Attack if cooldown is ready
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.performAttack(enemy);
                this.lastAttackTime = now;
            }
        }
    }

    performAttack(enemy) {
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
        if (this.scene.networkManager && enemy.data) {
            this.scene.networkManager.attackEnemy(enemy.data.id, this.damage);
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
