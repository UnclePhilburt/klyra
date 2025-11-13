const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: ["https://klyra.lol", "http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"],
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

const PORT = process.env.PORT || 3000;

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
        this.itemsCollected = 0;
        this.lastActivity = Date.now();
        this.isReconnecting = false;
        this.disconnectedAt = null;
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
            itemsCollected: this.itemsCollected
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

    // Spawn enemies in a region (called when players explore new areas)
    spawnEnemiesInRegion(regionX, regionY) {
        const regionKey = `${regionX},${regionY}`;

        // Skip if already spawned
        if (this.spawnedRegions.has(regionKey)) return [];

        this.spawnedRegions.add(regionKey);

        const REGION_SIZE = 50; // 50x50 tile regions
        const enemiesPerRegion = 5; // Much more reasonable!
        const newEnemies = [];

        // Use seed for consistent spawning
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const regionSeed = seed + regionX * 7919 + regionY * 6563;

        for (let i = 0; i < enemiesPerRegion; i++) {
            // Seeded random for this enemy
            const enemySeed = regionSeed + i * 1000;
            const x = regionX * REGION_SIZE + Math.floor(this.seededRandom(enemySeed) * REGION_SIZE);
            const y = regionY * REGION_SIZE + Math.floor(this.seededRandom(enemySeed + 1) * REGION_SIZE);

            // Clamp to world bounds
            if (x < 0 || x >= this.WORLD_SIZE || y < 0 || y >= this.WORLD_SIZE) continue;

            const enemy = {
                id: `${this.id}_enemy_${regionKey}_${i}`,
                type: 'wolf',
                position: { x, y },
                health: 100,
                maxHealth: 100,
                damage: 10,
                speed: 80,
                isAlive: true,
                sightRange: 15,
                lastMove: 0
            };

            this.gameState.enemies.push(enemy);
            newEnemies.push(enemy);
        }

        console.log(`✨ Spawned ${newEnemies.length} enemies in region (${regionX}, ${regionY})`);
        return newEnemies;
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

        // Generate biome map using noise - MASSIVE regions with hard boundaries
        // Add buffer zones to thresholds for clearer separation
        const bufferedGreenThreshold = greenThreshold - 0.025;
        const bufferedDarkGreenThreshold = darkGreenThreshold + 0.025;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Huge regions with minimal variation to prevent mixing
                const noise1 = this.noise2D(x * 0.001, y * 0.001, seed);        // Huge regions
                const noise2 = this.noise2D(x * 0.003, y * 0.003, seed + 1000); // Large variation

                const combinedNoise = (noise1 * 0.85 + noise2 * 0.15); // Mostly use huge regions

                // Determine biome with buffered thresholds for clearer separation
                let selectedBiome;
                if (combinedNoise < bufferedGreenThreshold) selectedBiome = BIOMES.GREEN;
                else if (combinedNoise < bufferedDarkGreenThreshold) selectedBiome = BIOMES.DARK_GREEN;
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
        // Spawn at world center
        const centerX = Math.floor(this.WORLD_SIZE / 2);
        const centerY = Math.floor(this.WORLD_SIZE / 2);
        const radius = 5;

        for (let i = 0; i < this.maxPlayers; i++) {
            const angle = (2 * Math.PI * i) / this.maxPlayers;
            points.push({
                x: Math.round(centerX + radius * Math.cos(angle)),
                y: Math.round(centerY + radius * Math.sin(angle))
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
            this.players.forEach(player => {
                const dist = Math.sqrt(
                    Math.pow(player.position.x - enemy.position.x, 2) +
                    Math.pow(player.position.y - enemy.position.y, 2)
                );
                if (dist < CLEANUP_DISTANCE) {
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
                this.gameState.minions.forEach((minion, minionId) => {
                    // Clean up stale minions (older than 5 seconds since last update)
                    if (Date.now() - minion.lastUpdate > 5000) {
                        this.gameState.minions.delete(minionId);
                        return;
                    }

                    const dist = Math.sqrt(
                        Math.pow(minion.position.x - enemy.position.x, 2) +
                        Math.pow(minion.position.y - enemy.position.y, 2)
                    );

                    // Check if minion has aggro on this enemy
                    const hasAggro = enemy.aggro && enemy.aggro.has(minionId);
                    const inSightRange = dist <= enemy.sightRange;

                    if (!hasAggro && !inSightRange) {
                        return; // Minion is too far and hasn't attacked this enemy
                    }

                    // Base aggro (closer = higher aggro)
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
                        target = { position: minion.position, id: minionId, isMinion: true };
                    }
                });
            }

            // Check all players
            this.players.forEach(player => {
                if (!player.isAlive) return;

                const dist = Math.sqrt(
                    Math.pow(player.position.x - enemy.position.x, 2) +
                    Math.pow(player.position.y - enemy.position.y, 2)
                );

                // Check if player is within sight range OR has aggro (enemy remembers them)
                const hasAggro = enemy.aggro && enemy.aggro.has(player.id);
                const inSightRange = dist <= enemy.sightRange;

                if (!hasAggro && !inSightRange) {
                    return; // Player is too far and hasn't attacked this enemy
                }

                // Base aggro (closer = higher aggro)
                let aggroValue = 100 / (dist + 1);

                // Add bonus aggro from damage taken (enemy remembers who hurt them)
                if (hasAggro) {
                    aggroValue += enemy.aggro.get(player.id);
                }

                // Target player with highest aggro
                if (aggroValue > maxAggro) {
                    maxAggro = aggroValue;
                    target = { position: player.position, id: player.id };
                }
            });

            // Skip if no target found
            if (!target) return;

            // Move toward target
            const dx = target.position.x - enemy.position.x;
            const dy = target.position.y - enemy.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Debug: Log first enemy movement occasionally
            if (movedCount === 1 && Math.random() < 0.05) {
                console.log(`🧟 ${enemy.type} at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) targeting (${target.position.x.toFixed(1)}, ${target.position.y.toFixed(1)}), dist: ${distance.toFixed(1)}`);
            }

            if (distance > 1) {
                const moveDistance = enemy.speed / 100; // Grid tiles per update (100ms)
                enemy.position.x += (dx / distance) * moveDistance;
                enemy.position.y += (dy / distance) * moveDistance;

                // Broadcast enemy movement (with interest management)
                this.broadcast('enemy:moved', {
                    enemyId: enemy.id,
                    position: enemy.position
                }, (player, data) => {
                    // Only send to players within 50 tiles
                    const dist = Math.sqrt(
                        Math.pow(player.position.x - data.position.x, 2) +
                        Math.pow(player.position.y - data.position.y, 2)
                    );
                    return dist < 50;
                });
            }

            // Attack if close enough (1 tile)
            if (distance < 1.5) {
                // Attack target (player or minion)
                if (target.isMinion) {
                    // Attack minion
                    this.broadcast('minion:damaged', {
                        minionId: target.id,
                        damage: enemy.damage,
                        attackerId: enemy.id
                    });
                } else {
                    // Attack player
                    const damageTarget = Array.from(this.players.values()).find(p => p.id === target.id);
                    if (damageTarget && damageTarget.isAlive) {
                        damageTarget.health -= enemy.damage;
                        if (damageTarget.health <= 0) {
                            damageTarget.isAlive = false;
                            damageTarget.health = 0;
                            damageTarget.deaths++;

                            this.broadcast('player:died', {
                                playerId: damageTarget.id,
                                playerName: damageTarget.username,
                                killedBy: enemy.id
                            });
                        } else {
                            this.broadcast('player:damaged', {
                                playerId: damageTarget.id,
                                health: damageTarget.health,
                                maxHealth: damageTarget.maxHealth,
                                damage: enemy.damage,
                                attackerId: enemy.id
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
    return position &&
           typeof position.x === 'number' &&
           typeof position.y === 'number' &&
           position.x >= 0 && position.x < worldSize &&
           position.y >= 0 && position.y < worldSize;
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

            socket.emit('game:start', {
                lobbyId: lobby.id,
                player: player.toJSON(),
                players: activePlayers,
                gameState: lobby.gameState,
                world: worldData,
                difficulty: lobby.difficulty,
                playerCount: lobby.players.size,
                maxPlayers: lobby.maxPlayers
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

                    // Validate position
                    if (!isValidPosition(player.position)) {
                        return;
                    }

                    player.updateActivity();

                    // Check if player entered new region - spawn enemies dynamically
                    const REGION_SIZE = 50;
                    const regionX = Math.floor(player.position.x / REGION_SIZE);
                    const regionY = Math.floor(player.position.y / REGION_SIZE);

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
                        const dist = Math.sqrt(
                            Math.pow(p.position.x - data.position.x, 2) +
                            Math.pow(p.position.y - data.position.y, 2)
                        );
                        return dist < 50; // Only within 50 tiles
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
            if (!enemy || !enemy.isAlive) return;

            const damage = data.damage || player.stats.strength;
            enemy.health -= damage;
            player.updateActivity();

            // Add aggro for the attacker (could be player or minion)
            const attackerId = data.attackerId || player.id;
            if (!enemy.aggro) enemy.aggro = new Map();
            const currentAggro = enemy.aggro.get(attackerId) || 0;
            enemy.aggro.set(attackerId, currentAggro + damage * 2); // Damage generates 2x aggro

            // If it's a minion attack, track the minion's position
            if (data.attackerId && data.attackerId.startsWith('minion_') && data.attackerPosition) {
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
                    damage: damage
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
            player.health = 0;

            lobby.broadcast('player:died', {
                playerId: player.id,
                playerName: player.username,
                killedBy: data.killedBy,
                position: player.position
            });
        } catch (error) {
            console.error('Error in player:death:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);

        const player = players.get(socket.id);
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
}, 100); // Update every 100ms

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

// Start server
server.listen(PORT, () => {
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
