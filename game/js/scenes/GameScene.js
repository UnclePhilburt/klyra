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
            'player:joined', 'player:left', 'player:moved', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:damaged', 'enemy:moved', 'enemy:killed',
            'minion:damaged',
            'item:spawned', 'item:collected', 'chat:message', 'chunks:updated'
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

        // Initialize chunk system
        this.chunks = new Map();
        this.CHUNK_SIZE = this.gameData.chunks.chunkSize || 50;

        // Create world from chunks
        this.loadChunks(this.gameData.chunks);

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
                this.otherPlayers[playerData.id] = new Player(this, playerData);

                // Spawn permanent minion if player is Malachar
                if (playerData.class === 'MALACHAR') {
                    const player = this.otherPlayers[playerData.id];
                    this.spawnMinion(
                        player.sprite.x + 40,
                        player.sprite.y,
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

        // Create enemies
        this.gameData.gameState.enemies.forEach(enemyData => {
            if (enemyData.type === 'wolf') {
                this.wolves[enemyData.id] = new Wolf(this, enemyData);
                console.log(`🐺 Created wolf ${enemyData.id} at grid (${enemyData.position.x}, ${enemyData.position.y})`);
            } else {
                this.enemies[enemyData.id] = new Enemy(this, enemyData);
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

    loadChunks(chunksData) {
        console.log(`🗺️ Loading ${chunksData.chunks.length} chunks...`);

        chunksData.chunks.forEach(chunk => {
            this.renderChunk(chunk);
        });

        console.log(`✅ Loaded ${chunksData.chunks.length} chunks for infinite world`);
    }

    renderChunk(chunk) {
        const key = `${chunk.chunkX},${chunk.chunkY}`;

        // Skip if already rendered
        if (this.chunks.has(key)) return;

        const tileSize = GameConfig.GAME.TILE_SIZE;
        const { chunkX, chunkY, tiles, biomes, decorations } = chunk;
        const chunkSize = tiles.length; // Should be 50x50

        console.log(`🎨 Rendering chunk (${chunkX}, ${chunkY}) - ${chunkSize}x${chunkSize} tiles`);

        // Calculate world offset for this chunk
        const worldOffsetX = chunkX * this.CHUNK_SIZE * tileSize;
        const worldOffsetY = chunkY * this.CHUNK_SIZE * tileSize;

        // Create tile container if it doesn't exist
        if (!this.tileContainer) {
            this.tileContainer = this.add.container(0, 0);
        }

        // Map biome types to tileset textures and tile indices
        const BIOME_TILESET_MAP = {
            // Grassland - Use green terrain tiles with variety
            10: { texture: 'terrain_green', frame: 0 },
            11: { texture: 'terrain_green', frame: 1 },
            12: { texture: 'terrain_green', frame: 2 },

            // Forest - Use forest tiles with variety
            20: { texture: 'forest', frame: 0 },
            21: { texture: 'forest', frame: 1 },
            22: { texture: 'forest', frame: 2 },

            // Magic Grove - Use purple terrain tileset with variety
            30: { texture: 'terrain_base', frame: 0 },
            31: { texture: 'terrain_base', frame: 1 },
            32: { texture: 'terrain_base', frame: 2 },

            // Dark Woods - Use darker forest tiles with variety
            40: { texture: 'forest', frame: 3 },
            41: { texture: 'forest', frame: 4 },
            42: { texture: 'forest', frame: 5 }
        };

        // Render tiles using individual frames from spritesheets
        for (let y = 0; y < chunkSize; y++) {
            for (let x = 0; x < chunkSize; x++) {
                const tile = tiles[y][x];
                const px = worldOffsetX + (x * tileSize);
                const py = worldOffsetY + (y * tileSize);

                // Get tileset mapping for this biome
                const tileInfo = BIOME_TILESET_MAP[tile];

                if (!tileInfo) {
                    console.warn(`Unknown tile type: ${tile} at chunk(${chunkX},${chunkY}) local(${x},${y})`);
                    continue;
                }

                // Create sprite from specific tile frame in the spritesheet
                const tileSprite = this.add.sprite(px, py, tileInfo.texture, tileInfo.frame);
                tileSprite.setOrigin(0, 0);

                // Scale to game tile size (48px tileset -> 32px game tile)
                const scale = tileSize / 48;
                tileSprite.setScale(scale);

                this.tileContainer.add(tileSprite);
            }
        }

        // Render decorations with multi-tile support (adjusted for world coordinates)
        decorations.forEach(deco => {
            // Decorations are stored in chunk-local coordinates, no need to adjust
            this.renderDecoration(deco.x, deco.y, deco.type);
        });

        // Mark chunk as loaded
        this.chunks.set(key, chunk);

        // Expand world bounds dynamically as chunks load
        this.expandWorldBounds();

        console.log(`✅ Chunk (${chunkX}, ${chunkY}) rendered with ${chunkSize * chunkSize} tiles`);
    }

    expandWorldBounds() {
        // For infinite world: Remove all bounds!
        // Players can move anywhere, chunks generate on-demand

        // Set extremely large bounds for physics (essentially infinite)
        const INFINITE = 1000000; // 1 million pixels in each direction
        this.physics.world.setBounds(-INFINITE, -INFINITE, INFINITE * 2, INFINITE * 2);

        // Remove camera bounds entirely - follow player anywhere
        this.cameras.main.removeBounds();

        console.log('🌍 World bounds: INFINITE (no limits!)');
    }

    seededRandom(seed) {
        // Simple seeded random using sin
        const x = Math.sin(this.seedCounter++) * 10000;
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
        const treeRandom = this.seededRandom(this.dungeonSeed);
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

            console.log(`✅ Created multi-tile ${type} at ${x},${y} with collision at Y=${collisionY}`);

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

            // Select variant based on type
            if (type === 'rock') {
                const variant = Math.floor(this.seededRandom(this.dungeonSeed) * ROCK_VARIANTS.length);
                decoInfo = ROCK_VARIANTS[variant];
            } else if (type === 'bush') {
                const variant = Math.floor(this.seededRandom(this.dungeonSeed) * BUSH_VARIANTS.length);
                decoInfo = BUSH_VARIANTS[variant];
            } else if (type === 'flower') {
                const variant = Math.floor(this.seededRandom(this.dungeonSeed) * FLOWER_VARIANTS.length);
                decoInfo = FLOWER_VARIANTS[variant];
            } else if (type === 'grass') {
                const variant = Math.floor(this.seededRandom(this.dungeonSeed) * GRASS_VARIANTS.length);
                decoInfo = GRASS_VARIANTS[variant];
            } else if (type === 'log') {
                const variant = Math.floor(this.seededRandom(this.dungeonSeed) * LOG_VARIANTS.length);
                decoInfo = LOG_VARIANTS[variant];
            } else if (type === 'tree_stump') {
                const variant = Math.floor(this.seededRandom(this.dungeonSeed) * TREE_STUMP_VARIANTS.length);
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

            console.log(`✅ Created ${type} at ${x},${y} with ${frames.length} tile(s)`);
        }
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
            'player:joined', 'player:left', 'player:moved', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:damaged', 'enemy:moved', 'enemy:killed',
            'minion:damaged',
            'item:spawned', 'item:collected', 'chat:message', 'chunks:updated'
        ];

        eventsToClear.forEach(event => {
            if (networkManager.callbacks[event]) {
                networkManager.callbacks[event] = [];
            }
        });

        // Listen for new chunks as world generates
        networkManager.on('chunks:updated', (chunksData) => {
            console.log(`🗺️ Received ${chunksData.chunks.length} chunk updates`);
            this.loadChunks(chunksData);
        });

        console.log('🔧 Cleared old network listeners to prevent duplicates');

        // New player joined
        networkManager.on('player:joined', (data) => {
            console.log('🎮 New player joined:', data.player.username);

            // Don't create a sprite for ourselves
            if (data.player.id !== networkManager.currentPlayer.id) {
                // Create new player sprite
                const newPlayer = new Player(this, data.player);
                this.otherPlayers[data.player.id] = newPlayer;

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

                console.log('✅ Created sprite for new player:', data.player.username);
            }
        });

        // Player left
        networkManager.on('player:left', (data) => {
            console.log('👋 Player left:', data.username);

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

                // Console log only - NO visual effects
                if (data.playerId === networkManager.currentPlayer.id) {
                    console.log(`🎉 LEVEL UP! Level ${data.level} | HP: ${data.health}/${data.maxHealth} | STR: ${data.stats.strength} | DEF: ${data.stats.defense}`);
                    console.log(`📊 DIAGNOSTIC - Tweens: ${tweensBefore} → ${tweensAfter} (Δ${tweensAfter - tweensBefore})`);
                    console.log(`📊 DIAGNOSTIC - Graphics: ${graphicsBefore} → ${graphicsAfter} (Δ${graphicsAfter - graphicsBefore})`);

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
                this.wolves[data.enemy.id] = new Wolf(this, data.enemy);
                console.log(`🐺 Spawned new wolf ${data.enemy.id} at grid (${data.enemy.position.x}, ${data.enemy.position.y})`);
            } else {
                this.enemies[data.enemy.id] = new Enemy(this, data.enemy);
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

                // Update position
                enemy.data.position = data.position;
                enemy.sprite.x = targetX;
                enemy.sprite.y = targetY;
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

                // Check if killer is Malachar with dark_harvest passive
                if (data.killedBy) {
                    const killer = data.killedBy === networkManager.currentPlayer.id
                        ? this.localPlayer
                        : this.otherPlayers[data.killedBy];

                    if (killer && killer.class === 'MALACHAR') {
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

        // Update animations (once per frame)
        const t1 = performance.now();
        this.localPlayer.updateAnimation(delta);
        Object.values(this.otherPlayers).forEach(player => {
            player.updateAnimation(delta);
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
