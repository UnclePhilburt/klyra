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

// Lobby class
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
            dungeon: null,
            startTime: Date.now(),
            endTime: null
        };
        this.createdAt = Date.now();
        this.readyPlayers = new Set();
        this.votes = new Map(); // For voting systems

        // Generate dungeon immediately when lobby is created
        this.generateDungeon();
        metrics.totalGames++;
    }

    addPlayer(player) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, error: 'Game is full' };
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

    generateDungeon() {
        const size = this.getDungeonSize();

        // Generate unique seed based on lobby ID + timestamp for unique procedural worlds
        const uniqueSeed = `${this.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Generate fantasy world with biomes instead of dungeon
        const worldData = this.generateFantasyWorld(size.width, size.height, uniqueSeed);

        this.gameState.dungeon = {
            width: size.width,
            height: size.height,
            tiles: worldData.tiles,
            biomes: worldData.biomes,
            decorations: worldData.decorations,
            seed: uniqueSeed
        };

        console.log(`🗺️  Generated unique fantasy world for room ${this.id.slice(0, 8)} (${size.width}x${size.height}, ${this.difficulty})`);
        console.log(`   Biomes: ${worldData.biomeStats.join(', ')}`);

        // Spawn enemies based on difficulty
        const enemyCount = this.getEnemyCount();
        this.spawnEnemies(enemyCount);

        // Spawn items
        const itemCount = this.getItemCount();
        this.spawnItems(itemCount);
    }

    getDungeonSize() {
        const sizes = {
            easy: { width: 40, height: 40 },
            normal: { width: 50, height: 50 },
            hard: { width: 60, height: 60 },
            nightmare: { width: 70, height: 70 }
        };
        return sizes[this.difficulty] || sizes.normal;
    }

    getEnemyCount() {
        const counts = {
            easy: 5,
            normal: 8,
            hard: 12,
            nightmare: 15
        };
        return Math.floor((counts[this.difficulty] || 8) * (1 + this.gameState.floor * 0.2));
    }

    getItemCount() {
        return Math.floor(10 + this.gameState.floor * 2);
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

        // Biome definitions with tile types
        const BIOMES = {
            GRASSLAND: { id: 'grassland', tiles: [10, 11, 12], weight: 0.3 },
            FOREST: { id: 'forest', tiles: [20, 21, 22], weight: 0.25 },
            MAGIC_GROVE: { id: 'magic', tiles: [30, 31, 32], weight: 0.15 },
            DARK_WOODS: { id: 'dark', tiles: [40, 41, 42], weight: 0.15 },
            CRYSTAL_PLAINS: { id: 'crystal', tiles: [50, 51, 52], weight: 0.1 },
            VOID_ZONE: { id: 'void', tiles: [60, 61, 62], weight: 0.05 }
        };

        const biomeStats = {};

        // Generate biome map using multiple octaves of noise
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Multi-octave noise for natural-looking biomes
                const noise1 = this.noise2D(x * 0.05, y * 0.05, seed);
                const noise2 = this.noise2D(x * 0.1, y * 0.1, seed + 1000);
                const noise3 = this.noise2D(x * 0.2, y * 0.2, seed + 2000);

                const combinedNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);

                // Determine biome based on noise value
                let selectedBiome;
                if (combinedNoise < 0.2) selectedBiome = BIOMES.GRASSLAND;
                else if (combinedNoise < 0.4) selectedBiome = BIOMES.FOREST;
                else if (combinedNoise < 0.6) selectedBiome = BIOMES.MAGIC_GROVE;
                else if (combinedNoise < 0.75) selectedBiome = BIOMES.DARK_WOODS;
                else if (combinedNoise < 0.9) selectedBiome = BIOMES.CRYSTAL_PLAINS;
                else selectedBiome = BIOMES.VOID_ZONE;

                biomes[y][x] = selectedBiome.id;

                // Select random tile variation from biome
                const tileVariation = Math.floor(this.seededRandom(seed + x * 100 + y) * selectedBiome.tiles.length);
                tiles[y][x] = selectedBiome.tiles[tileVariation];

                // Track biome stats
                biomeStats[selectedBiome.id] = (biomeStats[selectedBiome.id] || 0) + 1;
            }
        }

        // Add decorations (trees, rocks, crystals, etc.)
        const decorationCount = Math.floor(width * height * 0.05); // 5% coverage
        for (let i = 0; i < decorationCount; i++) {
            const x = Math.floor(this.seededRandom(seed + i * 1000) * width);
            const y = Math.floor(this.seededRandom(seed + i * 1001) * height);
            const biome = biomes[y][x];

            let decorationType;
            if (biome === 'grassland') decorationType = this.seededRandom(seed + i) < 0.7 ? 'flower' : 'rock';
            else if (biome === 'forest') decorationType = this.seededRandom(seed + i) < 0.8 ? 'tree' : 'bush';
            else if (biome === 'magic') decorationType = this.seededRandom(seed + i) < 0.6 ? 'magic_tree' : 'rune_stone';
            else if (biome === 'dark') decorationType = this.seededRandom(seed + i) < 0.7 ? 'dead_tree' : 'skull';
            else if (biome === 'crystal') decorationType = this.seededRandom(seed + i) < 0.8 ? 'crystal' : 'gem_rock';
            else decorationType = this.seededRandom(seed + i) < 0.5 ? 'void_portal' : 'shadow';

            decorations.push({ x, y, type: decorationType, biome });
        }

        const biomeList = Object.entries(biomeStats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name}(${Math.round(count / (width * height) * 100)}%)`);

        return { tiles, biomes, decorations, biomeStats: biomeList };
    }

    getSpawnPoints() {
        const points = [];
        const radius = 5;
        for (let i = 0; i < this.maxPlayers; i++) {
            const angle = (2 * Math.PI * i) / this.maxPlayers;
            points.push({
                x: Math.round(25 + radius * Math.cos(angle)),
                y: Math.round(25 + radius * Math.sin(angle))
            });
        }
        return points;
    }

    spawnEnemies(count) {
        const enemyTypes = [
            { type: 'goblin', health: 50, damage: 10, speed: 5 },
            { type: 'orc', health: 80, damage: 15, speed: 3 },
            { type: 'skeleton', health: 40, damage: 12, speed: 6 },
            { type: 'troll', health: 120, damage: 20, speed: 2 },
            { type: 'demon', health: 150, damage: 25, speed: 4 }
        ];

        for (let i = 0; i < count; i++) {
            const enemyTemplate = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            const difficultyMultiplier = { easy: 0.7, normal: 1, hard: 1.3, nightmare: 1.6 }[this.difficulty] || 1;

            this.gameState.enemies.push({
                id: uuidv4(),
                type: enemyTemplate.type,
                position: this.getRandomFloorPosition(),
                health: Math.floor(enemyTemplate.health * difficultyMultiplier * (1 + this.gameState.floor * 0.15)),
                maxHealth: Math.floor(enemyTemplate.health * difficultyMultiplier * (1 + this.gameState.floor * 0.15)),
                damage: Math.floor(enemyTemplate.damage * difficultyMultiplier),
                speed: enemyTemplate.speed,
                isAlive: true,
                lastMove: Date.now()
            });
        }
    }

    spawnItems(count) {
        const itemTypes = [
            { type: 'health_potion', rarity: 'common', effect: { health: 30 } },
            { type: 'mana_potion', rarity: 'common', effect: { mana: 50 } },
            { type: 'strength_potion', rarity: 'uncommon', effect: { strength: 5 } },
            { type: 'sword', rarity: 'uncommon', effect: { damage: 10 } },
            { type: 'shield', rarity: 'uncommon', effect: { defense: 8 } },
            { type: 'armor', rarity: 'rare', effect: { defense: 15 } },
            { type: 'legendary_sword', rarity: 'legendary', effect: { damage: 25 } },
            { type: 'key', rarity: 'special', effect: { unlocks: 'door' } },
            { type: 'treasure', rarity: 'rare', effect: { gold: 100 } }
        ];

        for (let i = 0; i < count; i++) {
            const item = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            this.gameState.items.push({
                id: uuidv4(),
                type: item.type,
                rarity: item.rarity,
                effect: item.effect,
                position: this.getRandomFloorPosition()
            });
        }
    }

    getRandomFloorPosition() {
        if (!this.gameState.dungeon) return { x: 25, y: 25 };

        // Try to find a floor tile
        for (let attempt = 0; attempt < 100; attempt++) {
            const x = Math.floor(Math.random() * this.gameState.dungeon.width);
            const y = Math.floor(Math.random() * this.gameState.dungeon.height);

            if (this.gameState.dungeon.tiles[y]?.[x] === 0) {
                return { x, y };
            }
        }

        return { x: 25, y: 25 }; // Fallback
    }

    broadcast(event, data) {
        this.players.forEach(player => {
            io.to(player.id).emit(event, data);
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
function isValidPosition(position) {
    return position &&
           typeof position.x === 'number' &&
           typeof position.y === 'number' &&
           position.x >= 0 && position.x < 100 &&
           position.y >= 0 && position.y < 100;
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
                // Reconnection
                player = disconnectedPlayer;
                player.id = socket.id;
                player.isReconnecting = false;
                player.disconnectedAt = null;
                disconnectedPlayers.delete(username);
                console.log(`🔄 ${username} reconnected`);
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
            socket.emit('game:start', {
                lobbyId: lobby.id,
                player: player.toJSON(),
                players: Array.from(lobby.players.values()).map(p => p.toJSON()),
                gameState: lobby.gameState,
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

    // Handle player movement
    socket.on('player:move', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'move')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            if (!isValidPosition(data.position)) return;

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

            if (enemy.health <= 0) {
                enemy.isAlive = false;
                player.kills++;
                player.experience += 10;

                lobby.broadcast('enemy:killed', {
                    enemyId: data.enemyId,
                    killedBy: player.id,
                    killerName: player.username,
                    experience: player.experience
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
