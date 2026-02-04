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
        this.healThreshold = 0.6; // Use health potion when below 60% HP
        this.attackRange = 800; // Range to detect enemies (increased from 300)
        this.lootRange = 200; // Range to pick up items
        this.explorationRange = 1500; // Range to explore when no enemies

        // Update intervals
        this.lastUpdate = 0;
        this.updateInterval = 100; // Update AI every 100ms

        // Movement state
        this.isRetreating = false;
        this.retreatTimer = 0;
        this.retreatDuration = 3000; // Retreat for 3 seconds

        // Exploration state
        this.isExploring = false;
        this.explorationTarget = null;
        this.lastExplorationTime = 0;
        this.explorationInterval = 5000; // Find new exploration target every 5 seconds

        // Kiting state
        this.isKiting = false;
        this.kiteDistance = 200; // Maintain this distance from melee enemies
        this.lastKiteCheck = 0;

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

        // Check health and use potions if needed
        const healthPercent = this.player.health / this.player.maxHealth;
        if (healthPercent < this.healThreshold) {
            this.tryUseHealthPotion();
        }

        // Check if we need to retreat (low HP and no potions)
        if (healthPercent < this.retreatThreshold && !this.isRetreating) {
            this.startRetreat();
        }

        // Handle retreat behavior
        if (this.isRetreating) {
            this.updateRetreat(delta);
            return; // Skip combat while retreating
        }

        // Auto-loot nearby items and souls
        if (this.autoLootEnabled) {
            this.autoLoot();
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
            // No enemies nearby, explore to find more
            console.log('🤖 No enemies found nearby, exploring...');
            this.explore();
            this.currentTarget = null;
            return;
        }

        console.log('🤖 Target found! Engaging enemy...');
        this.currentTarget = target;
        this.isExploring = false; // Stop exploring when enemy found

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

        // Smart movement AI
        if (this.autoMoveEnabled) {
            // Check if we should kite (ranged characters staying away from enemies)
            if (this.shouldKite(target)) {
                this.kiteAway(target);
            }
            // Move toward enemy if too far
            else if (distance > attackRange * 0.7) {
                this.moveTowardTarget(enemyPos);
            }
            // Stop moving when in optimal range
            else {
                this.player.move(0, 0);
            }
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
            this.player.move(velocityX, velocityY);
        }
    }

    useAbilities(target) {
        const now = Date.now();

        // Get ability manager if available
        const abilityManager = this.scene.abilityManager;
        if (!abilityManager) return;

        // Calculate distance to target for range checks
        const distance = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            target.x, target.y
        );

        // List of ability keys with priority (E is usually primary, Q/W secondary, R is ultimate)
        const abilityKeys = ['E', 'Q', 'W', 'R'];

        // Get ability ranges (approximate)
        const abilityRanges = {
            'E': 400, // Primary ability - medium range
            'Q': 350, // Secondary ability
            'W': 300, // Tertiary ability
            'R': 500  // Ultimate - longer range
        };

        abilityKeys.forEach(key => {
            // Check if ability is off cooldown
            const lastUse = this.lastAbilityUse[key] || 0;
            const cooldown = this.getAbilityCooldown(key);
            const abilityRange = abilityRanges[key] || 400;

            // Only use ability if off cooldown AND enemy is in range
            if (now - lastUse >= cooldown && distance < abilityRange) {
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

    explore() {
        const now = Date.now();

        // Generate new exploration target periodically
        if (!this.explorationTarget || now - this.lastExplorationTime > this.explorationInterval) {
            // Pick a random direction and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 300 + Math.random() * 400; // 300-700 pixels away

            this.explorationTarget = {
                x: this.player.sprite.x + Math.cos(angle) * distance,
                y: this.player.sprite.y + Math.sin(angle) * distance
            };

            this.lastExplorationTime = now;
            console.log('🤖 New exploration target generated');
        }

        // Move toward exploration target
        if (this.explorationTarget) {
            const playerPos = {
                x: this.player.sprite.x,
                y: this.player.sprite.y
            };

            const distance = Phaser.Math.Distance.Between(
                playerPos.x, playerPos.y,
                this.explorationTarget.x, this.explorationTarget.y
            );

            // If close to target, find a new one
            if (distance < 50) {
                this.explorationTarget = null;
                return;
            }

            // Move toward target
            this.moveTowardTarget(this.explorationTarget);
        }
    }

    tryUseHealthPotion() {
        // Try to use health potion (simulate pressing key)
        // The game typically uses number keys (1, 2, 3, 4) for consumables
        // Check if player has health potions and use them

        // Note: This depends on how your game handles potions
        // You may need to adjust based on your inventory system
        console.log('🤖 Attempting to use health potion...');

        // For now, just log - you'll need to implement potion usage based on your game's system
        // Example: this.scene.events.emit('use:potion', { slot: 1 });
    }

    shouldKite(target) {
        // Ranged characters should kite melee enemies
        const isRangedCharacter = ['ORION', 'LUNARE', 'BASTION'].includes(this.player.class);

        if (!isRangedCharacter) return false;

        const distance = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            target.x, target.y
        );

        // Too close! Need to kite
        return distance < this.kiteDistance;
    }

    kiteAway(target) {
        const playerPos = {
            x: this.player.sprite.x,
            y: this.player.sprite.y
        };

        // Move AWAY from target while still in attack range
        const dx = playerPos.x - target.x;
        const dy = playerPos.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const velocityX = dx / distance;
            const velocityY = dy / distance;
            console.log('🤖 Kiting away from enemy');
            this.player.move(velocityX, velocityY);
        }
    }

    destroy() {
        this.enabled = false;
        this.currentTarget = null;
        this.explorationTarget = null;

        // Clean up UI
        if (this.idleText) {
            this.idleText.destroy();
            this.idleText = null;
        }
    }
}
