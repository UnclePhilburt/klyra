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

        // Object/Decoration tilesets
        // Fantasy_Outside_D contains multi-tile trees (96x96 = 2x2 tiles)
        this.load.spritesheet('objects_d_trees', 'assets/tilesets/Fantasy_Outside_D.png', {
            frameWidth: 96,  // Trees are 2 tiles wide (96px)
            frameHeight: 96  // Trees are 2 tiles tall (96px)
        });

        // Also load with single tile size for smaller objects
        this.load.spritesheet('objects_d_small', 'assets/tilesets/Fantasy_Outside_D.png', {
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
        const { width, height, tiles, biomes, decorations } = dungeonData;

        console.log('🎨 Rendering dungeon with tileset sprites...');

        // Create container for tiles
        this.tileContainer = this.add.container(0, 0);

        // Map biome types to tileset textures and tile indices
        // RPG Maker A2 tilesets have specific tile positions
        const BIOME_TILESET_MAP = {
            // Grassland - Use green terrain tiles
            10: { texture: 'terrain_green', frame: 3, tint: 0xffffff },
            11: { texture: 'terrain_green', frame: 5, tint: 0xffffff },
            12: { texture: 'terrain_green', frame: 7, tint: 0xffffff },

            // Forest - Use forest tiles
            20: { texture: 'forest', frame: 3, tint: 0xffffff },
            21: { texture: 'forest', frame: 5, tint: 0xffffff },
            22: { texture: 'forest', frame: 7, tint: 0xffffff },

            // Magic Grove - Use base terrain with purple tint
            30: { texture: 'terrain_base', frame: 3, tint: 0xbb88ff },
            31: { texture: 'terrain_base', frame: 5, tint: 0xaa77ee },
            32: { texture: 'terrain_base', frame: 7, tint: 0x9966dd },

            // Dark Woods - Use forest with dark tint
            40: { texture: 'forest', frame: 10, tint: 0x666666 },
            41: { texture: 'forest', frame: 12, tint: 0x555555 },
            42: { texture: 'forest', frame: 14, tint: 0x444444 },

            // Crystal Plains - Use water tiles
            50: { texture: 'water_base', frame: 2, tint: 0xaaffff },
            51: { texture: 'water_base', frame: 4, tint: 0x88ddff },
            52: { texture: 'water_base', frame: 6, tint: 0x66bbff },

            // Void Zone - Use terrain with dark purple tint
            60: { texture: 'terrain_base', frame: 15, tint: 0x442266 },
            61: { texture: 'terrain_base', frame: 17, tint: 0x331155 },
            62: { texture: 'terrain_base', frame: 19, tint: 0x220044 }
        };

        // Render tiles using individual frames from spritesheets
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = tiles[y][x];
                const px = x * tileSize;
                const py = y * tileSize;

                // Get tileset mapping for this biome
                const tileInfo = BIOME_TILESET_MAP[tile] || { texture: 'terrain_base', frame: 0, tint: 0xffffff };

                // Create sprite from specific tile frame in the spritesheet
                const tileSprite = this.add.sprite(px, py, tileInfo.texture, tileInfo.frame);
                tileSprite.setOrigin(0, 0);

                // Scale to game tile size (48px tileset -> 32px game tile)
                const scale = tileSize / 48;
                tileSprite.setScale(scale);

                tileSprite.setTint(tileInfo.tint);

                // Add slight variety with random frames for same biome
                if (Math.random() < 0.2) {
                    const randomOffset = Math.floor(Math.random() * 3);
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

    adjustColor(color, amount) {
        const r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
        const g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
        const b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
        return (r << 16) | (g << 8) | b;
    }

    createDecoration(x, y, type, tileSize) {
        const px = x * tileSize;
        const py = y * tileSize;

        // Map decorations to appropriate spritesheets
        // Trees are 96x96 multi-tile sprites, small objects are 48x48
        const DECORATION_MAPPING = {
            // Grassland decorations - small objects
            flower: { texture: 'objects_d_small', frame: 32, scale: 0.7, tint: 0xffffff, size: 48 },
            rock: { texture: 'objects_d_small', frame: 48, scale: 0.8, tint: 0xffffff, size: 48 },

            // Forest decorations - trees are 96x96, bushes are 48x48
            tree: { texture: 'objects_d_trees', frame: 0, scale: 1.0, tint: 0xffffff, size: 96 },
            bush: { texture: 'objects_d_small', frame: 16, scale: 0.8, tint: 0xffffff, size: 48 },

            // Magic decorations
            magic_tree: { texture: 'objects_d_trees', frame: 0, scale: 1.0, tint: 0xbb88ff, glow: 0xbb88ff, size: 96 },
            rune_stone: { texture: 'objects_d_small', frame: 48, scale: 0.9, tint: 0x88ffff, glow: 0x88ffff, size: 48 },

            // Dark decorations
            dead_tree: { texture: 'objects_d_trees', frame: 0, scale: 1.0, tint: 0x444444, size: 96 },
            skull: { texture: 'objects_d_small', frame: 64, scale: 0.7, tint: 0xcccccc, size: 48 }
        };

        const decoInfo = DECORATION_MAPPING[type];
        if (!decoInfo) {
            console.warn(`Unknown decoration type: ${type}`);
            return;
        }

        // Check if texture exists
        if (!this.textures.exists(decoInfo.texture)) {
            console.error(`Texture ${decoInfo.texture} not loaded for decoration ${type}`);
            return;
        }

        // Add random frame variation (0-2 for trees to avoid going off-sheet)
        const maxVariation = decoInfo.size === 96 ? 2 : 4;
        const frameVariation = Math.floor(Math.random() * maxVariation);
        const finalFrame = decoInfo.frame + frameVariation;

        try {
            // Create sprite from tileset
            const decoration = this.add.sprite(px, py, decoInfo.texture, finalFrame);
            decoration.setOrigin(0, 0);

            // Scale sprite to fit game tiles
            // Multi-tile sprites (96px) should scale to 2 game tiles (64px)
            const targetSize = decoInfo.size === 96 ? tileSize * 2 : tileSize;
            const scale = (targetSize / decoInfo.size) * decoInfo.scale;
            decoration.setScale(scale);
            decoration.setTint(decoInfo.tint);

            // Add to tile container for proper layering
            this.tileContainer.add(decoration);

            console.log(`✅ Created ${type} at ${x},${y} using ${decoInfo.texture} frame ${finalFrame} (${decoInfo.size}px sprite)`);

            // Add glow effect for magical decorations
            if (decoInfo.glow) {
                const glowSprite = this.add.sprite(px, py, decoInfo.texture, finalFrame);
                glowSprite.setOrigin(0, 0);
                glowSprite.setScale(scale * 1.1);
                glowSprite.setTint(decoInfo.glow);
                glowSprite.setAlpha(0.3);
                glowSprite.setBlendMode(Phaser.BlendModes.ADD);

                this.tileContainer.add(glowSprite);

                // Pulsing glow animation
                this.tweens.add({
                    targets: glowSprite,
                    alpha: 0.5,
                    scale: scale * 1.15,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        } catch (error) {
            console.error(`Failed to create decoration ${type}:`, error);
        }
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
