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
        this.followDistance = 450; // Maximum distance from owner before returning
        this.seekRadius = 400; // How far to look for enemies

        // State machine
        this.state = 'idle'; // idle, patrolling, seeking, attacking, following

        // Aggro management
        this.aggroedEnemies = new Set(); // Track enemies currently targeting this minion
        this.maxAggro = Phaser.Math.Between(3, 5); // Random 3-5 enemy limit per minion

        // INTELLIGENT FORMATION SYSTEM
        this.role = null; // Assigned in setFormationRole()
        this.formationIndex = null; // Position in formation
        this.formationPosition = { x: 0, y: 0 }; // Target position in formation
        this.combatMode = false; // Changes behavior (patrol vs combat)

        // Role-specific behaviors
        this.patrolDistance = 0; // How far from player to patrol
        this.vigilanceRadius = 0; // How far to watch for threats
        this.protectionPriority = 0; // Higher = stays closer to player in combat

        // TACTICAL ARMY AI: Health-based behavior
        this.baseRole = null; // Original assigned role
        this.currentRole = null; // May change based on health
        this.isInjured = false; // Below 50% health
        this.isCritical = false; // Below 25% health
        this.retreating = false; // Currently falling back
        this.assistTarget = null; // Ally minion we're helping

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

    // INTELLIGENT FORMATION: Assign role to this minion
    setFormationRole(index, totalMinions) {
        this.formationIndex = index;

        // Assign roles based on position in minion array
        const roles = ['scout', 'flank_left', 'flank_right', 'rear_guard', 'bodyguard'];

        if (totalMinions === 1) {
            this.baseRole = 'bodyguard'; // Solo minion stays close
        } else if (totalMinions <= 3) {
            // Small squad: 1 scout, rest bodyguards
            this.baseRole = index === 0 ? 'scout' : 'bodyguard';
        } else if (totalMinions <= 5) {
            // Medium squad: scout, 2 flanks, bodyguards
            const roleMap = ['scout', 'flank_left', 'flank_right', 'bodyguard', 'bodyguard'];
            this.baseRole = roleMap[index] || 'bodyguard';
        } else {
            // Large squad: full formation
            const roleMap = ['scout', 'scout', 'flank_left', 'flank_right', 'rear_guard', 'rear_guard', 'bodyguard', 'bodyguard'];
            this.baseRole = roleMap[index] || 'bodyguard';
        }

        // Current role starts as base role (may change based on health)
        this.role = this.baseRole;

        // Set role-specific stats
        switch(this.baseRole) {
            case 'scout':
                this.patrolDistance = 180; // Far ahead
                this.vigilanceRadius = 500; // Wide vision
                this.protectionPriority = 1;
                this.moveSpeed = 280; // Fast
                break;
            case 'flank_left':
            case 'flank_right':
                this.patrolDistance = 120; // Sides
                this.vigilanceRadius = 400;
                this.protectionPriority = 2;
                this.moveSpeed = 250;
                break;
            case 'rear_guard':
                this.patrolDistance = -100; // Behind player
                this.vigilanceRadius = 350;
                this.protectionPriority = 3;
                this.moveSpeed = 240;
                break;
            case 'bodyguard':
                this.patrolDistance = 50; // Close to player
                this.vigilanceRadius = 300;
                this.protectionPriority = 5; // Highest - always protect player
                this.moveSpeed = 260;
                break;
        }

        console.log(`🛡️ Minion ${index} assigned role: ${this.role.toUpperCase()}`);
    }

    // DYNAMIC FORMATION SYSTEM V3: Smart, adaptive formations
    calculateFormationPositionV2(owner) {
        if (!owner || !owner.sprite) return { x: this.sprite.x, y: this.sprite.y };
        if (!this.role) return { x: this.sprite.x, y: this.sprite.y };

        const px = owner.sprite.x;
        const py = owner.sprite.y;

        // Determine facing direction
        const vel = owner.sprite.body.velocity;
        const moving = Math.abs(vel.x) > 10 || Math.abs(vel.y) > 10;

        let angle;
        if (moving) {
            angle = Math.atan2(vel.y, vel.x);
        } else {
            const dir = owner.currentDirection || 'down';
            angle = dir === 'up' ? -Math.PI/2 : dir === 'down' ? Math.PI/2 :
                    dir === 'left' ? Math.PI : 0;
        }

        // Count all alive minions for adaptive formations
        const allMinions = Object.values(this.scene.minions || {}).filter(m =>
            m.ownerId === this.ownerId && m.isAlive
        );
        const totalMinions = allMinions.length;
        const myGlobalIndex = allMinions.indexOf(this);

        // HEALTH-BASED DISTANCE MODIFIER
        const healthPercent = this.health / this.maxHealth;
        let healthModifier = 1.0;
        if (healthPercent < 0.25) {
            // Critical: Fall WAY back (150% further back)
            healthModifier = this.role === 'scout' || this.role.includes('flank') ? -0.5 : 1.5;
        } else if (healthPercent < 0.50) {
            // Injured: Fall back slightly (25% further back)
            healthModifier = this.role === 'scout' ? 0.7 : 1.25;
        } else if (healthPercent > 0.90) {
            // Healthy: Can push forward more (10% further)
            healthModifier = this.role === 'scout' ? 1.1 : 1.0;
        }

        // COMBAT MODE: Tighten formation (0.6x distance) vs PATROL: Spread out (1.0x)
        const combatModifier = this.combatMode ? 0.6 : 1.0;

        // ADAPTIVE FORMATION PATTERNS based on minion count
        let finalX, finalY;

        if (totalMinions <= 2) {
            // DUET FORMATION: One ahead, one beside
            if (myGlobalIndex === 0) {
                // First minion: Scout ahead
                const dist = 100 * combatModifier * healthModifier;
                finalX = px + Math.cos(angle) * dist;
                finalY = py + Math.sin(angle) * dist;
            } else {
                // Second minion: Guard left flank
                const dist = 80 * combatModifier * healthModifier;
                finalX = px + Math.cos(angle + Math.PI/2) * dist;
                finalY = py + Math.sin(angle + Math.PI/2) * dist;
            }
        }
        else if (totalMinions <= 4) {
            // DIAMOND FORMATION: Front, Left, Right, Back
            const positions = [
                { a: 0, d: 120 },           // Front
                { a: Math.PI/2, d: 100 },   // Left
                { a: -Math.PI/2, d: 100 },  // Right
                { a: Math.PI, d: 80 }       // Back
            ];
            const pos = positions[myGlobalIndex] || positions[0];
            const dist = pos.d * combatModifier * healthModifier;
            finalX = px + Math.cos(angle + pos.a) * dist;
            finalY = py + Math.sin(angle + pos.a) * dist;
        }
        else if (totalMinions <= 6) {
            // WEDGE FORMATION: Strong front, protected rear
            const positions = [
                { a: 0, d: 150 },              // Point scout
                { a: Math.PI/6, d: 120 },      // Right forward
                { a: -Math.PI/6, d: 120 },     // Left forward
                { a: Math.PI/2, d: 100 },      // Right flank
                { a: -Math.PI/2, d: 100 },     // Left flank
                { a: Math.PI, d: 80 }          // Rear guard
            ];
            const pos = positions[myGlobalIndex] || positions[0];
            const dist = pos.d * combatModifier * healthModifier;
            finalX = px + Math.cos(angle + pos.a) * dist;
            finalY = py + Math.sin(angle + pos.a) * dist;
        }
        else {
            // ARMY FORMATION (7+ minions): Use roles with dynamic spacing
            let baseDistance = this.patrolDistance * combatModifier * healthModifier;

            // Count same-role minions
            const sameRole = allMinions.filter(m => m.role === this.role);
            const myRoleIndex = sameRole.indexOf(this);
            const totalSameRole = sameRole.length;

            if (this.role === 'scout') {
                // Scouts: Wide arc ahead
                finalX = px + Math.cos(angle) * baseDistance;
                finalY = py + Math.sin(angle) * baseDistance;
                if (totalSameRole > 1) {
                    const spreadAngle = (myRoleIndex - (totalSameRole - 1) / 2) * (Math.PI / 4);
                    const spreadDist = baseDistance * 0.5;
                    finalX += Math.cos(angle + spreadAngle + Math.PI/2) * spreadDist;
                    finalY += Math.sin(angle + spreadAngle + Math.PI/2) * spreadDist;
                }
            }
            else if (this.role === 'flank_left') {
                // Flankers: Staggered left line
                const stagger = myRoleIndex * 40 * combatModifier;
                finalX = px + Math.cos(angle + Math.PI/2) * baseDistance + Math.cos(angle) * stagger;
                finalY = py + Math.sin(angle + Math.PI/2) * baseDistance + Math.sin(angle) * stagger;
            }
            else if (this.role === 'flank_right') {
                // Flankers: Staggered right line
                const stagger = myRoleIndex * 40 * combatModifier;
                finalX = px + Math.cos(angle - Math.PI/2) * baseDistance + Math.cos(angle) * stagger;
                finalY = py + Math.sin(angle - Math.PI/2) * baseDistance + Math.sin(angle) * stagger;
            }
            else if (this.role === 'rear_guard') {
                // Rear guard: Protective line behind
                const dist = Math.abs(baseDistance);
                finalX = px + Math.cos(angle + Math.PI) * dist;
                finalY = py + Math.sin(angle + Math.PI) * dist;
                if (totalSameRole > 1) {
                    const spreadOffset = (myRoleIndex - (totalSameRole - 1) / 2) * 70;
                    finalX += Math.cos(angle + Math.PI/2) * spreadOffset;
                    finalY += Math.sin(angle + Math.PI/2) * spreadOffset;
                }
            }
            else if (this.role === 'bodyguard') {
                // Bodyguards: Dynamic circle (closer in combat)
                const circleAngle = (myRoleIndex / Math.max(totalSameRole, 1)) * Math.PI * 2;
                finalX = px + Math.cos(angle + circleAngle) * baseDistance;
                finalY = py + Math.sin(angle + circleAngle) * baseDistance;
            }
            else {
                // Fallback
                finalX = px;
                finalY = py;
            }
        }

        return { x: finalX, y: finalY };
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

        // TACTICAL ARMY AI: Update health status
        this.updateHealthStatus();

        // TACTICAL ARMY AI: Check if we should help an ally
        const allyNeedingHelp = this.findAllyNeedingHelp();
        if (allyNeedingHelp && !this.isCritical) {
            this.state = 'assisting';
            this.assistAlly(allyNeedingHelp);
            return;
        }

        // FORMATION V2: Using new function name to force cache break
        this.formationPosition = this.calculateFormationPositionV2(owner);

        // Priority 2: Detect threats and enter combat mode
        const nearbyThreats = this.detectThreats();
        this.combatMode = nearbyThreats.length > 0;

        // TACTICAL ARMY AI: If injured/critical, modify behavior
        if (this.isCritical) {
            // Critical health: retreat to safety, only fight if threatened directly
            const closestThreat = nearbyThreats.length > 0 ? nearbyThreats[0] : null;
            if (closestThreat && closestThreat.distance < 150) {
                // Defend ourselves if enemy too close
                this.target = closestThreat.enemy;
                this.state = 'defending';
                this.attackEnemy(this.target);
            } else {
                // Retreat to rear position
                this.state = 'retreating';
                this.retreatToSafety(owner);
            }
            return;
        }

        // Priority 3: Find target (smart selection based on health)
        this.target = this.selectSmartTarget(nearbyThreats);

        if (this.target) {
            this.state = 'attacking';
            this.attackEnemy(this.target);
        } else {
            // Priority 4: Move to formation position
            this.state = 'patrolling';

            // DEBUG: Log formation state occasionally
            if (Math.random() < 0.005) { // 0.5% chance
                console.log(`📍 ${this.role} patrolling to formation: (${this.formationPosition.x.toFixed(0)}, ${this.formationPosition.y.toFixed(0)}), current: (${this.sprite.x.toFixed(0)}, ${this.sprite.y.toFixed(0)})`);
            }

            this.moveToFormationPosition();
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

    // INTELLIGENT FORMATION: Detect nearby threats
    detectThreats() {
        const allEnemies = [
            ...Object.values(this.scene.enemies || {}),
            ...Object.values(this.scene.wolves || {})
        ];

        const threats = [];
        const searchRadiusSquared = this.vigilanceRadius * this.vigilanceRadius;

        for (const enemy of allEnemies) {
            if (!enemy.isAlive) continue;

            const dx = this.sprite.x - enemy.sprite.x;
            const dy = this.sprite.y - enemy.sprite.y;
            const distSquared = dx * dx + dy * dy;

            if (distSquared < searchRadiusSquared) {
                threats.push({
                    enemy: enemy,
                    distanceSquared: distSquared,
                    distance: Math.sqrt(distSquared)
                });
            }
        }

        return threats.sort((a, b) => a.distanceSquared - b.distanceSquared);
    }

    // INTELLIGENT FORMATION: Smart target selection (spread attacks + health-based)
    selectSmartTarget(threats) {
        if (threats.length === 0) return null;

        // Check if at aggro limit
        if (this.aggroedEnemies.size >= this.maxAggro) {
            const currentTargets = Array.from(this.aggroedEnemies)
                .map(id => this.scene.enemies[id] || this.scene.wolves[id])
                .filter(e => e && e.isAlive);

            if (currentTargets.length > 0) {
                return currentTargets[0]; // Continue current targets
            } else {
                this.aggroedEnemies.clear();
            }
        }

        // Get all minions owned by same player
        const friendlyMinions = Object.values(this.scene.minions || {})
            .filter(m => m.ownerId === this.ownerId && m.isAlive && m !== this);

        // Count how many minions are targeting each threat
        const targetCounts = new Map();
        threats.forEach(t => {
            targetCounts.set(t.enemy.data.id, 0);
        });

        friendlyMinions.forEach(minion => {
            if (minion.target && minion.target.data) {
                const count = targetCounts.get(minion.target.data.id) || 0;
                targetCounts.set(minion.target.data.id, count + 1);
            }
        });

        // Find threat with LEAST minions attacking it (spread damage!)
        let bestTarget = null;
        let lowestCount = Infinity;

        for (const threat of threats) {
            const count = targetCounts.get(threat.enemy.data.id) || 0;
            const enemyHealth = threat.enemy.health;
            const enemyMaxHealth = threat.enemy.maxHealth;
            const enemyHealthPercent = enemyHealth / enemyMaxHealth;

            // Prioritize:
            // 1. Enemies with fewer minions attacking them
            // 2. Closer enemies
            // 3. TACTICAL: Match enemy health to minion health
            // 4. Role-based preferences
            let priority = count * 100 + threat.distance;

            // TACTICAL ARMY AI: Health-based targeting
            const myHealthPercent = this.health / this.maxHealth;

            if (this.isInjured) {
                // Injured minions prefer weak enemies (safer targets)
                if (enemyHealthPercent < 0.5) {
                    priority -= 80; // Much prefer low-health enemies
                } else {
                    priority += 50; // Avoid healthy enemies when injured
                }
            } else {
                // Healthy minions tank strong enemies (protect injured allies)
                if (enemyHealthPercent > 0.7) {
                    priority -= 60; // Prefer healthy enemies to protect team
                }
            }

            // Role-based adjustments
            if (this.role === 'scout' && threat.distance > 150) {
                priority -= 50; // Scouts prefer distant threats
            }
            if (this.role === 'bodyguard' && threat.distance < 100) {
                priority -= 100; // Bodyguards prefer close threats
            }

            if (priority < lowestCount) {
                lowestCount = priority;
                bestTarget = threat.enemy;
            }
        }

        // Add to aggro list
        if (bestTarget && bestTarget.data && bestTarget.data.id) {
            this.aggroedEnemies.add(bestTarget.data.id);
        }

        return bestTarget;
    }

    // TACTICAL ARMY AI: Update health status and role adjustments
    updateHealthStatus() {
        const healthPercent = this.health / this.maxHealth;

        this.isInjured = healthPercent < 0.5;
        this.isCritical = healthPercent < 0.25;

        // TACTICAL: Injured minions become more defensive
        if (this.isCritical && this.role !== 'bodyguard') {
            // Critical minions fallback to bodyguard role (stay close to player)
            this.role = 'bodyguard';
            this.patrolDistance = 50;
            this.vigilanceRadius = 300;
        } else if (this.isInjured && this.role === 'scout') {
            // Injured scouts become flankers (less exposed)
            this.role = 'flank_left';
            this.patrolDistance = 120;
            this.vigilanceRadius = 400;
        } else if (!this.isInjured && !this.isCritical) {
            // Healthy minions resume base role
            this.role = this.baseRole;
            // Restore original stats based on base role
            this.setRoleStats(this.baseRole);
        }
    }

    // Helper to set role stats
    setRoleStats(role) {
        switch(role) {
            case 'scout':
                this.patrolDistance = 180;
                this.vigilanceRadius = 500;
                this.moveSpeed = 280;
                break;
            case 'flank_left':
            case 'flank_right':
                this.patrolDistance = 120;
                this.vigilanceRadius = 400;
                this.moveSpeed = 250;
                break;
            case 'rear_guard':
                this.patrolDistance = -100;
                this.vigilanceRadius = 350;
                this.moveSpeed = 240;
                break;
            case 'bodyguard':
                this.patrolDistance = 50;
                this.vigilanceRadius = 300;
                this.moveSpeed = 260;
                break;
        }
    }

    // TACTICAL ARMY AI: Find ally minion that needs help
    findAllyNeedingHelp() {
        const friendlyMinions = Object.values(this.scene.minions || {})
            .filter(m => m.ownerId === this.ownerId && m.isAlive && m !== this);

        let mostUrgent = null;
        let urgencyScore = 0;

        for (const ally of friendlyMinions) {
            // Skip if ally is healthy
            if (ally.health / ally.maxHealth > 0.6) continue;

            // Check if ally is in combat with a VALID, ALIVE target
            if (!ally.target || !ally.target.isAlive) continue;

            // Check if there are actual threats near the ally
            const nearbyThreats = ally.detectThreats();
            if (nearbyThreats.length === 0) continue;

            const allyHealthPercent = ally.health / ally.maxHealth;
            const distToAlly = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                ally.sprite.x, ally.sprite.y
            );

            // Urgency = low health + close distance
            const score = (1 - allyHealthPercent) * 100 + (400 - distToAlly);

            if (score > urgencyScore && distToAlly < 400) {
                urgencyScore = score;
                mostUrgent = ally;
            }
        }

        return mostUrgent;
    }

    // TACTICAL ARMY AI: Assist struggling ally
    assistAlly(ally) {
        // Verify ally and target are still valid
        if (!ally || !ally.isAlive || !ally.target || !ally.target.isAlive) {
            this.assistTarget = null;
            this.state = 'patrolling'; // Exit assist mode
            return;
        }

        // Verify there are still threats nearby
        const nearbyThreats = this.detectThreats();
        if (nearbyThreats.length === 0) {
            this.assistTarget = null;
            this.state = 'patrolling'; // No threats, stop assisting
            return;
        }

        this.assistTarget = ally;
        this.target = ally.target; // Attack same enemy ally is fighting

        // If ally is critical, try to body block (move between ally and enemy)
        const allyHealthPercent = ally.health / ally.maxHealth;
        if (allyHealthPercent < 0.3 && this.health / this.maxHealth > 0.5 && ally.target.sprite) {
            // Position ourselves between ally and their target
            const blockX = (ally.sprite.x + ally.target.sprite.x) / 2;
            const blockY = (ally.sprite.y + ally.target.sprite.y) / 2;

            const angle = Math.atan2(blockY - this.sprite.y, blockX - this.sprite.x);
            this.sprite.body.setVelocity(
                Math.cos(angle) * this.moveSpeed,
                Math.sin(angle) * this.moveSpeed
            );
        }

        // Attack the enemy
        this.attackEnemy(this.target);
    }

    // TACTICAL ARMY AI: Retreat to safety when critical
    retreatToSafety(owner) {
        if (!owner || !owner.sprite) return;

        // Move behind player (opposite of threats)
        const playerX = owner.sprite.x;
        const playerY = owner.sprite.y;

        // Find average threat direction
        const threats = this.detectThreats();
        let threatAngle = 0;
        if (threats.length > 0) {
            let avgX = 0, avgY = 0;
            threats.forEach(t => {
                avgX += t.enemy.sprite.x;
                avgY += t.enemy.sprite.y;
            });
            avgX /= threats.length;
            avgY /= threats.length;
            threatAngle = Math.atan2(avgY - playerY, avgX - playerX);
        }

        // Retreat in opposite direction (behind player, away from threats)
        const retreatAngle = threatAngle + Math.PI; // Opposite direction
        const safeX = playerX + Math.cos(retreatAngle) * 80;
        const safeY = playerY + Math.sin(retreatAngle) * 80;

        const angle = Math.atan2(safeY - this.sprite.y, safeX - this.sprite.x);
        this.sprite.body.setVelocity(
            Math.cos(angle) * (this.moveSpeed * 1.2), // Faster retreat
            Math.sin(angle) * (this.moveSpeed * 1.2)
        );

        this.retreating = true;

        // Play walk animation
        if (this.sprite.anims) {
            this.sprite.play('minion_walk', true);
        }
    }

    // INTELLIGENT FORMATION: Move to assigned formation position
    moveToFormationPosition() {
        if (!this.formationPosition) {
            return;
        }

        const dist = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            this.formationPosition.x,
            this.formationPosition.y
        );

        // If close enough to formation position, idle there
        if (dist < 10) { // REDUCED from 30 to 10 for tighter formations
            this.sprite.body.setVelocity(0, 0);
            return;
        }

        // Move toward formation position
        const angle = Math.atan2(
            this.formationPosition.y - this.sprite.y,
            this.formationPosition.x - this.sprite.x
        );

        this.sprite.body.setVelocity(
            Math.cos(angle) * this.moveSpeed,
            Math.sin(angle) * this.moveSpeed
        );

        // Play walk animation
        if (this.sprite.anims) {
            this.sprite.play('minion_walk', true);
        }
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

        // INTELLIGENT FORMATION: Update remaining minions' formations
        const ownerId = this.ownerId;
        this.scene.tweens.add({
            targets: [this.sprite, this.healthBar, this.healthBarBg],
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
                // Reassign roles to remaining minions
                if (this.scene && this.scene.updateMinionFormations) {
                    this.scene.updateMinionFormations(ownerId);
                }
            }
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
