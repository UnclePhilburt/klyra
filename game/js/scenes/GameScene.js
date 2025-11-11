// Game Scene - Main gameplay
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.localPlayer = null;
        this.otherPlayers = {};
        this.enemies = {};
        this.items = {};
        this.dungeon = null;
        this.map = null;
    }

    init(data) {
        this.gameData = data.gameData;
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

        // If gameData already exists (from init), initialize immediately
        if (this.gameData) {
            this.initializeGame();
        }
    }

    initializeGame() {
        // Remove loading text
        if (this.loadingText) {
            this.loadingText.destroy();
        }

        // Initialize tree collision array
        this.treeCollisions = [];
        this.treeSprites = [];

        // Create dungeon
        this.createDungeon(this.gameData.gameState.dungeon);

        // Create local player
        const myData = this.gameData.players.find(p => p.id === networkManager.currentPlayer.id);
        if (myData) {
            this.localPlayer = new Player(this, myData);
            this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.1, 0.1);
        }

        // Create other players
        this.gameData.players.forEach(playerData => {
            if (playerData.id !== networkManager.currentPlayer.id) {
                this.otherPlayers[playerData.id] = new Player(this, playerData);
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
            this.enemies[enemyData.id] = new Enemy(this, enemyData);
        });

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

    createDungeon(dungeonData) {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const { width, height, tiles, biomes, decorations, seed } = dungeonData;

        console.log('🎨 Rendering dungeon with tileset sprites...');
        console.log('🌱 Using seed:', seed);

        // Store seed for consistent random generation
        this.dungeonSeed = seed;
        this.seedCounter = 0;

        // Create container for tiles
        this.tileContainer = this.add.container(0, 0);

        // Map biome types to tileset textures and tile indices
        // NO TINTS - render tiles naturally without color modification
        const BIOME_TILESET_MAP = {
            // Grassland - Use green terrain tiles
            10: { texture: 'terrain_green', frame: 3 },
            11: { texture: 'terrain_green', frame: 5 },
            12: { texture: 'terrain_green', frame: 7 },

            // Forest - Use forest tiles
            20: { texture: 'forest', frame: 3 },
            21: { texture: 'forest', frame: 5 },
            22: { texture: 'forest', frame: 7 },

            // Magic Grove - Use purple terrain tileset
            30: { texture: 'terrain_base', frame: 3 },
            31: { texture: 'terrain_base', frame: 5 },
            32: { texture: 'terrain_base', frame: 7 },

            // Dark Woods - Use darker forest tiles
            40: { texture: 'forest', frame: 10 },
            41: { texture: 'forest', frame: 12 },
            42: { texture: 'forest', frame: 14 }
        };

        // Render tiles using individual frames from spritesheets
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = tiles[y][x];
                const px = x * tileSize;
                const py = y * tileSize;

                // Get tileset mapping for this biome
                const tileInfo = BIOME_TILESET_MAP[tile] || { texture: 'terrain_base', frame: 0 };

                // Create sprite from specific tile frame in the spritesheet
                const tileSprite = this.add.sprite(px, py, tileInfo.texture, tileInfo.frame);
                tileSprite.setOrigin(0, 0);

                // Scale to game tile size (48px tileset -> 32px game tile)
                const scale = tileSize / 48;
                tileSprite.setScale(scale);

                // NO TINT - render naturally

                // Add slight variety with seeded random for consistency across clients
                if (this.seededRandom(this.dungeonSeed) < 0.2) {
                    const randomOffset = Math.floor(this.seededRandom(this.dungeonSeed) * 3);
                    tileSprite.setFrame(tileInfo.frame + randomOffset);
                }

                this.tileContainer.add(tileSprite);
            }
        }

        // Render decorations (trees, crystals, rocks, etc.)
        if (decorations) {
            decorations.forEach(deco => {
                this.createDecoration(deco.x, deco.y, deco.type, tileSize);
            });
        }

        // Set world bounds
        this.physics.world.setBounds(0, 0, width * tileSize, height * tileSize);
        this.cameras.main.setBounds(0, 0, width * tileSize, height * tileSize);

        // Store tiles for collision
        this.dungeonTiles = tiles;

        console.log(`✅ Dungeon rendered with ${width * height} PNG tiles`);
    }

    // Seeded random function for consistent random across all clients
    seededRandom(seedStr) {
        // Convert seed string to number if needed
        let seed = 0;
        if (typeof seedStr === 'string') {
            for (let i = 0; i < seedStr.length; i++) {
                seed += seedStr.charCodeAt(i);
            }
        } else {
            seed = seedStr;
        }

        // Use seed + counter for unique values
        seed = (seed + this.seedCounter++) * 9301 + 49297;
        seed = seed % 233280;
        return seed / 233280;
    }

    adjustColor(color, amount) {
        const r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
        const g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
        const b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
        return (r << 16) | (g << 8) | b;
    }

    createDecoration(x, y, type, tileSize) {
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
            // Render multi-tile tree - NO TINTS
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
                    // NO TINT - render naturally

                    // Don't add to tileContainer - add directly to scene for proper depth sorting
                    // this.tileContainer.add(tileSprite);
                    treeGroup.push(tileSprite);

                    // Add collision on specific tile
                    if (tileFrame === collisionTile) {
                        collisionY = tilePy;  // Top of the collision tile for depth sorting

                        // Create invisible collision rectangle at the tile's actual position
                        // Use tilePx which already has xOffset applied for TREE_TWO
                        // Shift Y up by quarter tile to better match visual trunk position
                        const collisionRect = this.add.rectangle(
                            tilePx + (tileSize / 2),  // Center X of tile
                            tilePy - (tileSize / 4),  // Shift up by 1/4 tile
                            tileSize,
                            tileSize,
                            0xff0000,
                            0
                        );
                        this.physics.add.existing(collisionRect, true);  // true = static body

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
            return;
        }

        // Simple single-tile decorations - NO TINTS
        const SIMPLE_DECORATIONS = {
            flower: { frame: 80, scale: 0.7 },
            rock: { frame: 96, scale: 0.8 },
            bush: { frame: 112, scale: 0.8 },
            rune_stone: { frame: 96, scale: 0.9 },
            skull: { frame: 128, scale: 0.7 }
        };

        const decoInfo = SIMPLE_DECORATIONS[type];
        if (!decoInfo) {
            console.warn(`Unknown decoration type: ${type}`);
            return;
        }

        const scale = (tileSize / 48) * decoInfo.scale;
        const decoration = this.add.sprite(px, py, 'objects_d', decoInfo.frame);
        decoration.setOrigin(0, 0);
        decoration.setScale(scale);
        // NO TINT - render naturally

        this.tileContainer.add(decoration);

        console.log(`✅ Created ${type} at ${x},${y}`);
    }

    createUI() {
        const width = this.cameras.main.width;

        // Health bar
        this.healthBarBg = this.add.rectangle(20, 20, 200, 20, 0x000000);
        this.healthBarBg.setOrigin(0, 0);
        this.healthBarBg.setScrollFactor(0);

        this.healthBar = this.add.rectangle(20, 20, 200, 20, 0x00ff00);
        this.healthBar.setOrigin(0, 0);
        this.healthBar.setScrollFactor(0);

        this.healthText = this.add.text(120, 30, '100/100', {
            font: '14px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        // Stats
        this.statsText = this.add.text(20, 50, '', {
            font: '12px monospace',
            fill: '#00ffff'
        }).setScrollFactor(0);

        // Kill counter
        this.killsText = this.add.text(width - 20, 20, 'Kills: 0', {
            font: '14px monospace',
            fill: '#ffff00'
        }).setOrigin(1, 0).setScrollFactor(0);
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

        // Mouse click to attack
        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown() && this.localPlayer) {
                this.localPlayer.attack(pointer.worldX, pointer.worldY);
            }
        });
    }

    setupNetworkListeners() {
        // New player joined
        networkManager.on('player:joined', (data) => {
            console.log('🎮 New player joined:', data.player.username);

            // Don't create a sprite for ourselves
            if (data.player.id !== networkManager.currentPlayer.id) {
                // Create new player sprite
                const newPlayer = new Player(this, data.player);
                this.otherPlayers[data.player.id] = newPlayer;

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
                this.showGameOver();
            }
        });

        // Enemy damaged
        networkManager.on('enemy:damaged', (data) => {
            const enemy = this.enemies[data.enemyId];
            if (enemy) {
                enemy.takeDamage(data.damage);
            }
        });

        // Enemy killed
        networkManager.on('enemy:killed', (data) => {
            const enemy = this.enemies[data.enemyId];
            if (enemy) {
                enemy.die();
                delete this.enemies[data.enemyId];
            }
            if (data.killedBy === networkManager.currentPlayer.id) {
                this.updateKills();
            }
        });

        // Item picked
        networkManager.on('item:picked', (data) => {
            const item = this.items[data.itemId];
            if (item) {
                item.pickup();
                delete this.items[data.itemId];
            }
        });

        // Chat
        networkManager.on('chat:message', (data) => {
            this.showChatMessage(data.username, data.message);
        });
    }

    update(time, delta) {
        if (!this.localPlayer) return;

        // Player movement
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

        this.localPlayer.move(velocityX, velocityY);

        // Update animations
        this.localPlayer.updateAnimation(delta);
        Object.values(this.otherPlayers).forEach(player => {
            player.updateAnimation(delta);
        });

        // Depth sorting - use Y position for proper layering
        // Higher Y = further down screen = higher depth (in front)
        if (this.treeSprites && this.treeSprites.length > 0) {
            const playerY = this.localPlayer.sprite.y;

            // Set player depth based on Y position
            this.localPlayer.sprite.setDepth(playerY);

            // Set each tree sprite's depth based on its collision Y
            this.treeSprites.forEach(tree => {
                // All sprites in a tree use the tree's collision Y as their depth
                tree.sprites.forEach(sprite => {
                    sprite.setDepth(tree.collisionY);
                });
            });
        }

        // Update UI
        this.updateUI();

        // Check item collisions
        Object.values(this.items).forEach(item => {
            if (item.checkCollision(this.localPlayer.sprite.x, this.localPlayer.sprite.y)) {
                networkManager.pickupItem(item.data.id);
            }
        });

        // Check enemy collisions for attack
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.attackNearestEnemy();
        }
    }

    updateUI() {
        if (!this.localPlayer) return;

        const player = this.localPlayer;
        const healthPercent = player.health / player.maxHealth;

        this.healthBar.width = 200 * healthPercent;
        this.healthBar.setFillStyle(
            healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000
        );
        this.healthText.setText(`${player.health}/${player.maxHealth}`);

        this.statsText.setText(
            `Level: ${player.level}\nXP: ${player.experience}\nClass: ${player.class}`
        );
    }

    updateKills() {
        const kills = networkManager.currentPlayer.kills || 0;
        this.killsText.setText(`Kills: ${kills}`);
    }

    attackNearestEnemy() {
        let nearest = null;
        let minDist = 100; // Attack range

        Object.values(this.enemies).forEach(enemy => {
            const dist = Phaser.Math.Distance.Between(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );

            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });

        if (nearest) {
            const damage = this.localPlayer.stats.strength;
            networkManager.hitEnemy(nearest.data.id, damage);
            this.showAttackEffect(nearest.sprite);
        }
    }

    showAttackEffect(target) {
        const x = target.x || target;
        const y = target.y || target;

        const effect = this.add.circle(x, y, 20, 0xff0000, 0.5);
        this.tweens.add({
            targets: effect,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => effect.destroy()
        });
    }

    showChatMessage(username, message) {
        const chatText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.scrollY + 100,
            `${username}: ${message}`,
            {
                font: '14px monospace',
                fill: '#00ffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: chatText,
            y: this.cameras.main.scrollY + 80,
            alpha: 0,
            duration: 3000,
            onComplete: () => chatText.destroy()
        });
    }

    showGameOver() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const overlay = this.add.rectangle(
            this.cameras.main.scrollX + width / 2,
            this.cameras.main.scrollY + height / 2,
            width,
            height,
            0x000000,
            0.8
        ).setScrollFactor(0);

        const gameOverText = this.add.text(
            this.cameras.main.scrollX + width / 2,
            this.cameras.main.scrollY + height / 2 - 50,
            'YOU DIED',
            {
                font: '64px monospace',
                fill: '#ff0000'
            }
        ).setOrigin(0.5).setScrollFactor(0);

        const respawnText = this.add.text(
            this.cameras.main.scrollX + width / 2,
            this.cameras.main.scrollY + height / 2 + 50,
            'Click to return to menu',
            {
                font: '20px monospace',
                fill: '#ffffff'
            }
        ).setOrigin(0.5).setScrollFactor(0);

        this.input.once('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    shutdown() {
        networkManager.off('player:moved');
        networkManager.off('player:attacked');
        networkManager.off('player:died');
        networkManager.off('enemy:damaged');
        networkManager.off('enemy:killed');
        networkManager.off('item:picked');
        networkManager.off('chat:message');
    }
}
