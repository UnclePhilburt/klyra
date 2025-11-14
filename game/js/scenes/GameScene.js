// Game Scene - Main gameplay
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.otherPlayers = {};
        this.enemies = {};
        this.wolves = {};
        this.items = {};
        this.minions = {};
        this.minionIdCounter = 0;

        // Map transition system
        this.currentMap = 'exterior'; // 'exterior' or 'interior'
        this.doorCooldown = 0; // Prevent rapid door triggers
    }

    init(data) {
        // Data structure: { username, selectedCharacter, gameData }
        // Extract the nested gameData
        this.gameData = data.gameData || data;
        this.username = data.username;
        this.selectedCharacter = data.selectedCharacter;
    }

    shutdown() {
        // Clean up network listeners when scene is destroyed
        console.log('🧹 GameScene shutting down - cleaning up listeners');

        const eventsToClear = [
            'player:joined', 'player:left', 'player:moved', 'player:changedMap', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:damaged', 'enemy:moved', 'enemy:killed',
            'minion:damaged',
            'item:spawned', 'item:collected', 'chat:message'
        ];

        eventsToClear.forEach(event => {
            if (networkManager.callbacks[event]) {
                networkManager.callbacks[event] = [];
            }
        });

        // Destroy HUD to prevent multiple instances
        if (this.modernHUD) {
            console.log('🧹 Destroying ModernHUD');
            // Use the proper destroy method
            this.modernHUD.destroy();
            this.modernHUD = null;
        }

        // Destroy skill selector
        if (this.skillSelector) {
            console.log('🧹 Destroying SkillSelector');
            this.skillSelector.destroy();
            this.skillSelector = null;
        }

        console.log('🧹 GameScene cleanup complete');
    }

    preload() {
        // Load tileset spritesheets for dungeon rendering
        // RPG Maker tilesets are 48x48 pixels per tile
        console.log('📦 Loading PNG tilesets as spritesheets...');

        const tileWidth = 48;
        const tileHeight = 48;

        // Terrain tilesets (A2 format)
        this.load.spritesheet('terrain_base', 'assets/tilesets/a2_terrain_base.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('terrain_green', 'assets/tilesets/a2_terrain_green.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('terrain_red', 'assets/tilesets/a2_terrain_red.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('terrain_misc', 'assets/tilesets/A2 - Terrain And Misc.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });

        // Forest tilesets
        this.load.spritesheet('forest', 'assets/tilesets/a2_forest.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('forest_extended', 'assets/tilesets/A2_extended_forest_terrain.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });

        // Water tilesets (A1 format - animated)
        this.load.spritesheet('water_base', 'assets/tilesets/a1_water_base.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('water_green', 'assets/tilesets/a1_water_green.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('water_red', 'assets/tilesets/a1_water_red.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });

        // Additional terrain
        this.load.spritesheet('walls_floors', 'assets/tilesets/A3 - Walls And Floors.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });
        this.load.spritesheet('walls', 'assets/tilesets/A4 - Walls.png', {
            frameWidth: tileWidth,
            frameHeight: tileHeight
        });

        // Object/Decoration tilesets - load as individual 48x48 tiles
        this.load.spritesheet('objects_d', 'assets/tilesets/Fantasy_Outside_D.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Fantasy_Outside_A5 tileset for spawn building
        this.load.spritesheet('fantasy_outside_a5', 'assets/tilesets/Fantasy_Outside_A5.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Additional tilesets for spawn building
        this.load.spritesheet('liquids_misc', 'assets/tilesets/A1_Liquids_And_Misc.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_door1', 'assets/tilesets/Fantasy_door1.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_door2', 'assets/tilesets/Fantasy_door2.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('gate_cathedral1', 'assets/tilesets/Gate_Cathedral1.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_outside_c', 'assets/tilesets/Fantasy_Outside_C.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Load spawn point building Tiled map
        this.load.tilemapTiledJSON('spawnMap', 'assets/spawnpointbuilding.tmj');

        // Red biome trees - 48x48 tiles, 12 columns x 24 rows
        this.load.spritesheet('red_trees', 'assets/tilesets/redbiome/Big_Trees_red.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Red biome decorations - 48x48 tiles
        this.load.spritesheet('red_decorations', 'assets/tilesets/redbiome/Fantasy_Outside_D_red.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Enemy sprites
        this.load.spritesheet('skullwolf', 'assets/sprites/skullwolf.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        console.log('✅ All tilesets queued for loading');
    }

    create() {
        // Show loading message
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.loadingText = this.add.text(width / 2, height / 2, 'Joining game...', {
            font: '24px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);

        // Wait for game:start event (instant join - no lobby)
        networkManager.on('game:start', (data) => {
            this.gameData = data;
            this.initializeGame();
        });

        // If gameData already exists (from init) and has gameState, initialize immediately
        if (this.gameData && this.gameData.gameState) {
            this.initializeGame();
        }
    }

    initializeGame() {
        // Remove loading text
        if (this.loadingText) {
            this.loadingText.destroy();
        }

        // Create enemy animations
        this.anims.create({
            key: 'skullwolf_idle',
            frames: this.anims.generateFrameNumbers('skullwolf', { start: 0, end: 5 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'skullwolf_walk',
            frames: this.anims.generateFrameNumbers('skullwolf', { start: 6, end: 10 }),
            frameRate: 10,
            repeat: -1
        });

        console.log('✅ Created enemy animations: skullwolf');

        // Initialize tree collision array
        this.treeCollisions = [];
        this.treeSprites = [];

        // Create world from world data
        this.renderWorld(this.gameData.world);

        // Enhance spawn point with visuals
        this.createSpawnPoint();

        // Create local player
        const myData = this.gameData.players.find(p => p.id === networkManager.currentPlayer.id);
        if (myData) {
            this.localPlayer = new Player(this, myData, true);
            this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.1, 0.1);

            // Send initial position immediately
            const tileSize = GameConfig.GAME.TILE_SIZE;
            const gridPos = {
                x: Math.floor(this.localPlayer.sprite.x / tileSize),
                y: Math.floor(this.localPlayer.sprite.y / tileSize)
            };
            console.log(`📍 Sending initial position: pixel(${this.localPlayer.sprite.x.toFixed(0)}, ${this.localPlayer.sprite.y.toFixed(0)}) -> grid(${gridPos.x}, ${gridPos.y})`);
            networkManager.movePlayer(gridPos);

            // Spawn permanent minion if player is Malachar
            if (myData.class === 'MALACHAR') {
                this.spawnMinion(
                    this.localPlayer.sprite.x + 40,
                    this.localPlayer.sprite.y,
                    myData.id,
                    true // permanent
                );
            }
        }

        // Create other players
        this.gameData.players.forEach(playerData => {
            if (playerData.id !== networkManager.currentPlayer.id) {
                const otherPlayer = new Player(this, playerData);
                this.otherPlayers[playerData.id] = otherPlayer;

                // Initialize map tracking (all players start on exterior)
                otherPlayer.currentMap = playerData.currentMap || 'exterior';

                // Add tree collisions to other player
                if (this.treeCollisions) {
                    this.treeCollisions.forEach(collisionRect => {
                        this.physics.add.collider(otherPlayer.sprite, collisionRect);
                    });
                }

                // Add castle collision layers to other player
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(otherPlayer.sprite, layer);
                    });
                }

                // Spawn permanent minion if player is Malachar
                if (playerData.class === 'MALACHAR') {
                    this.spawnMinion(
                        otherPlayer.sprite.x + 40,
                        otherPlayer.sprite.y,
                        playerData.id,
                        true // permanent
                    );
                }
            }
        });

        // Add tree collisions to player (after player is created)
        if (this.localPlayer && this.treeCollisions) {
            this.treeCollisions.forEach(collisionRect => {
                this.physics.add.collider(this.localPlayer.sprite, collisionRect);
            });
        }

        // Add castle collision layers to player
        if (this.localPlayer && this.castleCollisionLayers) {
            this.castleCollisionLayers.forEach(layer => {
                this.physics.add.collider(this.localPlayer.sprite, layer);
            });
            console.log(`🏰 Added ${this.castleCollisionLayers.length} castle collision layers to local player`);
        }

        // Create enemies
        this.gameData.gameState.enemies.forEach(enemyData => {
            if (enemyData.type === 'wolf') {
                const wolf = new Wolf(this, enemyData);
                this.wolves[enemyData.id] = wolf;

                // Add castle collision to wolf
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(wolf.sprite, layer);
                    });
                }

                console.log(`🐺 Created wolf ${enemyData.id} at grid (${enemyData.position.x}, ${enemyData.position.y})`);
            } else {
                const enemy = new Enemy(this, enemyData);
                this.enemies[enemyData.id] = enemy;

                // Add castle collision to enemy
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(enemy.sprite, layer);
                    });
                }
            }
        });

        console.log(`📊 Total enemies: ${Object.keys(this.enemies).length}, Total wolves: ${Object.keys(this.wolves).length}`);

        // Create items
        this.gameData.gameState.items.forEach(itemData => {
            this.items[itemData.id] = new Item(this, itemData);
        });

        // Setup UI
        this.createUI();

        // Setup controls
        this.setupControls();

        // Setup network listeners
        this.setupNetworkListeners();
    }

    renderWorld(world) {
        console.log(`🗺️ Generating world from seed: ${world.seed}`);
        const startTime = Date.now();

        const tileSize = GameConfig.GAME.TILE_SIZE;

        // Generate world from seed (same algorithm as server)
        this.worldSeed = world.seed;
        this.worldSize = world.size;

        // Store for viewport-based rendering (don't pre-generate all tiles)
        this.renderedTiles = new Map(); // Track rendered tiles
        this.renderedDecorations = new Set(); // Track rendered decorations
        this.RENDER_DISTANCE = 25; // Render 25 tiles in each direction from camera

        // Map biome types to tileset textures and tile indices
        this.BIOME_TILESET_MAP = {};

        // Basic Green Biome - A2 Terrain And Misc tiles 104-115
        for (let i = 0; i < 12; i++) {
            this.BIOME_TILESET_MAP[10 + i] = { texture: 'terrain_misc', frame: 104 + i };
        }

        // Dark Green Biome - A2 Extended Forest Terrain tiles 78-89
        for (let i = 0; i < 12; i++) {
            this.BIOME_TILESET_MAP[30 + i] = { texture: 'forest_extended', frame: 78 + i };
        }

        // Red Biome - A2 Extended Forest Terrain tiles 468-479
        for (let i = 0; i < 12; i++) {
            this.BIOME_TILESET_MAP[50 + i] = { texture: 'forest_extended', frame: 468 + i };
        }

        // Create tile container if it doesn't exist
        if (!this.tileContainer) {
            this.tileContainer = this.add.container(0, 0);
        }

        // Set world bounds based on actual world size
        const worldPixelWidth = world.size * tileSize;
        const worldPixelHeight = world.size * tileSize;
        this.physics.world.setBounds(0, 0, worldPixelWidth, worldPixelHeight);
        this.cameras.main.setBounds(0, 0, worldPixelWidth, worldPixelHeight);

        const elapsed = Date.now() - startTime;
        console.log(`✅ World setup complete in ${elapsed}ms`);
        console.log(`   Bounds: ${worldPixelWidth}x${worldPixelHeight} pixels (${world.size}x${world.size} tiles)`);
        console.log(`   Using on-demand generation (renders ${this.RENDER_DISTANCE} tiles around camera)`);
    }

    // Perlin-like noise for terrain generation (same as server)
    noise2D(x, y, seed) {
        const n = x + y * 57 + seed * 131;
        let noise = Math.sin(n) * 43758.5453;
        return noise - Math.floor(noise);
    }

    // Generate tile type for position (same algorithm as server)
    getTileType(x, y) {
        // Convert seed string to number
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Calculate randomized biome distribution once per world seed
        if (!this.biomeDistribution) {
            // Generate 3 random weights from seed
            const weight1 = this.seededRandom(seed + 1234) * 40 + 15; // 15-55%
            const weight2 = this.seededRandom(seed + 5678) * 40 + 15; // 15-55%
            const weight3 = this.seededRandom(seed + 9012) * 40 + 15; // 15-55%

            // Normalize to 100%
            const total = weight1 + weight2 + weight3;
            const green = weight1 / total;
            const darkGreen = weight2 / total;
            // red gets the remainder

            this.biomeDistribution = {
                green: green,
                darkGreen: green + darkGreen,
                // red: 1.0 (everything above darkGreen threshold)
            };

            console.log(`🌍 World biome distribution: Green=${(green*100).toFixed(1)}% DarkGreen=${(darkGreen*100).toFixed(1)}% Red=${((1-green-darkGreen)*100).toFixed(1)}%`);
            console.log(`📊 Biome thresholds: green=${this.biomeDistribution.green.toFixed(3)}, darkGreen=${this.biomeDistribution.darkGreen.toFixed(3)}`);
        }

        // Biome definitions with 12 tile variations each
        const BIOMES = {
            GREEN: { tiles: [10,11,12,13,14,15,16,17,18,19,20,21], id: 'green' },           // terrain_misc 104-115
            DARK_GREEN: { tiles: [30,31,32,33,34,35,36,37,38,39,40,41], id: 'dark_green' }, // forest_extended 78-89
            RED: { tiles: [50,51,52,53,54,55,56,57,58,59,60,61], id: 'red' }                // forest_extended 468-479
        };

        // CHUNK-BASED BIOMES: Assign biome per large chunk instead of per tile
        const CHUNK_SIZE = 100; // 100x100 tile chunks = large biome regions
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkY = Math.floor(y / CHUNK_SIZE);

        // Use chunk coordinates to determine biome (one biome per chunk)
        const chunkHash = this.seededRandom(seed + chunkX * 1000 + chunkY);

        // Determine biome based on chunk hash and distribution
        let selectedBiome;
        if (chunkHash < this.biomeDistribution.green) {
            selectedBiome = BIOMES.GREEN;
        } else if (chunkHash < this.biomeDistribution.darkGreen) {
            selectedBiome = BIOMES.DARK_GREEN;
        } else {
            selectedBiome = BIOMES.RED;
        }

        // DEBUG: Log first 5 chunks
        if (!this.debugChunks) this.debugChunks = new Set();
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.debugChunks.size < 5 && !this.debugChunks.has(chunkKey)) {
            console.log(`🗺️ Chunk (${chunkX},${chunkY}): hash=${chunkHash.toFixed(3)}, biome=${selectedBiome.id}`);
            this.debugChunks.add(chunkKey);
        }

        // Select tile variation (12 variations per biome)
        const tileVariation = Math.floor(this.seededRandom(seed + x * 100 + y) * selectedBiome.tiles.length);
        const tileId = selectedBiome.tiles[tileVariation];

        // DEBUG: Log first 10 tiles to verify chunk system
        if (!this.debugTileCount) this.debugTileCount = 0;
        if (this.debugTileCount < 10) {
            const tileMapping = this.BIOME_TILESET_MAP[tileId];
            console.log(`🔍 Tile (${x},${y}) in chunk (${chunkX},${chunkY}): biome=${selectedBiome.id}, tileId=${tileId}, texture=${tileMapping?.texture}, frame=${tileMapping?.frame}`);
            this.debugTileCount++;
        }

        // Store biome for decoration generation
        if (!this.biomeCache) this.biomeCache = {};
        this.biomeCache[`${x},${y}`] = selectedBiome.id;

        return tileId;
    }

    // Generate decoration for tile (client-side procedural)
    getDecoration(x, y) {
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const decoSeed = seed + x * 7919 + y * 6563; // Prime numbers for distribution
        const decoChance = this.seededRandom(decoSeed);

        // Get biome for this tile
        const biome = this.biomeCache[`${x},${y}`] || 'green';

        // Different spawn rates per biome - INCREASED for dense decoration
        let spawnChance;
        if (biome === 'green') spawnChance = 0.08; // 8% - lots of flowers/grass
        else if (biome === 'dark_green') spawnChance = 0.12; // 12% - very dense forest
        else if (biome === 'red') spawnChance = 0.15; // 15% - DENSE red biome

        if (decoChance > spawnChance) return null;

        const rand = this.seededRandom(decoSeed + 1000);

        let decorationType;
        if (biome === 'green') {
            // Basic Green: lots of flowers and grass
            if (rand < 0.5) decorationType = 'flower';
            else if (rand < 0.8) decorationType = 'grass';
            else if (rand < 0.95) decorationType = 'rock';
            else decorationType = 'baby_tree';
        } else if (biome === 'dark_green') {
            // Dark Green: very dense forest with lots of trees
            if (rand < 0.45) decorationType = 'tree';
            else if (rand < 0.65) decorationType = 'bush';
            else if (rand < 0.80) decorationType = 'log';
            else if (rand < 0.92) decorationType = 'tree_stump';
            else decorationType = 'grass';
        } else if (biome === 'red') {
            // Red biome: LOTS of red trees + red decorations
            if (rand < 0.30) decorationType = 'red_tree';           // 30% - MORE big trees
            else if (rand < 0.45) decorationType = 'red_flower';    // 15% - flowers
            else if (rand < 0.58) decorationType = 'red_grass';     // 13% - grass
            else if (rand < 0.70) decorationType = 'red_bush';      // 12% - bushes
            else if (rand < 0.80) decorationType = 'red_mushroom';  // 10% - mushrooms
            else if (rand < 0.87) decorationType = 'red_log';       // 7% - logs
            else if (rand < 0.92) decorationType = 'red_stone';     // 5% - stones
            else if (rand < 0.95) decorationType = 'red_stump';     // 3% - stumps
            else if (rand < 0.97) decorationType = 'red_trunk';     // 2% - tree trunks
            else decorationType = 'red_baby_tree';                  // 3% - baby trees
        }

        return decorationType;
    }

    updateVisibleTiles() {
        if (!this.worldSeed || !this.localPlayer) return;

        const tileSize = GameConfig.GAME.TILE_SIZE;
        const playerTileX = Math.floor(this.localPlayer.sprite.x / tileSize);
        const playerTileY = Math.floor(this.localPlayer.sprite.y / tileSize);

        // Calculate visible tile range
        const minX = Math.max(0, playerTileX - this.RENDER_DISTANCE);
        const maxX = Math.min(this.worldSize - 1, playerTileX + this.RENDER_DISTANCE);
        const minY = Math.max(0, playerTileY - this.RENDER_DISTANCE);
        const maxY = Math.min(this.worldSize - 1, playerTileY + this.RENDER_DISTANCE);

        // Calculate spawn area bounds once (50x50 tile spawn building)
        const worldSize = this.gameData.world.size;
        const worldCenterTileX = worldSize / 2;
        const worldCenterTileY = worldSize / 2;
        const spawnMapSize = 50;
        const spawnMargin = spawnMapSize / 2;

        // Render visible tiles
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const key = `${x},${y}`;

                // Skip if already rendered
                if (this.renderedTiles.has(key)) continue;

                // Check if this tile is within the spawn building area
                const isInSpawnArea = (
                    x >= (worldCenterTileX - spawnMargin) &&
                    x < (worldCenterTileX + spawnMargin) &&
                    y >= (worldCenterTileY - spawnMargin) &&
                    y < (worldCenterTileY + spawnMargin)
                );

                // Skip rendering procedural terrain in spawn area (Tiled map handles it)
                if (isInSpawnArea) continue;

                // Generate tile on-demand
                const tile = this.getTileType(x, y);
                const px = x * tileSize;
                const py = y * tileSize;

                // Get tileset mapping for this biome
                const tileInfo = this.BIOME_TILESET_MAP[tile];

                if (!tileInfo || !this.textures.exists(tileInfo.texture)) {
                    continue; // Skip invalid tiles
                }

                // Create sprite from specific tile frame in the spritesheet
                try {
                    const tileSprite = this.add.sprite(px, py, tileInfo.texture, tileInfo.frame);
                    tileSprite.setOrigin(0, 0);

                    // Scale to game tile size (48px tileset -> 32px game tile)
                    const scale = tileSize / 48;
                    tileSprite.setScale(scale);
                    tileSprite.setDepth(-1); // Background layer

                    this.tileContainer.add(tileSprite);
                    this.renderedTiles.set(key, tileSprite);
                } catch (error) {
                    // Silent fail for performance
                }

                // Generate decorations on-demand (already outside spawn area due to continue above)
                const decoration = this.getDecoration(x, y);
                if (decoration && !this.renderedDecorations.has(key)) {
                    this.renderDecoration(x, y, decoration);
                    this.renderedDecorations.add(key);
                }
            }
        }

        // Clean up tiles far from player (keep memory manageable)
        const CLEANUP_DISTANCE = this.RENDER_DISTANCE * 2;
        this.renderedTiles.forEach((sprite, key) => {
            const [x, y] = key.split(',').map(Number);
            const dist = Math.max(Math.abs(x - playerTileX), Math.abs(y - playerTileY));

            if (dist > CLEANUP_DISTANCE) {
                sprite.destroy();
                this.renderedTiles.delete(key);
            }
        });
    }

    seededRandom(seed) {
        // Simple seeded random using sin (stateless)
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    renderDecoration(x, y, type) {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const px = x * tileSize;
        const py = y * tileSize;

        // Tree tile patterns: rows of tiles that make up complete trees
        // TREE ONE - Top: 0-3, Second: 16-19, Third: 32-34, Fourth: 48-50, Bottom: 64-66
        const TREE_ONE = [
            [0, 1, 2, 3],       // Top row (4 tiles wide)
            [16, 17, 18, 19],   // Second row (4 tiles wide)
            [32, 33, 34],       // Third row (3 tiles wide)
            [48, 49, 50],       // Fourth row (3 tiles wide)
            [64, 65, 66]        // Bottom row (3 tiles wide)
        ];

        // TREE TWO - Top: 35-39, Second: 51-55, Third: 67-71, Fourth: 84-86, Fifth: 100-102, Bottom: 116-118
        const TREE_TWO = [
            [35, 36, 37, 38, 39],   // Top row (5 tiles wide)
            [51, 52, 53, 54, 55],   // Second row (5 tiles wide)
            [67, 68, 69, 70, 71],   // Third row (5 tiles wide)
            [84, 85, 86],           // Fourth row (3 tiles wide)
            [100, 101, 102],        // Fifth row (3 tiles wide)
            [116, 117, 118]         // Bottom row (3 tiles wide)
        ];

        // Select tree pattern using seeded random for consistency across clients
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const treeSeed = seed + x * 1009 + y * 2003; // Unique seed per position
        const treeRandom = this.seededRandom(treeSeed);
        const TREE_TILES = treeRandom < 0.5 ? TREE_ONE : TREE_TWO;

        if (type === 'tree' || type === 'magic_tree' || type === 'dead_tree') {
            // Render multi-tile tree using objects_d spritesheet
            const scale = tileSize / 48;
            const treeGroup = [];

            // Determine collision tile based on tree type
            const collisionTile = (TREE_TILES === TREE_TWO) ? 101 : 65;
            let collisionY = 0;

            for (let row = 0; row < TREE_TILES.length; row++) {
                const rowTiles = TREE_TILES[row];

                // For TREE_TWO, offset bottom 3 rows (rows 3, 4, and 5) by 1 tile to center the trunk
                let xOffset = 0;
                if (TREE_TILES === TREE_TWO && row >= 3) {
                    xOffset = 1;  // Shift right by 1 tile to center under 5-wide top
                }

                for (let col = 0; col < rowTiles.length; col++) {
                    const tileFrame = rowTiles[col];
                    const tilePx = px + ((col + xOffset) * tileSize);
                    const tilePy = py + (row * tileSize);

                    const tileSprite = this.add.sprite(tilePx, tilePy, 'objects_d', tileFrame);
                    tileSprite.setOrigin(0, 0);
                    tileSprite.setScale(scale);
                    tileSprite.setDepth(tilePy + tileSize); // Depth based on bottom of tile for Y-sorting

                    // Don't add to tileContainer - add directly to scene for proper depth sorting
                    treeGroup.push(tileSprite);

                    // Add collision on specific tile
                    if (tileFrame === collisionTile) {
                        collisionY = tilePy;  // Top of the collision tile for depth sorting

                        // Create collision rectangle at the tile's actual position
                        // Use tilePx which already has xOffset applied for TREE_TWO
                        // Different Y offsets for different tree types
                        let collisionYOffset;
                        if (TREE_TILES === TREE_TWO) {
                            // Tree 2: move down 20 pixels from base position
                            collisionYOffset = tilePy - (tileSize / 4) + 20;
                        } else {
                            // Tree 1: move down 20 pixels from base position
                            collisionYOffset = tilePy - (tileSize / 4) + 20;
                        }

                        const collisionRect = this.add.rectangle(
                            tilePx + (tileSize / 2),  // Center X of tile
                            collisionYOffset,
                            tileSize,
                            tileSize,
                            0xff0000,
                            0
                        );
                        this.physics.add.existing(collisionRect, true);  // true = static body

                        // Debug: visualize tree collision box with red outline
                        collisionRect.setStrokeStyle(2, 0xff0000, 1);
                        collisionRect.setDepth(9999); // Always on top
                        // Respect dev settings visibility
                        if (this.devSettings) {
                            collisionRect.setVisible(this.devSettings.showCollisionBoxes);
                        }

                        // Store for later collision setup (after player is created)
                        this.treeCollisions.push(collisionRect);
                    }
                }
            }

            // Store tree sprites with collision Y for depth sorting
            this.treeSprites.push({
                sprites: treeGroup,
                collisionY: collisionY
            });

        } else if (type === 'red_tree') {
            // RED BIOME TREES - Multi-tile trees from Big_Trees_red.png
            const scale = tileSize / 48;
            const treeGroup = [];

            // Define all 4 red tree types
            const RED_TREE_1 = [
                [9, 10],              // Row 1 (2 tiles wide)
                [21, 22],             // Row 2 (2 tiles wide)
                [32, 33, 34, 35],     // Row 3 (4 tiles wide)
                [44, 45, 46, 47],     // Row 4 (4 tiles wide)
                [56, 57, 58, 59],     // Row 5 (4 tiles wide)
                [68, 69, 70, 71]      // Row 6 (4 tiles wide)
            ];

            const RED_TREE_2 = [
                [80, 81, 82, 83],     // Row 1 (4 tiles wide)
                [92, 93, 94, 95],     // Row 2 (4 tiles wide)
                [104, 105, 106, 107], // Row 3 (4 tiles wide)
                [116, 117, 118, 119], // Row 4 (4 tiles wide)
                [128, 129, 130, 131], // Row 5 (4 tiles wide)
                [140, 141, 142, 143]  // Row 6 (4 tiles wide)
            ];

            const RED_TREE_3 = [
                [148, 149, 150, 151],       // Row 1 (4 tiles wide)
                [160, 161, 162, 163],       // Row 2 (4 tiles wide) - FIXED
                [172, 173, 174, 175],       // Row 3 (4 tiles wide)
                [184, 185, 186, 187],       // Row 4 (4 tiles wide)
                [196, 197, 198, 199],       // Row 5 (4 tiles wide) - FIXED
                [208, 209, 210, 211]        // Row 6 (4 tiles wide)
            ];

            const RED_TREE_4 = [
                [224, 225, 226, 227], // Row 1 (4 tiles wide)
                [236, 237, 238, 239], // Row 2 (4 tiles wide)
                [248, 249, 250, 251], // Row 3 (4 tiles wide)
                [260, 261, 262, 263], // Row 4 (4 tiles wide)
                [272, 273, 274, 275], // Row 5 (4 tiles wide)
                [284, 285, 286, 287]  // Row 6 (4 tiles wide)
            ];

            // Randomly select one of the 4 tree types
            const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const treeSeed = seed + x * 1009 + y * 2003;
            const treeRandom = this.seededRandom(treeSeed);

            let TREE_TILES;
            let collisionRow, collisionCol;

            if (treeRandom < 0.25) {
                TREE_TILES = RED_TREE_1;
                collisionRow = 5; // Bottom row
                collisionCol = 1; // Middle of 4-wide bottom
            } else if (treeRandom < 0.5) {
                TREE_TILES = RED_TREE_2;
                collisionRow = 5; // Bottom row
                collisionCol = 1; // Middle of 4-wide bottom
            } else if (treeRandom < 0.75) {
                TREE_TILES = RED_TREE_3;
                collisionRow = 5; // Bottom row
                collisionCol = 1; // Middle of 4-wide bottom
            } else {
                TREE_TILES = RED_TREE_4;
                collisionRow = 5; // Bottom row
                collisionCol = 1; // Middle of 4-wide bottom
            }

            let collisionY = 0;

            // Render all tree tiles
            for (let row = 0; row < TREE_TILES.length; row++) {
                const rowTiles = TREE_TILES[row];

                // Center offset for narrower rows (like RED_TREE_1 rows 1-2)
                let xOffset = 0;
                const maxWidth = Math.max(...TREE_TILES.map(r => r.length));
                if (rowTiles.length < maxWidth) {
                    xOffset = Math.floor((maxWidth - rowTiles.length) / 2);
                }

                for (let col = 0; col < rowTiles.length; col++) {
                    const tileFrame = rowTiles[col];
                    const tilePx = px + ((col + xOffset) * tileSize);
                    const tilePy = py + (row * tileSize);

                    const tileSprite = this.add.sprite(tilePx, tilePy, 'red_trees', tileFrame);
                    tileSprite.setOrigin(0, 0);
                    tileSprite.setScale(scale);
                    tileSprite.setDepth(tilePy + tileSize);

                    treeGroup.push(tileSprite);

                    // Add collision on the specified tile
                    if (row === collisionRow && col === collisionCol) {
                        collisionY = tilePy;

                        const collisionRect = this.add.rectangle(
                            tilePx + (tileSize / 2),
                            tilePy - (tileSize / 4) + 20,
                            tileSize,
                            tileSize,
                            0xff0000,
                            0
                        );
                        this.physics.add.existing(collisionRect, true);

                        // Debug visualization
                        collisionRect.setStrokeStyle(2, 0xff0000, 1);
                        collisionRect.setDepth(9999);
                        if (this.devSettings) {
                            collisionRect.setVisible(this.devSettings.showCollisionBoxes);
                        }

                        this.treeCollisions.push(collisionRect);
                    }
                }
            }

            // Store red tree sprites
            this.treeSprites.push({
                sprites: treeGroup,
                collisionY: collisionY
            });

        } else if (type === 'red_flower' || type === 'red_grass' || type === 'red_bush' ||
                   type === 'red_mushroom' || type === 'red_log' || type === 'red_stone' ||
                   type === 'red_stump' || type === 'red_trunk' || type === 'red_baby_tree') {
            // RED BIOME DECORATIONS from Fantasy_Outside_D_red.png
            const scale = tileSize / 48;
            const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const variantSeed = seed + x * 3001 + y * 7001;
            const variantRand = this.seededRandom(variantSeed);

            // Define all red decoration variants
            const RED_FLOWER_VARIANTS = [
                { frames: [120], scale: 0.7 },   // Red flowers 1
                { frames: [136], scale: 0.7 },   // Red flowers 2
                { frames: [124], scale: 0.7 },   // Red tulip 1
                { frames: [125], scale: 0.7 },   // Red tulip 2
                { frames: [156], scale: 0.7 },   // Red small flower 1
                { frames: [172], scale: 0.7 }    // Red small flower 2
            ];

            const RED_GRASS_VARIANTS = [
                { frames: [173], scale: 0.7 },       // Red grass blade 1
                { frames: [188, 204], scale: 0.7 },  // Red grass blade 2 (1x2)
                { frames: [189, 205], scale: 0.7 }   // Red grass blade 3 (1x2)
            ];

            const RED_BUSH_VARIANTS = [
                { frames: [121], scale: 0.8 },   // Red bush 1
                { frames: [122], scale: 0.8 },   // Red bush 2
                { frames: [123], scale: 0.8 }    // Red bush 3
            ];

            const RED_MUSHROOM_VARIANTS = [
                { frames: [157], scale: 0.8 },   // Red large mushroom
                { frames: [174], scale: 0.7 },   // Red purple mushrooms 1
                { frames: [175], scale: 0.7 },   // Red purple mushrooms 2
                { frames: [206], scale: 0.7 },   // Red mushroom 1
                { frames: [207], scale: 0.7 }    // Red mushroom 2
            ];

            const RED_LOG_VARIANTS = [
                { frames: [107], scale: 0.8 },       // Red small log 1
                { frames: [78], scale: 0.8 },        // Red small log 2
                { frames: [92, 108], scale: 0.8 },   // Red log 1 (1x2)
                { frames: [93, 109], scale: 0.8 },   // Red log 2 (1x2)
                { frames: [94, 95], scale: 0.8 }     // Red log 3 (2x1)
            ];

            const RED_STONE_VARIANTS = [
                { frames: [88], scale: 0.8 },    // Red stone 1
                { frames: [90], scale: 0.8 }     // Red stone 2
            ];

            const RED_STUMP_VARIANTS = [
                { frames: [4], scale: 0.8 },     // Tree stump
                { frames: [20], scale: 0.8 }     // Tree stump with moss
            ];

            const RED_TRUNK_VARIANTS = [
                { frames: [96, 112], scale: 0.9 },   // Red hollow tree trunk (1x2)
                { frames: [80, 96], scale: 0.9 }     // Red solid tree trunk (1x2)
            ];

            const RED_BABY_TREE_VARIANTS = [
                { frames: [87, 103], scale: 0.9 }    // Red baby tree (1x2)
            ];

            // Select variant based on type
            let variants;
            if (type === 'red_flower') variants = RED_FLOWER_VARIANTS;
            else if (type === 'red_grass') variants = RED_GRASS_VARIANTS;
            else if (type === 'red_bush') variants = RED_BUSH_VARIANTS;
            else if (type === 'red_mushroom') variants = RED_MUSHROOM_VARIANTS;
            else if (type === 'red_log') variants = RED_LOG_VARIANTS;
            else if (type === 'red_stone') variants = RED_STONE_VARIANTS;
            else if (type === 'red_stump') variants = RED_STUMP_VARIANTS;
            else if (type === 'red_trunk') variants = RED_TRUNK_VARIANTS;
            else if (type === 'red_baby_tree') variants = RED_BABY_TREE_VARIANTS;

            const variantIndex = Math.floor(variantRand * variants.length);
            const variant = variants[variantIndex];

            // Render decoration tiles
            // Calculate actual rendered tile size to avoid gaps in multi-tile decorations
            const scaledTileSize = 48 * scale * variant.scale;

            for (let i = 0; i < variant.frames.length; i++) {
                const frame = variant.frames[i];
                let tilePx = px;
                let tilePy = py;

                // Handle multi-tile positioning - use scaled size to avoid gaps
                if (variant.frames.length === 2) {
                    // Check if it's 2x1 (horizontal) or 1x2 (vertical)
                    if (type === 'red_log' && frame === 95) {
                        // Red log 3 is 2x1 (horizontal)
                        tilePx = px + (i * scaledTileSize);
                    } else {
                        // All others are 1x2 (vertical)
                        tilePy = py + (i * scaledTileSize);
                    }
                }

                const sprite = this.add.sprite(tilePx, tilePy, 'red_decorations', frame);
                sprite.setOrigin(0, 0);
                sprite.setScale(scale * variant.scale);
                sprite.setDepth(tilePy + tileSize);
            }

        } else {
            // Enhanced decoration system with variety
            const scale = tileSize / 48;

            // Rock variants (5 types - mix of single and multi-tile)
            const ROCK_VARIANTS = [
                { frames: [88], scale: 0.8 },      // Rock one
                { frames: [89, 105], scale: 0.8 }, // Rock two (2x1 vertical)
                { frames: [106], scale: 0.8 },     // Rock three
                { frames: [90], scale: 0.8 },      // Rock four
                { frames: [59], scale: 0.8 }       // Rock five
            ];

            // Bush variants (3 types)
            const BUSH_VARIANTS = [
                { frames: [121], scale: 0.8 },     // Bush one
                { frames: [122], scale: 0.8 },     // Bush two
                { frames: [123], scale: 0.8 }      // Bush three
            ];

            // Flower variants (10 types with different colors)
            const FLOWER_VARIANTS = [
                { frames: [12], scale: 0.7 },      // Red flower one
                { frames: [136], scale: 0.7 },     // Red flower two
                { frames: [137], scale: 0.7 },     // Blue flower one
                { frames: [138], scale: 0.7 },     // Blue flower two
                { frames: [139], scale: 0.7 },     // Blue flower three
                { frames: [140], scale: 0.7 },     // Cyan flower one
                { frames: [141], scale: 0.7 }      // Cyan flower two
            ];

            // Grass blade variants (3 types)
            const GRASS_VARIANTS = [
                { frames: [173], scale: 0.7 },     // Grass blades one
                { frames: [188, 204], scale: 0.7 },// Grass blades two (2x1 vertical)
                { frames: [189, 205], scale: 0.7 } // Grass blades three (2x1 vertical)
            ];

            // Log variants (4 types)
            const LOG_VARIANTS = [
                { frames: [107], scale: 0.8 },     // Log one
                { frames: [92, 108], scale: 0.8 }, // Log two (2x1 vertical)
                { frames: [93, 109], scale: 0.8 }, // Log three (2x1 vertical)
                { frames: [94, 95], scale: 0.8, horizontal: true } // Log four (1x2 horizontal)
            ];

            // Tree stump variants (2 types)
            const TREE_STUMP_VARIANTS = [
                { frames: [4], scale: 0.8 },      // Stump one
                { frames: [20], scale: 0.8 }      // Stump two
            ];

            // Other single decorations
            const OTHER_DECORATIONS = {
                rune_stone: { frames: [96], scale: 0.9 },
                skull: { frames: [128], scale: 0.7 },
                baby_tree: { frames: [87, 103], scale: 0.9 },      // 2x1 vertical
                hollow_trunk: { frames: [96, 112], scale: 0.9 }    // 2x1 vertical
            };

            let decoInfo;

            // Select variant based on type using position-based seed
            const variantSeed = seed + x * 503 + y * 1009; // Unique per position

            // Select variant based on type
            if (type === 'rock') {
                const variant = Math.floor(this.seededRandom(variantSeed) * ROCK_VARIANTS.length);
                decoInfo = ROCK_VARIANTS[variant];
            } else if (type === 'bush') {
                const variant = Math.floor(this.seededRandom(variantSeed) * BUSH_VARIANTS.length);
                decoInfo = BUSH_VARIANTS[variant];
            } else if (type === 'flower') {
                const variant = Math.floor(this.seededRandom(variantSeed) * FLOWER_VARIANTS.length);
                decoInfo = FLOWER_VARIANTS[variant];
            } else if (type === 'grass') {
                const variant = Math.floor(this.seededRandom(variantSeed) * GRASS_VARIANTS.length);
                decoInfo = GRASS_VARIANTS[variant];
            } else if (type === 'log') {
                const variant = Math.floor(this.seededRandom(variantSeed) * LOG_VARIANTS.length);
                decoInfo = LOG_VARIANTS[variant];
            } else if (type === 'tree_stump') {
                const variant = Math.floor(this.seededRandom(variantSeed) * TREE_STUMP_VARIANTS.length);
                decoInfo = TREE_STUMP_VARIANTS[variant];
            } else {
                decoInfo = OTHER_DECORATIONS[type];
            }

            if (!decoInfo) {
                console.warn(`Unknown decoration type: ${type}`);
                return;
            }

            const finalScale = scale * decoInfo.scale;
            const frames = decoInfo.frames;

            // Render multi-tile or single-tile decoration
            if (frames.length === 1) {
                // Single tile
                const decoration = this.add.sprite(px, py, 'objects_d', frames[0]);
                decoration.setOrigin(0, 0);
                decoration.setScale(finalScale);
                decoration.setDepth(py + tileSize);
                this.tileContainer.add(decoration);

            } else if (frames.length === 2 && decoInfo.horizontal) {
                // Horizontal 1x2 (side by side)
                const sprite1 = this.add.sprite(px, py, 'objects_d', frames[0]);
                sprite1.setOrigin(0, 0);
                sprite1.setScale(finalScale);
                sprite1.setDepth(py + tileSize);
                this.tileContainer.add(sprite1);

                // Position sprite2 based on actual width of sprite1 to avoid gaps
                const sprite2 = this.add.sprite(px + sprite1.displayWidth, py, 'objects_d', frames[1]);
                sprite2.setOrigin(0, 0);
                sprite2.setScale(finalScale);
                sprite2.setDepth(py + tileSize);
                this.tileContainer.add(sprite2);

            } else if (frames.length === 2) {
                // Vertical 2x1 (stacked)
                const topSprite = this.add.sprite(px, py, 'objects_d', frames[0]);
                topSprite.setOrigin(0, 0);
                topSprite.setScale(finalScale);
                topSprite.setDepth(py + tileSize * 2);
                this.tileContainer.add(topSprite);

                // Position bottomSprite based on actual height of topSprite to avoid gaps
                const bottomSprite = this.add.sprite(px, py + topSprite.displayHeight, 'objects_d', frames[1]);
                bottomSprite.setOrigin(0, 0);
                bottomSprite.setScale(finalScale);
                bottomSprite.setDepth(py + tileSize * 2);
                this.tileContainer.add(bottomSprite);
            }
        }
    }

    createSpawnPoint() {
        // Get spawn location from world data
        const worldSize = this.gameData.world.size;
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const worldCenterX = (worldSize / 2) * tileSize;
        const worldCenterY = (worldSize / 2) * tileSize;
        const safeZoneRadius = 800; // pixels

        console.log(`✨ Creating spawn point at world center (${worldCenterX}, ${worldCenterY})`);

        // Create particle texture if it doesn't exist
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);
            graphics.destroy();
        }

        // === LOAD TILED MAP FOR SPAWN BUILDING ===
        const map = this.make.tilemap({ key: 'spawnMap' });

        // Map is 50x50 tiles, each tile is 48px source but we use 32px game tiles
        const mapWidthTiles = 50;
        const mapHeightTiles = 50;
        const mapWidthPx = mapWidthTiles * tileSize;
        const mapHeightPx = mapHeightTiles * tileSize;

        // Position map so its center aligns with world center
        const mapOffsetX = worldCenterX - (mapWidthPx / 2);
        const mapOffsetY = worldCenterY - (mapHeightPx / 2);

        console.log(`📍 Spawn map: ${mapWidthTiles}x${mapHeightTiles} tiles (${mapWidthPx}x${mapHeightPx}px)`);
        console.log(`📍 Map positioned at offset (${mapOffsetX}, ${mapOffsetY})`);

        // Add ALL tilesets used in the map (must match TMJ embedded tileset names)
        const tilesets = [
            map.addTilesetImage('A2 - Terrain And Misc', 'terrain_misc'),
            map.addTilesetImage('Fantasy_Outside_A5', 'fantasy_outside_a5'),
            map.addTilesetImage('a2_terrain_base', 'terrain_base'),
            map.addTilesetImage('A1 - Liquids And Misc', 'liquids_misc'),
            map.addTilesetImage('A3 - Walls And Floors', 'walls_floors'),
            map.addTilesetImage('A4 - Walls', 'walls'),
            map.addTilesetImage('Fantasy_door1', 'fantasy_door1'),
            map.addTilesetImage('Fantasy_door2', 'fantasy_door2'),
            map.addTilesetImage('Gate_Cathedral1', 'gate_cathedral1'),
            map.addTilesetImage('Fantasy_Outside_D', 'objects_d'),
            map.addTilesetImage('Fantasy_Outside_C', 'fantasy_outside_c'),
            map.addTilesetImage('A2_extended_forest_terrain', 'forest_extended'),
            map.addTilesetImage('Big_Trees_red', 'red_trees'),
            map.addTilesetImage('Fantasy_Outside_D_red', 'red_decorations')
        ];

        console.log(`✅ Loaded ${tilesets.filter(t => t).length} tilesets for spawn building`);

        // Create all layers from the map (actual layer names from TMJ)
        const scale = tileSize / 48; // Scale from 48px tileset to 32px game tiles
        const layerConfig = [
            { name: 'Ground', depth: -1 },
            { name: 'water', depth: 0 },
            { name: 'walkway', depth: 1 },
            { name: 'walls', depth: 2 },
            { name: 'door', depth: 3 },
            { name: 'roof', depth: 4 },
            { name: 'roof decor', depth: 5 },
            { name: 'fence', depth: 6 }
        ];

        // Store layers for collision setup
        const createdLayers = [];

        layerConfig.forEach(({ name, depth }) => {
            const layer = map.createLayer(name, tilesets, mapOffsetX, mapOffsetY);
            if (layer) {
                layer.setScale(scale);
                layer.setDepth(depth);
                createdLayers.push(layer);

                // Store door layer for interaction
                if (name === 'door') {
                    this.doorLayer = layer;
                    this.doorLayerOffset = { x: mapOffsetX, y: mapOffsetY };
                    this.doorLayerScale = scale;
                }

                console.log(`  ✅ Created layer: ${name} (depth: ${depth})`);
            }
        });

        // === SETUP COLLISION FOR LAYERS WITH CUSTOM PROPERTIES ===
        console.log('🔒 Setting up collision for castle layers...');
        createdLayers.forEach(layer => {
            // Skip door layer - players need to walk through it
            if (layer.layer.name === 'door') {
                console.log(`  🚪 Skipping collision for door layer (walkable)`);
                return;
            }

            // Check if layer has collision property set to true
            const layerData = map.getLayer(layer.layer.name);
            if (layerData && layerData.properties) {
                const collisionProp = layerData.properties.find(p =>
                    (p.name === 'collision' || p.name === 'collides') && p.value === true
                );

                if (collisionProp) {
                    // Enable collision on all tiles in this layer
                    layer.setCollisionByExclusion([-1]);
                    console.log(`  🔒 Enabled collision for layer: ${layer.layer.name}`);

                    // Store this layer for later collision setup with player
                    if (!this.castleCollisionLayers) {
                        this.castleCollisionLayers = [];
                    }
                    this.castleCollisionLayers.push(layer);
                }
            }
        });

        // Spawn point is now at the CENTER of the map (tile 25, 25)
        const spawnX = worldCenterX; // Center of map
        const spawnY = worldCenterY; // Center of map
        console.log(`👤 Player spawn at map center: (${spawnX}, ${spawnY})`);

        // Create container for spawn point visual effects (on top of building)
        this.spawnPointContainer = this.add.container(0, 0);
        this.spawnPointContainer.setDepth(100); // Above building

        // 1. SUBTLE MAGICAL GLOW - Small glowing circle at center
        const glow = this.add.graphics();
        glow.fillStyle(0xfbbf24, 0.2); // Golden glow
        glow.fillCircle(spawnX, spawnY, 60);
        glow.setDepth(2);

        // Gentle pulsing
        this.tweens.add({
            targets: glow,
            alpha: 0.4,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.spawnPointContainer.add(glow);

        // 2. SAFE ZONE BORDER - Subtle glowing ring at edge
        const borderRing = this.add.graphics();
        borderRing.lineStyle(2, 0x8b5cf6, 0.3);
        borderRing.strokeCircle(spawnX, spawnY, safeZoneRadius);
        borderRing.setDepth(1);

        // Gentle pulsing border
        this.tweens.add({
            targets: borderRing,
            alpha: 0.15,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.spawnPointContainer.add(borderRing);

        // 3. SUBTLE PARTICLE EFFECTS - Gentle magical sparkles
        if (this.textures.exists('particle')) {
            // Gentle upward floating sparkles
            const sparkles = this.add.particles(spawnX, spawnY, 'particle', {
                speed: { min: 10, max: 30 },
                scale: { start: 0.2, end: 0 },
                alpha: { start: 0.4, end: 0 },
                tint: [0xfbbf24, 0x8b5cf6],
                lifespan: 3000,
                frequency: 300,
                quantity: 1,
                angle: { min: -100, max: -80 }, // Upward
                gravityY: -20,
                blendMode: 'ADD'
            });
            sparkles.setDepth(3);

            this.spawnPointContainer.add(sparkles);
        }

        // 4. WELCOME TEXT - Floating above spawn
        const welcomeText = this.add.text(spawnX, spawnY - 150, '⚔️ SAFE ZONE ⚔️', {
            fontFamily: 'Press Start 2P, monospace',
            fontSize: '16px',
            fill: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true
            }
        }).setOrigin(0.5).setDepth(101);

        // Gentle pulsing
        this.tweens.add({
            targets: welcomeText,
            alpha: 0.8,
            scale: 1.02,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.spawnPointContainer.add(welcomeText);

        // Store spawn point data for safe zone checks
        this.spawnPointData = {
            x: spawnX,
            y: spawnY,
            safeZoneRadius: safeZoneRadius
        };

        console.log(`✅ Spawn point created with ${safeZoneRadius}px safe zone`);
    }

    createUI() {
        // Create modern HUD system
        this.modernHUD = new ModernHUD(this, this.localPlayer);

        // Create skill selector system
        this.skillSelector = new SkillSelector(this);
    }

    setupControls() {
        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Tilda key for dev menu
        this.tildaKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK);
        this.tildaKey.on('down', () => {
            this.toggleDevMenu();
        });

        // Mouse click to attack
        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown() && this.localPlayer) {
                this.localPlayer.attack(pointer.worldX, pointer.worldY);
            }
        });

        // Initialize dev settings
        this.devSettings = {
            showCollisionBoxes: true,
            showFPS: false,
            showPosition: false,
            showGrid: false,
            showNetworkStats: false,
            godMode: false,
            speedMultiplier: 1.0,
            noClip: false,
            infiniteHealth: false,
            showEntityIDs: false,
            showDepthValues: false,
            damageNumbers: false,
            showSightRange: false,
            cameraZoom: 1.0,
            freeCamera: false,
            muteMusic: false,
            muteSFX: false
        };

        this.createDevMenu();
        this.createDebugOverlays();
    }

    setupNetworkListeners() {
        // Store event handlers for cleanup
        this.networkHandlers = {};

        // Clear any existing listeners to prevent duplicates
        // This is critical when reconnecting with the same username
        const eventsToClear = [
            'player:joined', 'player:left', 'player:moved', 'player:changedMap', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:damaged', 'enemy:moved', 'enemy:killed',
            'minion:damaged',
            'item:spawned', 'item:collected', 'chat:message'
        ];

        eventsToClear.forEach(event => {
            if (networkManager.callbacks[event]) {
                networkManager.callbacks[event] = [];
            }
        });

        // New player joined
        networkManager.on('player:joined', (data) => {

            // Don't create a sprite for ourselves
            if (data.player.id !== networkManager.currentPlayer.id) {
                // Create new player sprite
                const newPlayer = new Player(this, data.player);
                this.otherPlayers[data.player.id] = newPlayer;

                // Initialize map tracking (new players start on exterior)
                newPlayer.currentMap = data.player.currentMap || 'exterior';

                // Spawn permanent minion if player is Malachar
                if (data.player.class === 'MALACHAR') {
                    this.spawnMinion(
                        newPlayer.sprite.x + 40,
                        newPlayer.sprite.y,
                        data.player.id,
                        true // permanent
                    );
                }

                // Add tree collisions to new player
                if (this.treeCollisions) {
                    this.treeCollisions.forEach(collisionRect => {
                        this.physics.add.collider(newPlayer.sprite, collisionRect);
                    });
                }

                // Add castle collision layers to new player
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(newPlayer.sprite, layer);
                    });
                }
            }
        });

        // Player left
        networkManager.on('player:left', (data) => {

            const player = this.otherPlayers[data.playerId];
            if (player) {
                player.sprite.destroy();
                delete this.otherPlayers[data.playerId];

                // Remove all minions owned by this player
                Object.keys(this.minions).forEach(minionId => {
                    const minion = this.minions[minionId];
                    if (minion.ownerId === data.playerId) {
                        minion.destroy();
                        delete this.minions[minionId];
                    }
                });
            }
        });

        // Player movement
        networkManager.on('player:moved', (data) => {
            const player = this.otherPlayers[data.playerId];
            if (player) {
                player.moveToPosition(data.position);
            }
        });

        // Player changed map
        networkManager.on('player:changedMap', (data) => {
            const player = this.otherPlayers[data.playerId];
            if (player) {
                player.currentMap = data.mapName;
                // Hide/show player based on whether they're on the same map as local player
                const onSameMap = data.mapName === this.currentMap;
                player.sprite.setVisible(onSameMap);
                if (player.ui) {
                    player.ui.setVisible(onSameMap);
                }
                console.log(`👤 ${player.data.username} is now on ${data.mapName} map (visible: ${onSameMap})`);
            }
        });

        // Player attacked
        networkManager.on('player:attacked', (data) => {
            const player = this.otherPlayers[data.playerId] || this.localPlayer;
            if (player) {
                // Show attack effect
                this.showAttackEffect(data.position);
            }
        });

        // Player died
        networkManager.on('player:died', (data) => {
            const player = this.otherPlayers[data.playerId];
            if (player) {
                player.die();
            }
            if (data.playerId === networkManager.currentPlayer.id) {
                this.localPlayer.die();
            }
        });

        // Player leveled up
        networkManager.on('player:levelup', (data) => {
            const player = data.playerId === networkManager.currentPlayer.id
                ? this.localPlayer
                : this.otherPlayers[data.playerId];

            if (player) {
                // DIAGNOSTIC: Count objects BEFORE level up processing
                const tweensBefore = this.tweens.getTweens().length;
                const graphicsBefore = this.children.list.filter(c => c.type === 'Graphics').length;

                // Update player stats silently
                player.level = data.level;
                player.experience = data.experience;
                player.maxHealth = data.maxHealth;
                player.health = data.health;
                player.stats = data.stats;

                // Update UI (health bar only)
                if (player.ui) {
                    player.ui.updateHealthBar();
                }

                // DIAGNOSTIC: Count objects AFTER level up processing
                const tweensAfter = this.tweens.getTweens().length;
                const graphicsAfter = this.children.list.filter(c => c.type === 'Graphics').length;

                // Level up effects for local player
                if (data.playerId === networkManager.currentPlayer.id) {
                    console.log(`🎉 LEVEL UP! Level ${data.level} | HP: ${data.health}/${data.maxHealth} | STR: ${data.stats.strength} | DEF: ${data.stats.defense}`);
                    console.log(`📊 DIAGNOSTIC - Tweens: ${tweensBefore} → ${tweensAfter} (Δ${tweensAfter - tweensBefore})`);
                    console.log(`📊 DIAGNOSTIC - Graphics: ${graphicsBefore} → ${graphicsAfter} (Δ${graphicsAfter - graphicsBefore})`);

                    // Visual level-up effect
                    if (this.visualEffectsManager) {
                        this.visualEffectsManager.createLevelUpEffect(
                            player.sprite.x,
                            player.sprite.y
                        );
                    }

                    // Show skill selector!
                    if (this.skillSelector) {
                        this.skillSelector.show(player.class, data.level);
                    }
                }
            }
        });

        // Enemy spawned
        networkManager.on('enemy:spawned', (data) => {
            if (data.enemy.type === 'wolf') {
                const wolf = new Wolf(this, data.enemy);
                this.wolves[data.enemy.id] = wolf;

                // Add castle collision to wolf
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(wolf.sprite, layer);
                    });
                }
            } else {
                const enemy = new Enemy(this, data.enemy);
                this.enemies[data.enemy.id] = enemy;

                // Add castle collision to enemy
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(enemy.sprite, layer);
                    });
                }
            }
        });

        // Enemy damaged
        networkManager.on('enemy:damaged', (data) => {
            const enemy = this.enemies[data.enemyId] || this.wolves[data.enemyId];
            if (enemy) {
                enemy.takeDamage(data.damage);
            }
        });

        // Minion damaged by enemy
        networkManager.on('minion:damaged', (data) => {
            const minion = this.minions[data.minionId];
            if (minion) {
                minion.takeDamage(data.damage);
            }
        });

        // Enemy moved
        networkManager.on('enemy:moved', (data) => {
            const enemy = this.enemies[data.enemyId] || this.wolves[data.enemyId];

            // Debug: Only log if enemy not found (removed excessive 100% logging)
            if (!enemy) {
                const inEnemies = !!this.enemies[data.enemyId];
                const inWolves = !!this.wolves[data.enemyId];
                console.warn(`⚠️ enemy:moved event for ${data.enemyId.substring(0,8)} - inEnemies: ${inEnemies}, inWolves: ${inWolves}`);
                return;
            }

            if (enemy && enemy.sprite) {
                const tileSize = GameConfig.GAME.TILE_SIZE;
                const targetX = data.position.x * tileSize + tileSize / 2;
                const targetY = data.position.y * tileSize + tileSize / 2;

                // Update position with interpolation
                enemy.data.position = data.position;
                enemy.setTargetPosition(targetX, targetY);
            }
        });

        // Player damaged by enemy
        networkManager.on('player:damaged', (data) => {
            if (data.playerId === networkManager.currentPlayer.id && this.localPlayer) {
                this.localPlayer.health = data.health;
                // Show damage effect
                this.cameras.main.shake(100, 0.005);
            }
        });

        // Enemy killed
        networkManager.on('enemy:killed', (data) => {
            const enemy = this.enemies[data.enemyId] || this.wolves[data.enemyId];
            if (enemy) {
                const deathX = enemy.sprite.x;
                const deathY = enemy.sprite.y;

                enemy.die();

                // Delete from correct collection
                if (this.enemies[data.enemyId]) {
                    delete this.enemies[data.enemyId];
                } else if (this.wolves[data.enemyId]) {
                    delete this.wolves[data.enemyId];
                }

                // Check if killer is Malachar with special passives
                if (data.killedBy) {
                    const killer = data.killedBy === networkManager.currentPlayer.id
                        ? this.localPlayer
                        : this.otherPlayers[data.killedBy];

                    if (killer && killer.class === 'MALACHAR') {
                        // Heal on kill effects
                        let totalHeal = 0;

                        // Flat heal per kill
                        if (killer.healPerKill) {
                            totalHeal += killer.healPerKill;
                        }

                        // Percentage heal per kill
                        if (killer.healOnKillPercent) {
                            totalHeal += Math.floor(killer.maxHealth * killer.healOnKillPercent);
                        }

                        // Apply healing
                        if (totalHeal > 0 && killer === this.localPlayer) {
                            killer.health = Math.min(killer.maxHealth, killer.health + totalHeal);
                            if (killer.ui) {
                                killer.ui.updateHealthBar();
                            }

                            // Visual heal effect
                            if (this.visualEffectsManager) {
                                this.visualEffectsManager.createHealEffect(
                                    killer.sprite.x,
                                    killer.sprite.y,
                                    totalHeal
                                );
                            }
                        }

                        // 15% chance to summon minion (dark_harvest passive)
                        if (Math.random() < 0.15) {
                            this.spawnMinion(deathX, deathY, data.killedBy);
                        }
                    }
                }
            }
        });

        // Enemy died (legacy support)
        networkManager.on('enemy:died', (data) => {
            const enemy = this.enemies[data.enemyId];
            if (enemy) {
                const deathX = enemy.sprite.x;
                const deathY = enemy.sprite.y;

                enemy.die();
                delete this.enemies[data.enemyId];

                // Check if killer is Malachar with dark_harvest passive
                if (data.killerId) {
                    const killer = data.killerId === networkManager.currentPlayer.id
                        ? this.localPlayer
                        : this.otherPlayers[data.killerId];

                    if (killer && killer.class === 'MALACHAR') {
                        // 15% chance to summon minion (dark_harvest passive)
                        if (Math.random() < 0.15) {
                            this.spawnMinion(deathX, deathY, data.killerId);
                        }
                    }
                }
            }
        });

        // Item spawned
        networkManager.on('item:spawned', (data) => {
            this.items[data.item.id] = new Item(this, data.item);
        });

        // Item collected
        networkManager.on('item:collected', (data) => {
            const item = this.items[data.itemId];
            if (item) {
                item.collect();
                delete this.items[data.itemId];
            }
        });

        // Chat
        networkManager.on('chat:message', (data) => {
            this.showChatMessage(data.username, data.message);
        });
    }

    createDevMenu() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;

        this.devMenuElements = [];

        // Large background
        const bg = this.add.rectangle(centerX, centerY, 700, 550, 0x000000, 0.95);
        bg.setStrokeStyle(3, 0x00ff00);
        bg.setScrollFactor(0);
        bg.setDepth(10000);
        bg.setVisible(false);
        this.devMenuElements.push(bg);

        // Title
        const title = this.add.text(centerX, centerY - 260, '═══ DEV SETTINGS ═══', {
            font: 'bold 24px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(10001);
        title.setVisible(false);
        this.devMenuElements.push(title);

        const startY = centerY - 220;
        const leftX = centerX - 160;
        const rightX = centerX + 160;
        const spacing = 35;

        // LEFT COLUMN - Visual Debug
        this.createCategoryLabel('VISUAL DEBUG', leftX, startY - 10);
        this.createToggleButton('Collision Boxes', 'showCollisionBoxes', leftX, startY + spacing * 0);
        this.createToggleButton('Show Grid', 'showGrid', leftX, startY + spacing * 1);
        this.createToggleButton('Entity IDs', 'showEntityIDs', leftX, startY + spacing * 2);
        this.createToggleButton('Depth Values', 'showDepthValues', leftX, startY + spacing * 3);
        this.createToggleButton('Enemy Sight', 'showSightRange', leftX, startY + spacing * 4);
        this.createToggleButton('Damage Numbers', 'damageNumbers', leftX, startY + spacing * 5);

        // RIGHT COLUMN - Performance & Info
        this.createCategoryLabel('INFO & STATS', rightX, startY - 10);
        this.createToggleButton('FPS Counter', 'showFPS', rightX, startY + spacing * 0);
        this.createToggleButton('Player Position', 'showPosition', rightX, startY + spacing * 1);
        this.createToggleButton('Network Stats', 'showNetworkStats', rightX, startY + spacing * 2);

        // CHEATS SECTION (centered)
        const cheatsY = startY + spacing * 7;
        this.createCategoryLabel('CHEATS', centerX, cheatsY);
        this.createToggleButton('God Mode', 'godMode', leftX, cheatsY + spacing);
        this.createToggleButton('Infinite Health', 'infiniteHealth', rightX, cheatsY + spacing);
        this.createToggleButton('No Clip', 'noClip', leftX, cheatsY + spacing * 2);
        this.createSpeedControl(rightX, cheatsY + spacing * 2);

        // CAMERA SECTION
        const cameraY = cheatsY + spacing * 3.5;
        this.createCategoryLabel('CAMERA', centerX, cameraY);
        this.createToggleButton('Free Camera', 'freeCamera', leftX, cameraY + spacing);
        this.createZoomControl(rightX, cameraY + spacing);

        // AUDIO SECTION
        const audioY = cameraY + spacing * 2;
        this.createCategoryLabel('AUDIO', centerX, audioY);
        this.createToggleButton('Mute Music', 'muteMusic', leftX, audioY + spacing);
        this.createToggleButton('Mute SFX', 'muteSFX', rightX, audioY + spacing);

        // ACTION BUTTONS
        const actionsY = audioY + spacing * 2.5;
        this.createActionButton('Clear Enemies', () => this.clearAllEnemies(), leftX + 80, actionsY);
        this.createActionButton('Heal Full', () => this.healPlayer(), rightX - 80, actionsY);

        // Instructions
        const instructions = this.add.text(centerX, centerY + 265, 'Press ` to close | Click buttons to toggle', {
            font: '12px monospace',
            fill: '#666666',
            align: 'center'
        }).setOrigin(0.5);
        instructions.setScrollFactor(0);
        instructions.setDepth(10001);
        instructions.setVisible(false);
        this.devMenuElements.push(instructions);

        this.devMenuVisible = false;
    }

    createCategoryLabel(text, x, y) {
        const label = this.add.text(x, y, text, {
            font: 'bold 14px monospace',
            fill: '#ffff00'
        }).setOrigin(0.5);
        label.setScrollFactor(0);
        label.setDepth(10001);
        label.setVisible(false);
        this.devMenuElements.push(label);
    }

    createToggleButton(label, settingKey, x, y) {
        const button = this.add.rectangle(x, y, 280, 28, 0x222222, 1);
        button.setStrokeStyle(2, 0x00ff00);
        button.setScrollFactor(0);
        button.setDepth(10001);
        button.setVisible(false);
        button.setInteractive({ useHandCursor: true });

        const text = this.add.text(x - 100, y, label, {
            font: '13px monospace',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        text.setScrollFactor(0);
        text.setDepth(10002);
        text.setVisible(false);

        const statusText = this.add.text(x + 100, y, this.devSettings[settingKey] ? 'ON' : 'OFF', {
            font: 'bold 13px monospace',
            fill: this.devSettings[settingKey] ? '#00ff00' : '#ff0000'
        }).setOrigin(1, 0.5);
        statusText.setScrollFactor(0);
        statusText.setDepth(10002);
        statusText.setVisible(false);

        button.on('pointerdown', () => {
            this.devSettings[settingKey] = !this.devSettings[settingKey];
            statusText.setText(this.devSettings[settingKey] ? 'ON' : 'OFF');
            statusText.setColor(this.devSettings[settingKey] ? '#00ff00' : '#ff0000');
            this.updateDevSetting(settingKey);
        });

        button.on('pointerover', () => button.setStrokeStyle(2, 0x00ffff));
        button.on('pointerout', () => button.setStrokeStyle(2, 0x00ff00));

        this.devMenuElements.push(button, text, statusText);
    }

    createSpeedControl(x, y) {
        const speeds = [0.5, 1.0, 2.0, 5.0, 10.0];
        let currentIndex = 1;

        const button = this.add.rectangle(x, y, 280, 28, 0x222222, 1);
        button.setStrokeStyle(2, 0x00ff00);
        button.setScrollFactor(0);
        button.setDepth(10001);
        button.setVisible(false);
        button.setInteractive({ useHandCursor: true });

        const text = this.add.text(x - 100, y, 'Speed', {
            font: '13px monospace',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        text.setScrollFactor(0);
        text.setDepth(10002);
        text.setVisible(false);

        const valueText = this.add.text(x + 100, y, '1.0x', {
            font: 'bold 13px monospace',
            fill: '#00ff00'
        }).setOrigin(1, 0.5);
        valueText.setScrollFactor(0);
        valueText.setDepth(10002);
        valueText.setVisible(false);

        button.on('pointerdown', () => {
            currentIndex = (currentIndex + 1) % speeds.length;
            this.devSettings.speedMultiplier = speeds[currentIndex];
            valueText.setText(speeds[currentIndex] + 'x');
        });

        button.on('pointerover', () => button.setStrokeStyle(2, 0x00ffff));
        button.on('pointerout', () => button.setStrokeStyle(2, 0x00ff00));

        this.devMenuElements.push(button, text, valueText);
    }

    createZoomControl(x, y) {
        const zooms = [0.5, 0.75, 1.0, 1.5, 2.0];
        let currentIndex = 2;

        const button = this.add.rectangle(x, y, 280, 28, 0x222222, 1);
        button.setStrokeStyle(2, 0x00ff00);
        button.setScrollFactor(0);
        button.setDepth(10001);
        button.setVisible(false);
        button.setInteractive({ useHandCursor: true });

        const text = this.add.text(x - 100, y, 'Zoom', {
            font: '13px monospace',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        text.setScrollFactor(0);
        text.setDepth(10002);
        text.setVisible(false);

        const valueText = this.add.text(x + 100, y, '1.0x', {
            font: 'bold 13px monospace',
            fill: '#00ff00'
        }).setOrigin(1, 0.5);
        valueText.setScrollFactor(0);
        valueText.setDepth(10002);
        valueText.setVisible(false);

        button.on('pointerdown', () => {
            currentIndex = (currentIndex + 1) % zooms.length;
            this.devSettings.cameraZoom = zooms[currentIndex];
            this.cameras.main.setZoom(zooms[currentIndex]);
            valueText.setText(zooms[currentIndex] + 'x');
        });

        button.on('pointerover', () => button.setStrokeStyle(2, 0x00ffff));
        button.on('pointerout', () => button.setStrokeStyle(2, 0x00ff00));

        this.devMenuElements.push(button, text, valueText);
    }

    createActionButton(label, callback, x, y) {
        const button = this.add.rectangle(x, y, 140, 28, 0x444444, 1);
        button.setStrokeStyle(2, 0xffff00);
        button.setScrollFactor(0);
        button.setDepth(10001);
        button.setVisible(false);
        button.setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, label, {
            font: 'bold 12px monospace',
            fill: '#ffff00'
        }).setOrigin(0.5);
        text.setScrollFactor(0);
        text.setDepth(10002);
        text.setVisible(false);

        button.on('pointerdown', callback);
        button.on('pointerover', () => button.setStrokeStyle(2, 0xffffff));
        button.on('pointerout', () => button.setStrokeStyle(2, 0xffff00));

        this.devMenuElements.push(button, text);
    }

    createDebugOverlays() {
        // FPS Counter
        this.fpsText = this.add.text(10, 10, 'FPS: 60', {
            font: 'bold 14px monospace',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setScrollFactor(0).setDepth(9998).setVisible(false);

        // Player Position
        this.positionText = this.add.text(10, 30, 'X: 0 Y: 0', {
            font: '12px monospace',
            fill: '#00ffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setScrollFactor(0).setDepth(9998).setVisible(false);

        // Network Stats
        this.networkText = this.add.text(10, 50, 'Ping: 0ms', {
            font: '12px monospace',
            fill: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setScrollFactor(0).setDepth(9998).setVisible(false);

        // Grid overlay
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setDepth(9990);
        this.gridGraphics.setVisible(false);
    }

    toggleDevMenu() {
        this.devMenuVisible = !this.devMenuVisible;

        if (this.devMenuElements) {
            this.devMenuElements.forEach(element => {
                element.setVisible(this.devMenuVisible);
            });
        }
    }

    updateDevSetting(settingKey) {
        switch(settingKey) {
            case 'showCollisionBoxes':
                this.updateCollisionBoxVisibility();
                break;
            case 'showGrid':
                this.updateGridVisibility();
                break;
            case 'showFPS':
                this.fpsText.setVisible(this.devSettings.showFPS);
                break;
            case 'showPosition':
                this.positionText.setVisible(this.devSettings.showPosition);
                break;
            case 'showNetworkStats':
                this.networkText.setVisible(this.devSettings.showNetworkStats);
                break;
            case 'godMode':
                if (this.localPlayer) {
                    this.localPlayer.godMode = this.devSettings.godMode;
                }
                break;
            case 'noClip':
                if (this.localPlayer && this.devSettings.noClip) {
                    this.treeCollisions.forEach(rect => {
                        this.physics.world.removeCollider(
                            this.physics.add.collider(this.localPlayer.sprite, rect)
                        );
                    });
                } else if (this.localPlayer) {
                    this.treeCollisions.forEach(rect => {
                        this.physics.add.collider(this.localPlayer.sprite, rect);
                    });
                }
                break;
            case 'freeCamera':
                if (this.devSettings.freeCamera) {
                    this.cameras.main.stopFollow();
                } else if (this.localPlayer) {
                    this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.1, 0.1);
                }
                break;
        }
    }

    updateCollisionBoxVisibility() {
        if (this.localPlayer && this.localPlayer.collisionDebug) {
            this.localPlayer.collisionDebug.setVisible(this.devSettings.showCollisionBoxes);
        }

        Object.values(this.otherPlayers).forEach(player => {
            if (player.collisionDebug) {
                player.collisionDebug.setVisible(this.devSettings.showCollisionBoxes);
            }
        });

        if (this.treeCollisions) {
            this.treeCollisions.forEach(collisionRect => {
                collisionRect.setVisible(this.devSettings.showCollisionBoxes);
            });
        }
    }

    updateGridVisibility() {
        if (this.devSettings.showGrid) {
            this.drawGrid();
            this.gridGraphics.setVisible(true);
        } else {
            this.gridGraphics.setVisible(false);
        }
    }

    drawGrid() {
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0x00ff00, 0.3);

        const tileSize = GameConfig.GAME.TILE_SIZE;
        // Use camera bounds for infinite world
        const bounds = this.cameras.main.getBounds();
        const minX = Math.floor(bounds.x / tileSize) * tileSize;
        const minY = Math.floor(bounds.y / tileSize) * tileSize;
        const maxX = minX + bounds.width + tileSize;
        const maxY = minY + bounds.height + tileSize;

        for (let x = minX; x <= maxX; x += tileSize) {
            this.gridGraphics.lineBetween(x, minY, x, maxY);
        }

        for (let y = minY; y <= maxY; y += tileSize) {
            this.gridGraphics.lineBetween(minX, y, maxX, y);
        }
    }

    clearAllEnemies() {
        Object.values(this.enemies).forEach(enemy => {
            if (enemy.sprite) {
                enemy.sprite.destroy();
            }
        });
        Object.values(this.wolves).forEach(wolf => {
            if (wolf.sprite) {
                wolf.sprite.destroy();
            }
        });
        this.enemies = {};
        this.wolves = {};
        console.log('🧹 Cleared all enemies and wolves');
    }

    healPlayer() {
        if (this.localPlayer) {
            this.localPlayer.health = this.localPlayer.maxHealth;
            console.log('❤️ Player healed to full health');
        }
    }

    spawnMinion(x, y, ownerId, isPermanent = false) {
        const minionId = `minion_${this.minionIdCounter++}`;
        const minion = new Minion(this, x, y, ownerId, isPermanent, minionId);
        this.minions[minionId] = minion;

        // Add castle collision to minion
        if (this.castleCollisionLayers) {
            this.castleCollisionLayers.forEach(layer => {
                this.physics.add.collider(minion.sprite, layer);
            });
        }

        // Apply damage multiplier from skills (if local player owns this minion)
        if (ownerId === networkManager.currentPlayer.id && this.localPlayer && this.localPlayer.minionDamageMultiplier) {
            minion.damage *= this.localPlayer.minionDamageMultiplier;
            console.log(`⚡ Applied damage multiplier: ${this.localPlayer.minionDamageMultiplier}x (damage: ${minion.damage})`);
        }

        const minionType = isPermanent ? 'permanent companion' : 'temporary minion';
        console.log(`🔮 Spawned ${minionType} [${minionId}] for owner ${ownerId} at (${x.toFixed(0)}, ${y.toFixed(0)})`);

        // Show spawn effect
        const spawnCircle = this.add.circle(x, y, 30, 0x8B008B, 0.6);
        this.tweens.add({
            targets: spawnCircle,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => spawnCircle.destroy()
        });
    }

    // ==================== MAP TRANSITION SYSTEM ====================

    checkDoorInteraction() {
        if (!this.localPlayer) return;
        if (Date.now() - this.doorCooldown < 1000) return; // 1 second cooldown

        const playerX = this.localPlayer.sprite.x;
        const playerY = this.localPlayer.sprite.y;

        // Check exit door if in interior
        if (this.currentMap === 'interior' && this.exitDoorZone) {
            const exitBounds = this.exitDoorZone.getBounds();
            if (exitBounds.contains(playerX, playerY)) {
                this.transitionToExterior();
                this.doorCooldown = Date.now();
                return;
            }
        }

        // Check entrance door if in exterior
        if (this.currentMap === 'exterior' && this.doorLayer) {
            // Convert player position to tile coordinates
            const tileX = Math.floor((playerX - this.doorLayerOffset.x) / (48 * this.doorLayerScale));
            const tileY = Math.floor((playerY - this.doorLayerOffset.y) / (48 * this.doorLayerScale));

            // Check if there's a door tile nearby (within 2 tiles in any direction)
            // This lets players stand in front of the door rather than on it
            let doorFound = false;
            for (let dy = -2; dy <= 0; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const checkTile = this.doorLayer.getTileAt(tileX + dx, tileY + dy);
                    if (checkTile && checkTile.index > 0) {
                        doorFound = true;
                        break;
                    }
                }
                if (doorFound) break;
            }

            if (doorFound) {
                // Player is near a door
                this.transitionToInterior();
                this.doorCooldown = Date.now();
            }
        }
    }

    transitionToInterior() {
        console.log('🚪 Transitioning to castle interior...');

        // Notify server of map change
        networkManager.changeMap('interior');

        this.currentMap = 'interior';

        // Create interior if it doesn't exist yet
        if (!this.interiorLayers) {
            this.loadInteriorMap();
        }

        // Teleport player to interior (far away from main world)
        this.localPlayer.sprite.setPosition(this.interiorX, this.interiorY);

        // Show transition effect
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.cameras.main.fadeIn(200);
        });
    }

    transitionToExterior() {
        console.log('🚪 Transitioning to castle exterior...');

        // Notify server of map change
        networkManager.changeMap('exterior');

        this.currentMap = 'exterior';

        // Teleport player back to exterior (just outside door)
        const worldSize = this.gameData.world.size;
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const worldCenterX = (worldSize / 2) * tileSize;
        const worldCenterY = (worldSize / 2) * tileSize;

        this.localPlayer.sprite.setPosition(worldCenterX, worldCenterY + 100);

        // Show transition effect
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.cameras.main.fadeIn(200);
        });
    }

    loadInteriorMap() {
        // Place interior FAR away from main world so it's never visible
        // Main world is around (16000, 16000), so place interior at negative coords
        const interiorOffsetX = -10000;
        const interiorOffsetY = -10000;

        // Create simple interior floor (10x10 room)
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const roomSize = 10 * tileSize;
        const roomX = interiorOffsetX;
        const roomY = interiorOffsetY;

        // Store interior center position for teleporting
        this.interiorX = interiorOffsetX + roomSize / 2;
        this.interiorY = interiorOffsetY + roomSize / 2;

        this.interiorLayers = [];

        // Floor
        const floor = this.add.graphics();
        floor.fillStyle(0x4a4a4a, 1);
        floor.fillRect(roomX, roomY, roomSize, roomSize);
        floor.setDepth(0);
        this.interiorLayers.push(floor);

        // Walls
        const walls = this.add.graphics();
        walls.lineStyle(32, 0x8B4513, 1);
        walls.strokeRect(roomX, roomY, roomSize, roomSize);
        walls.setDepth(2);
        this.interiorLayers.push(walls);

        // Exit door (at bottom)
        const exitDoorX = this.interiorX;
        const exitDoorY = roomY + roomSize - 16;
        const exitDoor = this.add.rectangle(exitDoorX, exitDoorY, 64, 32, 0x654321);
        exitDoor.setDepth(3);
        this.interiorLayers.push(exitDoor);

        // Create exit door trigger zone
        this.exitDoorZone = this.add.zone(exitDoorX, exitDoorY, 64, 32);
        this.physics.add.existing(this.exitDoorZone);
        this.exitDoorZone.body.setAllowGravity(false);

        console.log(`✅ Interior map created at (${interiorOffsetX}, ${interiorOffsetY}) - far from main world`);
    }

    // Level up effect removed - was causing FPS drops
    // Stats update silently now, check console for level up notifications

    showAttackEffect(position) {
        // Visual attack effect
    }

    showChatMessage(username, message) {
        // Chat message display
    }

    update(time, delta) {
        if (!this.localPlayer) return;

        // DIAGNOSTIC: Performance timing
        const perfStart = performance.now();
        if (!this.perfTimings) {
            this.perfTimings = { player: 0, ui: 0, hud: 0, minions: 0, enemies: 0, wolves: 0, other: 0, frameCount: 0 };
            this.lastPerfLog = Date.now();
        }

        // Player movement (with speed multiplier)
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -1;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = 1;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -1;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = 1;
        }

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        // Apply speed multiplier
        velocityX *= this.devSettings.speedMultiplier;
        velocityY *= this.devSettings.speedMultiplier;

        this.localPlayer.move(velocityX, velocityY);

        // Update visible tiles based on camera position (viewport culling)
        if (!this.tileUpdateCounter) this.tileUpdateCounter = 0;
        this.tileUpdateCounter++;
        if (this.tileUpdateCounter >= 10) {  // Every 10 frames
            this.tileUpdateCounter = 0;
            this.updateVisibleTiles();
        }

        // Update animations (once per frame)
        const t1 = performance.now();
        this.localPlayer.updateAnimation(delta);
        Object.values(this.otherPlayers).forEach(player => {
            player.updateAnimation(delta);
            player.updateInterpolation(); // Smooth movement
        });
        this.perfTimings.player += (performance.now() - t1);

        // Update UI elements (name tags, health bars) less frequently
        const t2 = performance.now();
        if (!this.uiUpdateCounter) this.uiUpdateCounter = 0;
        this.uiUpdateCounter++;
        if (this.uiUpdateCounter >= 5) {  // Every 5 frames (~83ms at 60fps)
            this.uiUpdateCounter = 0;
            this.localPlayer.updateElements();
            Object.values(this.otherPlayers).forEach(player => {
                player.updateElements();
            });
        }
        this.perfTimings.ui += (performance.now() - t2);

            // Update modern HUD
            const t3 = performance.now();
            if (this.modernHUD) {
                this.modernHUD.update();
            }
            this.perfTimings.hud += (performance.now() - t3);

        // DIAGNOSTIC: Log FPS and object counts every 60 frames (1 second at 60fps)
        if (!this.diagnosticCounter) this.diagnosticCounter = 0;
        this.diagnosticCounter++;
        if (this.diagnosticCounter >= 60) {
            this.diagnosticCounter = 0;
            const fps = Math.round(this.game.loop.actualFps);
            const tweens = this.tweens.getTweens().length;
            const graphics = this.children.list.filter(c => c.type === 'Graphics').length;
            const totalChildren = this.children.list.length;
            console.log(`📊 FPS: ${fps} | Tweens: ${tweens} | Graphics: ${graphics} | Total Children: ${totalChildren}`);

            // Log performance breakdown
            const elapsed = Date.now() - this.lastPerfLog;
            const avgFrameTime = this.frameTimes && this.frameTimes.length > 0
                ? (this.frameTimes.reduce((a,b) => a+b, 0) / this.frameTimes.length).toFixed(1)
                : 0;
            const maxFrameTime = this.frameTimes && this.frameTimes.length > 0
                ? Math.max(...this.frameTimes).toFixed(1)
                : 0;
            console.log(`⏱️ Update Loop (${elapsed}ms): Player=${this.perfTimings.player.toFixed(1)}ms UI=${this.perfTimings.ui.toFixed(1)}ms HUD=${this.perfTimings.hud.toFixed(1)}ms Minions=${this.perfTimings.minions.toFixed(1)}ms Enemies=${this.perfTimings.enemies.toFixed(1)}ms Wolves=${this.perfTimings.wolves.toFixed(1)}ms Other=${this.perfTimings.other.toFixed(1)}ms | AvgFrame=${avgFrameTime}ms MaxFrame=${maxFrameTime}ms`);
            this.perfTimings = { player: 0, ui: 0, hud: 0, minions: 0, enemies: 0, wolves: 0, other: 0, frameCount: 0 };
            this.frameTimes = [];
            this.lastPerfLog = Date.now();
        }

        // Update minions
        const t4 = performance.now();
        Object.values(this.minions).forEach(minion => {
            if (minion.isAlive) {
                minion.update();
            }
        });
        this.perfTimings.minions += (performance.now() - t4);

        // Update enemies
        const t5 = performance.now();
        Object.values(this.enemies).forEach(enemy => {
            if (enemy.isAlive) {
                enemy.update();
            }
        });
        this.perfTimings.enemies += (performance.now() - t5);

        // Update wolves
        const t6 = performance.now();
        Object.values(this.wolves).forEach(wolf => {
            if (wolf.isAlive) {
                wolf.update();
            }
        });
        this.perfTimings.wolves += (performance.now() - t6);

        // Remaining update logic
        const t7 = performance.now();

        // Infinite health
        if (this.devSettings.infiniteHealth && this.localPlayer) {
            this.localPlayer.health = this.localPlayer.maxHealth;
        }

        // Check for door interactions
        this.checkDoorInteraction();

        // Update debug overlays
        if (this.devSettings.showFPS) {
            this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
        }

        if (this.devSettings.showPosition && this.localPlayer) {
            const x = Math.floor(this.localPlayer.sprite.x / 32);
            const y = Math.floor(this.localPlayer.sprite.y / 32);
            this.positionText.setText(`X: ${x} Y: ${y}`);
        }

        if (this.devSettings.showNetworkStats) {
            this.networkText.setText(`Ping: ${Math.floor(Math.random() * 50)}ms`);
        }

        // Depth sorting - use Y position for proper layering
        // Higher Y = further down screen = higher depth (in front)
        if (this.treeSprites && this.treeSprites.length > 0) {
            const playerY = this.localPlayer.sprite.y;

            // Set player depth based on Y position
            this.localPlayer.sprite.setDepth(playerY);

            // Set each tree sprite's depth based on its collision Y
            this.treeSprites.forEach(tree => {
                const treeDepth = tree.collisionY + 1000;

                tree.sprites.forEach(sprite => {
                    sprite.setDepth(treeDepth);
                });
            });
        }

        this.perfTimings.other += (performance.now() - t7);

        // DIAGNOSTIC: Track total frame time
        const totalFrameTime = performance.now() - perfStart;
        if (!this.frameTimes) this.frameTimes = [];
        this.frameTimes.push(totalFrameTime);
        if (this.frameTimes.length > 60) this.frameTimes.shift();

        // Log slow frames immediately
        if (totalFrameTime > 50) {
            console.error(`🐌 SLOW FRAME: ${totalFrameTime.toFixed(1)}ms (Player=${(performance.now() - t1).toFixed(1)}ms tracked, Untracked=${(totalFrameTime - (performance.now() - perfStart)).toFixed(1)}ms)`);
        }
    }
}
