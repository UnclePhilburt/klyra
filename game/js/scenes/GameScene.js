// Game Scene - Main gameplay
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.otherPlayers = {};
        this.enemies = {};
        this.items = {};
    }

    init(data) {
        this.gameData = data;
    }

    preload() {
        // TODO: Asset loading disabled - files don't exist yet
        // Will use colored placeholder tiles instead
        console.log('⚠️ Skipping tileset loading (using placeholders)');
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

        // Map biome types to colors (using placeholders instead of sprites)
        const biomeToColor = {
            grass: 0x228B22,  // Forest green
            dirt: 0x8B4513,   // Brown
            stone: 0x808080,  // Gray
            sand: 0xF4A460,   // Sandy brown
            water: 0x4169E1,  // Royal blue
            lava: 0xFF4500,   // Orange red
            ice: 0xADD8E6     // Light blue
        };

        // Render ground tiles as colored rectangles
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const tile = tiles[index];
                const biome = biomes[index];

                // Skip if no biome
                if (!biome) continue;

                const color = biomeToColor[biome];
                if (color === undefined) continue;

                const px = x * tileSize;
                const py = y * tileSize;

                // Create colored rectangle as placeholder tile
                const tileRect = this.add.rectangle(px, py, tileSize, tileSize, color);
                tileRect.setOrigin(0, 0);
                tileRect.setDepth(0); // Ground tiles at depth 0

                this.tileContainer.add(tileRect);
            }
        }

        // Render decorations with multi-tile support
        decorations.forEach(deco => {
            this.renderDecoration(deco.x, deco.y, deco.type);
        });

        console.log(`✅ Dungeon rendered with ${tiles.length} PNG tiles`);
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

        // Use colored shapes as placeholders for decorations
        const decorationColors = {
            tree: 0x228B22,        // Forest green
            magic_tree: 0x9370DB,  // Medium purple
            dead_tree: 0x8B4513,   // Saddle brown
            rock: 0x696969,        // Dim gray
            flower: 0xFF69B4,      // Hot pink
            bush: 0x90EE90,        // Light green
            chest: 0xDAA520,       // Goldenrod
            rune_stone: 0x4169E1   // Royal blue
        };

        const color = decorationColors[type] || 0x888888;

        if (type === 'tree' || type === 'magic_tree' || type === 'dead_tree') {
            // Simple tree: trunk + foliage
            // Trunk (bottom)
            const trunk = this.add.rectangle(
                px + tileSize / 2,
                py + tileSize,
                tileSize / 2,
                tileSize,
                0x8B4513
            );
            trunk.setDepth(py + tileSize * 2);

            // Foliage (top)
            const foliage = this.add.circle(
                px + tileSize / 2,
                py + tileSize / 2,
                tileSize,
                color
            );
            foliage.setDepth(py + tileSize * 2);

            // Collision rectangle at trunk
            const collisionRect = this.add.rectangle(
                px + tileSize / 2,
                py + tileSize + 10,
                tileSize / 2,
                tileSize / 2,
                0xff0000,
                0
            );
            this.physics.add.existing(collisionRect, true);

            // Debug outline
            collisionRect.setStrokeStyle(2, 0xff0000, 1);
            collisionRect.setDepth(9999);
            collisionRect.setVisible(true);

            this.treeCollisions.push(collisionRect);
            this.treeSprites.push({
                sprites: [trunk, foliage],
                collisionY: py + tileSize
            });

            console.log(`✅ Created placeholder ${type} at ${x},${y}`);

        } else {
            // Simple single-tile decorations as circles
            const deco = this.add.circle(px + tileSize / 2, py + tileSize / 2, tileSize / 3, color);
            deco.setDepth(py + tileSize);

            console.log(`✅ Created placeholder ${type} at ${x},${y}`);
        }
    }

    createUI() {
        const width = this.cameras.main.width;

        // Health bar
        this.healthBarBg = this.add.rectangle(120, 20, 200, 20, 0x000000);
        this.healthBarBg.setOrigin(0.5, 0);
        this.healthBarBg.setScrollFactor(0);

        this.healthBar = this.add.rectangle(120, 20, 200, 20, 0x00ff00);
        this.healthBar.setOrigin(0.5, 0);
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
            }
        });

        // Enemy spawned
        networkManager.on('enemy:spawned', (data) => {
            this.enemies[data.enemy.id] = new Enemy(this, data.enemy);
        });

        // Enemy died
        networkManager.on('enemy:died', (data) => {
            const enemy = this.enemies[data.enemyId];
            if (enemy) {
                enemy.die();
                delete this.enemies[data.enemyId];
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
        const width = this.gameData.gameState.dungeon.width * tileSize;
        const height = this.gameData.gameState.dungeon.height * tileSize;

        for (let x = 0; x <= width; x += tileSize) {
            this.gridGraphics.lineBetween(x, 0, x, height);
        }

        for (let y = 0; y <= height; y += tileSize) {
            this.gridGraphics.lineBetween(0, y, width, y);
        }
    }

    clearAllEnemies() {
        Object.values(this.enemies).forEach(enemy => {
            if (enemy.sprite) {
                enemy.sprite.destroy();
            }
        });
        this.enemies = {};
        console.log('🧹 Cleared all enemies');
    }

    healPlayer() {
        if (this.localPlayer) {
            this.localPlayer.health = this.localPlayer.maxHealth;
            this.localPlayer.updateHealthBar();
            console.log('❤️ Player healed to full health');
        }
    }

    showAttackEffect(position) {
        // Visual attack effect
    }

    showChatMessage(username, message) {
        // Chat message display
    }

    update(time, delta) {
        if (!this.localPlayer) return;

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
        this.localPlayer.updateAnimation(delta);
        Object.values(this.otherPlayers).forEach(player => {
            player.updateAnimation(delta);
        });

        // Update UI elements (name tags, health bars) less frequently
        if (!this.uiUpdateCounter) this.uiUpdateCounter = 0;
        this.uiUpdateCounter++;
        if (this.uiUpdateCounter >= 5) {  // Every 5 frames (~83ms at 60fps)
            this.uiUpdateCounter = 0;
            this.localPlayer.updateElements();
            Object.values(this.otherPlayers).forEach(player => {
                player.updateElements();
            });
        }

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
    }
}
