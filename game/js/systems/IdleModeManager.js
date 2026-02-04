// Idle Mode Manager - Handles auto-combat for AFK/idle gameplay
class IdleModeManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.enabled = false;

        // Auto-combat settings
        this.autoMoveEnabled = true;
        this.autoAbilitiesEnabled = true;
        this.autoLootEnabled = true;

        // AI state
        this.currentTarget = null;
        this.lastAbilityUse = {};
        this.retreatThreshold = 0.3; // Retreat when below 30% HP
        this.attackRange = 300; // Range to detect enemies
        this.lootRange = 150; // Range to pick up items

        // Update intervals
        this.lastUpdate = 0;
        this.updateInterval = 100; // Update AI every 100ms

        // Movement state
        this.isRetreating = false;
        this.retreatTimer = 0;
        this.retreatDuration = 3000; // Retreat for 3 seconds

        // UI Indicator
        this.createIdleIndicator();

        console.log('✅ IdleModeManager initialized');
    }

    createIdleIndicator() {
        // Create a simple text indicator at top of screen
        this.idleText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            30,
            'IDLE MODE: OFF',
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#888888',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10000);
        this.idleText.setVisible(false);
    }

    toggle() {
        this.enabled = !this.enabled;
        console.log(`🤖 Idle Mode: ${this.enabled ? 'ENABLED' : 'DISABLED'}`);

        // Update UI indicator
        if (this.idleText) {
            this.idleText.setText(`IDLE MODE: ${this.enabled ? 'ON' : 'OFF'}`);
            this.idleText.setStyle({
                color: this.enabled ? '#00ff00' : '#888888'
            });
            this.idleText.setVisible(true);

            // Hide the text after 3 seconds if disabled
            if (!this.enabled) {
                this.scene.time.delayedCall(3000, () => {
                    if (this.idleText && !this.enabled) {
                        this.idleText.setVisible(false);
                    }
                });
            }
        }

        return this.enabled;
    }

    setEnabled(value) {
        this.enabled = value;
        console.log(`🤖 Idle Mode: ${this.enabled ? 'ENABLED' : 'DISABLED'}`);

        // Update UI
        if (this.idleText) {
            this.idleText.setText(`IDLE MODE: ${this.enabled ? 'ON' : 'OFF'}`);
            this.idleText.setStyle({
                color: this.enabled ? '#00ff00' : '#888888'
            });
            this.idleText.setVisible(this.enabled);
        }
    }

    update(time, delta) {
        if (!this.enabled) return;
        if (!this.player.isAlive) return;

        // Throttle updates
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;

        console.log('🤖 Idle Mode: Running update...');

        // Auto-loot nearby items and souls
        if (this.autoLootEnabled) {
            this.autoLoot();
        }

        // Check if we need to retreat
        const healthPercent = this.player.health / this.player.maxHealth;
        if (healthPercent < this.retreatThreshold && !this.isRetreating) {
            this.startRetreat();
        }

        // Handle retreat behavior
        if (this.isRetreating) {
            this.updateRetreat(delta);
            return; // Skip combat while retreating
        }

        // Auto-combat logic
        if (this.autoMoveEnabled || this.autoAbilitiesEnabled) {
            this.autoCombat();
        }
    }

    autoLoot() {
        if (!this.scene.experienceOrbs || !this.scene.items) return;

        const playerPos = {
            x: this.player.sprite.x,
            y: this.player.sprite.y
        };

        // Auto-collect experience orbs
        Object.values(this.scene.experienceOrbs).forEach(orb => {
            if (!orb || !orb.sprite) return;

            const distance = Phaser.Math.Distance.Between(
                playerPos.x, playerPos.y,
                orb.sprite.x, orb.sprite.y
            );

            // Trigger collection if in range
            if (distance < this.lootRange) {
                // The game already has auto-collection when touching orbs
                // Just need to move toward them
            }
        });

        // Auto-collect items
        Object.values(this.scene.items).forEach(item => {
            if (!item || !item.sprite) return;

            const distance = Phaser.Math.Distance.Between(
                playerPos.x, playerPos.y,
                item.sprite.x, item.sprite.y
            );

            if (distance < this.lootRange) {
                // Items auto-collect on overlap in the game
            }
        });
    }

    autoCombat() {
        // Find nearest enemy
        const target = this.findNearestEnemy();

        if (!target) {
            // No enemies nearby, stop moving
            console.log('🤖 No enemies found nearby');
            if (this.autoMoveEnabled) {
                this.player.move(0, 0);
            }
            this.currentTarget = null;
            return;
        }

        console.log('🤖 Target found! Moving toward enemy...');
        this.currentTarget = target;

        const playerPos = {
            x: this.player.sprite.x,
            y: this.player.sprite.y
        };

        const enemyPos = {
            x: target.x,
            y: target.y
        };

        const distance = Phaser.Math.Distance.Between(
            playerPos.x, playerPos.y,
            enemyPos.x, enemyPos.y
        );

        // Get character's auto-attack range
        const attackRange = this.player.autoAttackConfig ?
            (this.player.autoAttackConfig.range * GameConfig.GAME.TILE_SIZE) :
            (10 * GameConfig.GAME.TILE_SIZE); // Default 10 tiles

        // Move toward enemy if too far
        if (this.autoMoveEnabled && distance > attackRange * 0.8) {
            this.moveTowardTarget(enemyPos);
        } else if (this.autoMoveEnabled) {
            // Stop moving when in range
            this.player.move(0, 0);
        }

        // Use abilities if in range
        if (this.autoAbilitiesEnabled && distance < attackRange * 1.2) {
            this.useAbilities(target);
        }
    }

    findNearestEnemy() {
        const playerPos = {
            x: this.player.sprite.x,
            y: this.player.sprite.y
        };

        let nearestEnemy = null;
        let nearestDistance = this.attackRange;

        // Check all enemy types
        const enemyCollections = [
            this.scene.enemies,
            this.scene.swordDemons,
            this.scene.minotaurs,
            this.scene.mushrooms,
            this.scene.emberclaws
        ];

        enemyCollections.forEach(collection => {
            if (!collection) return;

            Object.values(collection).forEach(enemy => {
                if (!enemy || !enemy.sprite || enemy.health <= 0) return;

                const distance = Phaser.Math.Distance.Between(
                    playerPos.x, playerPos.y,
                    enemy.sprite.x, enemy.sprite.y
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy.sprite;
                }
            });
        });

        return nearestEnemy;
    }

    moveTowardTarget(targetPos) {
        const playerPos = {
            x: this.player.sprite.x,
            y: this.player.sprite.y
        };

        // Calculate direction to target
        const dx = targetPos.x - playerPos.x;
        const dy = targetPos.y - playerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Normalize and move
            const velocityX = dx / distance;
            const velocityY = dy / distance;
            console.log(`🤖 Moving: vX=${velocityX.toFixed(2)}, vY=${velocityY.toFixed(2)}, dist=${distance.toFixed(0)}`);
            this.player.move(velocityX, velocityY);
        }
    }

    useAbilities(target) {
        const now = Date.now();

        // Get ability manager if available
        const abilityManager = this.scene.abilityManager;
        if (!abilityManager) return;

        // List of ability keys to try (prioritize based on cooldowns)
        const abilityKeys = ['E', 'Q', 'W', 'R'];

        abilityKeys.forEach(key => {
            // Check if ability is off cooldown
            const lastUse = this.lastAbilityUse[key] || 0;
            const cooldown = this.getAbilityCooldown(key);

            if (now - lastUse >= cooldown) {
                // Try to use the ability
                this.tryUseAbility(key, target);
                this.lastAbilityUse[key] = now;
            }
        });
    }

    tryUseAbility(key, target) {
        // Simulate keypress for ability
        const abilityManager = this.scene.abilityManager;
        if (!abilityManager) return;

        // Calculate direction to target
        const dx = target.x - this.player.sprite.x;
        const dy = target.y - this.player.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Update player's last movement direction for abilities that use it
            this.player.lastMovementDirection = {
                x: dx / distance,
                y: dy / distance
            };
        }

        // Trigger the ability through the ability manager
        try {
            if (key === 'E' && abilityManager.useAbilityE) {
                abilityManager.useAbilityE();
            } else if (key === 'Q' && abilityManager.useAbilityQ) {
                abilityManager.useAbilityQ();
            } else if (key === 'W' && abilityManager.useAbilityW) {
                abilityManager.useAbilityW();
            } else if (key === 'R' && abilityManager.useAbilityR) {
                abilityManager.useAbilityR();
            }
        } catch (error) {
            // Silently fail if ability can't be used
        }
    }

    getAbilityCooldown(key) {
        // Default cooldowns (in milliseconds)
        const defaultCooldowns = {
            'E': 5000,  // 5 seconds
            'Q': 8000,  // 8 seconds
            'W': 10000, // 10 seconds
            'R': 15000  // 15 seconds
        };

        return defaultCooldowns[key] || 5000;
    }

    startRetreat() {
        this.isRetreating = true;
        this.retreatTimer = 0;
        console.log('🏃 LOW HP! Retreating to safety...');
    }

    updateRetreat(delta) {
        this.retreatTimer += delta;

        // Retreat away from enemies
        const nearestEnemy = this.findNearestEnemy();

        if (nearestEnemy) {
            const playerPos = {
                x: this.player.sprite.x,
                y: this.player.sprite.y
            };

            // Move AWAY from enemy
            const dx = playerPos.x - nearestEnemy.x;
            const dy = playerPos.y - nearestEnemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const velocityX = dx / distance;
                const velocityY = dy / distance;
                this.player.move(velocityX, velocityY);
            }
        }

        // Stop retreating after duration or if HP is recovered
        const healthPercent = this.player.health / this.player.maxHealth;
        if (this.retreatTimer >= this.retreatDuration || healthPercent > 0.6) {
            this.isRetreating = false;
            console.log('✅ Retreat finished, resuming combat');
        }
    }

    destroy() {
        this.enabled = false;
        this.currentTarget = null;

        // Clean up UI
        if (this.idleText) {
            this.idleText.destroy();
            this.idleText = null;
        }
    }
}
