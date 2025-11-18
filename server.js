require('dotenv').config(); // Load environment variables

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: ["https://klyra.lol", "https://klyra-server.onrender.com"],
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Serve static game files
app.use(express.static('game'));

const PORT = process.env.PORT || 3001;

// Game constants
const MAX_PLAYERS_PER_LOBBY = 10;
const LOBBY_START_DELAY = 5000; // 5 seconds before game starts
const RECONNECT_TIMEOUT = 30000; // 30 seconds to reconnect
const AFK_TIMEOUT = 180000; // 3 minutes AFK kick
const RATE_LIMIT_INTERVAL = 100; // Min ms between actions
const MAX_MESSAGE_LENGTH = 200;

// Data structures
const lobbies = new Map();
const players = new Map();
const disconnectedPlayers = new Map(); // For reconnection
const rateLimits = new Map(); // Rate limiting per player

// Performance metrics
const metrics = {
    totalGames: 0,
    totalPlayers: 0,
    averageGameDuration: 0,
    peakPlayers: 0
};

// Player class
class Player {
    constructor(socketId, username) {
        this.id = socketId;
        this.username = this.sanitizeUsername(username);
        this.lobbyId = null;
        this.position = { x: 0, y: 0 };
        this.health = 100;
        this.maxHealth = 100;
        this.level = 1;
        this.experience = 0;
        this.class = 'warrior';
        this.isAlive = true;
        this.isReady = false;
        this.inventory = [];
        this.stats = this.getClassStats('warrior');
        this.kills = 0;
        this.deaths = 0;
        this.damageDealt = 0; // Track damage dealt for stats
        this.damageTaken = 0; // Track damage taken for stats
        this.itemsCollected = 0;
        this.sessionStartTime = Date.now(); // Track playtime
        this.lastActivity = Date.now();
        this.isReconnecting = false;
        this.disconnectedAt = null;
        this.currentMap = 'exterior'; // Track which map instance player is in

        // Skill system
        this.selectedSkills = []; // Array of skill IDs/objects
        this.permanentMinions = []; // Track permanent minion IDs for restoration
        this.initializeMultipliers();
    }

    initializeMultipliers() {
        // Minion multipliers
        this.minionHealthMultiplier = 1;
        this.minionDamageMultiplier = 1;
        this.minionSpeedMultiplier = 1;
        this.minionAttackSpeedMultiplier = 1;
        this.minionAllStatsMultiplier = 1;
        this.minionSizeMultiplier = 1;
        this.minionDefenseMultiplier = 1;
        this.minionArmor = 0;

        // Minion special stats
        this.minionLifesteal = 0;
        this.minionRegen = 0;
        this.minionKnockback = false;
        // Removed minionStun - replaced with bleed mechanic
        this.minionCleave = false;
        this.minionUnstoppable = false;
        this.minionCritChance = 0;
        this.minionCritDamage = 2.0;

        // Player multipliers
        this.damageMultiplier = 1;
        this.xpMultiplier = 1;

        // Player special stats
        this.healPerKill = 0;
        this.healOnKillPercent = 0;
        this.regenPerMinion = 0;
        this.packDamageBonus = 0;
        this.groupedDefense = 0;
        this.coordinatedDamage = 0;
        this.perMinionBonus = 0;
        this.maxMinionBonus = 2.0;

        // Special effects
        this.berserkerDamage = 0;
        this.berserkerThreshold = 0.4;
        this.executeThreshold = 0;
        this.executeDamage = 2.0;
        this.bossDamage = 1.0;
        this.armorPen = 0;
        this.chainAttack = null;
        this.splashDamage = null;
        this.dualWield = false;
        this.attacksPerStrike = 1;
        this.commandAura = null;
        this.flankDamage = 1.0;
        this.killDamageStack = 0;
        this.maxKillStacks = 20;
        this.currentKillStacks = 0;
        this.reapersMarkThreshold = 0;
        this.reapersMarkDamage = 1.0;

        // God-tier effects
        this.minionCap = 20;
        this.legionBuffMultiplier = 1.0;
        this.instantRevive = false;
        this.shockwaveRadius = 0;
        this.deathAura = null;
        this.deathImmunity = false;
    }

    sanitizeUsername(username) {
        if (!username || typeof username !== 'string') {
            return `Player_${Math.floor(Math.random() * 9999)}`;
        }
        // Remove special chars, limit length
        return username.slice(0, 20).replace(/[^a-zA-Z0-9_-]/g, '') || `Player_${Math.floor(Math.random() * 9999)}`;
    }

    getClassStats(characterClass) {
        const classStats = {
            warrior: { strength: 15, defense: 12, speed: 8, health: 120 },
            mage: { strength: 8, defense: 6, speed: 10, health: 80 },
            rogue: { strength: 10, defense: 8, speed: 15, health: 90 },
            archer: { strength: 12, defense: 8, speed: 12, health: 100 },
            paladin: { strength: 13, defense: 15, speed: 7, health: 130 },
            necromancer: { strength: 9, defense: 7, speed: 9, health: 85 },
            malachar: { strength: 16, defense: 10, speed: 9, health: 115 }
        };

        const stats = classStats[characterClass] || classStats.warrior;
        this.maxHealth = stats.health;
        this.health = stats.health;
        return {
            strength: stats.strength,
            defense: stats.defense,
            speed: stats.speed
        };
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    isAFK() {
        return Date.now() - this.lastActivity > AFK_TIMEOUT;
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            position: this.position,
            health: this.health,
            maxHealth: this.maxHealth,
            level: this.level,
            experience: this.experience,
            class: this.class,
            isAlive: this.isAlive,
            isReady: this.isReady,
            stats: this.stats,
            kills: this.kills,
            itemsCollected: this.itemsCollected,
            selectedSkills: this.selectedSkills,
            permanentMinions: this.permanentMinions,
            // Include all multipliers and special effects
            minionHealthMultiplier: this.minionHealthMultiplier,
            minionDamageMultiplier: this.minionDamageMultiplier,
            minionSpeedMultiplier: this.minionSpeedMultiplier,
            minionAttackSpeedMultiplier: this.minionAttackSpeedMultiplier,
            minionAllStatsMultiplier: this.minionAllStatsMultiplier,
            minionSizeMultiplier: this.minionSizeMultiplier,
            minionDefenseMultiplier: this.minionDefenseMultiplier,
            minionArmor: this.minionArmor,
            minionLifesteal: this.minionLifesteal,
            minionRegen: this.minionRegen,
            minionKnockback: this.minionKnockback,
            // minionStun removed - replaced with bleed mechanic
            minionCleave: this.minionCleave,
            minionUnstoppable: this.minionUnstoppable,
            minionCritChance: this.minionCritChance,
            minionCritDamage: this.minionCritDamage,
            damageMultiplier: this.damageMultiplier,
            xpMultiplier: this.xpMultiplier,
            healPerKill: this.healPerKill,
            healOnKillPercent: this.healOnKillPercent,
            regenPerMinion: this.regenPerMinion,
            packDamageBonus: this.packDamageBonus,
            groupedDefense: this.groupedDefense,
            coordinatedDamage: this.coordinatedDamage,
            perMinionBonus: this.perMinionBonus,
            maxMinionBonus: this.maxMinionBonus,
            berserkerDamage: this.berserkerDamage,
            berserkerThreshold: this.berserkerThreshold,
            executeThreshold: this.executeThreshold,
            executeDamage: this.executeDamage,
            bossDamage: this.bossDamage,
            armorPen: this.armorPen,
            chainAttack: this.chainAttack,
            splashDamage: this.splashDamage,
            dualWield: this.dualWield,
            attacksPerStrike: this.attacksPerStrike,
            commandAura: this.commandAura,
            flankDamage: this.flankDamage,
            killDamageStack: this.killDamageStack,
            maxKillStacks: this.maxKillStacks,
            currentKillStacks: this.currentKillStacks,
            reapersMarkThreshold: this.reapersMarkThreshold,
            reapersMarkDamage: this.reapersMarkDamage,
            minionCap: this.minionCap,
            legionBuffMultiplier: this.legionBuffMultiplier,
            instantRevive: this.instantRevive,
            shockwaveRadius: this.shockwaveRadius,
            deathAura: this.deathAura,
            deathImmunity: this.deathImmunity
        };
    }
}

