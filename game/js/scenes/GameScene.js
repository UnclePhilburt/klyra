// Game Scene - Main gameplay
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.otherPlayers = {};
        this.enemies = {};
        this.swordDemons = {};
        this.minotaurs = {};
        this.mushrooms = {};
        this.emberclaws = {};
        this.items = {};
        this.minions = {};
        this.experienceOrbs = {};
        this.expOrbIdCounter = 0;
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
        debug.info('CORE', 'GameScene shutting down - cleaning up listeners');

        const eventsToClear = [
            'player:joined', 'player:left', 'player:moved', 'player:changedMap', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:despawned', 'enemy:damaged', 'enemy:moved', 'enemy:killed',
            'minion:spawned', 'minion:moved', 'minion:died', 'minion:damaged', 'minion:healed',
            'item:spawned', 'item:collected', 'chat:message'
        ];

        eventsToClear.forEach(event => {
            if (networkManager.callbacks[event]) {
                networkManager.callbacks[event] = [];
            }
        });

        // Destroy HUD to prevent multiple instances
        if (this.modernHUD) {
            debug.debug('CORE', 'Destroying ModernHUD');
            this.modernHUD.destroy();
            this.modernHUD = null;
        }

        // Destroy skill selector
        if (this.skillSelector) {
            debug.debug('CORE', 'Destroying SkillSelector');
            this.skillSelector.destroy();
            this.skillSelector = null;
        }

        // Destroy ability manager
        if (this.abilityManager) {
            debug.debug('CORE', 'Destroying AbilityManager');
            this.abilityManager.destroy();
            this.abilityManager = null;
        }

        // Destroy music system
        if (this.musicManager) {
            debug.debug('AUDIO', 'Destroying MusicManager');
            this.musicManager.destroy();
            this.musicManager = null;
        }

        // Destroy footstep system
        if (this.footstepManager) {
            debug.debug('AUDIO', 'Destroying FootstepManager');
            this.footstepManager.destroy();
            this.footstepManager = null;
        }

        if (this.musicUI) {
            debug.debug('UI', 'Destroying MusicUI');
            this.musicUI.destroy();
            this.musicUI = null;
        }

        debug.info('CORE', 'GameScene cleanup complete');
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

        // Enemy sprites - Sword Demon (64x64 tiles, 28 columns x 8 rows = 224 tiles)
        // Odd-numbered tiles are blank (baked into PNG), so we manually pick even tiles for animations
        // Row 0: idle (tiles 0,2,4,6,8,10,12)
        // Row 1: walk (tiles 28,30,32,34)
        // Row 2: run (tiles 56,58,60,62,64,66,68,70)
        // Row 4: attack (tiles 112,114,116,118,120,122,124,126)
        // Row 6: damage (tiles 168,170)
        // Row 7: death (tiles 196,198,200,202,204,206,208,210,212)
        this.load.spritesheet('sworddemon', 'assets/sprites/Sword.png', {
            frameWidth: 64,
            frameHeight: 64,
            spacing: 0,  // No spacing - blank tiles are part of the image
            margin: 0
        });

        // Enemy sprites - Minotaur (96x96 tiles, 10 columns x 10 rows)
        // Row 0: idle (tiles 0-4)
        // Row 2: run (tiles 20-24)
        // Row 3: attack (tiles 30-38)
        // Row 8: damage (tiles 80-82)
        // Row 9: death (tiles 90-95)
        this.load.spritesheet('minotaur', 'assets/sprites/minotaur.png', {
            frameWidth: 96,
            frameHeight: 96,
            spacing: 0,
            margin: 0
        });

        // Enemy sprites - Mushroom (80x64 tiles, individual animation files)
        this.load.spritesheet('mushroom-idle', 'assets/sprites/mushroom/Mushroom-Idle.png', {
            frameWidth: 80,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('mushroom-run', 'assets/sprites/mushroom/Mushroom-Run.png', {
            frameWidth: 80,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('mushroom-attack', 'assets/sprites/mushroom/Mushroom-Attack.png', {
            frameWidth: 80,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('mushroom-hit', 'assets/sprites/mushroom/Mushroom-Hit.png', {
            frameWidth: 80,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('mushroom-die', 'assets/sprites/mushroom/Mushroom-Die.png', {
            frameWidth: 80,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });

        // Enemy sprites - Emberclaw (81x71px tiles, individual animation files)
        this.load.spritesheet('emberclaw-idle', 'assets/sprites/Emberclaw/IDLE.png', {
            frameWidth: 81,
            frameHeight: 71,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('emberclaw-flying', 'assets/sprites/Emberclaw/FLYING.png', {
            frameWidth: 81,
            frameHeight: 71,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('emberclaw-attack', 'assets/sprites/Emberclaw/ATTACK.png', {
            frameWidth: 81,
            frameHeight: 71,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('emberclaw-hurt', 'assets/sprites/Emberclaw/HURT.png', {
            frameWidth: 81,
            frameHeight: 71,
            spacing: 0,
            margin: 0
        });
        this.load.spritesheet('emberclaw-death', 'assets/sprites/Emberclaw/DEATH.png', {
            frameWidth: 81,
            frameHeight: 71,
            spacing: 0,
            margin: 0
        });

        // Emberclaw projectile
        this.load.image('emberclaw-projectile', 'assets/sprites/Emberclaw/projectile.png');

        console.log('✅ All tilesets queued for loading');

        // Debug: Log sword demon spritesheet info after load
        this.load.on('filecomplete-spritesheet-sworddemon', () => {
            const texture = this.textures.get('sworddemon');
            console.log('🗡️ Sword Demon spritesheet loaded:');
            console.log(`   Total frames: ${texture.frameTotal}`);
            console.log(`   Frame names:`, Object.keys(texture.frames).slice(0, 10), '...');
        });
    }

    create() {
        // Register networkManager in game registry for global access
        this.game.registry.set('networkManager', networkManager);
        console.log('✅ NetworkManager registered in game registry');

        // Initialize controller manager
        this.input.gamepad.start();
        this.controllerManager = new ControllerManager(this);

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
            // Request skill restoration from server
            networkManager.requestSkillRestore();
        });

        // Setup skill restoration listener
        networkManager.on('skills:restored', (data) => {
            this.restorePlayerSkills(data);
        });

        // If gameData already exists (from init) and has gameState, initialize immediately
        if (this.gameData && this.gameData.gameState) {
            this.initializeGame();
            // Request skill restoration from server
            networkManager.requestSkillRestore();
        }
    }

    initializeGame() {
        // Remove loading text
        if (this.loadingText) {
            this.loadingText.destroy();
        }

        // Initialize screen blood splatter system
        this.screenBloodSplatters = [];
        this.screenBloodContainer = this.add.container(0, 0);
        this.screenBloodContainer.setScrollFactor(0); // Fixed to camera
        this.screenBloodContainer.setDepth(10000); // On top of everything

        // Initialize permanent ground blood puddles (never cleanup)
        this.permanentBloodPuddles = [];

        // Create enemy animations - Sword Demon (64x64 tiles, 28 cols x 8 rows, odd tiles are blank)
        // Row 0: Idle (tiles 0,2,4,6,8,10,12)
        this.anims.create({
            key: 'sworddemon_idle',
            frames: [0, 2, 4, 6, 8, 10, 12].map(n => ({ key: 'sworddemon', frame: n })),
            frameRate: 8,
            repeat: -1
        });

        // Row 1: Walk (tiles 28,30,32,34)
        this.anims.create({
            key: 'sworddemon_walk',
            frames: [28, 30, 32, 34].map(n => ({ key: 'sworddemon', frame: n })),
            frameRate: 8,
            repeat: -1
        });

        // Row 4: Attack (tiles 112,114,116,118,120,122,124,126)
        this.anims.create({
            key: 'sworddemon_attack',
            frames: [112, 114, 116, 118, 120, 122, 124, 126].map(n => ({ key: 'sworddemon', frame: n })),
            frameRate: 12,
            repeat: 0
        });

        // Row 6: Damage (tiles 168,170)
        this.anims.create({
            key: 'sworddemon_damage',
            frames: [168, 170].map(n => ({ key: 'sworddemon', frame: n })),
            frameRate: 12,
            repeat: 0
        });

        // Row 7: Death (tiles 196,198,200,202,204,206,208,210,212)
        this.anims.create({
            key: 'sworddemon_death',
            frames: [196, 198, 200, 202, 204, 206, 208, 210, 212].map(n => ({ key: 'sworddemon', frame: n })),
            frameRate: 10,
            repeat: 0
        });

        console.log('✅ Created enemy animations: sworddemon (idle, walk, attack, damage, death)');

        // Create enemy animations - Minotaur (96x96 tiles, 10 columns)
        // Row 0: Idle (tiles 0-4)
        this.anims.create({
            key: 'minotaur_idle',
            frames: this.anims.generateFrameNumbers('minotaur', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });

        // Row 2: Run (tiles 20-24)
        this.anims.create({
            key: 'minotaur_run',
            frames: this.anims.generateFrameNumbers('minotaur', { start: 20, end: 24 }),
            frameRate: 10,
            repeat: -1
        });

        // Row 3: Attack (tiles 30-38)
        this.anims.create({
            key: 'minotaur_attack',
            frames: this.anims.generateFrameNumbers('minotaur', { start: 30, end: 38 }),
            frameRate: 12,
            repeat: 0
        });

        // Row 8: Damage (tiles 80-82)
        this.anims.create({
            key: 'minotaur_damage',
            frames: this.anims.generateFrameNumbers('minotaur', { start: 80, end: 82 }),
            frameRate: 12,
            repeat: 0
        });

        // Row 9: Death (tiles 90-95)
        this.anims.create({
            key: 'minotaur_death',
            frames: this.anims.generateFrameNumbers('minotaur', { start: 90, end: 95 }),
            frameRate: 10,
            repeat: 0
        });

        console.log('✅ Created enemy animations: minotaur (idle, run, attack, damage, death)');

        // Create enemy animations - Mushroom (80x64 tiles, separate sprite sheets)
        // Idle animation (7 frames)
        this.anims.create({
            key: 'mushroom_idle',
            frames: this.anims.generateFrameNumbers('mushroom-idle', { start: 0, end: 6 }),
            frameRate: 8,
            repeat: -1
        });

        // Run animation (8 frames)
        this.anims.create({
            key: 'mushroom_run',
            frames: this.anims.generateFrameNumbers('mushroom-run', { start: 0, end: 7 }),
            frameRate: 12,
            repeat: -1
        });

        // Attack animation (10 frames)
        this.anims.create({
            key: 'mushroom_attack',
            frames: this.anims.generateFrameNumbers('mushroom-attack', { start: 0, end: 9 }),
            frameRate: 12,
            repeat: 0
        });

        // Damage animation (5 frames)
        this.anims.create({
            key: 'mushroom_damage',
            frames: this.anims.generateFrameNumbers('mushroom-hit', { start: 0, end: 4 }),
            frameRate: 12,
            repeat: 0
        });

        // Death animation (15 frames)
        this.anims.create({
            key: 'mushroom_death',
            frames: this.anims.generateFrameNumbers('mushroom-die', { start: 0, end: 14 }),
            frameRate: 10,
            repeat: 0
        });

        console.log('✅ Created enemy animations: mushroom (idle, run, attack, damage, death)');

        // Create enemy animations - Emberclaw (64x64 tiles, separate sprite sheets)
        // Idle animation (4 frames)
        this.anims.create({
            key: 'emberclaw_idle',
            frames: this.anims.generateFrameNumbers('emberclaw-idle', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        // Flying animation (4 frames)
        this.anims.create({
            key: 'emberclaw_flying',
            frames: this.anims.generateFrameNumbers('emberclaw-flying', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        // Attack animation (8 frames)
        this.anims.create({
            key: 'emberclaw_attack',
            frames: this.anims.generateFrameNumbers('emberclaw-attack', { start: 0, end: 7 }),
            frameRate: 12,
            repeat: 0
        });

        // Hurt animation (4 frames)
        this.anims.create({
            key: 'emberclaw_hurt',
            frames: this.anims.generateFrameNumbers('emberclaw-hurt', { start: 0, end: 3 }),
            frameRate: 12,
            repeat: 0
        });

        // Death animation (7 frames)
        this.anims.create({
            key: 'emberclaw_death',
            frames: this.anims.generateFrameNumbers('emberclaw-death', { start: 0, end: 6 }),
            frameRate: 10,
            repeat: 0
        });

        console.log('✅ Created enemy animations: emberclaw (idle, flying, attack, hurt, death)');

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
            console.log(`👤 Creating local player with position:`, myData.position);
            this.localPlayer = new Player(this, myData, true);
            console.log(`📍 Local player spawned at pixel position (${this.localPlayer.sprite.x}, ${this.localPlayer.sprite.y})`);

            // Smooth camera with dead zone
            this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.08, 0.08); // Smoother lerp
            this.cameras.main.setDeadzone(100, 80); // Dead zone: 100px wide, 80px tall

            // Initialize off-screen player indicators
            this.playerIndicators = {};

            // Set character's default auto-attack if available
            const characterDef = CHARACTERS[myData.class];
            if (characterDef && characterDef.autoAttack) {
                this.localPlayer.autoAttackConfig = characterDef.autoAttack;
                console.log(`⚔️ Auto-attack enabled: ${characterDef.autoAttack.name}`);
            }

            // Initialize Ally Manager (detects nearby players for co-op abilities)
            this.allyManager = new AllyManager(this);
            console.log('✅ AllyManager initialized');

            // Send initial position immediately (PIXEL coordinates for smooth movement)
            const pixelPos = {
                x: Math.round(this.localPlayer.sprite.x),
                y: Math.round(this.localPlayer.sprite.y)
            };
            console.log(`📍 Sending initial pixel position: (${pixelPos.x}, ${pixelPos.y})`);
            networkManager.movePlayer(pixelPos);

            // Spawn permanent minion if local player is Malachar
            if (myData.class === 'MALACHAR') {
                this.spawnMinion(
                    this.localPlayer.sprite.x + 40,
                    this.localPlayer.sprite.y,
                    myData.id,
                    true // permanent
                );
                console.log('🔮 Spawned permanent minion for local Malachar player');
            }

            // Show skill selector immediately at level 1 for path selection
            if (myData.level === 1) {
                console.log('🎯 Level 1 - showing initial path selection');
                // Delay slightly to ensure all systems are initialized
                this.time.delayedCall(500, () => {
                    if (this.skillSelector) {
                        this.skillSelector.show(myData.class, 1);
                    }
                });
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
                // Skip dead sword demons from initial game state
                if (enemyData.isAlive === false) {
                    console.log(`⚰️ Skipping dead sword demon ${enemyData.id}`);
                    return;
                }

                const swordDemon = new SwordDemon(this, enemyData);
                this.swordDemons[enemyData.id] = swordDemon;

                // Add castle collision to sword demon
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(swordDemon.sprite, layer);
                    });
                }

                console.log(`⚔️ Created sword demon ${enemyData.id} at grid (${enemyData.position.x}, ${enemyData.position.y})`);
            } else if (enemyData.type === 'minotaur') {
                // Skip dead minotaurs from initial game state
                if (enemyData.isAlive === false) {
                    console.log(`⚰️ Skipping dead minotaur ${enemyData.id}`);
                    return;
                }

                const minotaur = new Minotaur(this, enemyData);
                this.minotaurs[enemyData.id] = minotaur;

                // Add castle collision to minotaur
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(minotaur.sprite, layer);
                    });
                }

                console.log(`🐂 Created minotaur ${enemyData.id} at grid (${enemyData.position.x}, ${enemyData.position.y})`);
            } else if (enemyData.type === 'mushroom') {
                // Skip dead mushrooms from initial game state
                if (enemyData.isAlive === false) {
                    console.log(`⚰️ Skipping dead mushroom ${enemyData.id}`);
                    return;
                }

                const mushroom = new Mushroom(this, enemyData);
                this.mushrooms[enemyData.id] = mushroom;

                // Add castle collision to mushroom
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(mushroom.sprite, layer);
                    });
                }

                console.log(`🍄 Created mushroom ${enemyData.id} at grid (${enemyData.position.x}, ${enemyData.position.y})`);
            } else if (enemyData.type === 'emberclaw') {
                // Skip dead emberclaws from initial game state
                if (enemyData.isAlive === false) {
                    console.log(`⚰️ Skipping dead emberclaw ${enemyData.id}`);
                    return;
                }

                const emberclaw = new Emberclaw(this, enemyData);
                this.emberclaws[enemyData.id] = emberclaw;

                // Emberclaws fly - no collision needed
                console.log(`🔥 Created emberclaw ${enemyData.id} at grid (${enemyData.position.x}, ${enemyData.position.y})`);
            } else {
                console.warn(`⚠️ Unknown enemy type "${enemyData.type}" for enemy ${enemyData.id} - skipping`);
            }
        });

        console.log(`📊 Total sword demons: ${Object.keys(this.swordDemons).length}, Total minotaurs: ${Object.keys(this.minotaurs).length}, Total mushrooms: ${Object.keys(this.mushrooms).length}, Total emberclaws: ${Object.keys(this.emberclaws).length}`);

        // Create items
        this.gameData.gameState.items.forEach(itemData => {
            this.items[itemData.id] = new Item(this, itemData);
        });

        // Create existing minions from other players
        if (this.gameData.minions && this.gameData.minions.length > 0) {
            console.log(`🔮 Spawning ${this.gameData.minions.length} existing minions from other players`);
            this.gameData.minions.forEach(minionData => {
                // Don't spawn our own minions (they'll be spawned by our own commands)
                if (minionData.ownerId !== networkManager.currentPlayer.id) {
                    const tileSize = GameConfig.GAME.TILE_SIZE;
                    const x = minionData.position.x * tileSize + tileSize / 2;
                    const y = minionData.position.y * tileSize + tileSize / 2;
                    this.spawnMinion(x, y, minionData.ownerId, minionData.isPermanent, minionData.id);
                    console.log(`🔮 Spawned existing minion ${minionData.id} for player ${minionData.ownerId}`);
                }
            });
        }

        // Setup UI
        this.createUI();

        // Setup controls
        this.setupControls();

        // Setup ambient particles
        this.setupAmbientParticles();

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
        this.renderedDecorations = new Map(); // Track rendered decorations with their sprites
        // PERFORMANCE: Asymmetric render distance to match screen aspect ratio (16:9)
        // Increased for better visual experience now that GPU acceleration is confirmed working
        this.RENDER_DISTANCE_X = 20; // Horizontal (loads tiles off-screen)
        this.RENDER_DISTANCE_Y = 12; // Vertical (loads tiles off-screen)

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
        console.log(`   Using on-demand generation (renders ${this.RENDER_DISTANCE_X}x${this.RENDER_DISTANCE_Y} tiles around camera)`);
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

        // Decoration density - balanced for good visuals with GPU acceleration
        let spawnChance;
        if (biome === 'green') spawnChance = 0.04; // 4% - flowers and grass
        else if (biome === 'dark_green') spawnChance = 0.05; // 5% - forest decorations
        else if (biome === 'red') spawnChance = 0.05; // 5% - red biome decorations

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
            // Dark Green: forest with good tree coverage
            if (rand < 0.30) decorationType = 'tree';           // 30% - more trees
            else if (rand < 0.50) decorationType = 'bush';      // 20%
            else if (rand < 0.70) decorationType = 'log';       // 20%
            else if (rand < 0.85) decorationType = 'tree_stump'; // 15%
            else decorationType = 'grass';                      // 15%
        } else if (biome === 'red') {
            // Red biome: red trees + red decorations
            if (rand < 0.25) decorationType = 'red_tree';           // 25% - more trees
            else if (rand < 0.45) decorationType = 'red_flower';    // 20% - flowers
            else if (rand < 0.52) decorationType = 'red_grass';     // 17% - grass
            else if (rand < 0.68) decorationType = 'red_bush';      // 16% - bushes
            else if (rand < 0.80) decorationType = 'red_mushroom';  // 12% - mushrooms
            else if (rand < 0.88) decorationType = 'red_log';       // 8% - logs
            else if (rand < 0.93) decorationType = 'red_stone';     // 5% - stones
            else if (rand < 0.96) decorationType = 'red_stump';     // 3% - stumps
            else if (rand < 0.98) decorationType = 'red_trunk';     // 2% - tree trunks
            else decorationType = 'red_baby_tree';                  // 2% - baby trees
        }

        return decorationType;
    }

    updateVisibleTiles() {
        if (!this.worldSeed || !this.localPlayer) return;

        const tileSize = GameConfig.GAME.TILE_SIZE;
        const playerTileX = Math.floor(this.localPlayer.sprite.x / tileSize);
        const playerTileY = Math.floor(this.localPlayer.sprite.y / tileSize);

        // PERFORMANCE: Only update when player moves to a new tile (not every frame!)
        // This avoids 1,265+ iterations per frame (589 tiles + 656 cleanup + 20 decorations)
        if (!this.lastPlayerTileX) {
            this.lastPlayerTileX = playerTileX;
            this.lastPlayerTileY = playerTileY;
        }

        if (playerTileX === this.lastPlayerTileX && playerTileY === this.lastPlayerTileY) {
            return; // Player hasn't moved to a new tile, skip expensive update
        }

        this.lastPlayerTileX = playerTileX;
        this.lastPlayerTileY = playerTileY;

        // Calculate visible tile range (asymmetric for aspect ratio)
        const minX = Math.max(0, playerTileX - this.RENDER_DISTANCE_X);
        const maxX = Math.min(this.worldSize - 1, playerTileX + this.RENDER_DISTANCE_X);
        const minY = Math.max(0, playerTileY - this.RENDER_DISTANCE_Y);
        const maxY = Math.min(this.worldSize - 1, playerTileY + this.RENDER_DISTANCE_Y);

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
                    const sprites = this.renderDecoration(x, y, decoration);
                    if (sprites && sprites.length > 0) {
                        this.renderedDecorations.set(key, sprites);
                    }
                }
            }
        }

        // Clean up tiles far from player (keep memory manageable)
        // PERFORMANCE: Tight cleanup to prevent accumulation (996 tiles with 1.4x, trying 1.15x)
        const CLEANUP_DISTANCE_X = this.RENDER_DISTANCE_X * 1.15;
        const CLEANUP_DISTANCE_Y = this.RENDER_DISTANCE_Y * 1.15;

        this.renderedTiles.forEach((sprite, key) => {
            const [x, y] = key.split(',').map(Number);
            const distX = Math.abs(x - playerTileX);
            const distY = Math.abs(y - playerTileY);

            if (distX > CLEANUP_DISTANCE_X || distY > CLEANUP_DISTANCE_Y) {
                sprite.destroy();
                this.renderedTiles.delete(key);
            }
        });

        // PERFORMANCE: Clean up decorations far from player (critical for FPS)
        this.renderedDecorations.forEach((sprites, key) => {
            const [x, y] = key.split(',').map(Number);
            const distX = Math.abs(x - playerTileX);
            const distY = Math.abs(y - playerTileY);

            if (distX > CLEANUP_DISTANCE_X || distY > CLEANUP_DISTANCE_Y) {
                // Destroy all sprites for this decoration
                sprites.forEach(sprite => {
                    if (sprite && sprite.destroy) {
                        sprite.destroy();
                    }
                });
                this.renderedDecorations.delete(key);
            }
        });
    }

    seededRandom(seed) {
        // Simple seeded random using sin (stateless)
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    updatePlayerIndicators() {
        if (!this.localPlayer || !this.localPlayer.spriteRenderer || !this.localPlayer.spriteRenderer.sprite) return;

        const camera = this.cameras.main;
        const screenWidth = camera.width;
        const screenHeight = camera.height;
        const padding = 30; // Distance from screen edge

        // Check each other player
        Object.keys(this.otherPlayers).forEach(playerId => {
            const player = this.otherPlayers[playerId];
            if (!player || !player.spriteRenderer || !player.spriteRenderer.sprite) {
                // Clean up indicator if player is gone
                if (this.playerIndicators[playerId]) {
                    this.playerIndicators[playerId].destroy();
                    delete this.playerIndicators[playerId];
                }
                return;
            }

            const playerSprite = player.spriteRenderer.sprite;
            const worldX = playerSprite.x;
            const worldY = playerSprite.y;

            // Convert to screen position
            const screenX = worldX - camera.scrollX;
            const screenY = worldY - camera.scrollY;

            // Check if player is off-screen
            const isOffScreen = screenX < 0 || screenX > screenWidth || screenY < 0 || screenY > screenHeight;

            if (isOffScreen) {
                // Create indicator if it doesn't exist
                if (!this.playerIndicators[playerId]) {
                    this.playerIndicators[playerId] = this.add.text(0, 0, '▶', {
                        fontSize: '24px',
                        color: '#00FF00',
                        stroke: '#000000',
                        strokeThickness: 3
                    });
                    this.playerIndicators[playerId].setOrigin(0.5);
                    this.playerIndicators[playerId].setScrollFactor(0);
                    this.playerIndicators[playerId].setDepth(10000);
                }

                const indicator = this.playerIndicators[playerId];

                // Calculate position on screen edge
                let edgeX = screenX;
                let edgeY = screenY;
                let angle = 0;

                // Clamp to screen bounds with padding
                if (screenX < 0) {
                    edgeX = padding;
                    angle = 180;
                } else if (screenX > screenWidth) {
                    edgeX = screenWidth - padding;
                    angle = 0;
                }

                if (screenY < 0) {
                    edgeY = padding;
                    angle = screenX < screenWidth / 2 ? 225 : 315;
                } else if (screenY > screenHeight) {
                    edgeY = screenHeight - padding;
                    angle = screenX < screenWidth / 2 ? 135 : 45;
                }

                // Calculate actual angle to player
                const dx = worldX - (camera.scrollX + screenWidth / 2);
                const dy = worldY - (camera.scrollY + screenHeight / 2);
                angle = Math.atan2(dy, dx) * (180 / Math.PI);

                // Set position and rotation
                indicator.setPosition(edgeX, edgeY);
                indicator.setAngle(angle);
                indicator.setVisible(true);
            } else {
                // Hide indicator if player is on-screen
                if (this.playerIndicators[playerId]) {
                    this.playerIndicators[playerId].setVisible(false);
                }
            }
        });

        // Clean up indicators for players that no longer exist
        Object.keys(this.playerIndicators).forEach(playerId => {
            if (!this.otherPlayers[playerId]) {
                this.playerIndicators[playerId].destroy();
                delete this.playerIndicators[playerId];
            }
        });
    }

    renderDecoration(x, y, type) {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const px = x * tileSize;
        const py = y * tileSize;
        const allSprites = []; // PERFORMANCE: Track all sprites for cleanup

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

            // PERFORMANCE: Add to allSprites for cleanup
            allSprites.push(...treeGroup);

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

            // PERFORMANCE: Add to allSprites for cleanup
            allSprites.push(...treeGroup);

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
                allSprites.push(sprite); // PERFORMANCE: Track for cleanup
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
                allSprites.push(decoration); // PERFORMANCE: Track for cleanup

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

                allSprites.push(sprite1, sprite2); // PERFORMANCE: Track for cleanup

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

                allSprites.push(topSprite, bottomSprite); // PERFORMANCE: Track for cleanup
            }
        }

        // PERFORMANCE: Return all sprites for cleanup tracking
        return allSprites;
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

        // Update username in HUD (in case it wasn't set during player creation)
        if (this.localPlayer && this.localPlayer.username) {
            this.modernHUD.updateUsername(this.localPlayer.username);
        }

        // Create skill selector system
        this.skillSelector = new SkillSelector(this);

        // Create ability manager system (Q/E/R abilities)
        this.abilityManager = new AbilityManager(this, this.localPlayer);

        // Create music system
        this.musicManager = new MusicManager(this);
        this.musicUI = new MusicUI(this, this.musicManager);

        // Create footstep manager
        this.footstepManager = new FootstepManager(this);

        // Start gameplay music
        this.musicManager.startGameplayMusic();
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

        // Ability keys (Q/E/R)
        this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        this.keyQ.on('down', () => {
            if (this.abilityManager) {
                this.abilityManager.useAbility('q');
            }
        });

        this.keyE.on('down', () => {
            if (this.abilityManager) {
                this.abilityManager.useAbility('e');
            }
        });

        this.keyR.on('down', () => {
            if (this.abilityManager) {
                this.abilityManager.useAbility('r');
            }
        });

        // Tilda key for dev menu
        this.tildaKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK);
        this.tildaKey.on('down', () => {
            this.toggleDevMenu();
        });

        // H key for testing healing animation (DEV ONLY)
        this.keyH = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
        this.keyH.on('down', () => {
            // Test: Show heal effect on all minions
            Object.values(this.minions).forEach(minion => {
                if (minion.sprite && minion.sprite.active) {
                    this.showMinionHealEffect(minion.sprite.x, minion.sprite.y);
                }
            });
            console.log('🧪 [DEV] Showing heal animation on all minions (Press H to test)');
        });

        // Mouse click to attack
        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown() && this.localPlayer) {
                this.localPlayer.attack(pointer.worldX, pointer.worldY);
            }
        });

        // Initialize dev settings
        this.devSettings = {
            showCollisionBoxes: false, // PERFORMANCE: Disabled by default (saves rendering overhead)
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

    setupAmbientParticles() {
        // Ambient particle system for atmospheric effects
        this.ambientParticles = [];
        this.ambientParticleTimer = 0;

        // Particle spawn settings - DENSE atmosphere
        this.particleSpawnRate = 100; // Spawn particle every 100ms (2x faster)
        this.maxAmbientParticles = 300; // Max particles on screen (2x more)

        console.log('✨ Ambient particle system initialized');
    }

    updateAmbientParticles(delta) {
        this.ambientParticleTimer += delta;

        // Spawn new particles at intervals
        if (this.ambientParticleTimer >= this.particleSpawnRate) {
            this.ambientParticleTimer = 0;

            // Don't spawn if at max
            if (this.ambientParticles.length < this.maxAmbientParticles) {
                this.spawnAmbientParticle();
            }
        }

        // Update existing particles
        this.ambientParticles = this.ambientParticles.filter(particle => {
            if (!particle || !particle.sprite || !particle.sprite.scene) {
                return false;
            }
            return true;
        });
    }

    spawnAmbientParticle() {
        const camera = this.cameras.main;
        const particleTypes = ['leaf', 'dust', 'ember'];
        const type = Phaser.Utils.Array.GetRandom(particleTypes);

        // Spawn at random position around camera view
        const spawnSide = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let x, y;

        switch (spawnSide) {
            case 0: // Top
                x = camera.scrollX + Math.random() * camera.width;
                y = camera.scrollY - 20;
                break;
            case 1: // Right
                x = camera.scrollX + camera.width + 20;
                y = camera.scrollY + Math.random() * camera.height;
                break;
            case 2: // Bottom
                x = camera.scrollX + Math.random() * camera.width;
                y = camera.scrollY + camera.height + 20;
                break;
            case 3: // Left
                x = camera.scrollX - 20;
                y = camera.scrollY + Math.random() * camera.height;
                break;
        }

        let particle;
        if (type === 'leaf') {
            // Green/yellow leaves
            const colors = [0x2d5016, 0x4a7c2b, 0x8b7355, 0xd4a574];
            particle = this.add.ellipse(x, y, 4, 6, Phaser.Utils.Array.GetRandom(colors));
        } else if (type === 'dust') {
            // Light gray dust particles
            const colors = [0xcccccc, 0xdddddd, 0xaaaaaa];
            particle = this.add.circle(x, y, 2, Phaser.Utils.Array.GetRandom(colors));
        } else { // ember
            // Orange/red embers
            const colors = [0xff6600, 0xff8800, 0xffaa00];
            particle = this.add.circle(x, y, 3, Phaser.Utils.Array.GetRandom(colors));
            particle.setAlpha(0.7);
        }

        particle.setDepth(2); // Below UI, above ground
        particle.setAlpha(0.3 + Math.random() * 0.4);

        // Wind direction (gentle drift)
        const windX = -10 + Math.random() * 20;
        const windY = type === 'leaf' ? 20 + Math.random() * 30 : 10 + Math.random() * 20;

        // Animate particle floating
        this.tweens.add({
            targets: particle,
            x: x + windX * 30,
            y: y + windY * 30,
            alpha: 0,
            duration: 3000 + Math.random() * 2000,
            ease: 'Linear',
            onComplete: () => {
                if (particle && particle.scene) {
                    particle.destroy();
                }
            }
        });

        // Add slight rotation for leaves
        if (type === 'leaf') {
            this.tweens.add({
                targets: particle,
                angle: 360,
                duration: 2000 + Math.random() * 1000,
                ease: 'Linear'
            });
        }

        this.ambientParticles.push({ sprite: particle, type });
    }

    setupNetworkListeners() {
        // Store event handlers for cleanup
        this.networkHandlers = {};

        // Clear any existing listeners to prevent duplicates
        // This is critical when reconnecting with the same username
        const eventsToClear = [
            'player:joined', 'player:left', 'player:moved', 'player:changedMap', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:despawned', 'enemy:damaged', 'enemy:moved', 'enemy:killed',
            'minion:spawned', 'minion:moved', 'minion:died', 'minion:damaged', 'minion:healed',
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
                // Play attack animation
                if (player.spriteRenderer && player.spriteRenderer.playAttackAnimation) {
                    player.spriteRenderer.playAttackAnimation();
                }

                // Show attack effect
                this.showAttackEffect(data.position);
            }
        });

        // Player died
        networkManager.on('player:died', (data) => {
            // Handle other players dying
            const player = this.otherPlayers[data.playerId];
            if (player) {
                player.die();
            }

            // Handle local player death (server says we died)
            if (data.playerId === networkManager.currentPlayer.id && this.localPlayer) {
                console.log('💀 Server says we died - processing death...');

                // Set health to 0 and mark as dead
                this.localPlayer.health = 0;
                this.localPlayer.isAlive = false;

                // Play death animation
                if (this.localPlayer.spriteRenderer) {
                    this.localPlayer.spriteRenderer.playDeathAnimation();
                    this.localPlayer.spriteRenderer.fadeOut(1000);
                }

                // Fade UI
                if (this.localPlayer.ui) {
                    this.localPlayer.ui.setAlpha(0.5);
                    this.localPlayer.ui.updateHealthBar();
                }

                // Clear all permanent minions
                Object.keys(this.minions).forEach(minionId => {
                    const minion = this.minions[minionId];
                    if (minion.ownerId === data.playerId) {
                        minion.destroy();
                        delete this.minions[minionId];
                    }
                });

                // Clear skill selector state
                if (this.skillSelector) {
                    this.skillSelector.selectedSkills = [];
                }

                console.log('💀 Death processed - awaiting respawn in 3 seconds...');
            }
        });

        // Player respawned after death
        networkManager.on('player:respawned', (data) => {
            console.log('📨 Received player:respawned event:', data);

            if (data.playerId === networkManager.currentPlayer.id || data.id === networkManager.currentPlayer.id) {
                console.log('♻️ Respawning local player at spawn point - Level 1');

                try {
                    // Restore player from server state
                    this.restorePlayerFromDeath(data);
                    console.log('✅ Respawn complete');
                } catch (error) {
                    console.error('❌ Error during respawn:', error);
                }
            } else {
                // Other player respawned
                const player = this.otherPlayers[data.playerId];
                if (player) {
                    player.isAlive = true;
                    player.health = data.health;
                    player.maxHealth = data.maxHealth;
                    player.level = data.level;
                    player.sprite.setAlpha(1);
                    // Position is already in pixels
                    player.sprite.setPosition(data.position.x, data.position.y);
                }
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
                    debug.levelUp(player.data.username || 'Player', data.level);
                    debug.info('SKILLS', `HP: ${data.health}/${data.maxHealth} | STR: ${data.stats.strength} | DEF: ${data.stats.defense}`);
                    debug.debug('PERFORMANCE', `Tweens: ${tweensBefore} → ${tweensAfter} (Δ${tweensAfter - tweensBefore})`);
                    debug.debug('PERFORMANCE', `Graphics: ${graphicsBefore} → ${graphicsAfter} (Δ${graphicsAfter - graphicsBefore})`);

                    // Visual level-up effect
                    if (this.visualEffectsManager) {
                        this.visualEffectsManager.createLevelUpEffect(
                            player.sprite.x,
                            player.sprite.y
                        );
                    }

                    // Show skill selector only at milestone levels (new skill tree v2)
                    const milestones = [1, 5, 10, 15];
                    const isMilestone = milestones.includes(data.level) || data.level >= 16;

                    if (this.skillSelector && isMilestone) {
                        debug.info('SKILLS', `Milestone level ${data.level} - showing skill selector`);
                        this.skillSelector.show(player.class, data.level);
                    } else {
                        debug.debug('SKILLS', `Level ${data.level} - no skill choices (milestones: 1, 5, 10, 15, 16+)`);
                    }
                }
            }
        });

        // Enemy spawned
        networkManager.on('enemy:spawned', (data) => {
            if (data.enemy.type === 'wolf') {
                // Skip dead sword demons
                if (data.enemy.isAlive === false) {
                    console.log(`⚰️ Skipping spawning dead sword demon ${data.enemy.id}`);
                    return;
                }

                const swordDemon = new SwordDemon(this, data.enemy);
                this.swordDemons[data.enemy.id] = swordDemon;

                // Add castle collision to sword demon
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(swordDemon.sprite, layer);
                    });
                }
            } else if (data.enemy.type === 'minotaur') {
                // Skip dead minotaurs
                if (data.enemy.isAlive === false) {
                    console.log(`⚰️ Skipping spawning dead minotaur ${data.enemy.id}`);
                    return;
                }

                const minotaur = new Minotaur(this, data.enemy);
                this.minotaurs[data.enemy.id] = minotaur;

                // Add castle collision to minotaur
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(minotaur.sprite, layer);
                    });
                }
            } else if (data.enemy.type === 'mushroom') {
                // Skip dead mushrooms
                if (data.enemy.isAlive === false) {
                    console.log(`⚰️ Skipping spawning dead mushroom ${data.enemy.id}`);
                    return;
                }

                const mushroom = new Mushroom(this, data.enemy);
                this.mushrooms[data.enemy.id] = mushroom;

                // Add castle collision to mushroom
                if (this.castleCollisionLayers) {
                    this.castleCollisionLayers.forEach(layer => {
                        this.physics.add.collider(mushroom.sprite, layer);
                    });
                }
            } else if (data.enemy.type === 'emberclaw') {
                // Skip dead emberclaws
                if (data.enemy.isAlive === false) {
                    console.log(`⚰️ Skipping spawning dead emberclaw ${data.enemy.id}`);
                    return;
                }

                const emberclaw = new Emberclaw(this, data.enemy);
                this.emberclaws[data.enemy.id] = emberclaw;

                // Emberclaws fly - no collision needed
                console.log(`🔥 Spawned Emberclaw ${data.enemy.id} at (${data.enemy.position.x}, ${data.enemy.position.y})`);
            } else {
                console.warn(`⚠️ Unknown enemy type "${data.enemy.type}" for enemy ${data.enemy.id} - skipping spawn`);
            }
        });

        // DYNAMIC SPAWN SYSTEM: Enemy despawned (region became inactive)
        networkManager.on('enemy:despawned', (data) => {
            const swordDemon = this.swordDemons[data.enemyId];
            const minotaur = this.minotaurs[data.enemyId];
            const mushroom = this.mushrooms[data.enemyId];
            const enemy = this.enemies[data.enemyId];

            if (swordDemon) {
                console.log(`🌙 Despawning sword demon ${data.enemyId}`);
                swordDemon.destroy();
                delete this.swordDemons[data.enemyId];
            } else if (minotaur) {
                console.log(`🌙 Despawning minotaur ${data.enemyId}`);
                minotaur.destroy();
                delete this.minotaurs[data.enemyId];
            } else if (mushroom) {
                console.log(`🌙 Despawning mushroom ${data.enemyId}`);
                mushroom.destroy();
                delete this.mushrooms[data.enemyId];
            } else if (enemy) {
                console.log(`🌙 Despawning enemy ${data.enemyId}`);
                enemy.destroy();
                delete this.enemies[data.enemyId];
            }
        });

        // Enemy damaged
        networkManager.on('enemy:damaged', (data) => {
            const enemy = this.enemies[data.enemyId] || this.swordDemons[data.enemyId] || this.minotaurs[data.enemyId] || this.mushrooms[data.enemyId];
            if (enemy) {
                enemy.takeDamage(data.damage);
            }
        });

        // Minion spawned by another player
        networkManager.on('minion:spawned', (data) => {
            console.log(`🔮 Received minion spawn from server: ${data.minionId} for owner ${data.ownerId}`);

            // Don't create if we already have this minion
            if (this.minions[data.minionId]) {
                console.log(`⚠️ Minion ${data.minionId} already exists, skipping`);
                return;
            }

            // Position from server is in GRID coordinates, convert to pixels
            const tileSize = GameConfig.GAME.TILE_SIZE;
            const x = data.position.x * tileSize + tileSize / 2;
            const y = data.position.y * tileSize + tileSize / 2;

            console.log(`🔮 Converting grid position (${data.position.x}, ${data.position.y}) to pixels (${x}, ${y})`);

            // Spawn the minion
            const minion = this.spawnMinion(x, y, data.ownerId, data.isPermanent, data.minionId);

            // Apply initial animation state and flip if provided
            if (minion && minion.sprite) {
                if (data.animationState && minion.sprite.anims) {
                    minion.sprite.anims.play(data.animationState, true);
                }
                if (data.flipX !== undefined) {
                    minion.sprite.setFlipX(data.flipX);
                }
            }
        });

        // Minion position updated (from server broadcast)
        networkManager.on('minion:moved', (data) => {
            const minion = this.minions[data.minionId];

            // DEBUG: Log every minion:moved event
            if (Math.random() < 0.05) { // Log 5% to see if events are firing
                console.log(`🔍 minion:moved - ID: ${data.minionId}, exists: ${!!minion}, ownerId: ${minion?.ownerId}, currentPlayer: ${networkManager.currentPlayer?.id}`);
            }

            if (minion && minion.sprite && minion.sprite.active) {
                // Position is now in PIXELS, use directly
                const targetX = data.position.x;
                const targetY = data.position.y;

                // Apply animation state and sprite flip
                if (data.animationState && minion.sprite.anims) {
                    const currentAnim = minion.sprite.anims.currentAnim?.key;
                    const isPlaying = minion.sprite.anims.isPlaying;

                    // DEBUG: Log animation changes occasionally
                    if (Math.random() < 0.01) {
                        console.log(`🎬 Animation update - current: ${currentAnim}, target: ${data.animationState}, isPlaying: ${isPlaying}`);
                    }

                    // Always play the animation to ensure it's running
                    if (currentAnim !== data.animationState || !isPlaying) {
                        minion.sprite.anims.play(data.animationState, true);
                    }
                }
                if (data.flipX !== undefined) {
                    minion.sprite.setFlipX(data.flipX);
                }

                // Calculate distance to determine if we should snap or smooth move
                const dx = targetX - minion.sprite.x;
                const dy = targetY - minion.sprite.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // DEBUG: Log target position setting
                if (Math.random() < 0.05) {
                    console.log(`🎯 Setting target for ${data.minionId}: (${targetX}, ${targetY}), distance: ${distance.toFixed(2)}, snap: ${distance > 200}`);
                }

                // If distance is too large (teleport/spawn), snap instantly
                // Otherwise use smooth interpolation
                if (distance > 200) {
                    minion.sprite.x = targetX;
                    minion.sprite.y = targetY;
                    if (minion.healthBar) {
                        minion.healthBar.x = targetX;
                        minion.healthBar.y = targetY - 20;
                    }
                } else {
                    // Store target for smooth interpolation in update loop
                    minion.targetX = targetX;
                    minion.targetY = targetY;
                }
            } else if (!minion) {
                // Debug: Log when we receive a move event for a minion that doesn't exist locally
                if (Math.random() < 0.01) { // Log 1% of missing minions to avoid spam
                    console.log(`⚠️ Received minion:moved for unknown minion: ${data.minionId}`);
                }
            }
        });

        // Minion died (from server broadcast)
        networkManager.on('minion:died', (data) => {
            const minion = this.minions[data.minionId];
            if (minion && minion.sprite && minion.sprite.active) {
                console.log(`💀 Remote minion died: ${data.minionId}`);
                // Call die() to play death animation and destroy
                minion.die();
            }
        });

        // Minion damaged by enemy
        networkManager.on('minion:damaged', (data) => {
            const minion = this.minions[data.minionId];
            if (minion) {
                minion.takeDamage(data.damage);
            }

            // Trigger attack animation for the attacker
            if (data.attackerId) {
                const attacker = this.enemies[data.attackerId] || this.swordDemons[data.attackerId] || this.minotaurs[data.attackerId] || this.mushrooms[data.attackerId] || this.emberclaws[data.attackerId];
                if (attacker && typeof attacker.attack === 'function' && minion && minion.sprite) {
                    // Pass target position so attacker faces the right way
                    attacker.attack(minion.sprite.x, minion.sprite.y);
                }
            }
        });

        // Minion healed (Malachar's auto attack)
        networkManager.on('minion:healed', (data) => {
            const minion = this.minions[data.minionId];
            if (minion && minion.sprite && minion.sprite.active) {
                // Show visual effect at minion position
                this.showMinionHealEffect(minion.sprite.x, minion.sprite.y);

                // Apply healing (client-side visual)
                if (minion.health < minion.maxHealth) {
                    minion.health = Math.min(minion.maxHealth, minion.health + data.healAmount);

                    // Show +HP text
                    const healText = this.add.text(minion.sprite.x, minion.sprite.y - 30, `+${data.healAmount}`, {
                        font: 'bold 14px monospace',
                        fill: '#4AE290',
                        stroke: '#000000',
                        strokeThickness: 2
                    }).setOrigin(0.5);

                    this.tweens.add({
                        targets: healText,
                        y: minion.sprite.y - 60,
                        alpha: 0,
                        duration: 800,
                        ease: 'Power2',
                        onComplete: () => healText.destroy()
                    });
                }
            }
        });

        // Enemy moved
        networkManager.on('enemy:moved', (data) => {
            const enemy = this.enemies[data.enemyId] || this.swordDemons[data.enemyId] || this.minotaurs[data.enemyId] || this.mushrooms[data.enemyId] || this.emberclaws[data.enemyId];

            // Silently ignore movement for non-existent enemies (likely killed but server still sending updates)
            if (!enemy) {
                return;
            }

            if (enemy.sprite) {
                // Update position with interpolation
                enemy.data.position = data.position;

                // Emberclaw uses moveToPosition with tile coordinates
                if (enemy.moveToPosition) {
                    enemy.moveToPosition(data.position);
                }
                // Other enemies use setTargetPosition with pixel coordinates
                else if (enemy.setTargetPosition) {
                    const tileSize = GameConfig.GAME.TILE_SIZE;
                    const targetX = data.position.x * tileSize + tileSize / 2;
                    const targetY = data.position.y * tileSize + tileSize / 2;
                    enemy.setTargetPosition(targetX, targetY);
                }
            }
        });

        // Player damaged by enemy
        networkManager.on('player:damaged', (data) => {
            if (data.playerId === networkManager.currentPlayer.id && this.localPlayer) {
                // CLIENT-SIDE VALIDATION: Verify enemy is actually close enough to attack
                // Only validate if we have position data AND the enemy exists
                if (data.attackerId && data.enemyPosition) {
                    const attacker = this.enemies[data.attackerId] || this.swordDemons[data.attackerId] || this.minotaurs[data.attackerId];

                    if (attacker && attacker.sprite) {
                        const TILE_SIZE = GameConfig.GAME.TILE_SIZE;
                        const MAX_ATTACK_RANGE = 3.0; // 3 tiles max attack range (generous to account for latency)

                        // Convert enemy grid position to pixel position
                        const enemyPixelX = data.enemyPosition.x * TILE_SIZE + TILE_SIZE / 2;
                        const enemyPixelY = data.enemyPosition.y * TILE_SIZE + TILE_SIZE / 2;

                        // Calculate distance between enemy and player
                        const dx = this.localPlayer.sprite.x - enemyPixelX;
                        const dy = this.localPlayer.sprite.y - enemyPixelY;
                        const distanceInPixels = Math.sqrt(dx * dx + dy * dy);
                        const distanceInTiles = distanceInPixels / TILE_SIZE;

                        // If enemy is too far away, log warning and skip damage
                        if (distanceInTiles > MAX_ATTACK_RANGE) {
                            console.warn(`⚠️ Rejected attack from ${data.attackerId}: enemy at (${data.enemyPosition.x.toFixed(1)}, ${data.enemyPosition.y.toFixed(1)}) is ${distanceInTiles.toFixed(1)} tiles away (max: ${MAX_ATTACK_RANGE})`);
                            console.warn(`   Player at pixels (${this.localPlayer.sprite.x.toFixed(0)}, ${this.localPlayer.sprite.y.toFixed(0)}), Enemy at pixels (${enemyPixelX.toFixed(0)}, ${enemyPixelY.toFixed(0)})`);
                            return; // Skip damage
                        }
                    }
                }

                // Calculate damage and apply through takeDamage (respects shield)
                const currentHealth = this.localPlayer.health;
                const newHealth = data.health;
                const damage = currentHealth - newHealth;

                if (damage > 0) {
                    this.localPlayer.takeDamage(damage);
                } else {
                    // If server sent health increase (healing), apply directly
                    this.localPlayer.health = data.health;
                    this.localPlayer.ui.updateHealthBar();
                }

                // Show damage effect
                this.cameras.main.shake(100, 0.005);
            }

            // Trigger attack animation for the attacker
            if (data.attackerId) {
                const attacker = this.enemies[data.attackerId] || this.swordDemons[data.attackerId] || this.minotaurs[data.attackerId] || this.mushrooms[data.attackerId] || this.emberclaws[data.attackerId];
                if (attacker && attacker.attack && this.localPlayer && this.localPlayer.spriteRenderer && this.localPlayer.spriteRenderer.sprite) {
                    // Pass player position so attacker faces the right way
                    attacker.attack(this.localPlayer.spriteRenderer.sprite.x, this.localPlayer.spriteRenderer.sprite.y);
                }
            }
        });

        // Malachar ability used
        networkManager.on('ability:used', (data) => {
            console.log(`📩 Received ability event:`, data);
            console.log(`   My ID: ${this.localPlayer?.data?.id}, Target ID: ${data.targetPlayerId}`);
            console.log(`   Match: ${data.targetPlayerId === this.localPlayer?.data?.id}`);

            // Handle auto-attack visual effects (Command Bolt, etc.)
            if (data.abilityKey === 'autoattack' && data.targetMinionId) {
                console.log(`⚔️ Auto-attack visual effect: ${data.abilityName} on minion ${data.targetMinionId}`);
                this.playAutoAttackVisual(data);
                return;
            }

            // Handle Pact of Bones visual effects for other players
            if (data.abilityName === 'Pact of Bones' && data.effects && data.effects.minions) {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.effects.playerId === this.localPlayer?.data?.id) {
                    console.log(`💀 Pact of Bones - I'm the caster, skipping visual replay`);
                    return;
                }
                console.log(`💀 Pact of Bones visual effect from ${data.playerName}`);
                this.playPactOfBonesVisual(data.effects);
                return;
            }

            // Only apply if we're the target player
            if (this.localPlayer && data.targetPlayerId === this.localPlayer.data.id) {
                console.log(`🎯 I AM THE TARGET! Applying ${data.abilityName} from ${data.playerName}`);

                // Apply shield
                if (data.effects && data.effects.shield) {
                    const oldShield = this.localPlayer.shield || 0;
                    this.localPlayer.shield = oldShield + data.effects.shield;
                    console.log(`🛡️ Shield updated: ${oldShield} → ${this.localPlayer.shield}`);

                    // Force HUD update
                    const hud = this.hud || this.modernHUD;
                    console.log(`   HUD object:`, hud ? 'EXISTS' : 'NULL');

                    if (hud) {
                        console.log(`   HUD.updateHealthBar:`, typeof hud.updateHealthBar);
                        hud.updateHealthBar();
                        console.log(`✅ HUD updated with shield: ${this.localPlayer.shield}`);
                    } else {
                        console.error(`❌ No HUD found!`);
                    }

                    // Also update PlayerUI if it exists (for other players viewing you)
                    if (this.localPlayer.ui && this.localPlayer.ui.updateHealthBar) {
                        this.localPlayer.ui.updateHealthBar();
                    }

                    console.log(`🛡️ Shield applied to me: +${data.effects.shield} (Total: ${this.localPlayer.shield})`);
                }
            } else {
                console.log(`⏭️ Not for me, skipping`);
            }
        });

        // Enemy attack (Emberclaw shooting)
        networkManager.on('enemy:attack', (data) => {
            console.log(`🎯 Received enemy:attack - enemyId: ${data.enemyId}`);
            const emberclaw = this.emberclaws[data.enemyId];
            if (emberclaw && emberclaw.shootProjectile) {
                console.log(`🔥 Emberclaw found, shooting at (${data.targetX}, ${data.targetY})`);
                emberclaw.shootProjectile(data.targetX, data.targetY);
            } else {
                console.warn(`⚠️ Emberclaw ${data.enemyId} not found or no shootProjectile method`);
            }
        });

        // Enemy killed
        networkManager.on('enemy:killed', (data) => {
            const enemy = this.enemies[data.enemyId] || this.swordDemons[data.enemyId] || this.minotaurs[data.enemyId] || this.emberclaws[data.enemyId];
            if (enemy) {
                const deathX = enemy.sprite.x;
                const deathY = enemy.sprite.y;

                // Add blood splatter to screen
                this.addScreenBloodSplatter();

                // Spawn experience orb at death location
                this.spawnExperienceOrb(deathX, deathY);

                enemy.die();

                // Track kill if local player killed this enemy
                if (data.killedBy === networkManager.currentPlayer.id) {
                    if (this.modernHUD) {
                        this.modernHUD.addKill();
                    }
                }

                // Delete from correct collection
                if (this.enemies[data.enemyId]) {
                    delete this.enemies[data.enemyId];
                } else if (this.swordDemons[data.enemyId]) {
                    delete this.swordDemons[data.enemyId];
                } else if (this.minotaurs[data.enemyId]) {
                    delete this.minotaurs[data.enemyId];
                } else if (this.emberclaws[data.enemyId]) {
                    delete this.emberclaws[data.enemyId];
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

                // Track kill if local player killed this enemy
                if (data.killerId === networkManager.currentPlayer.id) {
                    if (this.modernHUD) {
                        this.modernHUD.addKill();
                    }
                }

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

        // Large background (increased height for debug logging section)
        const bg = this.add.rectangle(centerX, centerY, 700, 650, 0x000000, 0.95);
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

        // DEBUG LOGGING SECTION
        const debugY = cameraY + spacing * 2;
        this.createCategoryLabel('DEBUG LOGGING', centerX, debugY);
        this.createDebugCategoryButton('Network', 'NETWORK', leftX, debugY + spacing);
        this.createDebugCategoryButton('Combat', 'COMBAT', rightX, debugY + spacing);
        this.createDebugCategoryButton('Movement', 'MOVEMENT', leftX, debugY + spacing * 2);
        this.createDebugCategoryButton('Minions', 'MINIONS', rightX, debugY + spacing * 2);

        // AUDIO SECTION
        const audioY = debugY + spacing * 3;
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

    createDebugCategoryButton(label, category, x, y) {
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

        const isEnabled = debug.categories[category];
        const statusText = this.add.text(x + 100, y, isEnabled ? 'ON' : 'OFF', {
            font: 'bold 13px monospace',
            fill: isEnabled ? '#00ff00' : '#ff0000'
        }).setOrigin(1, 0.5);
        statusText.setScrollFactor(0);
        statusText.setDepth(10002);
        statusText.setVisible(false);

        button.on('pointerdown', () => {
            const newState = !debug.categories[category];
            debug.setCategory(category, newState);
            statusText.setText(newState ? 'ON' : 'OFF');
            statusText.setColor(newState ? '#00ff00' : '#ff0000');
        });

        button.on('pointerover', () => button.setStrokeStyle(2, 0x00ffff));
        button.on('pointerout', () => button.setStrokeStyle(2, 0x00ff00));

        this.devMenuElements.push(button, text, statusText);
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
        Object.values(this.swordDemons).forEach(swordDemon => {
            if (swordDemon.sprite) {
                swordDemon.sprite.destroy();
            }
        });
        Object.values(this.minotaurs).forEach(minotaur => {
            if (minotaur.sprite) {
                minotaur.sprite.destroy();
            }
        });
        Object.values(this.mushrooms).forEach(mushroom => {
            if (mushroom.sprite) {
                mushroom.sprite.destroy();
            }
        });
        this.enemies = {};
        this.swordDemons = {};
        this.minotaurs = {};
        this.mushrooms = {};
        console.log('🧹 Cleared all enemies, sword demons, minotaurs, and mushrooms');
    }

    healPlayer() {
        if (this.localPlayer) {
            this.localPlayer.health = this.localPlayer.maxHealth;
            console.log('❤️ Player healed to full health');
        }
    }

    spawnMinion(x, y, ownerId, isPermanent = false, providedMinionId = null, skipFormationUpdate = false) {
        // Use provided ID if spawning from network, otherwise generate new one with player ID prefix
        const minionId = providedMinionId || `${ownerId}_minion_${this.minionIdCounter++}`;

        console.log(`🔮 spawnMinion called: minionId=${minionId}, ownerId=${ownerId}, currentPlayerId=${networkManager.currentPlayer?.id}, providedId=${providedMinionId}`);

        // If this is a local player spawn (no provided ID), request from server instead
        if (!providedMinionId && ownerId === networkManager.currentPlayer.id) {
            const gridPosition = {
                x: Math.floor(x / 32),
                y: Math.floor(y / 32)
            };
            console.log(`🔮 Requesting minion spawn from server: ${minionId} at grid (${gridPosition.x}, ${gridPosition.y})`);
            networkManager.requestMinionSpawn(minionId, gridPosition, isPermanent);

            // Return null - minion will be spawned when server broadcasts
            console.log(`🔮 Returning null, waiting for server broadcast`);
            return null;
        }

        // Spawn the minion locally (from server broadcast)
        const minion = new Minion(this, x, y, ownerId, isPermanent, minionId);
        this.minions[minionId] = minion;

        // DON'T add castle collision to minions - they need to pass through walls to follow player

        // INTELLIGENT FORMATION: Assign roles to all minions owned by this player
        // Skip if this is a batch spawn (will be called manually after)
        if (!skipFormationUpdate) {
            this.updateMinionFormations(ownerId);
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

        return minion; // Return minion for tracking
    }

    // Spawn temporary minion with custom stats and auto-destruction
    spawnTempMinion(x, y, stats, duration) {
        if (!this.localPlayer) return null;

        // Spawn temporary minion (isPermanent = false)
        const minion = this.spawnMinion(x, y, this.localPlayer.data.id, false);

        if (!minion) return null;

        // Apply custom stats
        if (stats.health !== undefined) {
            minion.maxHealth = stats.health;
            minion.health = stats.health;
        }
        if (stats.damage !== undefined) {
            minion.damage = stats.damage;
        }

        // Auto-remove after duration
        this.time.delayedCall(duration, () => {
            if (minion && minion.isAlive) {
                minion.health = 0; // Will be cleaned up by death logic
                console.log(`⏱️ Temp minion ${minion.minionId} expired after ${duration}ms`);
            }
        });

        console.log(`🔮 Spawned temp minion with ${stats.health}HP, ${stats.damage}DMG (${duration}ms duration)`);

        return minion;
    }

    // Spawn experience orb at specified location
    spawnExperienceOrb(x, y, expValue = 10) {
        const orbId = `exp_${this.expOrbIdCounter++}`;
        const orb = new ExperienceOrb(this, { x, y, expValue });
        this.experienceOrbs[orbId] = orb;

        console.log(`💎 Spawned experience orb [${orbId}] at (${x.toFixed(0)}, ${y.toFixed(0)}) worth ${expValue} XP`);

        return orb;
    }

    // INTELLIGENT FORMATION: Reassign roles to all minions owned by a player
    updateMinionFormations(ownerId) {
        // Get all alive minions owned by this player
        const ownerMinions = Object.values(this.minions)
            .filter(m => m.ownerId === ownerId && m.isAlive)
            .sort((a, b) => a.minionId.localeCompare(b.minionId)); // Stable sort

        const totalMinions = ownerMinions.length;

        console.log(`🛡️ Formation update for player ${ownerId.slice(0,8)}: ${totalMinions} minions`);
        console.log(`  Minion IDs:`, ownerMinions.map(m => m.minionId.slice(-4)));

        // Assign roles based on squad size
        ownerMinions.forEach((minion, index) => {
            minion.setFormationRole(index, totalMinions);
            console.log(`    [${index}] ${minion.minionId.slice(-4)} -> ${minion.role} (patrol: ${minion.patrolDistance})`);
        });
    }

    // ==================== SKILL RESTORATION SYSTEM ====================

    restorePlayerSkills(playerData) {
        if (!this.localPlayer || !this.skillSelector) {
            console.warn('⚠️ Cannot restore skills - localPlayer or skillSelector not initialized');
            return;
        }

        console.log('🔄 Restoring player skills from server:', playerData);

        // Restore selected skills array
        if (playerData.selectedSkills && playerData.selectedSkills.length > 0) {
            this.skillSelector.selectedSkills = playerData.selectedSkills;
            console.log(`✅ Restored ${playerData.selectedSkills.length} skills`);
        }

        // Restore all multipliers and special effects
        const player = this.localPlayer;
        const fields = [
            'minionHealthMultiplier', 'minionDamageMultiplier', 'minionSpeedMultiplier',
            'minionAttackSpeedMultiplier', 'minionAllStatsMultiplier', 'minionSizeMultiplier',
            'minionDefenseMultiplier', 'minionArmor', 'minionLifesteal', 'minionRegen',
            'minionKnockback', 'minionStun', 'minionCleave', 'minionUnstoppable',
            'minionCritChance', 'minionCritDamage', 'damageMultiplier', 'xpMultiplier',
            'healPerKill', 'healOnKillPercent', 'regenPerMinion', 'packDamageBonus',
            'groupedDefense', 'coordinatedDamage', 'perMinionBonus', 'maxMinionBonus',
            'berserkerDamage', 'berserkerThreshold', 'executeThreshold', 'executeDamage',
            'bossDamage', 'armorPen', 'chainAttack', 'splashDamage', 'dualWield',
            'attacksPerStrike', 'commandAura', 'flankDamage', 'killDamageStack',
            'maxKillStacks', 'currentKillStacks', 'reapersMarkThreshold', 'reapersMarkDamage',
            'minionCap', 'legionBuffMultiplier', 'instantRevive', 'shockwaveRadius',
            'deathAura', 'deathImmunity'
        ];

        fields.forEach(field => {
            if (playerData[field] !== undefined) {
                player[field] = playerData[field];
            }
        });

        // Restore permanent minions (only if not empty - respawn after death has empty array)
        if (playerData.permanentMinions && playerData.permanentMinions.length > 0) {
            console.log(`🔮 Restoring ${playerData.permanentMinions.length} permanent minions...`);

            // Count existing minions to avoid duplicates
            const existingMinions = Object.keys(this.minions).length;

            playerData.permanentMinions.forEach((minionId, index) => {
                // Skip if minion already exists
                if (this.minions[minionId]) {
                    console.log(`⏭️ Minion ${minionId} already exists, skipping`);
                    return;
                }

                // Spawn minion near player with slight offset
                const spawnX = player.sprite.x + (index * 40) - 40;
                const spawnY = player.sprite.y + (index % 2 === 0 ? -40 : 40);

                this.spawnMinion(spawnX, spawnY, player.data.id, true, minionId);
            });
        }

        console.log('✅ Skill restoration complete');
    }

    restorePlayerFromDeath(playerData) {
        if (!this.localPlayer) {
            console.warn('⚠️ Cannot restore player - localPlayer not initialized');
            return;
        }

        console.log('♻️ Restoring player from death:', playerData);

        const player = this.localPlayer;

        // Reset player state
        player.isAlive = true;
        player.level = playerData.level || 1;
        player.experience = playerData.experience || 0;
        player.health = playerData.health;
        player.maxHealth = playerData.maxHealth;
        player.stats = playerData.stats || {
            strength: 10,
            agility: 10,
            intelligence: 10,
            vitality: 10,
            damage: 10,
            armor: 5
        };

        // Clear all multipliers (reset to defaults)
        if (this.skillSelector) {
            this.skillSelector.initializePlayerMultipliers();
        }

        // Teleport to respawn position (already in pixels)
        const respawnPos = playerData.respawnPosition || playerData.position;
        if (respawnPos) {
            console.log(`🎯 Teleporting to pixel position (${respawnPos.x}, ${respawnPos.y})`);

            // Update physics body position (this is the actual player position)
            player.sprite.x = respawnPos.x;
            player.sprite.y = respawnPos.y;
            player.sprite.body.setVelocity(0, 0);

            console.log(`✅ Physics body moved to (${player.sprite.x}, ${player.sprite.y})`);

            // Restore visual sprites - make all elements visible again
            if (player.spriteRenderer) {
                const targets = player.spriteRenderer.getVisualTargets();
                targets.forEach(target => {
                    if (target) {
                        target.setAlpha(1);
                        target.setVisible(true);
                    }
                });

                // Update sprite positions
                if (player.usingSprite) {
                    player.spriteRenderer.updateSpritePositions();
                }

                // Play idle animation
                if (player.spriteRenderer.is1x1 && player.spriteRenderer.sprite) {
                    const textureKey = player.class.toLowerCase();
                    const idleAnimKey = `${textureKey}_idle`;
                    if (this.anims.exists(idleAnimKey)) {
                        player.spriteRenderer.sprite.play(idleAnimKey);
                    }
                }
            }

            // Restore UI visibility
            if (player.ui) {
                player.ui.setAlpha(1);
            }

            // Center camera on respawn point
            this.cameras.main.centerOn(pixelX, pixelY);
            this.cameras.main.startFollow(player.sprite);

            console.log(`📍 Respawned at (${respawnPos.x}, ${respawnPos.y})`);
            console.log(`📷 Camera at (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);

            // Starting minions are now handled by skill tree path selection
        }

        // Update UI
        if (player.ui) {
            player.ui.updateHealthBar();
        }

        // Force an update to ensure everything is rendered
        if (player.spriteRenderer && player.usingSprite) {
            player.spriteRenderer.updateSpritePositions();
        }

        console.log('✅ Death restoration complete - Fresh start!');
        console.log(`   Player at (${player.sprite.x}, ${player.sprite.y}), alive: ${player.isAlive}, health: ${player.health}/${player.maxHealth}`);
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

        // Remove camera bounds so it can follow to negative coordinates
        this.cameras.main.setBounds();

        // Teleport player to interior (far away from main world)
        this.localPlayer.sprite.setPosition(this.interiorX, this.interiorY);

        // Immediately center camera on player
        this.cameras.main.centerOn(this.interiorX, this.interiorY);

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

        // Restore camera bounds to main world
        const worldSize = this.gameData.world.size;
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const worldPixelWidth = worldSize * tileSize;
        const worldPixelHeight = worldSize * tileSize;
        this.cameras.main.setBounds(0, 0, worldPixelWidth, worldPixelHeight);

        // Teleport player back to exterior (just outside door)
        const worldCenterX = (worldSize / 2) * tileSize;
        const worldCenterY = (worldSize / 2) * tileSize;
        this.localPlayer.sprite.setPosition(worldCenterX, worldCenterY + 100);

        // Immediately center camera on player
        this.cameras.main.centerOn(worldCenterX, worldCenterY + 100);

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

    showMinionHealEffect(minionX, minionY) {
        // Play Malachar healing auto attack animation on minion
        const healSprite = this.add.sprite(minionX, minionY, 'malacharautoattack');
        healSprite.setOrigin(0.5);
        healSprite.setDepth(100); // Above everything
        healSprite.setScale(1.0); // 64x64 at 1:1 scale

        // Play animation once
        healSprite.play('malachar_heal_attack');

        // Destroy sprite after animation completes
        healSprite.once('animationcomplete', () => {
            healSprite.destroy();
        });

        // Backup: destroy after 1 second if animation doesn't complete
        this.time.delayedCall(1000, () => {
            if (healSprite && healSprite.active) {
                healSprite.destroy();
            }
        });
    }

    showChatMessage(username, message) {
        // Chat message display
    }

    addScreenBloodSplatter() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Random splatter count (3-8 splatters per kill)
        const splatterCount = 3 + Math.floor(Math.random() * 6);

        for (let i = 0; i < splatterCount; i++) {
            // Random position on screen edges (more likely on edges where enemies die)
            const edge = Math.random();
            let x, y;

            if (edge < 0.5) {
                // Side edges
                x = Math.random() < 0.5 ? Math.random() * 200 : width - Math.random() * 200;
                y = Math.random() * height;
            } else {
                // Top/bottom edges
                x = Math.random() * width;
                y = Math.random() < 0.5 ? Math.random() * 200 : height - Math.random() * 200;
            }

            // Create blood splatter using blood splash sprites
            const splashType = Math.floor(Math.random() * 3) + 1;
            const splatter = this.add.sprite(x, y, `blood_splash_${splashType}`);
            splatter.setScrollFactor(0);
            splatter.setDepth(10000);
            splatter.setScale(0.8 + Math.random() * 0.6);
            splatter.setRotation(Math.random() * Math.PI * 2);

            // Play blood animation
            splatter.play(`blood_splash_${splashType}_anim`);

            // Add to container
            this.screenBloodContainer.add(splatter);
            this.screenBloodSplatters.push(splatter);

            // Auto-fade all screen blood within 3 seconds
            this.tweens.add({
                targets: splatter,
                alpha: 0,
                duration: 1000, // Fade over 1 second
                delay: 2000, // Start fading after 2 seconds (total = 3 seconds)
                ease: 'Linear',
                onComplete: () => {
                    splatter.destroy();
                    const idx = this.screenBloodSplatters.indexOf(splatter);
                    if (idx > -1) this.screenBloodSplatters.splice(idx, 1);
                }
            });
        }

        // Limit total blood splatters (keep last 50)
        if (this.screenBloodSplatters.length > 50) {
            const toRemove = this.screenBloodSplatters.splice(0, this.screenBloodSplatters.length - 50);
            toRemove.forEach(splat => {
                if (splat && !splat.scene) return; // Already destroyed
                this.tweens.add({
                    targets: splat,
                    alpha: 0,
                    duration: 300, // Very fast fade - gone in 300ms
                    onComplete: () => splat.destroy()
                });
            });
        }
    }

    update(time, delta) {
        if (!this.localPlayer) return;

        // Update music UI progress bar
        if (this.musicUI) {
            this.musicUI.update();
        }

        // Update ambient particles
        if (this.ambientParticles) {
            this.updateAmbientParticles(delta);
        }

        // Update ability manager cooldowns
        if (this.abilityManager) {
            this.abilityManager.update(time, delta);
        }

        // Update controller manager
        if (this.controllerManager) {
            this.controllerManager.update();
        }

        // Controller ability buttons
        if (this.controllerManager && this.abilityManager) {
            if (this.controllerManager.isAbilityJustPressed('Q')) {
                this.abilityManager.useAbility('q');
            }
            if (this.controllerManager.isAbilityJustPressed('E')) {
                this.abilityManager.useAbility('e');
            }
            if (this.controllerManager.isAbilityJustPressed('R')) {
                this.abilityManager.useAbility('r');
            }
        }

        // PERFORMANCE: Removed performance timing system (saves 21+ performance.now() calls per frame)

        // Player movement (with speed multiplier)
        let velocityX = 0;
        let velocityY = 0;

        // Get controller input
        const controllerVector = this.controllerManager ? this.controllerManager.getMovementVector() : { x: 0, y: 0 };

        // Keyboard input
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

        // Controller input (overrides keyboard if active)
        if (Math.abs(controllerVector.x) > 0 || Math.abs(controllerVector.y) > 0) {
            velocityX = controllerVector.x;
            velocityY = controllerVector.y;
        } else {
            // Normalize diagonal movement for keyboard
            if (velocityX !== 0 && velocityY !== 0) {
                velocityX *= 0.707;
                velocityY *= 0.707;
            }
        }

        // Apply speed multiplier
        velocityX *= this.devSettings.speedMultiplier;
        velocityY *= this.devSettings.speedMultiplier;

        this.localPlayer.move(velocityX, velocityY);

        // Update visible tiles based on camera position (viewport culling)
        // PERFORMANCE: Run every frame to prevent tile accumulation (was every 5 frames causing 996 tiles!)
        this.updateVisibleTiles();

        // Update animations (once per frame)
        this.localPlayer.updateAnimation(delta);
        Object.values(this.otherPlayers).forEach(player => {
            player.updateAnimation(delta);
            player.updateInterpolation(); // Smooth movement
        });

        // Update off-screen player indicators
        this.updatePlayerIndicators();

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

            // Update modern HUD
            if (this.modernHUD) {
                this.modernHUD.update();
            }

        // PERFORMANCE: Removed diagnostic logging and FPS counter (saves performance)

        // Update minions and cleanup dead ones
        Object.keys(this.minions).forEach(minionId => {
            const minion = this.minions[minionId];
            if (minion.isAlive) {
                minion.update();
            } else {
                // Clean up dead minion if sprite is destroyed
                if (!minion.sprite || !minion.sprite.active) {
                    delete this.minions[minionId];
                    console.log(`🧹 Cleaned up dead minion: ${minionId.slice(0, 8)}`);
                }
            }
        });

        // Update enemies
        Object.values(this.enemies).forEach(enemy => {
            if (enemy.isAlive) {
                enemy.update();
            }
        });

        // Update sword demons
        Object.values(this.swordDemons).forEach(swordDemon => {
            if (swordDemon.isAlive) {
                swordDemon.update();
            }
        });

        // Update minotaurs
        Object.values(this.minotaurs).forEach(minotaur => {
            if (minotaur.isAlive) {
                minotaur.update();
            }
        });

        // Update mushrooms
        Object.values(this.mushrooms).forEach(mushroom => {
            if (mushroom.isAlive) {
                mushroom.update();
            }
        });

        // Update emberclaws
        Object.values(this.emberclaws).forEach(emberclaw => {
            if (emberclaw.isAlive) {
                emberclaw.update();
            }
        });

        // Check for experience orb collection
        const playerX = this.localPlayer.sprite.x;
        const playerY = this.localPlayer.sprite.y;

        Object.keys(this.experienceOrbs).forEach(orbId => {
            const orb = this.experienceOrbs[orbId];
            if (orb && orb.checkCollision(playerX, playerY)) {
                // Collect the orb
                orb.collect();

                // Add experience to local player
                this.localPlayer.addExperience(orb.expValue);

                // Add experience to all other players that are visible on screen
                const camera = this.cameras.main;
                Object.values(this.otherPlayers).forEach(otherPlayer => {
                    if (otherPlayer.isAlive) {
                        const otherX = otherPlayer.sprite.x;
                        const otherY = otherPlayer.sprite.y;

                        // Check if other player is within camera bounds (on screen)
                        if (otherX >= camera.scrollX &&
                            otherX <= camera.scrollX + camera.width &&
                            otherY >= camera.scrollY &&
                            otherY <= camera.scrollY + camera.height) {
                            otherPlayer.addExperience(orb.expValue);
                        }
                    }
                });

                // Remove from collection
                delete this.experienceOrbs[orbId];
            }
        });

        // Remaining update logic

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
        // PERFORMANCE: Only update depth for moving objects (players), NOT static objects (trees)

        // Set player depth based on Y position
        this.localPlayer.sprite.setDepth(this.localPlayer.sprite.y);

        // Update other players' depth
        Object.values(this.otherPlayers).forEach(player => {
            if (player.sprite && player.sprite.active) {
                player.sprite.setDepth(player.sprite.y);
            }
        });

        // NOTE: Tree depths are set ONCE when created, not every frame!
        // This saves massive performance (was updating 100s of sprites every frame)

        // PERFORMANCE: Removed frame time tracking and slow frame logging
    }

    // Play auto-attack visual effect for remote players
    playAutoAttackVisual(data) {
        // Find the player who cast it
        const caster = data.playerId === networkManager.currentPlayer?.id
            ? this.localPlayer
            : this.otherPlayers[data.playerId];

        if (!caster || !caster.spriteRenderer || !caster.spriteRenderer.sprite) {
            console.warn(`⚠️ Cannot play auto-attack visual: caster not found`);
            return;
        }

        // Find the target minion
        const targetMinion = this.minions[data.targetMinionId];
        if (!targetMinion || !targetMinion.sprite) {
            console.warn(`⚠️ Cannot play auto-attack visual: target minion not found`);
            return;
        }

        // Play Command Bolt visual effect
        if (data.abilityName === 'Command Bolt') {
            console.log(`✨ Playing Command Bolt visual from ${data.playerId} to minion ${data.targetMinionId}`);

            // Create bone projectile sprite
            const projectile = this.add.sprite(
                caster.spriteRenderer.sprite.x,
                caster.spriteRenderer.sprite.y - 10,
                'autoattackbonecommander'
            );
            projectile.setOrigin(0.5, 0.5);
            projectile.setScale(0.6);
            projectile.setDepth(caster.spriteRenderer.sprite.depth + 1);
            projectile.setAlpha(0.9);

            // Play bone commander aura animation
            projectile.play('bone_commander_aura');

            // Calculate projectile travel
            const dx = targetMinion.sprite.x - projectile.x;
            const dy = targetMinion.sprite.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = 400; // pixels per second
            const travelTime = (distance / speed) * 1000;

            // Animate projectile to target
            this.tweens.add({
                targets: projectile,
                x: targetMinion.sprite.x,
                y: targetMinion.sprite.y,
                duration: travelTime,
                ease: 'Linear',
                onComplete: () => {
                    // Show buff aura on minion
                    const buffAura = this.add.sprite(
                        targetMinion.sprite.x,
                        targetMinion.sprite.y,
                        'autoattackbonecommander'
                    );
                    buffAura.setOrigin(0.5, 0.5);
                    buffAura.setScale(0.8);
                    buffAura.setDepth(targetMinion.sprite.depth - 1);
                    buffAura.setAlpha(0.6);
                    buffAura.play('bone_commander_aura');

                    // Follow minion during animation
                    const updateAuraPosition = () => {
                        if (buffAura && buffAura.active && targetMinion && targetMinion.sprite) {
                            buffAura.setPosition(targetMinion.sprite.x, targetMinion.sprite.y);
                            buffAura.setDepth(targetMinion.sprite.depth - 1);
                        }
                    };

                    this.events.on('update', updateAuraPosition);

                    buffAura.on('animationcomplete', () => {
                        this.events.off('update', updateAuraPosition);
                        buffAura.destroy();
                    });

                    // Destroy projectile
                    projectile.destroy();
                }
            });

            // Rotate projectile towards target
            const angle = Math.atan2(dy, dx);
            projectile.setRotation(angle);
        }
    }

    playPactOfBonesVisual(effects) {
        console.log(`💀 Playing Pact of Bones visual effects`, effects);

        if (!effects.minions || !Array.isArray(effects.minions)) {
            console.warn('⚠️ No minion data for Pact of Bones visual');
            return;
        }

        const explosionRadius = effects.explosionRadius || 96; // 3 tiles default

        effects.minions.forEach((minionData, index) => {
            const { explosionX, explosionY, minionId, teleportX, teleportY } = minionData;

            // Create explosion visual effect at explosion location
            const explosion = this.add.circle(explosionX, explosionY, explosionRadius, 0x8B008B, 0.3);
            explosion.setDepth(9999);

            this.tweens.add({
                targets: explosion,
                scale: 1.5,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => explosion.destroy()
            });

            // Spawn fire at explosion location (after short delay)
            this.time.delayedCall(200, () => {
                this.spawnFireVisual(explosionX, explosionY);
            });

            // Teleport minion to new position
            const minion = this.minions[minionId];
            if (minion && minion.sprite && teleportX !== undefined && teleportY !== undefined) {
                // Hide minion briefly
                minion.sprite.setAlpha(0);

                // Teleport after brief delay
                this.time.delayedCall(300, () => {
                    if (minion && minion.sprite && minion.sprite.scene) {
                        minion.sprite.x = teleportX;
                        minion.sprite.y = teleportY;
                        minion.sprite.setAlpha(1);

                        // Show respawn effect
                        const respawnCircle = this.add.circle(teleportX, teleportY, 20, 0x8B008B, 0.6);
                        this.tweens.add({
                            targets: respawnCircle,
                            scale: 1.5,
                            alpha: 0,
                            duration: 300,
                            ease: 'Power2',
                            onComplete: () => respawnCircle.destroy()
                        });
                    }
                });
            }
        });
    }

    spawnFireVisual(x, y) {
        // Random fire sprite selection
        const fireSprites = ['4_2', '4_4', '4_5', '5_1', '5_2', '5_4', '5_5', '6_1', '6_2', '6_4', '6_5', '7_1', '7_2', '7_4', '7_5'];
        const randomSprite = Phaser.Utils.Array.GetRandom(fireSprites);

        // Create fire sprite
        const fireSprite = this.add.sprite(x, y, `fire_${randomSprite}`);
        fireSprite.play(`fire_${randomSprite}_anim`);
        fireSprite.setDepth(5); // Above ground, below players

        // Spawn additional fires nearby for spreading effect (2-3 extra fires)
        const spreadCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < spreadCount; i++) {
            this.time.delayedCall(800 + (i * 400), () => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 40;
                const spreadX = x + Math.cos(angle) * distance;
                const spreadY = y + Math.sin(angle) * distance;

                const spreadSprite = Phaser.Utils.Array.GetRandom(fireSprites);
                const spreadFire = this.add.sprite(spreadX, spreadY, `fire_${spreadSprite}`);
                spreadFire.play(`fire_${spreadSprite}_anim`);
                spreadFire.setDepth(5);

                // Spread fires last 2 seconds
                this.time.delayedCall(2000, () => {
                    if (spreadFire && spreadFire.scene) {
                        spreadFire.destroy();
                    }
                });
            });
        }

        // Clean up main fire after 5 seconds
        this.time.delayedCall(5000, () => {
            if (fireSprite && fireSprite.scene) {
                fireSprite.destroy();
            }
        });
    }
}
