// Network Manager - Handles all Socket.IO communication
class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentPlayer = null;
        this.lobbyId = null;
        this.players = new Map();
        this.callbacks = {};

        // Batching system
        this.updateQueue = [];
        this.lastBatchTime = 0;
        this.BATCH_INTERVAL = 50; // Send batches every 50ms

        // Delta compression
        this.lastPosition = null;

        // Start batch sender
        this.startBatchSender();
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(GameConfig.SERVER_URL, {
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to server');
                this.connected = true;
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error);
                this.connected = false;
                reject(error);
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from server');
                this.connected = false;
                this.emit('disconnected');
            });

            this.setupListeners();
        });
    }

    setupListeners() {
        // Lobby events
        this.socket.on('lobby:joined', (data) => {
            console.log('🎮 Joined lobby:', data);
            this.currentPlayer = data.player;
            this.lobbyId = data.lobbyId;
            this.players.clear();
            data.players.forEach(p => this.players.set(p.id, p));
            this.emit('lobby:joined', data);
        });

        this.socket.on('player:joined', (data) => {
            console.log('👋 Player joined:', data.player.username);
            this.players.set(data.player.id, data.player);
            this.emit('player:joined', data);
        });

        this.socket.on('player:left', (data) => {
            console.log('👋 Player left:', data.username);
            this.players.delete(data.playerId);
            this.emit('player:left', data);
        });

        this.socket.on('player:disconnected', (data) => {
            console.log('⚠️ Player disconnected:', data.username);
            this.emit('player:disconnected', data);
        });

        this.socket.on('player:ready', (data) => {
            console.log('✅ Player ready:', data.username);
            const player = this.players.get(data.playerId);
            if (player) player.isReady = true;
            this.emit('player:ready', data);
        });

        // Game events
        this.socket.on('game:countdown', (data) => {
            console.log('⏰ Game starting in', data.seconds, 'seconds');
            this.emit('game:countdown', data);
        });

        this.socket.on('game:start', (data) => {
            console.log('🎮 Game started!', data);
            // Set player data (instant join - no lobby wait)
            this.currentPlayer = data.player;
            this.lobbyId = data.lobbyId;
            this.players.clear();
            data.players.forEach(p => this.players.set(p.id, p));
            this.emit('game:start', data);
        });

        this.socket.on('player:moved', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.position = data.position;
            }
            this.emit('player:moved', data);
        });

        this.socket.on('player:attacked', (data) => {
            this.emit('player:attacked', data);
        });

        this.socket.on('player:damaged', (data) => {
            this.emit('player:damaged', data);
        });

        this.socket.on('player:levelup', (data) => {
            console.log(`🎉 ${data.playerName} leveled up to level ${data.level}!`);
            this.emit('player:levelup', data);
        });

        this.socket.on('player:died', (data) => {
            const player = this.players.get(data.playerId);
            if (player) player.isAlive = false;
            this.emit('player:died', data);
        });

        // Enemy events
        this.socket.on('enemy:moved', (data) => {
            this.emit('enemy:moved', data);
        });

        this.socket.on('enemy:spawned', (data) => {
            this.emit('enemy:spawned', data);
        });

        this.socket.on('enemy:damaged', (data) => {
            this.emit('enemy:damaged', data);
        });

        this.socket.on('enemy:killed', (data) => {
            this.emit('enemy:killed', data);
        });

        // Item events
        this.socket.on('item:picked', (data) => {
            this.emit('item:picked', data);
        });

        // Chat events
        this.socket.on('chat:message', (data) => {
            console.log(`💬 ${data.username}: ${data.message}`);
            this.emit('chat:message', data);
        });

        // Server events
        this.socket.on('server:shutdown', (data) => {
            console.log('⚠️ Server shutdown:', data.message);
            this.emit('server:shutdown', data);
        });

        this.socket.on('kicked', (data) => {
            console.log('⛔ Kicked:', data.reason);
            this.emit('kicked', data);
        });

        this.socket.on('error', (data) => {
            console.error('❌ Server error:', data.message);
            this.emit('error', data);
        });
    }

    // Send player join
    joinGame(username, characterClass = 'warrior', difficulty = 'normal') {
        this.socket.emit('player:join', {
            username,
            characterClass,
            difficulty
        });
    }

    // Send player ready
    playerReady() {
        this.socket.emit('player:ready');
    }

    // Batch sender (runs continuously)
    startBatchSender() {
        setInterval(() => {
            if (this.updateQueue.length > 0 && this.connected) {
                // Send all queued updates at once
                this.socket.emit('batch:update', this.updateQueue);
                this.updateQueue = [];
            }
        }, this.BATCH_INTERVAL);
    }

    // Queue update for batching
    queueUpdate(type, data) {
        this.updateQueue.push({ type, data, timestamp: Date.now() });
    }

    // Send player movement (with delta compression)
    movePlayer(position) {
        // Delta compression: only send if position changed significantly
        if (this.lastPosition) {
            const dx = position.x - this.lastPosition.x;
            const dy = position.y - this.lastPosition.y;

            // Only send if moved at least 1 tile
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
                return; // Skip redundant update
            }

            // Send delta instead of absolute position
            this.queueUpdate('move', { delta: { x: dx, y: dy } });
        } else {
            // First update: send absolute position
            this.queueUpdate('move', { position });
        }

        this.lastPosition = { ...position };
    }

    // Send attack
    attack(target, damage) {
        this.socket.emit('player:attack', { target, damage });
    }

    // Hit enemy
    hitEnemy(enemyId, damage, attackerId = null, attackerPosition = null) {
        this.socket.emit('enemy:hit', { enemyId, damage, attackerId, attackerPosition });
    }

    // Pick up item
    pickupItem(itemId) {
        this.socket.emit('item:pickup', { itemId });
    }

    // Send chat message
    sendChat(message) {
        this.socket.emit('chat:message', { message });
    }

    // Report death
    reportDeath(killedBy) {
        this.socket.emit('player:death', { killedBy });
    }

    // Update minion position (so enemies can target them)
    updateMinionPosition(minionId, position, isPermanent = false) {
        this.socket.emit('minion:position', { minionId, position, isPermanent });
    }

    // Change map (interior/exterior)
    changeMap(mapName) {
        this.socket.emit('player:changeMap', { mapName });
        console.log(`📍 Requested map change to: ${mapName}`);
    }

    // Event emitter
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global network manager instance
const networkManager = new NetworkManager();