// Lobby class with infinite chunk-based world
class Lobby {
    constructor(difficulty = 'normal') {
        this.id = uuidv4();
        this.players = new Map();
        this.maxPlayers = MAX_PLAYERS_PER_LOBBY;
        this.status = 'active'; // Always active - instant join!
        this.difficulty = difficulty;
        this.gameState = {
            floor: 1,
            enemies: [],
            items: [],
            minions: new Map(), // Track all spawned minions
            startTime: Date.now(),
            endTime: null
        };
        this.createdAt = Date.now();
        this.readyPlayers = new Set();
        this.votes = new Map();

        // Large static world - generated once
        this.WORLD_SIZE = 1000; // 1000x1000 tiles (massive world)
        this.worldSeed = `${this.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Generate the entire world once
        this.world = this.generateCompleteWorld();
        metrics.totalGames++;

        // DYNAMIC WOLF SYSTEM: Track active regions and despawn inactive ones
        this.activeRegions = new Map(); // regionKey -> { lastActiveTime, playerCount }
        this.regionEnemies = new Map(); // regionKey -> Set of enemy IDs
        this.regionClearedTime = new Map(); // regionKey -> timestamp when region was cleared
        this.REGION_INACTIVE_TIMEOUT = 120000; // Despawn wolves after 2 minutes of no players
        this.REGION_RESPAWN_COOLDOWN = 30000; // Wait 30 seconds before respawning in cleared region

        // Start dynamic cleanup interval - runs every 30 seconds
        this.dynamicSpawnCleanup = setInterval(() => {
            this.cleanupInactiveRegions();
        }, 30000);
    }

    addPlayer(player) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, error: 'Game is full' };
        }

        // Ensure player is alive when joining
        if (!player.isAlive) {
            console.log(`⚠️ Resetting ${player.username} to alive (was dead when joining)`);
            player.isAlive = true;
            player.health = player.maxHealth;
        }

        this.players.set(player.id, player);
        player.lobbyId = this.id;

        // Assign spawn position
        const spawnPoints = this.getSpawnPoints();
        player.position = spawnPoints[this.players.size - 1];

        console.log(`✅ ${player.username} joined game ${this.id.slice(0, 8)} (${this.players.size}/${this.maxPlayers})`);
        console.log(`📍 Assigned spawn position (PIXELS): (${player.position.x}, ${player.position.y})`);

        return { success: true };
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
            console.log(`❌ ${player.username} left game ${this.id.slice(0, 8)} (${this.players.size}/${this.maxPlayers})`);

            // Mark as finished if empty and auto-close
            if (this.players.size === 0) {
                this.status = 'finished';
                this.gameState.endTime = Date.now();
                console.log(`🗑️  Room ${this.id.slice(0, 8)} closed - all players left`);
            }
        }
    }

    generateCompleteWorld() {
        console.log(`🗺️ Generating world metadata for room ${this.id.slice(0, 8)}...`);
        const startTime = Date.now();

        // DON'T spawn all enemies upfront - way too laggy!
        // Enemies will spawn dynamically as players explore
        this.spawnedRegions = new Set(); // Track which regions have enemies

        const elapsed = Date.now() - startTime;
        console.log(`✅ World metadata generated in ${elapsed}ms`);
        console.log(`   Size: ${this.WORLD_SIZE}x${this.WORLD_SIZE} tiles`);
        console.log(`   Enemies: Spawned on-demand (dynamic)`);
        console.log(`   Seed: ${this.worldSeed} (client will generate terrain)`);

        // Don't send tiles/biomes/decorations - client generates them from seed
        return {
            size: this.WORLD_SIZE,
            seed: this.worldSeed
        };
    }

    // Create wolf with variant stats - BALANCED: Quality over quantity
    createWolfVariant(variant, baseId, position, healthMultiplier = 1.0) {
        const variants = {
            small: {
                scale: 0.7,
                health: 30,  // HORDE MODE: 50% health
                maxHealth: 30,
                damage: 2,  // HORDE MODE: 40% less damage
                speed: 70,
                sightRange: 12,
                glowColor: 0xff6666, // Light red
                glowSize: 6
            },
            normal: {
                scale: 1.0,
                health: 50,  // HORDE MODE: 50% health
                maxHealth: 50,
                damage: 3,  // HORDE MODE: 40% less damage
                speed: 80,
                sightRange: 15,
                glowColor: 0xff0000, // Red
                glowSize: 8
            },
            boss: {
                scale: 1.5,
                health: 100,  // HORDE MODE: 50% health
                maxHealth: 100,
                damage: 6,  // HORDE MODE: 40% less damage
                speed: 90,
                sightRange: 20,
                glowColor: 0xff0066, // Dark pink/red
                glowSize: 12
            }
        };

        const stats = variants[variant];

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'wolf',
            variant: variant, // Track variant type
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.damage,
            speed: stats.speed,
            scale: stats.scale,
            glowColor: stats.glowColor,
            glowSize: stats.glowSize,
            isAlive: true,
            sightRange: stats.sightRange,
            lastMove: 0
        };
    }

    // Create minotaur with variant stats - BALANCED: Quality over quantity
    createMinotaurVariant(variant, baseId, position, healthMultiplier = 1.0) {
        const variants = {
            small: {
                scale: 0.8,
                health: 60,  // HORDE MODE: 50% health
                maxHealth: 60,
                damage: 5,  // HORDE MODE: 40% less damage
                speed: 50,
                sightRange: 10
            },
            normal: {
                scale: 1.0,
                health: 100,  // HORDE MODE: 50% health
                maxHealth: 100,
                damage: 7,  // HORDE MODE: 40% less damage
                speed: 60,
                sightRange: 12
            },
            boss: {
                scale: 1.3,
                health: 175,  // HORDE MODE: 50% health
                maxHealth: 175,
                damage: 11,  // HORDE MODE: 40% less damage
                speed: 70,
                sightRange: 15
            }
        };

        const stats = variants[variant];

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'minotaur',
            variant: variant,
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.damage,
            speed: stats.speed,
            scale: stats.scale,
            isAlive: true,
            sightRange: stats.sightRange,
            lastMove: 0
        };
    }

    // Create mushroom with variant stats - BALANCED: Medium threat
    createMushroomVariant(variant, baseId, position, healthMultiplier = 1.0) {
        const variants = {
            small: {
                scale: 0.8,
                health: 20,  // HORDE MODE: 50% health
                maxHealth: 20,
                damage: 2,  // HORDE MODE: 40% less damage
                speed: 35,
                sightRange: 8
            },
            normal: {
                scale: 1.0,
                health: 35,  // HORDE MODE: 50% health
                maxHealth: 35,
                damage: 4,  // HORDE MODE: 40% less damage
                speed: 45,
                sightRange: 10
            },
            boss: {
                scale: 1.4,
                health: 90,  // HORDE MODE: 50% health
                maxHealth: 90,
                damage: 7,  // HORDE MODE: 40% less damage
                speed: 55,
                sightRange: 14
            }
        };

        const stats = variants[variant];

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'mushroom',
            variant: variant,
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.damage,
            speed: stats.speed,
            scale: stats.scale,
            isAlive: true,
            sightRange: stats.sightRange,
            lastMove: 0
        };
    }

    // Get the dominant biome for a region
    getRegionBiome(regionX, regionY) {
        const REGION_SIZE = 50;
        const CHUNK_SIZE = 100;
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Biome distribution thresholds
        const greenThreshold = 0.33;
        const darkGreenThreshold = 0.66;

        // Get center of region
        const regionCenterX = regionX * REGION_SIZE + REGION_SIZE / 2;
        const regionCenterY = regionY * REGION_SIZE + REGION_SIZE / 2;

        // Determine chunk for region center
        const chunkX = Math.floor(regionCenterX / CHUNK_SIZE);
        const chunkY = Math.floor(regionCenterY / CHUNK_SIZE);

        // Use chunk coordinates to determine biome
        const chunkHash = this.seededRandom(seed + chunkX * 1000 + chunkY);

        // Return biome based on hash
        if (chunkHash < greenThreshold) return 'green';
        else if (chunkHash < darkGreenThreshold) return 'dark_green';
        else return 'red';
    }

    // Spawn enemies in a region (called when players explore new areas)
    spawnEnemiesInRegion(regionX, regionY) {
        const regionKey = `${regionX},${regionY}`;

        // DYNAMIC: Mark region as active and count players
        const playersInRegion = this.getPlayersInRegion(regionX, regionY);
        const playerCount = playersInRegion.length;

        this.activeRegions.set(regionKey, {
            lastActiveTime: Date.now(),
            playerCount: playerCount
        });

        // Skip if already spawned
        if (this.spawnedRegions.has(regionKey)) return [];

        // CHECK: Don't spawn enemies if the region has living enemies or was recently cleared
        // This prevents respawning on top of players who just cleared the area
        const regionEnemies = this.regionEnemies.get(regionKey);
        if (regionEnemies && regionEnemies.size > 0) {
            // Check if any enemies in this region are still alive
            let hasLivingEnemies = false;
            regionEnemies.forEach(enemyId => {
                const enemy = this.gameState.enemies.find(e => e.id === enemyId);
                if (enemy && enemy.isAlive) {
                    hasLivingEnemies = true;
                }
            });

            if (hasLivingEnemies) {
                return []; // Don't respawn if enemies still alive
            }
        }

        // CHECK: Don't spawn if players are currently in this region
        // Allow respawn only after players have left the area
        if (playersInRegion.length > 0 && this.regionEnemies.has(regionKey)) {
            // Region was previously spawned and players are still here - don't respawn yet
            return [];
        }

        // CHECK: Respawn cooldown - don't respawn too quickly after clearing
        const clearedTime = this.regionClearedTime.get(regionKey);
        if (clearedTime) {
            const timeSinceCleared = Date.now() - clearedTime;
            if (timeSinceCleared < this.REGION_RESPAWN_COOLDOWN) {
                // Still on cooldown
                return [];
            } else {
                // Cooldown expired, remove the timer
                this.regionClearedTime.delete(regionKey);
            }
        }

        this.spawnedRegions.add(regionKey);
        this.regionEnemies.set(regionKey, new Set()); // Track enemies in this region

        const REGION_SIZE = 50; // 50x50 tile regions
        const newEnemies = [];

        // Calculate distance from world center (spawn point)
        const worldCenterX = this.WORLD_SIZE / 2;
        const worldCenterY = this.WORLD_SIZE / 2;
        const safeZoneRadius = 30; // Safe zone around spawn
        const regionCenterX = regionX * REGION_SIZE + REGION_SIZE / 2;
        const regionCenterY = regionY * REGION_SIZE + REGION_SIZE / 2;
        const distanceFromSpawn = Math.sqrt(
            Math.pow(regionCenterX - worldCenterX, 2) +
            Math.pow(regionCenterY - worldCenterY, 2)
        );

        // Distance-based pack sizing - BALANCED: Quality over quantity for performance
        let packsToSpawn = 1;
        let minPackSize = 1;
        let maxPackSize = 2;
        let bossChance = 0;

        if (distanceFromSpawn < 80) {
            // Near spawn: HORDE MODE - 8-10 packs, 6-9 enemies each (~48-90 total)
            packsToSpawn = 8 + Math.floor(Math.random() * 3); // 8-10 packs
            minPackSize = 6;
            maxPackSize = 9;
            bossChance = 0;
        } else if (distanceFromSpawn < 150) {
            // Close to spawn: HORDE MODE - 7-9 packs, 9-12 enemies (~63-108 total)
            packsToSpawn = 7 + Math.floor(Math.random() * 3); // 7-9 packs
            minPackSize = 9;
            maxPackSize = 12;
            bossChance = 0.02;
        } else if (distanceFromSpawn < 250) {
            // Medium distance: HORDE MODE - 6-8 packs, 9-12 enemies (~54-96 total)
            packsToSpawn = 6 + Math.floor(Math.random() * 3); // 6-8 packs
            minPackSize = 9;
            maxPackSize = 12;
            bossChance = 0.05;
        } else if (distanceFromSpawn < 450) {
            // Far: HORDE MODE - 5-7 packs, 12-18 enemies (~60-126 total)
            packsToSpawn = 5 + Math.floor(Math.random() * 3); // 5-7 packs
            minPackSize = 12;
            maxPackSize = 18;
            bossChance = 0.10;
        } else {
            // Very far: MASSIVE HORDE - 5-7 packs, 15-21 enemies (~75-147 total)
            packsToSpawn = 5 + Math.floor(Math.random() * 3); // 5-7 packs
            minPackSize = 15;
            maxPackSize = 21;
            bossChance = 0.15;
        }

        // CO-OP SCALING: Diablo-style diminishing returns
        // More players = more enemies with more health (aggressive but capped)
        let spawnMultiplier = 1.0;
        let healthMultiplier = 1.0;

        if (playerCount === 1) {
            spawnMultiplier = 1.0;
            healthMultiplier = 1.0;
        } else if (playerCount === 2) {
            spawnMultiplier = 1.8;
            healthMultiplier = 1.3;
        } else if (playerCount === 3) {
            spawnMultiplier = 2.4;
            healthMultiplier = 1.5;
        } else if (playerCount === 4) {
            spawnMultiplier = 3.0;
            healthMultiplier = 1.7;
        } else if (playerCount === 5) {
            spawnMultiplier = 3.5;
            healthMultiplier = 1.9;
        } else { // 6+ players
            spawnMultiplier = 4.0; // Capped at 4x
            healthMultiplier = 2.0; // Capped at 2x
        }

        // Apply spawn multiplier
        packsToSpawn = Math.floor(packsToSpawn * spawnMultiplier);

        // Hard cap: Max 80 enemies per region (safety net)
        const estimatedEnemies = packsToSpawn * ((minPackSize + maxPackSize) / 2);
        if (estimatedEnemies > 80) {
            const scale = 80 / estimatedEnemies;
            packsToSpawn = Math.floor(packsToSpawn * scale);
        }

        // Log co-op scaling (for debugging/balancing)
        if (playerCount > 1) {
            console.log(`🔥 CO-OP SCALING: ${playerCount} players in region ${regionKey} → ${spawnMultiplier.toFixed(1)}x spawns, ${healthMultiplier.toFixed(1)}x health`);
        }

        // Use seed for consistent spawning
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const regionSeed = seed + regionX * 7919 + regionY * 6563;

        // Determine biome for this region
        const biome = this.getRegionBiome(regionX, regionY);
        console.log(`🌍 Spawning enemies in region ${regionKey} | Biome: ${biome}`);

        // Spawn packs
        for (let packIndex = 0; packIndex < packsToSpawn; packIndex++) {
            const packSeed = regionSeed + packIndex * 10000;

            // Determine pack size
            const packSize = Math.floor(
                minPackSize + this.seededRandom(packSeed) * (maxPackSize - minPackSize + 1)
            );

            // Choose pack location in region
            const packX = regionX * REGION_SIZE + Math.floor(this.seededRandom(packSeed + 1) * REGION_SIZE);
            const packY = regionY * REGION_SIZE + Math.floor(this.seededRandom(packSeed + 2) * REGION_SIZE);

            // Check if pack location is in safe zone
            const isInSafeZone = (
                packX >= (worldCenterX - safeZoneRadius) &&
                packX < (worldCenterX + safeZoneRadius) &&
                packY >= (worldCenterY - safeZoneRadius) &&
                packY < (worldCenterY + safeZoneRadius)
            );

            if (isInSafeZone) continue; // Skip this pack

            // Decide if this pack has a boss
            const hasBoss = this.seededRandom(packSeed + 3) < bossChance;
            let bossSpawned = false;

            // Determine enemy type based on biome
            let enemyType;
            const spawnRoll = this.seededRandom(packSeed + 50);

            if (biome === 'red') {
                // RED biome: 60% sword demons, 20% minotaurs, 20% mushrooms
                if (spawnRoll < 0.6) {
                    enemyType = 'swordDemon';
                } else if (spawnRoll < 0.8) {
                    enemyType = 'minotaur';
                } else {
                    enemyType = 'mushroom';
                }
            } else if (biome === 'dark_green') {
                // DARK_GREEN biome: 30% sword demons, 40% minotaurs, 30% mushrooms
                if (spawnRoll < 0.3) {
                    enemyType = 'swordDemon';
                } else if (spawnRoll < 0.7) {
                    enemyType = 'minotaur';
                } else {
                    enemyType = 'mushroom';
                }
            } else {
                // GREEN biome: 10% sword demons, 50% minotaurs, 40% mushrooms (mushrooms fit forest theme)
                if (spawnRoll < 0.1) {
                    enemyType = 'swordDemon';
                } else if (spawnRoll < 0.6) {
                    enemyType = 'minotaur';
                } else {
                    enemyType = 'mushroom';
                }
            }

            // Spawn appropriate enemy type in pack
            if (enemyType === 'swordDemon') {
                // Spawn sword demons (wolves) in pack
                for (let i = 0; i < packSize; i++) {
                    const wolfSeed = packSeed + i * 100;

                    // Position in tight cluster (within 5 tiles of pack center)
                    const offsetX = Math.floor((this.seededRandom(wolfSeed + 10) - 0.5) * 10);
                    const offsetY = Math.floor((this.seededRandom(wolfSeed + 11) - 0.5) * 10);
                    const x = Math.max(0, Math.min(this.WORLD_SIZE - 1, packX + offsetX));
                    const y = Math.max(0, Math.min(this.WORLD_SIZE - 1, packY + offsetY));

                    // Determine sword demon variant
                    let variant = 'normal';

                    if (hasBoss && !bossSpawned && i === 0) {
                        variant = 'boss';
                        bossSpawned = true;
                    } else if (distanceFromSpawn < 100) {
                        variant = this.seededRandom(wolfSeed + 20) < 0.7 ? 'small' : 'normal';
                    } else if (distanceFromSpawn < 200) {
                        variant = this.seededRandom(wolfSeed + 20) < 0.3 ? 'small' : 'normal';
                    } else {
                        variant = 'normal';
                    }

                    const wolfId = `${this.id}_wolf_${regionKey}_p${packIndex}_${i}`;
                    const wolf = this.createWolfVariant(variant, wolfId, { x, y }, healthMultiplier);

                    // Track region
                    wolf.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(wolf.id);

                    this.gameState.enemies.push(wolf);
                    newEnemies.push(wolf);
                }
            } else if (enemyType === 'minotaur') {
                // Spawn minotaurs in pack (smaller packs since they're tougher)
                const minotaurPackSize = Math.max(1, Math.floor(packSize / 2)); // Half the size
                for (let i = 0; i < minotaurPackSize; i++) {
                    const minotaurSeed = packSeed + i * 100;

                    // Position in cluster
                    const offsetX = Math.floor((this.seededRandom(minotaurSeed + 10) - 0.5) * 10);
                    const offsetY = Math.floor((this.seededRandom(minotaurSeed + 11) - 0.5) * 10);
                    const x = Math.max(0, Math.min(this.WORLD_SIZE - 1, packX + offsetX));
                    const y = Math.max(0, Math.min(this.WORLD_SIZE - 1, packY + offsetY));

                    // Determine minotaur variant
                    let variant = 'normal';
                    if (hasBoss && !bossSpawned && i === 0) {
                        variant = 'boss';
                        bossSpawned = true;
                    }

                    const minotaurId = `${this.id}_minotaur_${regionKey}_p${packIndex}_${i}`;
                    const minotaur = this.createMinotaurVariant(variant, minotaurId, { x, y }, healthMultiplier);

                    // Track region
                    minotaur.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(minotaur.id);

                    this.gameState.enemies.push(minotaur);
                    newEnemies.push(minotaur);
                }
            } else if (enemyType === 'mushroom') {
                // Spawn mushrooms in pack
                for (let i = 0; i < packSize; i++) {
                    const mushroomSeed = packSeed + i * 100;

                    // Position in cluster
                    const offsetX = Math.floor((this.seededRandom(mushroomSeed + 10) - 0.5) * 10);
                    const offsetY = Math.floor((this.seededRandom(mushroomSeed + 11) - 0.5) * 10);
                    const x = Math.max(0, Math.min(this.WORLD_SIZE - 1, packX + offsetX));
                    const y = Math.max(0, Math.min(this.WORLD_SIZE - 1, packY + offsetY));

                    // Determine mushroom variant
                    let variant = 'normal';

                    if (hasBoss && !bossSpawned && i === 0) {
                        variant = 'boss';
                        bossSpawned = true;
                    } else if (distanceFromSpawn < 100) {
                        variant = this.seededRandom(mushroomSeed + 20) < 0.7 ? 'small' : 'normal';
                    } else if (distanceFromSpawn < 200) {
                        variant = this.seededRandom(mushroomSeed + 20) < 0.3 ? 'small' : 'normal';
                    } else {
                        variant = 'normal';
                    }

                    const mushroomId = `${this.id}_mushroom_${regionKey}_p${packIndex}_${i}`;
                    const mushroom = this.createMushroomVariant(variant, mushroomId, { x, y }, healthMultiplier);

                    // Track region
                    mushroom.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(mushroom.id);

                    this.gameState.enemies.push(mushroom);
                    newEnemies.push(mushroom);
                }
            }
        }

        console.log(`✨ Spawned ${newEnemies.length} enemies in ${packsToSpawn} pack(s) at region (${regionX}, ${regionY}) | Biome: ${biome} [Distance: ${Math.floor(distanceFromSpawn)}]`);

        return newEnemies;
    }

    // DYNAMIC SPAWN SYSTEM: Get players in a specific region
    getPlayersInRegion(regionX, regionY) {
        const TILE_SIZE = 32;
        const REGION_SIZE = 50;
        const players = [];

        this.players.forEach(player => {
            // Convert pixel position to grid position for region calculation
            const gridX = Math.floor(player.position.x / TILE_SIZE);
            const gridY = Math.floor(player.position.y / TILE_SIZE);
            const playerRegionX = Math.floor(gridX / REGION_SIZE);
            const playerRegionY = Math.floor(gridY / REGION_SIZE);

            // Check if player is in this region or adjacent regions (visibility range)
            if (Math.abs(playerRegionX - regionX) <= 1 && Math.abs(playerRegionY - regionY) <= 1) {
                players.push(player);
            }
        });

        return players;
    }

    // DYNAMIC SPAWN SYSTEM: Cleanup wolves from inactive regions
    cleanupInactiveRegions() {
        const now = Date.now();
        const REGION_SIZE = 50;
        const regionsToCleanup = [];

        // Find inactive regions
        this.activeRegions.forEach((regionData, regionKey) => {
            const timeSinceActive = now - regionData.lastActiveTime;

            // Check if any players are still near this region
            const [regionX, regionY] = regionKey.split(',').map(Number);
            const playersNearby = this.getPlayersInRegion(regionX, regionY);

            if (playersNearby.length > 0) {
                // Update last active time if players nearby
                this.activeRegions.set(regionKey, {
                    lastActiveTime: now,
                    playerCount: playersNearby.length
                });
            } else if (timeSinceActive > this.REGION_INACTIVE_TIMEOUT) {
                // Region has been inactive for too long
                regionsToCleanup.push(regionKey);
            }
        });

        // Cleanup inactive regions
        regionsToCleanup.forEach(regionKey => {
            const enemyIds = this.regionEnemies.get(regionKey);
            if (enemyIds && enemyIds.size > 0) {
                let despawnedCount = 0;

                // Remove enemies from this region
                this.gameState.enemies = this.gameState.enemies.filter(enemy => {
                    if (enemyIds.has(enemy.id)) {
                        despawnedCount++;

                        // Broadcast despawn to all players
                        this.broadcast('enemy:despawned', { enemyId: enemy.id });
                        return false; // Remove this enemy
                    }
                    return true; // Keep other enemies
                });

                console.log(`🌙 Despawned ${despawnedCount} wolves from inactive region ${regionKey}`);
            }

            // Clear region data so it can respawn later
            this.spawnedRegions.delete(regionKey);
            this.activeRegions.delete(regionKey);
            this.regionEnemies.delete(regionKey);

            // Mark when this region was cleared (for respawn cooldown)
            this.regionClearedTime.set(regionKey, Date.now());
        });

        if (regionsToCleanup.length > 0) {
            console.log(`♻️ Dynamic cleanup: ${regionsToCleanup.length} regions cleared, ${this.gameState.enemies.length} wolves remaining`);
        }
    }

    getWorldData() {
        return this.world;
    }

    // Seeded random number generator for consistent procedural generation
    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Perlin-like noise for natural terrain generation
    noise2D(x, y, seed) {
        const n = x + y * 57 + seed * 131;
        let noise = Math.sin(n) * 43758.5453;
        return noise - Math.floor(noise);
    }

    generateFantasyWorld(width, height, seedString) {
        // Convert seed string to number
        const seed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const tiles = Array(height).fill(null).map(() => Array(width).fill(null));
        const biomes = Array(height).fill(null).map(() => Array(width).fill(null));
        const decorations = [];

        // Calculate randomized biome distribution from seed (matches client)
        const weight1 = this.seededRandom(seed + 1234) * 40 + 15; // 15-55%
        const weight2 = this.seededRandom(seed + 5678) * 40 + 15; // 15-55%
        const weight3 = this.seededRandom(seed + 9012) * 40 + 15; // 15-55%

        // Normalize to 100%
        const total = weight1 + weight2 + weight3;
        const greenThreshold = weight1 / total;
        const darkGreenThreshold = greenThreshold + (weight2 / total);

        // Biome definitions - 3 biomes with 12 tile variations each
        const BIOMES = {
            GREEN: { id: 'green', tiles: [10,11,12,13,14,15,16,17,18,19,20,21] },           // terrain_green 104-115
            DARK_GREEN: { id: 'dark_green', tiles: [30,31,32,33,34,35,36,37,38,39,40,41] }, // forest_extended 78-89
            RED: { id: 'red', tiles: [50,51,52,53,54,55,56,57,58,59,60,61] }                // forest_extended 468-479
        };

        const biomeStats = {};

        console.log(`🌍 Server biome distribution: Green=${(greenThreshold*100).toFixed(1)}% DarkGreen=${((darkGreenThreshold-greenThreshold)*100).toFixed(1)}% Red=${((1-darkGreenThreshold)*100).toFixed(1)}%`);

        // CHUNK-BASED BIOMES: Assign biome per large chunk instead of per tile
        const CHUNK_SIZE = 100; // 100x100 tile chunks = large biome regions

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Determine chunk coordinates
                const chunkX = Math.floor(x / CHUNK_SIZE);
                const chunkY = Math.floor(y / CHUNK_SIZE);

                // Use chunk coordinates to determine biome (one biome per chunk)
                const chunkHash = this.seededRandom(seed + chunkX * 1000 + chunkY);

                // Determine biome based on chunk hash and distribution
                let selectedBiome;
                if (chunkHash < greenThreshold) selectedBiome = BIOMES.GREEN;
                else if (chunkHash < darkGreenThreshold) selectedBiome = BIOMES.DARK_GREEN;
                else selectedBiome = BIOMES.RED;

                biomes[y][x] = selectedBiome.id;

                // Select random tile variation from biome
                const tileVariation = Math.floor(this.seededRandom(seed + x * 100 + y) * selectedBiome.tiles.length);
                tiles[y][x] = selectedBiome.tiles[tileVariation];

                // Track biome stats
                biomeStats[selectedBiome.id] = (biomeStats[selectedBiome.id] || 0) + 1;
            }
        }

        // Add decorations (trees, rocks, flowers, grass, logs, etc.)
        const decorationCount = Math.floor(width * height * 0.005); // 0.5% coverage for better performance
        for (let i = 0; i < decorationCount; i++) {
            const x = Math.floor(this.seededRandom(seed + i * 1000) * width);
            const y = Math.floor(this.seededRandom(seed + i * 1001) * height);
            const biome = biomes[y][x];

            let decorationType;
            const rand = this.seededRandom(seed + i);

            if (biome === 'grassland') {
                // Grassland: lots of flowers and grass (GREEN ONLY)
                if (rand < 0.5) decorationType = 'flower';
                else if (rand < 0.8) decorationType = 'grass';
                else if (rand < 0.95) decorationType = 'rock';
                else decorationType = 'baby_tree';
            }
            else if (biome === 'forest') {
                // Forest: lots of trees and vegetation (DARK GREEN)
                if (rand < 0.4) decorationType = 'tree';
                else if (rand < 0.6) decorationType = 'bush';
                else if (rand < 0.75) decorationType = 'log';
                else if (rand < 0.9) decorationType = 'tree_stump';
                else decorationType = 'grass';
            }
            else if (biome === 'desert') {
                // Desert: sparse red/orange terrain with rocks and dead trees
                if (rand < 0.4) decorationType = 'rock';
                else if (rand < 0.7) decorationType = 'dead_tree';
                else if (rand < 0.9) decorationType = 'log';
                else decorationType = 'skull';
            }
            else if (biome === 'dark') {
                // Dark Woods: spooky stuff
                if (rand < 0.4) decorationType = 'dead_tree';
                else if (rand < 0.6) decorationType = 'skull';
                else if (rand < 0.85) decorationType = 'log';
                else decorationType = 'rock';
            }
            else {
                // Fallback for other biomes
                decorationType = 'rock';
            }

            decorations.push({ x, y, type: decorationType, biome });
        }

        const biomeList = Object.entries(biomeStats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name}(${Math.round(count / (width * height) * 100)}%)`);

