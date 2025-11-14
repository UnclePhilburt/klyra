// Minion Entity - Malachar's Summoned Minion
class Minion {
    constructor(scene, x, y, ownerId, isPermanent = false, minionId = null) {
        this.scene = scene;
        this.ownerId = ownerId; // The player who summoned this minion
        this.minionId = minionId; // Unique ID for this minion
        this.isPermanent = isPermanent; // Permanent minions don't despawn
        this.health = 50;
        this.maxHealth = 50;
        this.damage = 15;
        this.isAlive = true;
        this.moveSpeed = 240; // Increased from 150 for faster response
        this.attackRange = 100;
        this.attackCooldown = 1000; // 1 second between attacks
        this.lastAttackTime = 0;
        this.lifespan = 30000; // 30 seconds (only for temporary minions)
        this.spawnTime = Date.now();

        // Position update tracking for server
        this.lastPositionUpdate = 0;
        this.positionUpdateInterval = 500; // Send position to server every 500ms

        // UI update throttling (don't update every frame!)
        this.uiUpdateCounter = 0;
        this.uiUpdateInterval = 5; // Update UI every 5 frames (~83ms at 60fps)

        // AI state
        this.target = null;
        this.followDistance = 350; // Maximum distance from owner before returning (increased)
        this.roamRadius = 250; // How far to wander when exploring (increased)
        this.seekRadius = 350; // How far to look for enemies (increased)

        // Wandering behavior
        this.wanderTarget = null;
        this.wanderCooldown = 0;
        this.wanderDelay = 2000; // Change wander direction every 2 seconds

        // State machine
        this.state = 'idle'; // idle, wandering, seeking, attacking, following

        // Aggro management
        this.aggroedEnemies = new Set(); // Track enemies currently targeting this minion
        this.maxAggro = Phaser.Math.Between(3, 5); // Random 3-5 enemy limit per minion

        // Formation positioning
        this.formationOffset = { x: 0, y: 0 }; // Offset for surrounding target
        this.formationAngle = Math.random() * Math.PI * 2; // Random starting angle

        this.createSprite(x, y);
        this.setupAI();
    }

    createSprite(x, y) {
        const tileSize = GameConfig.GAME.TILE_SIZE;

        // Create minion sprite - purple/dark creature
        this.sprite = this.scene.add.sprite(x, y, 'malacharminion', 39);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(1.0); // 64x64 sprite at 1:1 scale
        this.sprite.setDepth(2); // Above walkways (depth 1) but with walls (depth 2)
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(32, 32);

        // Play idle animation
        this.sprite.play('minion_idle');

        // Health bar only (no glow, no label - cleanest look)
        this.healthBarBg = this.scene.add.rectangle(x, y - 18, 24, 3, 0x000000);
        this.healthBarBg.setDepth(2); // Same depth as sprite
        this.healthBar = this.scene.add.rectangle(x, y - 18, 24, 3, 0x8B008B);
        this.healthBar.setDepth(2); // Same depth as sprite

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
        // Check if we're at aggro limit
        if (this.aggroedEnemies.size >= this.maxAggro) {
            // Already tanking max enemies, only target ones we're already fighting
            const alreadyTargeted = Array.from(this.aggroedEnemies)
                .map(id => this.scene.enemies[id] || this.scene.wolves[id])
                .filter(e => e && e.isAlive);

            if (alreadyTargeted.length > 0) {
                return alreadyTargeted[0]; // Continue fighting current targets
            } else {
                this.aggroedEnemies.clear(); // All current targets dead, reset
            }
        }

        // Combine both enemies and wolves
        const allEnemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        if (allEnemies.length === 0) {
            return null;
        }

        let nearestEnemy = null;
        let nearestDistSquared = searchRadius * searchRadius; // Use squared distance (faster)

        // PERFORMANCE: Use squared distance to avoid expensive sqrt
        for (const enemy of allEnemies) {
            if (!enemy.isAlive) continue;

            const dx = this.sprite.x - enemy.sprite.x;
            const dy = this.sprite.y - enemy.sprite.y;
            const distSquared = dx * dx + dy * dy;

            if (distSquared < nearestDistSquared) {
                nearestDistSquared = distSquared;
                nearestEnemy = enemy;
            }
        }

        // Add new target to aggro list
        if (nearestEnemy && nearestEnemy.data && nearestEnemy.data.id) {
            this.aggroedEnemies.add(nearestEnemy.data.id);
        }

        return nearestEnemy;
    }