        return { tiles, biomes, decorations, biomeStats: biomeList };
    }

    getSpawnPoints() {
        const points = [];
        // Spawn at world center (in PIXEL coordinates)
        const TILE_SIZE = 32;
        const centerX = Math.floor(this.WORLD_SIZE / 2);
        const centerY = Math.floor(this.WORLD_SIZE / 2);
        const radius = 5;

        for (let i = 0; i < this.maxPlayers; i++) {
            const angle = (2 * Math.PI * i) / this.maxPlayers;
            const gridX = Math.round(centerX + radius * Math.cos(angle));
            const gridY = Math.round(centerY + radius * Math.sin(angle));

            // Convert to pixel coordinates
            points.push({
                x: gridX * TILE_SIZE + TILE_SIZE / 2,
                y: gridY * TILE_SIZE + TILE_SIZE / 2
            });
        }
        return points;
    }


    broadcast(event, data, filter = null) {
        this.players.forEach(player => {
            // Interest management: filter irrelevant updates
            if (filter && !filter(player, data)) {
                return; // Skip this player
            }
            io.to(player.id).emit(event, data);
        });
    }

    cleanupDistantEnemies() {
        // Remove enemies that are >100 tiles from ALL players
        const CLEANUP_DISTANCE = 100;

        this.gameState.enemies = this.gameState.enemies.filter(enemy => {
            // Check if ANY player is within range
            let nearPlayer = false;
            const cleanupDistSquared = CLEANUP_DISTANCE * CLEANUP_DISTANCE;
            this.players.forEach(player => {
                // PERFORMANCE: Use squared distance for cleanup check
                const dx = player.position.x - enemy.position.x;
                const dy = player.position.y - enemy.position.y;
                const distSquared = dx * dx + dy * dy;
                if (distSquared < cleanupDistSquared) {
                    nearPlayer = true;
                }
            });

            // If enemy is dead or far from all players, remove it
            if (!nearPlayer && !enemy.isAlive) {
                // Also clear the region so it can respawn later if player returns
                const REGION_SIZE = 50;
                const regionX = Math.floor(enemy.position.x / REGION_SIZE);
                const regionY = Math.floor(enemy.position.y / REGION_SIZE);
                const regionKey = `${regionX},${regionY}`;
                this.spawnedRegions.delete(regionKey);
                return false; // Remove
            }

            return nearPlayer || enemy.isAlive; // Keep if near player or still alive
        });
    }

    updateEnemies() {
        const tileSize = 32;
        const now = Date.now();
        let movedCount = 0;

        // Cleanup distant enemies occasionally
        if (!this.lastCleanup) this.lastCleanup = 0;
        if (now - this.lastCleanup > 10000) { // Every 10 seconds
            this.cleanupDistantEnemies();
            this.lastCleanup = now;
        }

        // Debug: Check if we have enemies
        if (this.gameState.enemies.length === 0) return;

        this.gameState.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;

            // Update every 100ms
            if (now - enemy.lastMove < 100) return;
            enemy.lastMove = now;
            movedCount++;

            // Find nearest target (player or minion)
            let target = null;
            let maxAggro = 0; // Track highest aggro value (not infinity!)

            // Skip if no players in lobby
            if (this.players.size === 0) return;

            // Debug: Log player positions for first enemy occasionally
            if (movedCount === 0 && Math.random() < 0.1) { // 10% chance for first enemy
                this.players.forEach(p => {
                    console.log(`👤 Player ${p.username} at (${p.position.x}, ${p.position.y}) for enemy targeting`);
                });
            }

            // Check all minions first (they have higher priority if they have aggro)
            if (this.gameState.minions) {
                const sightRangeSquared = enemy.sightRange * enemy.sightRange; // PERFORMANCE: Squared comparison
                const TILE_SIZE = 32;

                this.gameState.minions.forEach((minion, minionId) => {
                    // Clean up stale minions (older than 5 seconds since last update)
                    if (Date.now() - minion.lastUpdate > 5000) {
                        this.gameState.minions.delete(minionId);
                        return;
                    }

                    // Convert minion PIXEL position to GRID coordinates for comparison with enemy
                    const minionGridX = minion.position.x / TILE_SIZE;
                    const minionGridY = minion.position.y / TILE_SIZE;

                    // PERFORMANCE: Use squared distance (avoid expensive sqrt)
                    const dx = minionGridX - enemy.position.x;
                    const dy = minionGridY - enemy.position.y;
                    const distSquared = dx * dx + dy * dy;

                    // Check if minion has aggro on this enemy
                    const hasAggro = enemy.aggro && enemy.aggro.has(minionId);
                    const inSightRange = distSquared <= sightRangeSquared;

                    if (!hasAggro && !inSightRange) {
                        return; // Minion is too far and hasn't attacked this enemy
                    }

                    // Base aggro (closer = higher aggro) - need actual distance here
                    const dist = Math.sqrt(distSquared);
                    let aggroValue = 100 / (dist + 1);

                    // Add bonus aggro from damage taken
                    if (hasAggro) {
                        aggroValue += enemy.aggro.get(minionId);
                    }

                    // Minions get 1.5x aggro multiplier (tank role)
                    aggroValue *= 1.5;

                    // Target minion with highest aggro
                    if (aggroValue > maxAggro) {
                        maxAggro = aggroValue;
                        // Store GRID position for enemy movement
                        target = { position: { x: minionGridX, y: minionGridY }, id: minionId, isMinion: true };
                    }
                });
            }

            // Check all players
            const sightRangeSquared = enemy.sightRange * enemy.sightRange; // PERFORMANCE: Squared comparison
            const TILE_SIZE = 32;

            this.players.forEach(player => {
                if (!player.isAlive) {
                    // DEBUG: Log if we're skipping a dead player
                    if (Math.random() < 0.01) {
                        console.log(`⚠️ Enemy ${enemy.id} skipping dead player ${player.username}`);
                    }
                    return;
                }

                // Convert player PIXEL position to GRID coordinates for comparison with enemy
                const playerGridX = player.position.x / TILE_SIZE;
                const playerGridY = player.position.y / TILE_SIZE;

                // PERFORMANCE: Use squared distance (avoid expensive sqrt)
                const dx = playerGridX - enemy.position.x;
                const dy = playerGridY - enemy.position.y;
                const distSquared = dx * dx + dy * dy;

                // Check if player is within sight range OR has aggro (enemy remembers them)
                const hasAggro = enemy.aggro && enemy.aggro.has(player.id);
                const inSightRange = distSquared <= sightRangeSquared;

                // DEBUG: Log targeting checks occasionally
                if (Math.random() < 0.01) {
                    const dist = Math.sqrt(distSquared);
                    console.log(`🎯 Enemy ${enemy.id} checking ${player.username}: alive=${player.isAlive}, dist=${dist.toFixed(1)}, sightRange=${enemy.sightRange}, hasAggro=${!!hasAggro}, inSight=${inSightRange}`);
                }

                if (!hasAggro && !inSightRange) {
                    return; // Player is too far and hasn't attacked this enemy
                }

                // Base aggro (closer = higher aggro) - need actual distance here
                const dist = Math.sqrt(distSquared);
                let aggroValue = 100 / (dist + 1);

                // Add bonus aggro from damage taken (enemy remembers who hurt them)
                if (hasAggro) {
                    aggroValue += enemy.aggro.get(player.id);
                }

                // Target player with highest aggro
                if (aggroValue > maxAggro) {
                    maxAggro = aggroValue;
                    // Store GRID position for enemy movement
                    target = { position: { x: playerGridX, y: playerGridY }, id: player.id };
                }
            });

            // Skip if no target found
            if (!target) return;

            // DEBUG: Log when we find a target
            if (Math.random() < 0.02) {
                console.log(`🎯 Enemy ${enemy.id} found target: ${target.id}, isMinion: ${target.isMinion}, targetPos: (${target.position.x.toFixed(1)}, ${target.position.y.toFixed(1)}), enemyPos: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
            }

            // Move toward target
            const dx = target.position.x - enemy.position.x;
            const dy = target.position.y - enemy.position.y;
            const distanceSquared = dx * dx + dy * dy;

            // Only calculate sqrt when needed (for movement normalization or debug)
            let distance = null;

            // Debug: Log first enemy movement occasionally
            if (movedCount === 1 && Math.random() < 0.05) {
                distance = Math.sqrt(distanceSquared);
                console.log(`🧟 ${enemy.type} at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) targeting (${target.position.x.toFixed(1)}, ${target.position.y.toFixed(1)}), dist: ${distance.toFixed(1)}`);
            }

            if (distanceSquared > 1) {  // PERFORMANCE: Check squared distance first
                if (distance === null) distance = Math.sqrt(distanceSquared);  // Calculate only if needed
                const moveDistance = enemy.speed / 100; // Grid tiles per update (100ms)
                const newX = enemy.position.x + (dx / distance) * moveDistance;
                const newY = enemy.position.y + (dy / distance) * moveDistance;

                // SAFE ZONE CHECK: Prevent enemies from entering spawn building area
                const worldCenterX = this.WORLD_SIZE / 2;
                const worldCenterY = this.WORLD_SIZE / 2;
                const safeZoneRadius = 25; // 50x50 tiles = 25 tiles from center in each direction

                const wouldEnterSafeZone = (
                    newX >= (worldCenterX - safeZoneRadius) &&
                    newX < (worldCenterX + safeZoneRadius) &&
                    newY >= (worldCenterY - safeZoneRadius) &&
                    newY < (worldCenterY + safeZoneRadius)
                );

                // Only move if it doesn't enter the safe zone
                if (!wouldEnterSafeZone) {
                    enemy.position.x = newX;
                    enemy.position.y = newY;
                } else {
                    // Enemy is blocked by safe zone - clear aggro so they wander away
                    if (enemy.aggro) {
                        enemy.aggro.clear();
                    }
                }

                // Broadcast enemy movement (with interest management)
                this.broadcast('enemy:moved', {
                    enemyId: enemy.id,
                    position: enemy.position
                }, (player, data) => {
                    // PERFORMANCE: Only send to players within 50 tiles (2500 squared)
                    // FIX: Convert player pixel position to grid position for comparison
                    const TILE_SIZE = 32;
                    const playerGridX = player.position.x / TILE_SIZE;
                    const playerGridY = player.position.y / TILE_SIZE;
                    const dx = playerGridX - data.position.x;
                    const dy = playerGridY - data.position.y;
                    const distSquared = dx * dx + dy * dy;
                    return distSquared < 2500;  // 50 * 50 = 2500
                });
            }

            // Attack if close enough (1.5 tiles -> 2.25 squared)
            // NOTE: distanceSquared is already calculated in GRID coordinates above
            if (distanceSquared < 2.25) {  // PERFORMANCE: 1.5 * 1.5 = 2.25
                // Attack target (player or minion)
                if (target.isMinion) {
                    // Attack minion
                    this.broadcast('minion:damaged', {
                        minionId: target.id,
                        damage: enemy.damage,
                        attackerId: enemy.id,
                        enemyPosition: { x: enemy.position.x, y: enemy.position.y }
                    });
                } else {
                    // Attack player
                    const damageTarget = Array.from(this.players.values()).find(p => p.id === target.id);
                    if (damageTarget && damageTarget.isAlive) {
                        damageTarget.health -= enemy.damage;

                        // Track damage taken for stats
                        if (damageTarget.damageTaken !== undefined) {
                            damageTarget.damageTaken += enemy.damage;
                        }

                        if (damageTarget.health <= 0) {
                            damageTarget.isAlive = false;
                            damageTarget.health = 0;
                            damageTarget.deaths++;

                            console.log(`💀 ${damageTarget.username} died - resetting to level 1`);

                            // FULL RESET - Roguelike death penalty
                            damageTarget.level = 1;
                            damageTarget.experience = 0;
                            damageTarget.selectedSkills = [];
                            damageTarget.permanentMinions = [];

                            // Reset stats to class defaults
                            damageTarget.stats = damageTarget.getClassStats(damageTarget.class);
                            damageTarget.health = damageTarget.maxHealth;

                            // Reset all multipliers
                            damageTarget.initializeMultipliers();

                            // Respawn at spawn point (center of world) in PIXEL coordinates
                            const TILE_SIZE = 32;
                            const worldCenterGrid = Math.floor(this.WORLD_SIZE / 2);
                            damageTarget.position = {
                                x: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2,
                                y: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2
                            };

                            console.log(`♻️ ${damageTarget.username} reset: Level ${damageTarget.level}, Health ${damageTarget.health}/${damageTarget.maxHealth}`);

                            // Clear aggro from all enemies
                            this.gameState.enemies.forEach(e => {
                                if (e.aggro && e.aggro.has(damageTarget.id)) {
                                    e.aggro.delete(damageTarget.id);
                                }
                            });

                            this.broadcast('player:died', {
                                playerId: damageTarget.id,
                                playerName: damageTarget.username,
                                killedBy: enemy.id,
                                position: damageTarget.position
                            });

                            // After death animation, send respawn data
                            setTimeout(() => {
                                damageTarget.isAlive = true;
                                damageTarget.justRespawned = true; // DEBUG FLAG

                                console.log(`♻️ ${damageTarget.username} respawned at (${damageTarget.position.x}, ${damageTarget.position.y}), isAlive=${damageTarget.isAlive}`);

                                // Find the player's socket
                                const playerSocket = Array.from(io.sockets.sockets.values())
                                    .find(s => players.get(s.id)?.id === damageTarget.id);

                                if (playerSocket) {
                                    playerSocket.emit('player:respawned', {
                                        ...damageTarget.toJSON(),
                                        respawnPosition: damageTarget.position
                                    });
                                }

                                this.broadcast('player:respawned', {
                                    playerId: damageTarget.id,
                                    playerName: damageTarget.username,
                                    position: damageTarget.position,
                                    health: damageTarget.health,
                                    maxHealth: damageTarget.maxHealth,
                                    level: damageTarget.level
                                });

                                // Clear flag after 5 seconds
                                setTimeout(() => {
                                    damageTarget.justRespawned = false;
                                }, 5000);
                            }, 3000); // 3 second death delay
                        } else {
                            this.broadcast('player:damaged', {
                                playerId: damageTarget.id,
                                health: damageTarget.health,
                                maxHealth: damageTarget.maxHealth,
                                damage: enemy.damage,
                                attackerId: enemy.id,
                                enemyPosition: { x: enemy.position.x, y: enemy.position.y },
                                playerPosition: { x: target.position.x, y: target.position.y }
                            });
                        }
                    }
                }
            }
        });
    }

    toJSON() {
        return {
            id: this.id,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            status: this.status,
            difficulty: this.difficulty,
            floor: this.gameState.floor
        };
    }
}

// Rate limiting
function checkRateLimit(socketId, action) {
    const key = `${socketId}_${action}`;
    const now = Date.now();
    const lastAction = rateLimits.get(key) || 0;

    if (now - lastAction < RATE_LIMIT_INTERVAL) {
        return false; // Rate limited
    }

    rateLimits.set(key, now);
    return true;
}

// Matchmaking - Find active game or create new one
function findOrCreateLobby(difficulty = 'normal') {
    // Find active game with space and matching difficulty
    for (const [lobbyId, lobby] of lobbies.entries()) {
        if (lobby.status === 'active' &&
            lobby.players.size < lobby.maxPlayers &&
            lobby.difficulty === difficulty) {
            return lobby;
        }
    }

    // Create new game (starts immediately with dungeon)
    const newLobby = new Lobby(difficulty);
    lobbies.set(newLobby.id, newLobby);
    console.log(`🆕 Created new game ${newLobby.id.slice(0, 8)} (${difficulty}) - Ready for players!`);
    return newLobby;
}

// Validation helpers
function isValidPosition(position, worldSize = 1000) {
    // Position is now in PIXELS, so validate against worldSize * TILE_SIZE
    const TILE_SIZE = 32;
    const maxPixelCoord = worldSize * TILE_SIZE;
    return position &&
           typeof position.x === 'number' &&
           typeof position.y === 'number' &&
           position.x >= 0 && position.x < maxPixelCoord &&
           position.y >= 0 && position.y < maxPixelCoord;
}

function sanitizeMessage(message) {
    if (typeof message !== 'string') return '';
    return message.slice(0, MAX_MESSAGE_LENGTH).trim();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    metrics.totalPlayers++;
    if (players.size + 1 > metrics.peakPlayers) {
        metrics.peakPlayers = players.size + 1;
    }

    // Handle player joining
    socket.on('player:join', (data) => {
        try {
            const { username, characterClass, difficulty } = data || {};

            // Check if player is reconnecting
            const disconnectedPlayer = disconnectedPlayers.get(username);
            let player;

            if (disconnectedPlayer && Date.now() - disconnectedPlayer.disconnectedAt < RECONNECT_TIMEOUT) {
                // Reconnection - restore player but reset vital stats
                player = disconnectedPlayer;
                player.id = socket.id;
                player.isReconnecting = false;
                player.disconnectedAt = null;
                player.isAlive = true; // Reset to alive on reconnect
                player.health = player.maxHealth; // Restore full health
                disconnectedPlayers.delete(username);
                console.log(`🔄 ${username} reconnected (restored to full health)`);
            } else {
                // New player
                player = new Player(socket.id, username);
                if (characterClass && typeof characterClass === 'string') {
                    player.class = characterClass;
                    player.stats = player.getClassStats(characterClass);
                }
            }

            players.set(socket.id, player);

            // Find or create lobby
            const lobby = findOrCreateLobby(difficulty || 'normal');
            const result = lobby.addPlayer(player);

            if (!result.success) {
                socket.emit('error', { message: result.error });
                return;
            }

            socket.join(lobby.id);

            // Send game start immediately (no lobby waiting!)
            // Filter out disconnected/reconnecting players (ghost players)
            const activePlayers = Array.from(lobby.players.values())
                .filter(p => !p.isReconnecting)
                .map(p => p.toJSON());

            // Send world data
            const worldData = lobby.getWorldData();

            // Spawn initial enemies around spawn point (center of world)
            const REGION_SIZE = 50;
            const spawnRegionX = Math.floor(lobby.WORLD_SIZE / 2 / REGION_SIZE);
            const spawnRegionY = Math.floor(lobby.WORLD_SIZE / 2 / REGION_SIZE);

            // Spawn enemies in 3x3 regions around spawn
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    lobby.spawnEnemiesInRegion(spawnRegionX + dx, spawnRegionY + dy);
                }
            }

            // Convert minions Map to array for transmission
            const minionsArray = lobby.gameState.minions
                ? Array.from(lobby.gameState.minions.values())
                : [];

            // Filter game state to only include alive enemies
            const filteredGameState = {
                ...lobby.gameState,
                enemies: lobby.gameState.enemies.filter(e => e.isAlive !== false)
            };

            socket.emit('game:start', {
                lobbyId: lobby.id,
                player: player.toJSON(),
                players: activePlayers,
                gameState: filteredGameState,
                world: worldData,
                difficulty: lobby.difficulty,
                playerCount: lobby.players.size,
                maxPlayers: lobby.maxPlayers,
                minions: minionsArray  // Send existing minions to new player
            });

            // Notify others that a new player joined the active game
            socket.to(lobby.id).emit('player:joined', {
                player: player.toJSON(),
                playerCount: lobby.players.size
            });

        } catch (error) {
            console.error('Error in player:join:', error);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    // Handle batched updates
    socket.on('batch:update', (updates) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            // DEBUG: Log batch updates after respawn
            if (player.justRespawned && updates.some(u => u.type === 'move')) {
                console.log(`📦 BATCH: Received ${updates.length} updates from ${player.username}, processing...`);
            }

            // Process each update in the batch
            updates.forEach(update => {
                if (update.type === 'move') {
                    // Handle delta or absolute position
                    if (update.data.delta) {
                        player.position.x += update.data.delta.x;
                        player.position.y += update.data.delta.y;
                    } else if (update.data.position) {
                        player.position = update.data.position;
                    }

                    // DEBUG: Log position updates after respawn
                    if (player.justRespawned) {
                        console.log(`📍 POST-RESPAWN (BATCH): ${player.username} moved to (${player.position.x}, ${player.position.y}), isAlive=${player.isAlive}, delta=${!!update.data.delta}`);
                        player.justRespawned = false; // Only log first move
                    }

                    // Validate position
                    if (!isValidPosition(player.position)) {
                        return;
                    }

                    player.updateActivity();

                    // Check if player entered new region - spawn enemies dynamically
                    // Convert pixel position to grid position for region calculation
                    const TILE_SIZE = 32;
                    const REGION_SIZE = 50;
                    const gridX = Math.floor(player.position.x / TILE_SIZE);
                    const gridY = Math.floor(player.position.y / TILE_SIZE);
                    const regionX = Math.floor(gridX / REGION_SIZE);
                    const regionY = Math.floor(gridY / REGION_SIZE);

                    // Check surrounding regions (player can see beyond current region)
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const newEnemies = lobby.spawnEnemiesInRegion(regionX + dx, regionY + dy);
                            if (newEnemies.length > 0) {
                                // Broadcast new enemies to nearby players
                                newEnemies.forEach(enemy => {
                                    lobby.broadcast('enemy:spawned', { enemy });
                                });
                            }
                        }
                    }

                    // Interest management: only send to nearby players
                    lobby.broadcast('player:moved', {
                        playerId: player.id,
                        position: player.position
                    }, (p, data) => {
                        if (p.id === player.id) return false; // Don't send to self
                        // PERFORMANCE: Use squared distance for broadcast filter
                        const dx = p.position.x - data.position.x;
                        const dy = p.position.y - data.position.y;
                        const distSquared = dx * dx + dy * dy;
                        return distSquared < 640000; // 800 * 800 = 640000 (approx 25 tiles)
                    });
                }
            });
        } catch (error) {
            console.error('Error in batch:update:', error);
        }
    });

    // Handle player movement (legacy support)
    socket.on('player:move', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'move')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            if (!isValidPosition(data.position)) return;

            // Debug: Log first position update for each player
            if (!player.hasLoggedPosition) {
                console.log(`📍 Received initial position for ${player.username}: (${data.position.x}, ${data.position.y})`);
                player.hasLoggedPosition = true;
            }

            // DEBUG: Log position updates after respawn
            if (player.justRespawned) {
                console.log(`📍 POST-RESPAWN: ${player.username} moved to (${data.position.x}, ${data.position.y}), isAlive=${player.isAlive}`);
                player.justRespawned = false; // Only log first move
            }

            player.position = data.position;
            player.updateActivity();

            socket.to(lobby.id).emit('player:moved', {
                playerId: player.id,
                position: player.position
            });
        } catch (error) {
            console.error('Error in player:move:', error);
        }
    });

    // Handle map change (interior/exterior)
    socket.on('player:changeMap', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { mapName } = data;
            if (mapName !== 'interior' && mapName !== 'exterior') return;

            player.currentMap = mapName;
            console.log(`🚪 ${player.username} moved to ${mapName}`);

            // Broadcast map change to other players
            socket.to(lobby.id).emit('player:changedMap', {
                playerId: player.id,
                mapName: mapName
            });
        } catch (error) {
            console.error('Error in player:changeMap:', error);
        }
    });

    // Handle player attack
    socket.on('player:attack', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'attack')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId || !player.isAlive) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            player.updateActivity();

            lobby.broadcast('player:attacked', {
                playerId: player.id,
                target: data.target,
                damage: data.damage || player.stats.strength,
                position: player.position
            });
        } catch (error) {
            console.error('Error in player:attack:', error);
        }
    });

    // Handle enemy hit
    socket.on('enemy:hit', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const enemy = lobby.gameState.enemies.find(e => e.id === data.enemyId);
            if (!enemy || !enemy.isAlive) {
                // Enemy doesn't exist on server, tell all clients to remove it (fixes desync)
                lobby.broadcast('enemy:despawned', { enemyId: data.enemyId });
                return;
            }

            const damage = data.damage || player.stats.strength;

            // Debug: Log minion attacks to troubleshoot damage issues
            if (data.attackerId && data.attackerId.includes('minion_')) {
                console.log(`🔮 Minion attack: ${data.attackerId} dealt ${damage} damage to ${data.enemyId} (health: ${enemy.health} -> ${enemy.health - damage})`);
            }

            enemy.health -= damage;
            player.updateActivity();

            // Track damage dealt for stats
            if (player.damageDealt !== undefined) {
                player.damageDealt += damage;
            }

            // Apply effects (bleed, knockback, etc.)
            if (data.effects) {
                if (data.effects.bleed && !data.effects.isBleedDamage) {
                    // Initialize bleed tracking
                    if (!enemy.bleedStacks) {
                        enemy.bleedStacks = 0;
                        enemy.bleedTimers = [];
                    }

                    // Add bleed stack (max 10 stacks)
                    enemy.bleedStacks = Math.min(enemy.bleedStacks + 1, 10);

                    const bleedConfig = data.effects.bleed;

                    // Start bleed damage timer for this stack
                    const bleedInterval = setInterval(() => {
                        if (enemy.isAlive && enemy.bleedStacks > 0) {
                            const bleedDamage = bleedConfig.damagePerStack * enemy.bleedStacks;
                            enemy.health -= bleedDamage;

                            // Broadcast bleed damage
                            lobby.broadcast('enemy:damaged', {
                                enemyId: enemy.id,
                                damage: bleedDamage,
                                health: enemy.health,
                                maxHealth: enemy.maxHealth,
                                isBleed: true
                            });

                            // Check if enemy died from bleed
                            if (enemy.health <= 0) {
                                enemy.isAlive = false;
                                lobby.broadcast('enemy:died', {
                                    enemyId: enemy.id,
                                    killerId: player.id,
                                    position: enemy.position
                                });
                                clearInterval(bleedInterval);
                            }
                        } else {
                            clearInterval(bleedInterval);
                        }
                    }, bleedConfig.tickRate);

                    enemy.bleedTimers.push(bleedInterval);

                    // Remove this bleed stack after duration
                    setTimeout(() => {
                        if (enemy.bleedStacks > 0) {
                            enemy.bleedStacks--;
                        }
                        clearInterval(bleedInterval);
                        const index = enemy.bleedTimers.indexOf(bleedInterval);
                        if (index > -1) enemy.bleedTimers.splice(index, 1);
                    }, bleedConfig.duration);
                }
                if (data.effects.knockback && enemy.position) {
                    // Convert pixel positions to tile positions
                    const sourceX = data.effects.knockback.sourceX / 32;
                    const sourceY = data.effects.knockback.sourceY / 32;

                    const dx = enemy.position.x - sourceX;
                    const dy = enemy.position.y - sourceY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 0) {
                        const knockbackTiles = data.effects.knockback.distance / 32;
                        const oldX = enemy.position.x;
                        const oldY = enemy.position.y;

                        enemy.position.x += (dx / distance) * knockbackTiles;
                        enemy.position.y += (dy / distance) * knockbackTiles;

                        // Mark when knockback happened to prevent immediate position updates
                        enemy.lastKnockback = Date.now();

                        // Broadcast the knockback position immediately (in tiles, not pixels)
                        lobby.broadcast('enemy:moved', {
                            enemyId: enemy.id,
                            position: {
                                x: enemy.position.x,
                                y: enemy.position.y
                            },
                            bleedStacks: enemy.bleedStacks || 0
                        });
                    }
                }
            }

            // Add aggro for the attacker (could be player or minion)
            const attackerId = data.attackerId || player.id;
            if (!enemy.aggro) enemy.aggro = new Map();
            const currentAggro = enemy.aggro.get(attackerId) || 0;
            enemy.aggro.set(attackerId, currentAggro + damage * 2); // Damage generates 2x aggro

            // If it's a minion attack, track the minion's position
            if (data.attackerId && data.attackerId.includes('minion_') && data.attackerPosition) {
                if (!lobby.gameState.minions) lobby.gameState.minions = new Map();
                lobby.gameState.minions.set(data.attackerId, {
                    id: data.attackerId,
                    position: data.attackerPosition,
                    ownerId: player.id,
                    lastUpdate: Date.now()
                });
            }

            if (enemy.health <= 0) {
                enemy.isAlive = false;
                player.kills++;

                // Award XP (1 XP per kill for testing)
                player.experience += 1;

                // Check for level up (1 XP = 1 level for testing)
                const oldLevel = player.level;
                const newLevel = player.experience; // 1 XP = 1 level

                if (newLevel > oldLevel) {
                    player.level = newLevel;

                    // Level up! Increase stats
                    player.maxHealth += 10;
                    player.health = player.maxHealth; // Heal to full on level up
                    player.stats.strength += 2;
                    player.stats.defense += 1;

                    console.log(`🎉 ${player.username} leveled up! ${oldLevel} -> ${newLevel}`);

                    lobby.broadcast('player:levelup', {
                        playerId: player.id,
                        playerName: player.username,
                        level: player.level,
                        experience: player.experience,
                        health: player.health,
                        maxHealth: player.maxHealth,
                        stats: player.stats
                    });
                }

                lobby.broadcast('enemy:killed', {
                    enemyId: data.enemyId,
                    killedBy: player.id,
                    killerName: player.username,
                    experience: player.experience,
                    level: player.level
                });
            } else {
                lobby.broadcast('enemy:damaged', {
                    enemyId: data.enemyId,
                    health: enemy.health,
                    maxHealth: enemy.maxHealth,
                    damage: damage,
                    effects: data.effects
                });
            }
        } catch (error) {
            console.error('Error in enemy:hit:', error);
        }
    });

    // Handle item pickup
    socket.on('item:pickup', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const itemIndex = lobby.gameState.items.findIndex(i => i.id === data.itemId);
            if (itemIndex === -1) return;

            const item = lobby.gameState.items[itemIndex];
            lobby.gameState.items.splice(itemIndex, 1);

            player.inventory.push(item);
            player.itemsCollected++;
            player.updateActivity();

            // Apply item effects
            if (item.effect) {
                if (item.effect.health) {
                    player.health = Math.min(player.maxHealth, player.health + item.effect.health);
                }
                if (item.effect.strength) {
                    player.stats.strength += item.effect.strength;
                }
                if (item.effect.defense) {
                    player.stats.defense += item.effect.defense;
                }
            }

            lobby.broadcast('item:picked', {
                itemId: data.itemId,
                playerId: player.id,
                playerName: player.username,
                item: item,
                newStats: player.toJSON()
            });
        } catch (error) {
            console.error('Error in item:pickup:', error);
        }
    });

    // Handle minion position updates
    socket.on('minion:position', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            // Update minion position in game state so enemies can target it
            if (!lobby.gameState.minions) lobby.gameState.minions = new Map();

            const existingMinion = lobby.gameState.minions.get(data.minionId);
            const isNew = !existingMinion;
            const now = Date.now();

            // Minimal throttling - broadcast every 16ms (60fps) OR any movement
            // Ultra-smooth multiplayer movement
            let shouldBroadcast = isNew;
            if (!isNew && existingMinion) {
                const timeSinceLastBroadcast = now - (existingMinion.lastBroadcast || 0);
                const dx = Math.abs(data.position.x - existingMinion.position.x);
                const dy = Math.abs(data.position.y - existingMinion.position.y);
                const anyMovement = dx > 0 || dy > 0;

                shouldBroadcast = timeSinceLastBroadcast >= 16 || anyMovement;
            }

            lobby.gameState.minions.set(data.minionId, {
                id: data.minionId,
                position: data.position,
                ownerId: player.id,
                isPermanent: data.isPermanent || false,
                animationState: data.animationState || 'minion_idle',
                flipX: data.flipX || false,
                lastUpdate: now,
                lastBroadcast: shouldBroadcast ? now : (existingMinion?.lastBroadcast || now)
            });

            // If this is a new minion, broadcast spawn event to other players
            if (isNew) {
                socket.to(lobby.id).emit('minion:spawned', {
                    minionId: data.minionId,
                    position: data.position,
                    ownerId: player.id,
                    isPermanent: data.isPermanent || false,
                    animationState: data.animationState || 'minion_idle',
                    flipX: data.flipX || false
                });
                console.log(`🔮 Broadcasted minion spawn: ${data.minionId} for ${player.username}`);
            } else if (shouldBroadcast) {
                // For existing minions, broadcast position update to other players (throttled)
                socket.to(lobby.id).emit('minion:moved', {
                    minionId: data.minionId,
                    position: data.position,
                    ownerId: player.id,
                    animationState: data.animationState || 'minion_idle',
                    flipX: data.flipX || false
                });
                console.log(`🚶 Broadcasted minion move: ${data.minionId} to (${data.position.x}, ${data.position.y})`);
            }
        } catch (error) {
            console.error('Error in minion:position:', error);
        }
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'chat')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const message = sanitizeMessage(data.message);
            if (!message) return;

            player.updateActivity();

            lobby.broadcast('chat:message', {
                playerId: player.id,
                username: player.username,
                message: message,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error in chat:message:', error);
        }
    });

    // Handle player death
    socket.on('player:death', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            player.isAlive = false;
            player.deaths++;

            console.log(`💀 ${player.username} died - resetting to level 1`);

            // FULL RESET - Roguelike death penalty
            player.level = 1;
            player.experience = 0;
            player.selectedSkills = [];
            player.permanentMinions = [];

            // Reset stats to class defaults
            player.stats = player.getClassStats(player.class);
            player.health = player.maxHealth;

            // Reset all multipliers
            player.initializeMultipliers();

            // Respawn at spawn point (center of world) in PIXEL coordinates
            const TILE_SIZE = 32;
            const worldCenterGrid = Math.floor(lobby.WORLD_SIZE / 2);
            player.position = {
                x: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2,
                y: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2
            };

            console.log(`♻️ ${player.username} reset: Level ${player.level}, Health ${player.health}/${player.maxHealth}`);

            lobby.broadcast('player:died', {
                playerId: player.id,
                playerName: player.username,
                killedBy: data.killedBy,
                position: player.position
            });

            // After death animation, send respawn data
            setTimeout(() => {
                player.isAlive = true;
                socket.emit('player:respawned', {
                    ...player.toJSON(),
                    respawnPosition: player.position
                });

                lobby.broadcast('player:respawned', {
                    playerId: player.id,
                    playerName: player.username,
                    position: player.position,
                    health: player.health,
                    maxHealth: player.maxHealth,
                    level: player.level
                });
            }, 3000); // 3 second death delay
        } catch (error) {
            console.error('Error in player:death:', error);
        }
    });


    // Handle skill selection
    socket.on('skill:selected', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const { skill, multipliers } = data;

            // Validate skill data
            if (!skill || !skill.id) {
                console.error('Invalid skill data received');
                return;
            }

            // Add skill to player's skill list
            player.selectedSkills.push(skill);

            // Update multipliers from client
            if (multipliers) {
                Object.keys(multipliers).forEach(key => {
                    if (player.hasOwnProperty(key)) {
                        player[key] = multipliers[key];
                    }
                });
            }

            console.log(`✨ ${player.username} selected skill: ${skill.name}`);

            // Broadcast updated player data
            lobby.broadcast('player:skillUpdate', {
                playerId: player.id,
                skill: skill,
                multipliers: multipliers
            });
        } catch (error) {
            console.error('Error in skill:selected:', error);
        }
    });

    // Track permanent minions
    socket.on('minion:permanent', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const { minionId, action } = data;

            if (action === 'add') {
                if (!player.permanentMinions.includes(minionId)) {
                    player.permanentMinions.push(minionId);
                    console.log(`👹 ${player.username} gained permanent minion: ${minionId}`);
                }
            } else if (action === 'remove') {
                const index = player.permanentMinions.indexOf(minionId);
                if (index > -1) {
                    player.permanentMinions.splice(index, 1);
                    console.log(`💀 ${player.username} lost permanent minion: ${minionId}`);
                }
            }
        } catch (error) {
            console.error('Error in minion:permanent:', error);
        }
    });

    // Handle Malachar healing minions
    socket.on('minion:heal', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { minionId, healAmount, position } = data;

            // Broadcast heal effect to all players
            lobby.broadcast('minion:healed', {
                minionId: minionId,
                healAmount: healAmount,
                playerId: player.id,
                position: position
            });

            console.log(`💚 ${player.username} healed minion ${minionId} for ${healAmount} HP`);
        } catch (error) {
            console.error('Error in minion:heal:', error);
        }
    });

    // Handle minion spawn requests (server-authoritative)
    socket.on('minion:requestSpawn', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { position, isPermanent, minionId } = data;

            // Check permanent minion cap for this specific player
            if (isPermanent) {
                const currentPermanentCount = player.permanentMinions.length;
                const minionCap = player.minionCap || 5; // Default cap is 5

                if (currentPermanentCount >= minionCap && !player.permanentMinions.includes(minionId)) {
                    console.log(`⛔ ${player.username} hit permanent minion cap (${currentPermanentCount}/${minionCap})`);
                    return; // Reject spawn
                }
            }

            // Add to permanent minions tracking
            if (isPermanent && !player.permanentMinions.includes(minionId)) {
                player.permanentMinions.push(minionId);
            }

            // Add to game state
            lobby.gameState.minions.set(minionId, {
                id: minionId,
                position: position,
                ownerId: player.id,
                isPermanent: isPermanent || false,
                lastUpdate: Date.now()
            });

            // Broadcast spawn to ALL players in lobby (including requester)
            lobby.broadcast('minion:spawned', {
                minionId: minionId,
                position: position,
                ownerId: player.id,
                isPermanent: isPermanent || false
            });

            console.log(`🔮 ${player.username} spawned minion ${minionId} (permanent: ${isPermanent}) [${player.permanentMinions.length}/${player.minionCap || 5}]`);
        } catch (error) {
            console.error('Error in minion:requestSpawn:', error);
        }
    });

    // Handle minion death
    socket.on('minion:death', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const { minionId, isPermanent } = data;

            // Remove from server state
            if (lobby.gameState.minions) {
                lobby.gameState.minions.delete(minionId);
            }

            // Remove from permanent minions list
            if (isPermanent && player.permanentMinions) {
                const index = player.permanentMinions.indexOf(minionId);
                if (index > -1) {
                    player.permanentMinions.splice(index, 1);
                }
            }

            // Broadcast death to all players
            lobby.broadcast('minion:died', {
                minionId: minionId,
                ownerId: player.id
            });

            console.log(`💀 ${player.username}'s minion ${minionId} died (permanent: ${isPermanent})`);
        } catch (error) {
            console.error('Error in minion:death:', error);
        }
    });

    // Request skill restoration (on reconnect/respawn)
    socket.on('skills:requestRestore', () => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            // Send all player data including skills and multipliers
            socket.emit('skills:restored', player.toJSON());
        } catch (error) {
            console.error('Error in skills:requestRestore:', error);
        }
    });

    // Handle Malachar ability usage
    socket.on('ability:use', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            if (data.targetMinionId) {
                console.log(`✨ ${player.username} used ${data.abilityName} on minion ${data.targetMinionId}`);
            } else {
                console.log(`✨ ${player.username} used ${data.abilityName} on player ${data.targetPlayerId}`);
            }
            console.log(`   Lobby has ${lobby.players.length} players`);

            // Broadcast to all players in lobby (including the caster for confirmation)
            let sentCount = 0;
            lobby.players.forEach(p => {
                const targetSocket = io.sockets.sockets.get(p.id);
                console.log(`   → Sending to ${p.username} (${p.id}): ${targetSocket ? 'SUCCESS' : 'FAILED - Socket not found'}`);
                if (targetSocket) {
                    targetSocket.emit('ability:used', {
                        playerId: socket.id,
                        playerName: player.username,
                        abilityKey: data.abilityKey,
                        abilityName: data.abilityName,
                        targetPlayerId: data.targetPlayerId,
                        targetMinionId: data.targetMinionId, // For auto-attacks targeting minions
                        effects: data.effects
                    });
                    sentCount++;
                }
            });
            console.log(`   📤 Broadcast sent to ${sentCount}/${lobby.players.length} players`);
        } catch (error) {
            console.error('Error in ability:use:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);

        const player = players.get(socket.id);

        // Save player stats to database
        if (player && process.env.DATABASE_URL) {
            const sessionPlaytime = Date.now() - player.sessionStartTime;
            await db.updatePlayerStats(player.id, player.username, {
                kills: player.kills || 0,
                deaths: player.deaths || 0,
                damageDealt: player.damageDealt || 0,
                damageTaken: player.damageTaken || 0,
                playtime: sessionPlaytime
            }).catch(err => console.error('Failed to save player stats:', err));
        }

        if (player && player.lobbyId) {
            const lobby = lobbies.get(player.lobbyId);

            if (lobby) {
                // Allow reconnection window
                player.disconnectedAt = Date.now();
                player.isReconnecting = true;
                disconnectedPlayers.set(player.username, player);

                // Remove after timeout
                setTimeout(() => {
                    if (disconnectedPlayers.has(player.username)) {
                        disconnectedPlayers.delete(player.username);
                        lobby.removePlayer(socket.id);

                        socket.to(lobby.id).emit('player:left', {
                            playerId: player.id,
                            username: player.username,
                            playerCount: lobby.players.size
                        });

                        // Auto-close room if all players left
                        if (lobby.status === 'finished') {
                            lobbies.delete(lobby.id);
                            console.log(`🗑️  Deleted empty room ${lobby.id.slice(0, 8)} from lobbies map`);
                        }
                    }
                }, RECONNECT_TIMEOUT);

                // Immediate notification of disconnect
                socket.to(lobby.id).emit('player:disconnected', {
                    playerId: player.id,
                    username: player.username,
                    canReconnect: true,
                    timeout: RECONNECT_TIMEOUT
                });
            }
        }

        players.delete(socket.id);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        lobbies: lobbies.size,
        activePlayers: players.size,
        disconnectedPlayers: disconnectedPlayers.size,
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
    });
});

// Stats endpoint
app.get('/stats', (req, res) => {
    const lobbyStats = Array.from(lobbies.values()).map(lobby => ({
        id: lobby.id.slice(0, 8),
        playerCount: lobby.players.size,
        status: lobby.status,
        difficulty: lobby.difficulty,
        floor: lobby.gameState.floor
    }));

    res.json({
        totalLobbies: lobbies.size,
        activePlayers: players.size,
        lobbies: lobbyStats,
        metrics: metrics,
        serverUptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Global stats endpoint (from database)
app.get('/global-stats', async (req, res) => {
    try {
        if (!process.env.DATABASE_URL) {
            return res.json({
                totalKills: 0,
                totalDeaths: 0,
                totalPlayers: 0,
                error: 'Database not configured'
            });
        }

        const result = await db.pool.query(`
            SELECT
                COALESCE(SUM(total_kills), 0) as total_kills,
                COALESCE(SUM(total_deaths), 0) as total_deaths,
                COALESCE(SUM(total_damage_dealt), 0) as total_damage_dealt,
                COUNT(*) as total_players
            FROM player_stats
        `);

        const stats = result.rows[0];
        res.json({
            totalKills: parseInt(stats.total_kills),
            totalDeaths: parseInt(stats.total_deaths),
            totalDamageDealt: parseInt(stats.total_damage_dealt),
            totalPlayers: parseInt(stats.total_players),
            activePlayers: players.size,
            activeLobbies: lobbies.size
        });
    } catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        ...metrics,
        currentPlayers: players.size,
        currentLobbies: lobbies.size,
        uptime: process.uptime()
    });
});

// AFK check interval
setInterval(() => {
    players.forEach((player, socketId) => {
        if (player.isAFK() && player.lobbyId) {
            console.log(`⏰ Kicking AFK player: ${player.username}`);
            io.to(socketId).emit('kicked', { reason: 'AFK' });
            io.to(socketId).disconnect(true);
        }
    });
}, 60000); // Check every minute

// Game loop - update enemy AI
setInterval(() => {
    lobbies.forEach((lobby) => {
        if (lobby.status === 'active') {
            lobby.updateEnemies();
        }
    });
}, 350); // PERFORMANCE: Update every 350ms (reduced from 200ms for 0.1 CPU tier)

// Cleanup old lobbies
setInterval(() => {
    const now = Date.now();
    for (const [lobbyId, lobby] of lobbies.entries()) {
        if (lobby.status === 'finished' && (now - lobby.createdAt) > 300000) {
            lobbies.delete(lobbyId);
            console.log(`🧹 Cleaned up lobby ${lobbyId.slice(0, 8)}`);
        }
    }
}, 300000); // Every 5 minutes

// Cleanup rate limits
setInterval(() => {
    rateLimits.clear();
}, 600000); // Every 10 minutes

// Periodic player stats save (every 60 seconds)
setInterval(async () => {
    if (!process.env.DATABASE_URL) return;

    let savedCount = 0;
    for (const [socketId, player] of players.entries()) {
        if (player && player.id) {
            try {
                const sessionPlaytime = Date.now() - player.sessionStartTime;
                await db.updatePlayerStats(player.id, player.username, {
                    kills: player.kills || 0,
                    deaths: player.deaths || 0,
                    damageDealt: player.damageDealt || 0,
                    damageTaken: player.damageTaken || 0,
                    playtime: sessionPlaytime
                });
                savedCount++;
            } catch (err) {
                console.error(`Failed to save stats for ${player.username}:`, err.message);
            }
        }
    }

    if (savedCount > 0) {
        console.log(`💾 Auto-saved stats for ${savedCount} active player(s)`);
    }
}, 60000); // Every 60 seconds

// Start server
server.listen(PORT, async () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     🎮 KLYRA MULTIPLAYER SERVER v2.0                 ║
║                                                       ║
║  Port: ${PORT.toString().padEnd(44)} ║
║  Status: ONLINE ✅                                    ║
║                                                       ║
║  Endpoints:                                           ║
║  - GET /health   - Server health                      ║
║  - GET /stats    - Game statistics                    ║
║  - GET /metrics  - Performance metrics                ║
╚═══════════════════════════════════════════════════════╝
    `);

    // Initialize database
    if (process.env.DATABASE_URL) {
        await db.initDatabase();
    } else {
        console.warn('⚠️  DATABASE_URL not set - stats will not persist');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received: shutting down gracefully');

    // Notify all players
    io.emit('server:shutdown', {
        message: 'Server is restarting. Please reconnect in a moment.',
        timestamp: Date.now()
    });

    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