    wanderAround(owner) {
        const now = Date.now();

        // Pick a new wander target periodically
        if (!this.wanderTarget || now - this.wanderCooldown > this.wanderDelay) {
            this.wanderCooldown = now;

            // Try to find a wander position that's not near other minions
            let attempts = 0;
            let validPosition = false;
            let targetPosition = null;

            while (!validPosition && attempts < 10) {
                // Random point near owner
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.roamRadius;

                targetPosition = {
                    x: owner.sprite.x + Math.cos(angle) * distance,
                    y: owner.sprite.y + Math.sin(angle) * distance
                };

                // Check if too close to other minions (anti-clustering)
                validPosition = this.isPositionClearOfMinions(targetPosition, 80); // 80px minimum distance
                attempts++;
            }

            // Use the position (even if not perfect after 10 tries)
            this.wanderTarget = targetPosition;
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
            // Check for nearby minions and steer away slightly
            this.avoidNearbyMinions();

            // Move at 85% speed when wandering (faster to keep up)
            const wanderSpeed = this.moveSpeed * 0.85;
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

    isPositionClearOfMinions(position, minDistance) {
        const allMinions = this.getAllMinionsInScene();
        const minDistSquared = minDistance * minDistance; // Squared distance (faster than sqrt)

        for (const minion of allMinions) {
            if (minion === this || !minion.sprite) continue;

            // Use squared distance (avoid expensive sqrt)
            const dx = position.x - minion.sprite.x;
            const dy = position.y - minion.sprite.y;
            const distSquared = dx * dx + dy * dy;

            if (distSquared < minDistSquared) {
                return false; // Too close to another minion
            }
        }

        return true; // Position is clear
    }

    avoidNearbyMinions() {
        const allMinions = this.getAllMinionsInScene();
        const personalSpace = 60; // Minimum distance to maintain
        const personalSpaceSquared = personalSpace * personalSpace;

        for (const minion of allMinions) {
            if (minion === this || !minion.sprite || !minion.sprite.body) continue;

            // Use squared distance (avoid expensive sqrt)
            const dx = this.sprite.x - minion.sprite.x;
            const dy = this.sprite.y - minion.sprite.y;
            const distSquared = dx * dx + dy * dy;

            // If too close, apply repulsion force
            if (distSquared < personalSpaceSquared && distSquared > 0) {
                // Normalize direction without sqrt
                const distance = Math.sqrt(distSquared);
                const angle = Math.atan2(dy, dx);

                // Push away from nearby minion
                const repulsionStrength = (personalSpace - distance) / personalSpace;
                const pushForce = 30 * repulsionStrength;

                this.sprite.body.velocity.x += Math.cos(angle) * pushForce;
                this.sprite.body.velocity.y += Math.sin(angle) * pushForce;
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

        // Calculate formation position for surrounding target
        const formationPosition = this.calculateFormationPosition(enemy);

        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            formationPosition.x,
            formationPosition.y
        );

        // Move towards formation position if not in position
        if (distance > 20) {
            this.scene.physics.moveToObject(this.sprite, formationPosition, this.moveSpeed);
            // Play walk animation
            if (this.sprite.anims.currentAnim?.key !== 'minion_walk') {
                this.sprite.play('minion_walk');
            }
        } else {
            this.sprite.body.setVelocity(0, 0);

            // Attack if cooldown is ready and in range of enemy
            const distToEnemy = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );

            const now = Date.now();
            if (distToEnemy <= this.attackRange && now - this.lastAttackTime > this.attackCooldown) {
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

    calculateFormationPosition(target) {
        // Find all minions in scene attacking the same target
        const allMinions = this.getAllMinionsInScene();
        const minionsAttackingTarget = allMinions.filter(m =>
            m.isAlive && m.target === target && m !== this
        );

        // If alone, just attack from current angle
        if (minionsAttackingTarget.length === 0) {
            const angle = Math.atan2(
                this.sprite.y - target.sprite.y,
                this.sprite.x - target.sprite.x
            );
            return {
                x: target.sprite.x + Math.cos(angle) * this.attackRange * 0.8,
                y: target.sprite.y + Math.sin(angle) * this.attackRange * 0.8
            };
        }

        // Multiple minions: surround formation
        const totalMinions = minionsAttackingTarget.length + 1; // +1 for this minion
        const myIndex = this.getMinionIndex(allMinions);
        const angleStep = (Math.PI * 2) / totalMinions;
        const myAngle = angleStep * myIndex;

        // Position around target in a circle
        const formationRadius = this.attackRange * 0.8;
        return {
            x: target.sprite.x + Math.cos(myAngle) * formationRadius,
            y: target.sprite.y + Math.sin(myAngle) * formationRadius
        };
    }

    getAllMinionsInScene() {
        // Get all minions from the scene (minions is an object, not array)
        if (!this.scene.minions) return [this];
        return Object.values(this.scene.minions).filter(m => m && m.isAlive);
    }

    getMinionIndex(allMinions) {
        // Get stable index based on minionId
        const sortedMinions = allMinions.sort((a, b) => {
            if (a.minionId < b.minionId) return -1;
            if (a.minionId > b.minionId) return 1;
            return 0;
        });
        return sortedMinions.indexOf(this);
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
        // Send minion ID and position so server knows aggro should go to minion, not owner
        if (enemy.data && enemy.data.id) {
            const minionPosition = {
                x: Math.floor(this.sprite.x / 32), // Convert to grid coordinates
                y: Math.floor(this.sprite.y / 32)
            };
            networkManager.hitEnemy(enemy.data.id, this.damage, this.minionId, minionPosition);
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

        // Notify server if this was a permanent minion
        if (this.isPermanent && this.minionId) {
            networkManager.trackPermanentMinion(this.minionId, 'remove');
        }

        // Death animation - fade out
        this.scene.tweens.add({
            targets: [this.sprite, this.healthBar, this.healthBarBg],
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
            targets: [this.sprite, this.healthBar, this.healthBarBg],
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => this.destroy()
        });
    }

    update() {
        if (!this.isAlive) return;

        // Send position updates to server so enemies can target this minion
        const now = Date.now();
        if (now - this.lastPositionUpdate > this.positionUpdateInterval) {
            this.sendPositionUpdate();
            this.lastPositionUpdate = now;
        }

        // Update sprite facing direction based on velocity (cheap, keep every frame)
        if (this.sprite && this.sprite.body) {
            if (this.sprite.body.velocity.x < -10) {
                // Moving left - flip sprite
                this.sprite.setFlipX(true);
            } else if (this.sprite.body.velocity.x > 10) {
                // Moving right - don't flip
                this.sprite.setFlipX(false);
            }
        }

        // PERFORMANCE: Only update UI positions every 5 frames (~83ms at 60fps)
        // This saves massive performance with many minions
        this.uiUpdateCounter++;
        if (this.uiUpdateCounter >= this.uiUpdateInterval) {
            this.uiUpdateCounter = 0;

            if (this.sprite && this.sprite.active) {
                this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 18);
                this.healthBar.setPosition(this.sprite.x - (24 - this.healthBar.width) / 2, this.sprite.y - 18);
            }
        }
    }

    sendPositionUpdate() {
        // Send minion position to server so enemies can target it
        const gridPosition = {
            x: Math.floor(this.sprite.x / 32),
            y: Math.floor(this.sprite.y / 32)
        };

        networkManager.updateMinionPosition(this.minionId, gridPosition, this.isPermanent);
    }

    destroy() {
        if (this.aiTimer) {
            this.aiTimer.remove();
        }

        if (this.sprite) this.sprite.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
    }
}
