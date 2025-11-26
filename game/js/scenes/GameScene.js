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
        // Data structure: { username, selectedCharacter, gameData, loadingScene }
        // Extract the nested gameData
        this.gameData = data.gameData || data;
        this.username = data.username;
        this.selectedCharacter = data.selectedCharacter;
        this.loadingScene = data.loadingScene; // Store reference for progress updates
    }

    shutdown() {
        // Clean up network listeners when scene is destroyed
        debug.info('CORE', 'GameScene shutting down - cleaning up listeners');

        // Clean up keyboard controls
        const keysToCleanup = [
            this.key1, this.key2, this.key3, this.key4,
            this.keyQ, this.keyE, this.keyR, this.keyF,
            this.keyESC, this.tildaKey, this.keyH, this.spaceKey
        ];

        keysToCleanup.forEach(key => {
            if (key && typeof key.removeAllListeners === 'function') {
                key.removeAllListeners();
            }
        });

        const eventsToClear = [
            'player:joined', 'player:left', 'player:moved', 'player:changedMap', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:despawned', 'enemy:damaged', 'enemy:moved', 'enemies:moved:batch', 'enemy:killed',
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
        this.load.spritesheet('walls_floors', 'assets/tilesets/A3 - Walls And Floors.png?v=3', {
            frameWidth: 24,
            frameHeight: 24
            // Let Phaser auto-detect: 768÷24 = 32 wide, 1536÷24 = 64 tall = 2048 frames
        });
        this.load.spritesheet('walls', 'assets/tilesets/A4 - Walls.png', {
            frameWidth: 24,
            frameHeight: 24
        });

        // Object/Decoration tilesets - load as individual 48x48 tiles
        this.load.spritesheet('objects_d', 'assets/tilesets/Fantasy_Outside_D.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Fantasy_Outside_A5 tileset for spawn building (Winlu remaster)
        this.load.spritesheet('fantasy_outside_a5', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/tilesets/Fantasy_Outside_A5.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Additional tilesets for spawn building
        this.load.spritesheet('liquids_misc', 'assets/tilesets/A1_Liquids_And_Misc.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_door1', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Fantasy_door1.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_door2', 'assets/tilesets/Fantasy_door2.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('gate_cathedral1', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!$Gate_Cathedral1.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_outside_c', 'assets/tilesets/Fantasy_Outside_C.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Biome tilesets for LDtk chunks (2448x672 = 51 tiles wide × 14 tiles tall)
        this.load.spritesheet('a2_terrain_red', 'assets/tilesets/a2_terrain_red.png', {
            frameWidth: 48,
            frameHeight: 48,
            endFrame: 713  // 51 × 14 - 1 = 713 (0-indexed)
        });
        this.load.spritesheet('a2_terrain_green', 'assets/tilesets/a2_terrain_green.png', {
            frameWidth: 48,
            frameHeight: 48,
            endFrame: 713  // 51 × 14 - 1 = 713 (0-indexed)
        });
        this.load.spritesheet('fantasy_outside_b', 'assets/tilesets/Fantasy_Outside_B.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_roofs', 'assets/tilesets/Fantasy_Roofs.png', {
            frameWidth: 24,
            frameHeight: 24
        });

        // Winlu exterior remaster tilesets for spawn building
        this.load.spritesheet('fantasy_outside_a2', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/tilesets/Fantasy_Outside_A2.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_outside_a4', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/tilesets/Fantasy_Outside_A4.png', {
            frameWidth: 24,
            frameHeight: 24
        });

        // Winlu exterior remaster character/object assets for spawn building
        this.load.spritesheet('big_decoration', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!$Big_Decoration.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('diagonal_walls_top', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!diagonal_walls_top.png', {
            frameWidth: 24,
            frameHeight: 24
        });
        this.load.spritesheet('big_drawbridge', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!$Big_drawbridge.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('flags_banner', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Flags_banner.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('signs', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Signs.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('statue', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Statue.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('fantasy_chest', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Fantasy_chest.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('decoration_vegetation', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Decoration_vegetation.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('decoration', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Decoration.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('smith', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!$Smith.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('waterwheel', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!$Waterwheel.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('lamp', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!lamp.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('roof_windows', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Roof_Windows.png', {
            frameWidth: 24,
            frameHeight: 24
        });
        this.load.spritesheet('fantasy_switches', 'assets/Winlu exterior remaster/Winlu Fantasy Exterior/characters/!Fantasy_switches.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // Load spawn point building - LDtk map (small file, load in preload)
        this.load.json('spawnMapLDtk', 'assets/spawnpointbuilding.ldtk');

        // Load blackjack table background
        this.load.image('blackjack_table', 'assets/casino/blackjack.png');

        // Load blackjack sounds
        this.load.audio('carddeal', 'assets/casino/carddeal.mp3');
        this.load.audio('cardshuffle', 'assets/casino/cardshuffle.mp3');
        this.load.audio('cardwin', 'assets/casino/cardwin.mp3');
        this.load.audio('cardlose', 'assets/casino/cardlose.mp3');

        // Load playing cards for blackjack (white border version)
        this.load.image('card_back', 'assets/casino/Pixel Playing Cards Pack/Pixel Playing Cards Pack/back_red_basic_white.png');

        // Load all 52 playing cards (white border versions)
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

        suits.forEach(suit => {
            values.forEach(value => {
                const cardKey = `${value}_${suit}`;
                const cardPath = `assets/casino/Pixel Playing Cards Pack/Pixel Playing Cards Pack/${value}_${suit}_white.png`;
                this.load.image(cardKey, cardPath);
            });
        });

        // Don't load biome chunks in preload - they're huge and slow down initial load
        // They'll be loaded on-demand when first needed
        // this.load.json('emberChunk1', 'assets/ldtk/biomes/Ember Wilds/chunk1.ldtk');
        // this.load.json('emberChunk2', 'assets/ldtk/biomes/Ember Wilds/chunk1.ldtk');
        // this.load.json('emberChunk3', 'assets/ldtk/biomes/Ember Wilds/chunk1.ldtk');
        // this.load.json('darkForestChunk1', 'assets/ldtk/biomes/Dark Forest/chunk1.ldtk');

        // OLD Tiled version (disabled)
        // this.load.tilemapTiledJSON('spawnMap', 'assets/spawnpointbuilding.tmj');

        // Load town LDtk map (optional)
        // this.load.json('townLDtk', 'assets/town.ldtk');

        // Load town tilesets (48x48 tiles)
        // DISABLED: These files don't exist yet - uncomment when you add them
        // this.load.spritesheet('fantasy_roofs', 'assets/Fantasy Exterior - Other Engines/Fantasy_Roofs.png', {
        //     frameWidth: 48,
        //     frameHeight: 48
        // });
        // this.load.spritesheet('fantasy_outside_b', 'assets/Fantasy Exterior - Other Engines/Fantasy_Outside_B.png', {
        //     frameWidth: 48,
        //     frameHeight: 48
        // });
        // this.load.spritesheet('roof_center', 'assets/Fantasy Exterior - Other Engines/Objects/!$Roof_center.png', {
        //     frameWidth: 48,
        //     frameHeight: 48
        // });

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
    }

    async create() {
        // Register networkManager in game registry for global access
        this.game.registry.set('networkManager', networkManager);

        // Register mobile optimizer with this scene
        if (typeof mobileOptimizer !== 'undefined') {
            mobileOptimizer.setGameScene(this);
        }

        // Initialize controller manager
        this.input.gamepad.start();
        this.controllerManager = new ControllerManager(this);

        // Listen for window resize to update UI positions
        this.scale.on('resize', (gameSize) => {
            if (this.cameras && this.cameras.main) {
                this.cameras.main.setSize(gameSize.width, gameSize.height);

                // Update render distances for ultra-wide support
                this.updateRenderDistances(gameSize.width, gameSize.height);

                // Resize blue atmosphere overlay
                if (this.blueAtmosphereOverlay) {
                    this.blueAtmosphereOverlay.setSize(gameSize.width * 2, gameSize.height * 2);
                }

                // Reposition UI elements
                if (this.modernHUD && this.modernHUD.repositionUI) {
                    this.modernHUD.repositionUI();
                }
                if (this.inventoryUI && this.inventoryUI.repositionUI) {
                    this.inventoryUI.repositionUI();
                }
                if (this.abilityManager && this.abilityManager.repositionUI) {
                    this.abilityManager.repositionUI();
                }
            }
        });

        // Show loading message
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.loadingText = this.add.text(width / 2, height / 2, 'Joining game...', {
            font: '24px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);

        // Setup network listeners FIRST (before game:start, so minion:spawned is ready)
        this.setupNetworkListeners();

        // Wait for game:start event (instant join - no lobby)
        networkManager.on('game:start', async (data) => {
            this.gameData = data;
            await this.initializeGame();
            // Request skill restoration from server
            networkManager.requestSkillRestore();
        });

        // Setup skill restoration listener
        networkManager.on('skills:restored', (data) => {
            this.restorePlayerSkills(data);
        });

        // If gameData already exists (from init) and has gameState, initialize immediately
        if (this.gameData && this.gameData.gameState) {
            await this.initializeGame();
            // Request skill restoration from server
            networkManager.requestSkillRestore();
        }
    }

    async initializeGame() {
        // Hide CRT scanline overlay when game is active
        document.body.classList.add('game-active');

        // Remove loading text
        if (this.loadingText) {
            this.loadingText.destroy();
        }

        // Add atmospheric visual effects
        this.createAtmosphericEffects();

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

        // Initialize tree collision array
        this.treeCollisions = [];
        this.treeSprites = [];

        // Create world setup first (sets up camera bounds)
        const world = this.gameData.world;
        const tileSize = GameConfig.GAME.TILE_SIZE;
        this.worldSeed = world.seed;
        this.worldSize = world.size;
        this.cachedNumericSeed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Set world bounds
        const worldPixelWidth = world.size * tileSize;
        const worldPixelHeight = world.size * tileSize;
        this.physics.world.setBounds(0, 0, worldPixelWidth, worldPixelHeight);
        this.cameras.main.setBounds(0, 0, worldPixelWidth, worldPixelHeight);

        // Initialize BiomeChunkSystem with world seed
        this.biomeChunks = new BiomeChunkSystem(this, this.worldSeed);
        this.renderedDecorations = new Map();
        this.MAX_DECORATIONS = 500; // PERFORMANCE: Limit total decorations to prevent FPS drops

        // OBJECT POOLING: Initialize decoration pools to reduce garbage collection
        this.decorationPools = {
            // Green biome decorations
            tree: [],
            magic_tree: [],
            dead_tree: [],
            rock: [],
            bush: [],
            flower: [],
            grass: [],
            log: [],
            tree_stump: [],
            rune_stone: [],
            skull: [],
            baby_tree: [],
            hollow_trunk: [],
            flower_patch: [],
            // Red biome decorations
            red_tree: [],
            red_flower: [],
            red_grass: [],
            red_bush: [],
            red_mushroom: [],
            red_log: [],
            red_stone: [],
            red_stump: [],
            red_trunk: [],
            red_baby_tree: [],
            red_flower_patch: []
        };
        this.MAX_POOL_SIZE = 500; // Limit pool size to prevent memory bloat

        // Calculate initial render distances based on camera size (supports ultra-wide monitors)
        const initialWidth = this.cameras.main.width;
        const initialHeight = this.cameras.main.height;
        this.updateRenderDistances(initialWidth, initialHeight);

        const spawnX = (world.size / 2) * tileSize;
        const spawnY = (world.size / 2) * tileSize;

        // Show loading screen
        this.showLoadingScreen();

        // Initialize BiomeChunkSystem - preload only chunks near spawn (11x11 grid = 121 chunks)
        await this.biomeChunks.preloadNearSpawn(spawnX, spawnY, 5);

        // Notify LoadingScene that chunks are loaded
        if (this.loadingScene) {
            console.log('📢 Notifying LoadingScene that chunks are loaded');
            this.loadingScene.finishLoading();
        }

        // Decorations are now generated on-demand when chunks load (no precalculation needed)

        // Show loading screen briefly to ensure everything is ready
        const loadingDuration = 500; // 0.5 seconds after chunks are loaded
        console.log(`⏱️ Loading screen will show for ${Math.round(loadingDuration/1000)} seconds...`);

        // Wait for loading duration, then transition to game
        setTimeout(() => {
            console.log(`✅ Loading complete - transitioning to game`);
            this.hideLoadingScreen();
            this.continueGameInitialization();
        }, loadingDuration);

        // STOP HERE - don't continue until preload completes
        return;
    }

    continueGameInitialization() {
        // Enhance spawn point with visuals
        this.createSpawnPoint();

        // Create local player - use gameData.player directly (has authoritative data including souls)
        const myData = this.gameData.player || this.gameData.players.find(p => p.id === networkManager.currentPlayer.id);
        if (myData) {
            this.localPlayer = new Player(this, myData, true);

            // Smooth camera with dead zone
            this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.08, 0.08); // Smoother lerp
            this.cameras.main.setDeadzone(100, 80); // Dead zone: 100px wide, 80px tall

            // Add chunk5 collision to local player if it exists (OPTIMIZED: use group instead of individual bodies)
            if (this.chunk5CollisionGroup) {
                this.physics.add.collider(this.localPlayer.sprite, this.chunk5CollisionGroup);
                console.log(`🧱 Added chunk5 collision to local player (O(1) optimization)`);
            }

            // Initialize off-screen player indicators
            this.playerIndicators = {};

            // Set character's default auto-attack if available
            const characterDef = CHARACTERS[myData.class.toUpperCase()];
            if (characterDef && characterDef.autoAttack) {
                this.localPlayer.autoAttackConfig = characterDef.autoAttack;
            }

            // Load character's full stats from character definition (overrides server stats)
            if (characterDef && characterDef.stats && characterDef.stats.base) {
                // Merge character-specific stats with server stats
                this.localPlayer.stats = {
                    ...this.localPlayer.stats,
                    ...characterDef.stats.base
                };
                console.log(`✅ Loaded ${myData.class} stats:`, this.localPlayer.stats);
            }

            // Load character's default abilities from character definition
            if (characterDef && characterDef.abilities) {
                if (!this.localPlayer.abilities) {
                    this.localPlayer.abilities = {};
                }
                Object.keys(characterDef.abilities).forEach(key => {
                    this.localPlayer.abilities[key] = characterDef.abilities[key];
                });
            }

            // Initialize Ally Manager (detects nearby players for co-op abilities)
            this.allyManager = new AllyManager(this);

            // Initialize Pet Manager (manages pet companions)
            this.petManager = new PetManager(this, this.localPlayer);
            // Players must buy pets from the Pet Merchant

            // Initialize character build and unlock starting ability (delayed slightly to ensure everything is initialized)
            this.time.delayedCall(500, () => {
                try {
                    if (!this.localPlayer) {
                        console.error('❌ localPlayer not initialized');
                        return;
                    }


                    // Apply character's starting build (e.g., Bone Commander for Malachar)
                    this.applyCharacterBuild(this.localPlayer);

                    // Unlock starting ability (E at level 1 for Malachar)
                    this.time.delayedCall(500, () => {
                        this.checkAndUnlockAbilities(this.localPlayer, 1);

                        // Force UI update
                        if (this.abilityManager) {
                            this.abilityManager.updateCooldownUI();
                        }
                    });
                } catch (error) {
                    console.error('❌ Error in character initialization:', error);
                }
            });

            // Send initial position immediately (PIXEL coordinates for smooth movement)
            const pixelPos = {
                x: Math.round(this.localPlayer.sprite.x),
                y: Math.round(this.localPlayer.sprite.y)
            };
            networkManager.movePlayer(pixelPos);

            // Minions are now spawned via applyCharacterBuild() system

            // Show skill selector immediately at level 1 for path selection
            if (myData.level === 1) {
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

                // Load character's full stats from character definition
                const otherCharDef = CHARACTERS[playerData.class.toUpperCase()];
                if (otherCharDef && otherCharDef.stats && otherCharDef.stats.base) {
                    otherPlayer.stats = {
                        ...otherPlayer.stats,
                        ...otherCharDef.stats.base
                    };
                }

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

                // Add spawn building collision to other player
                if (this.spawnCollisionBodies) {
                    this.spawnCollisionBodies.forEach(body => {
                        this.physics.add.collider(otherPlayer.sprite, body);
                    });
                }

                // Initialize passive skills if the player has any
                if (playerData.passiveSkills && playerData.passiveSkills.length > 0) {
                    otherPlayer.passiveSkills = new PassiveSkills(this, otherPlayer);
                    playerData.passiveSkills.forEach(skillId => {
                        otherPlayer.passiveSkills.addSkill(skillId, false);
                    });
                }

                // Minions are now spawned via applyCharacterBuild() system
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
        }

        // Add spawn building collision to player
        if (this.localPlayer && this.spawnCollisionBodies) {
            this.spawnCollisionBodies.forEach(body => {
                this.physics.add.collider(this.localPlayer.sprite, body);
            });
        }

        // Create enemies
        this.gameData.gameState.enemies.forEach(enemyData => {
            if (enemyData.type === 'wolf') {
                // Skip dead sword demons from initial game state
                if (enemyData.isAlive === false) {
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
            } else if (enemyData.type === 'minotaur') {
                // Skip dead minotaurs from initial game state
                if (enemyData.isAlive === false) {
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
            } else if (enemyData.type === 'mushroom') {
                // Skip dead mushrooms from initial game state
                if (enemyData.isAlive === false) {
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
            } else if (enemyData.type === 'emberclaw') {
                // Skip dead emberclaws from initial game state
                if (enemyData.isAlive === false) {
                    return;
                }

                const emberclaw = new Emberclaw(this, enemyData);
                this.emberclaws[enemyData.id] = emberclaw;

                // Emberclaws fly - no collision needed
            } else {
                console.warn(`⚠️ Unknown enemy type "${enemyData.type}" for enemy ${enemyData.id} - skipping`);
            }
        });


        // Create items
        if (this.gameData.gameState.items) {
            // Handle items whether they come as an array, object, or Map
            const itemsArray = Array.isArray(this.gameData.gameState.items)
                ? this.gameData.gameState.items
                : Object.values(this.gameData.gameState.items);

            itemsArray.forEach(itemData => {
                this.items[itemData.id] = new Item(this, itemData);
            });
        }

        // Create existing minions from other players
        if (this.gameData.minions && this.gameData.minions.length > 0) {
            this.gameData.minions.forEach(minionData => {
                // Don't spawn our own minions (they'll be spawned by our own commands)
                if (minionData.ownerId !== networkManager.currentPlayer.id) {
                    // Position from server is now in PIXEL coordinates (already converted)
                    const x = minionData.position.x;
                    const y = minionData.position.y;
                    this.spawnMinion(x, y, minionData.ownerId, minionData.isPermanent, minionData.id);
                }
            });
        }

        // Setup UI
        this.createUI();

        // Create blue atmospheric overlay for eerie/scary vibe
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.blueAtmosphereOverlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x4488ff, 0.3);
        this.blueAtmosphereOverlay.setOrigin(0, 0);
        this.blueAtmosphereOverlay.setScrollFactor(0); // Fixed to camera
        this.blueAtmosphereOverlay.setDepth(97000); // Below roof overlay and UI, above game world
        this.blueAtmosphereOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY); // Multiply blend for color tint effect

        // Create dark overlay for when player is under roof (blackout rest of world)
        this.roofDarkOverlay = this.add.graphics();
        this.roofDarkOverlay.fillStyle(0x000000, 1); // Black, full opacity
        this.roofDarkOverlay.fillRect(0, 0, width, height); // Fill entire screen
        this.roofDarkOverlay.setScrollFactor(0); // Fixed to camera
        this.roofDarkOverlay.setDepth(98000); // Below UI (99000) but above game world
        this.roofDarkOverlay.setAlpha(0); // Start invisible

        // Setup controls
        this.setupControls();

        // Setup ambient particles
        this.setupAmbientParticles();

        // Network listeners already set up at the beginning of create()
    }


    showLoadingScreen() {

        // HIDE THE LOBBY SCREEN FIRST!
        const lobbyScreen = document.getElementById('lobbyScreen');
        const startScreen = document.getElementById('startScreen');
        if (lobbyScreen) {
            lobbyScreen.style.display = 'none';
        }
        if (startScreen) {
            startScreen.style.display = 'none';
        }

        // Create DOM overlay on top of canvas
        this.loadingDiv = document.createElement('div');
        this.loadingDiv.id = 'chunk-loading-overlay';
        this.loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000000;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Press Start 2P', monospace;
            pointer-events: none;
            overflow: hidden;
        `;

        this.loadingDiv.innerHTML = `
            <!-- Animated gradient background -->
            <div style="
                position: absolute;
                width: 200%;
                height: 200%;
                background: radial-gradient(ellipse at center, #1a0f2e 0%, #0a0515 40%, #000000 70%);
                animation: bgPulse 8s ease-in-out infinite;
            "></div>

            <!-- Scanline effect -->
            <div style="
                position: absolute;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    0deg,
                    rgba(0, 0, 0, 0.15),
                    rgba(0, 0, 0, 0.15) 1px,
                    transparent 1px,
                    transparent 2px
                );
                pointer-events: none;
                opacity: 0.3;
            "></div>

            <!-- Dynamic particle field -->
            <div style="position: absolute; width: 100%; height: 100%; overflow: hidden;">
                <div class="orb" style="position: absolute; top: 15%; left: 10%; width: 100px; height: 100px; background: radial-gradient(circle, rgba(0,255,0,0.15) 0%, transparent 70%); border-radius: 50%; animation: orbFloat1 8s ease-in-out infinite;"></div>
                <div class="orb" style="position: absolute; top: 60%; left: 75%; width: 80px; height: 80px; background: radial-gradient(circle, rgba(0,255,0,0.1) 0%, transparent 70%); border-radius: 50%; animation: orbFloat2 10s ease-in-out infinite;"></div>
                <div class="orb" style="position: absolute; top: 80%; left: 20%; width: 60px; height: 60px; background: radial-gradient(circle, rgba(0,255,0,0.12) 0%, transparent 70%); border-radius: 50%; animation: orbFloat3 7s ease-in-out infinite;"></div>
            </div>

            <!-- Floating particles -->
            <div style="position: absolute; width: 100%; height: 100%; overflow: hidden; opacity: 0.2;">
                ${Array.from({length: 20}, (_, i) => `
                    <div style="
                        position: absolute;
                        top: ${Math.random() * 100}%;
                        left: ${Math.random() * 100}%;
                        width: ${1 + Math.random() * 2}px;
                        height: ${1 + Math.random() * 2}px;
                        background: #00ff00;
                        border-radius: 50%;
                        animation: particleFloat ${3 + Math.random() * 4}s ease-in-out infinite;
                        animation-delay: ${Math.random() * 2}s;
                    "></div>
                `).join('')}
            </div>

            <div style="text-align: center; position: relative; z-index: 10;">
                <!-- Corner decorations -->
                <div style="position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 600px; height: 2px; background: linear-gradient(90deg, transparent, rgba(0,255,0,0.3), transparent);"></div>

                <!-- Main Logo Container with Glow -->
                <div style="
                    margin-bottom: 100px;
                    position: relative;
                ">
                    <!-- Outer glow ring -->
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 550px;
                        height: 550px;
                        border: 1px solid rgba(0, 255, 0, 0.1);
                        border-radius: 50%;
                        animation: ringPulse 3s ease-in-out infinite;
                    "></div>

                    <!-- Logo with effects -->
                    <div style="
                        animation: logoEntrance 2s cubic-bezier(0.34, 1.56, 0.64, 1);
                        position: relative;
                    ">
                        <img src="assets/logo.png" style="
                            max-width: 550px;
                            height: auto;
                            filter: drop-shadow(0 0 60px rgba(0, 255, 0, 0.4));
                            animation: logoFloat 4s ease-in-out infinite, logoBreath 3s ease-in-out infinite;
                        " alt="Klyra Logo">
                    </div>

                    <!-- Light rays -->
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 600px;
                        height: 600px;
                        background: conic-gradient(from 0deg, transparent 0deg 10deg, rgba(0,255,0,0.03) 10deg 20deg);
                        border-radius: 50%;
                        animation: rayRotate 20s linear infinite;
                        pointer-events: none;
                    "></div>
                </div>

                <!-- Elegant multi-line divider -->
                <div style="margin-bottom: 50px;">
                    <div style="width: 450px; height: 1px; background: linear-gradient(90deg, transparent, #00ff00, transparent); margin: 0 auto 8px auto; opacity: 0.6;"></div>
                    <div style="width: 400px; height: 1px; background: linear-gradient(90deg, transparent, #00ff00, transparent); margin: 0 auto; opacity: 0.3;"></div>
                </div>

                <!-- Progress container with depth -->
                <div style="margin-bottom: 40px; padding: 0 20px;">
                    <!-- Progress bar background -->
                    <div style="
                        width: 600px;
                        height: 6px;
                        background: rgba(0, 255, 0, 0.05);
                        border-radius: 3px;
                        margin: 0 auto;
                        position: relative;
                        overflow: hidden;
                        box-shadow:
                            inset 0 1px 3px rgba(0, 0, 0, 0.5),
                            0 0 20px rgba(0, 255, 0, 0.1);
                        border: 1px solid rgba(0, 255, 0, 0.1);
                    ">
                        <!-- Progress fill -->
                        <div id="loading-bar-fill" style="
                            width: 0%;
                            height: 100%;
                            background: linear-gradient(90deg, #00ff00 0%, #00ff88 50%, #00ff00 100%);
                            box-shadow:
                                0 0 30px rgba(0, 255, 0, 0.8),
                                0 0 60px rgba(0, 255, 0, 0.4),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                            transition: width 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
                            position: relative;
                        ">
                            <!-- Animated shine -->
                            <div style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(90deg,
                                    transparent 0%,
                                    rgba(255,255,255,0.8) 50%,
                                    transparent 100%
                                );
                                animation: progressShine 2.5s ease-in-out infinite;
                            "></div>
                        </div>
                    </div>
                </div>

                <!-- Percentage with enhanced styling -->
                <div id="loading-percent" style="
                    font-size: 32px;
                    color: #00ff00;
                    margin-bottom: 25px;
                    text-shadow:
                        0 0 10px rgba(0, 255, 0, 1),
                        0 0 20px rgba(0, 255, 0, 0.8),
                        0 0 40px rgba(0, 255, 0, 0.6),
                        0 0 80px rgba(0, 255, 0, 0.3);
                    letter-spacing: 6px;
                    font-weight: bold;
                    animation: percentGlow 2s ease-in-out infinite;
                ">
                    0%
                </div>

                <!-- Status text with icon -->
                <div id="loading-progress" style="
                    font-size: 10px;
                    color: #999999;
                    letter-spacing: 3px;
                    animation: statusPulse 2s ease-in-out infinite;
                    text-transform: uppercase;
                    position: relative;
                ">
                    <span style="display: inline-block; animation: dotPulse 1.5s infinite;">⬢</span>
                    <span id="status-text">Initializing</span>
                    <span style="display: inline-block; animation: dotPulse 1.5s infinite 0.5s;">⬢</span>
                </div>

                <!-- Bottom decoration -->
                <div style="position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%); width: 500px; height: 2px; background: linear-gradient(90deg, transparent, rgba(0,255,0,0.3), transparent);"></div>
            </div>

            <style>
                @keyframes logoEntrance {
                    0% {
                        opacity: 0;
                        transform: scale(0.5) translateY(50px);
                        filter: blur(10px);
                    }
                    60% {
                        transform: scale(1.05) translateY(0);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                        filter: blur(0px);
                    }
                }

                @keyframes logoFloat {
                    0%, 100% {
                        transform: translateY(0px) scale(1);
                    }
                    50% {
                        transform: translateY(-20px) scale(1.02);
                    }
                }

                @keyframes logoBreath {
                    0%, 100% {
                        filter: drop-shadow(0 0 40px rgba(0, 255, 0, 0.3));
                    }
                    50% {
                        filter: drop-shadow(0 0 70px rgba(0, 255, 0, 0.6));
                    }
                }

                @keyframes ringPulse {
                    0%, 100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.3;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.1);
                        opacity: 0.6;
                    }
                }

                @keyframes rayRotate {
                    from {
                        transform: translate(-50%, -50%) rotate(0deg);
                    }
                    to {
                        transform: translate(-50%, -50%) rotate(360deg);
                    }
                }

                @keyframes bgPulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 0.8;
                    }
                }

                @keyframes orbFloat1 {
                    0%, 100% {
                        transform: translate(0, 0);
                    }
                    33% {
                        transform: translate(30px, -40px);
                    }
                    66% {
                        transform: translate(-20px, 30px);
                    }
                }

                @keyframes orbFloat2 {
                    0%, 100% {
                        transform: translate(0, 0);
                    }
                    33% {
                        transform: translate(-40px, 30px);
                    }
                    66% {
                        transform: translate(20px, -20px);
                    }
                }

                @keyframes orbFloat3 {
                    0%, 100% {
                        transform: translate(0, 0);
                    }
                    33% {
                        transform: translate(25px, 35px);
                    }
                    66% {
                        transform: translate(-30px, -25px);
                    }
                }

                @keyframes particleFloat {
                    0% {
                        transform: translateY(0) translateX(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-100px) translateX(20px);
                        opacity: 0;
                    }
                }

                @keyframes statusPulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }

                @keyframes dotPulse {
                    0%, 100% {
                        opacity: 0.3;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.3);
                    }
                }

                @keyframes progressShine {
                    0% {
                        transform: translateX(-200%);
                    }
                    100% {
                        transform: translateX(300%);
                    }
                }

                @keyframes percentGlow {
                    0%, 100% {
                        text-shadow:
                            0 0 10px rgba(0, 255, 0, 1),
                            0 0 20px rgba(0, 255, 0, 0.8),
                            0 0 40px rgba(0, 255, 0, 0.6),
                            0 0 80px rgba(0, 255, 0, 0.3);
                    }
                    50% {
                        text-shadow:
                            0 0 15px rgba(0, 255, 0, 1),
                            0 0 30px rgba(0, 255, 0, 1),
                            0 0 60px rgba(0, 255, 0, 0.8),
                            0 0 120px rgba(0, 255, 0, 0.5);
                    }
                }
            </style>
        `;

        document.body.appendChild(this.loadingDiv);

        // Track when loading started for minimum duration
        this.loadingStartTime = Date.now();
    }

    updateLoadingProgress(current, total) {
        const percent = Math.floor((current / total) * 100);
        const progressEl = document.getElementById('loading-progress');
        const percentEl = document.getElementById('loading-percent');
        const barFill = document.getElementById('loading-bar-fill');

        // Update progress bar width
        if (barFill) {
            barFill.style.width = `${percent}%`;
        }

        // Update percentage text
        if (percentEl) {
            percentEl.textContent = `${percent}%`;
        }

        // Update status text with different messages based on progress
        const statusTextEl = document.getElementById('status-text');
        if (statusTextEl) {
            if (percent < 20) {
                statusTextEl.textContent = 'Awakening the realm';
            } else if (percent < 40) {
                statusTextEl.textContent = 'Forging landscapes';
            } else if (percent < 60) {
                statusTextEl.textContent = 'Summoning creatures';
            } else if (percent < 80) {
                statusTextEl.textContent = 'Weaving magic';
            } else if (percent < 95) {
                statusTextEl.textContent = 'Preparing your destiny';
            } else {
                statusTextEl.textContent = 'Welcome, warrior';
            }
        }
    }

    hideLoadingScreen() {
        if (!this.loadingDiv) {
            console.warn('⚠️ loadingDiv not found');
            return;
        }

        // Check if loadingDiv is in DOM
        if (!this.loadingDiv.parentNode) {
            console.warn('⚠️ loadingDiv was never appended to DOM!');
            this.loadingDiv = null;
            return;
        }

        console.log(`⏱️ Hiding loading screen...`);

        // Fade out animation
        this.loadingDiv.style.transition = 'opacity 1s ease-out';
        this.loadingDiv.style.opacity = '0';

        setTimeout(() => {
            if (this.loadingDiv && this.loadingDiv.parentNode) {
                this.loadingDiv.parentNode.removeChild(this.loadingDiv);
                this.loadingDiv = null;
                console.log('✅ Loading screen removed');
            }
        }, 1000);
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
        const seed = this.cachedNumericSeed;

        // Calculate randomized biome distribution once per world seed
        if (!this.biomeDistribution) {
            this.biomeDistribution = {
                green: 0,
                darkGreen: 0.5, // 50% Dark Forest
                // Everything else (50%) is red/Ember Wilds
            };

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
            this.debugChunks.add(chunkKey);
        }

        // Select tile variation (12 variations per biome)
        const tileVariation = Math.floor(this.seededRandom(seed + x * 100 + y) * selectedBiome.tiles.length);
        const tileId = selectedBiome.tiles[tileVariation];

        // DEBUG: Log first 10 tiles to verify chunk system
        if (!this.debugTileCount) this.debugTileCount = 0;
        if (this.debugTileCount < 10) {
            const tileMapping = this.BIOME_TILESET_MAP[tileId];
            this.debugTileCount++;
        }

        // Store biome for decoration generation
        if (!this.biomeCache) this.biomeCache = {};
        this.biomeCache[`${x},${y}`] = selectedBiome.id;

        return tileId;
    }

    /**
     * Render an LDtk chunk - selects appropriate biome chunk based on position
     */
    renderLDtkChunkIfNeeded(chunkX, chunkY) {
        const chunkKey = `${chunkX},${chunkY}`;

        // Skip if already rendered or currently loading
        if (this.renderedChunks.has(chunkKey)) {
            return;
        }

        // Initialize loading tracker
        if (!this.loadingChunks) {
            this.loadingChunks = new Set();
        }

        // Skip if already loading
        if (this.loadingChunks.has(chunkKey)) {
            return;
        }

        // Use chunk coordinates to deterministically select biome and chunk variant
        const seed = this.cachedNumericSeed;

        // Determine biome for this chunk using smooth noise for coherent biome regions
        // Use smooth noise to create large coherent biome regions
        // Scale of 3.0 means biomes change every ~3 chunks
        const biomeNoise = this.smoothNoise(chunkX, chunkY, 3.0, seed);

        // Initialize biome distribution if not already done
        if (!this.biomeDistribution) {
            this.biomeDistribution = {
                darkGreen: 0.5, // 50% Dark Forest, 50% Ember Wilds
            };
        }

        // Determine biome using noise value (creates coherent regions)
        // Only two biomes: Dark Forest and Ember Wilds
        let biome;
        if (biomeNoise < this.biomeDistribution.darkGreen) {
            biome = 'dark_green';
        } else {
            biome = 'red'; // Ember Wilds
        }

        // Debug: Log biome selection for ALL chunks

        // Select chunk variant based on biome
        let chunkDataKey;
        let chunkIndex;
        let biomeName;

        if (biome === 'dark_green') {
            // Dark Forest biome - 3 chunk variants
            const chunkSeed = seed + chunkX * 7919 + chunkY * 6563;
            const chunkRandom = this.seededRandom(chunkSeed);

            if (chunkRandom < 0.33) {
                chunkDataKey = 'darkForestChunk1';
                chunkIndex = 1;
            } else if (chunkRandom < 0.66) {
                chunkDataKey = 'darkForestChunk2';
                chunkIndex = 2;
            } else {
                chunkDataKey = 'darkForestChunk3';
                chunkIndex = 3;
            }
            biomeName = 'Dark Forest';
        } else {
            // Ember Wilds biome (red) - 2 chunk variants
            const chunkSeed = seed + chunkX * 7919 + chunkY * 6563;
            const chunkRandom = this.seededRandom(chunkSeed);

            if (chunkRandom < 0.5) {
                chunkDataKey = 'emberChunk1';
                chunkIndex = 1;
            } else {
                chunkDataKey = 'emberChunk2';
                chunkIndex = 2;
            }
            biomeName = 'Ember Wilds';
        }

        // Check if chunk data is loaded, if not load it on-demand
        if (!this.cache.json.exists(chunkDataKey)) {

            // Mark this chunk as loading to prevent duplicate requests
            this.loadingChunks.add(chunkKey);

            // Determine file path based on chunk key
            let filePath;
            if (chunkDataKey.startsWith('darkForest')) {
                // Dark Forest chunks: chunk1, chunk2, chunk3
                filePath = `assets/ldtk/biomes/Dark Forest/chunk${chunkIndex}.ldtk`;
            } else {
                // Ember Wilds chunks: chunk1, chunk2
                filePath = `assets/ldtk/biomes/Ember Wilds/chunk${chunkIndex}.ldtk`;
            }

            // Load the file asynchronously
            fetch(filePath)
                .then(response => response.json())
                .then(data => {
                    this.cache.json.add(chunkDataKey, data);
                    // Remove from loading set
                    this.loadingChunks.delete(chunkKey);
                    // Try rendering again now that it's loaded
                    this.renderLDtkChunkIfNeeded(chunkX, chunkY);
                })
                .catch(err => {
                    console.error(`❌ Failed to load ${chunkDataKey}:`, err);
                    // Remove from loading set on error too
                    this.loadingChunks.delete(chunkKey);
                });
            return; // Exit and wait for async load
        }

        // Calculate world position for this chunk (in pixels)
        // World now uses 48px tiles to match LDtk chunks
        const tileSize = GameConfig.GAME.TILE_SIZE; // 48px
        const worldX = chunkX * this.LDTK_CHUNK_SIZE * tileSize;
        const worldY = chunkY * this.LDTK_CHUNK_SIZE * tileSize;


        // Load the LDtk chunk (use top-left positioning for chunks, not centered)
        const chunkData = this.loadLDtkMap(chunkDataKey, worldX, worldY, tileSize, true);

        if (chunkData) {
            // Set all chunk layers to render DEEP in the background (behind everything)
            chunkData.layers.forEach(layer => {
                if (layer.container) {
                    // Push layers to -200 range so they're behind spawn building (-100) and enemies (0+)
                    const newDepth = -200 + layer.depth;
                    layer.container.setDepth(newDepth);
                }
            });

            // Mark this chunk as rendered
            this.renderedChunks.set(chunkKey, {
                ldtkData: chunkData,
                chunkIndex: chunkIndex,
                biome: biomeName,
                position: { x: worldX, y: worldY }
            });

        } else {
            console.error(`❌ Failed to load ${biomeName} chunk${chunkIndex} at (${chunkX},${chunkY})`);
        }
    }

    // Generate decoration for tile (client-side procedural)
    getDecoration(x, y) {
        const seed = this.cachedNumericSeed;
        const decoSeed = seed + x * 7919 + y * 6563; // Prime numbers for distribution
        const decoChance = this.seededRandom(decoSeed);

        // Check if this tile is in chunk5 (no decorations in chunk5)
        if (this.biomeChunks) {
            const chunkX = Math.floor(x / 37); // 37 tiles per chunk
            const chunkY = Math.floor(y / 37);
            const chunkKey = `${chunkX},${chunkY}`;
            const chunk = this.biomeChunks.loadedChunks.get(chunkKey);

            if (chunk && chunk.chunkKey === 'darkForestChunk5') {
                return null; // No decorations in chunk5 (NPC building)
            }
        }

        // Initialize biome cache if not exists
        if (!this.biomeCache) {
            this.biomeCache = {};
        }

        // Get biome for this tile using the new BiomeChunkSystem
        let biome = this.biomeCache[`${x},${y}`];
        if (!biome) {
            const biomeName = this.biomeChunks.getBiomeAtTile(x, y);
            // Convert biome name to old format for decoration logic
            biome = biomeName === 'dark_forest' ? 'dark_green' : 'red';
            this.biomeCache[`${x},${y}`] = biome;
        }

        // Decoration density
        let spawnChance;
        if (biome === 'dark_green') {
            spawnChance = 0.06; // 6% - Dark Forest decorations (reduced from 12% for performance)
        } else if (biome === 'red') {
            spawnChance = 0.06; // 6% - Ember Wilds decorations (reduced from 12% for performance)
        } else {
            return null; // No decorations for unknown biomes
        }

        if (decoChance > spawnChance) return null;

        const rand = this.seededRandom(decoSeed + 1000);

        let decorationType;

        // Check for flower patches in Ember Wilds
        if (biome === 'red' && rand < 0.08) {
            return 'red_flower_patch';
        }

        if (biome === 'dark_green') {
            // Dark Green: forest with good tree coverage - randomly use green or red decor
            // Use chunk coordinates to determine decor color variant (consistent per chunk)
            const tileSize = GameConfig.GAME.TILE_SIZE;
            const chunkSize = 16; // tiles per chunk
            const chunkX = Math.floor(x / chunkSize);
            const chunkY = Math.floor(y / chunkSize);
            const chunkSeed = seed + chunkX * 5003 + chunkY * 9001;
            const chunkRand = this.seededRandom(chunkSeed);
            const useRedDecor = chunkRand < 0.5; // 50% chance for red, 50% for green

            if (useRedDecor) {
                // Red variant decorations
                if (rand < 0.30) decorationType = 'red_tree';           // 30% - more trees
                else if (rand < 0.50) decorationType = 'red_bush';      // 20%
                else if (rand < 0.70) decorationType = 'red_log';       // 20%
                else if (rand < 0.85) decorationType = 'red_stump';     // 15%
                else decorationType = 'red_grass';                      // 15%
            } else {
                // Green variant decorations
                if (rand < 0.30) decorationType = 'tree';           // 30% - more trees
                else if (rand < 0.50) decorationType = 'bush';      // 20%
                else if (rand < 0.70) decorationType = 'log';       // 20%
                else if (rand < 0.85) decorationType = 'tree_stump'; // 15%
                else decorationType = 'grass';                      // 15%
            }
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

    /**
     * REMOVED: preloadAllDecorations() - was pre-calculating 1M tiles (1000x1000) at startup
     * Decorations are now generated on-demand in updateVisibleDecorations() using getDecoration()
     * This saves 3-5 seconds of startup time and ~15MB of memory
     */

    updateRenderDistances(width, height) {
        const tileSize = GameConfig.GAME.TILE_SIZE;

        // Calculate how many tiles fit on screen, then add buffer for off-screen rendering
        // Add 8 extra tiles as buffer to ensure decorations render well off-screen
        const tilesVisibleX = Math.ceil(width / 2 / tileSize);
        const tilesVisibleY = Math.ceil(height / 2 / tileSize);

        this.RENDER_DISTANCE_X = tilesVisibleX + 8;
        this.RENDER_DISTANCE_Y = tilesVisibleY + 8;

        console.log(`🖥️ Render distances updated for ${width}x${height}: X=${this.RENDER_DISTANCE_X} tiles, Y=${this.RENDER_DISTANCE_Y} tiles`);
    }

    updateVisibleDecorations() {
        if (!this.worldSeed || !this.localPlayer) return;

        const tileSize = GameConfig.GAME.TILE_SIZE;
        const playerTileX = Math.floor(this.localPlayer.sprite.x / tileSize);
        const playerTileY = Math.floor(this.localPlayer.sprite.y / tileSize);

        // Track if player moved to new tile
        const isFirstUpdate = !this.lastPlayerTileX;
        const playerMovedTile = playerTileX !== this.lastPlayerTileX || playerTileY !== this.lastPlayerTileY;

        // PERFORMANCE FIX: Only run cleanup when player moves OR every 2 frames
        // This balances cleanup frequency with performance (optimized for faster cleanup)
        if (!this.cleanupFrameCounter) this.cleanupFrameCounter = 0;
        this.cleanupFrameCounter++;

        const shouldRunCleanup = isFirstUpdate || playerMovedTile || (this.cleanupFrameCounter >= 2);
        const shouldRenderNewDecorations = isFirstUpdate || playerMovedTile;

        if (shouldRunCleanup) {
            this.cleanupFrameCounter = 0;
        } else {
            // Skip this update entirely - no cleanup, no rendering needed
            return;
        }

        this.lastPlayerTileX = playerTileX;
        this.lastPlayerTileY = playerTileY;

        // PERFORMANCE: Debug logging disabled (enable only when needed)

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

        // PERFORMANCE: Clean up decorations far from player (critical for FPS)
        // Decorations despawn only when well off-screen to prevent pop-out
        const DECORATION_CLEANUP_DISTANCE_X = this.RENDER_DISTANCE_X * 2.0; // Despawn much further off-screen
        const DECORATION_CLEANUP_DISTANCE_Y = this.RENDER_DISTANCE_Y * 2.0; // Despawn much further off-screen

        // PERFORMANCE: Use for...of instead of forEach, parse coordinates manually
        for (const [key, sprites] of this.renderedDecorations) {
            // Parse coordinates without creating arrays
            const commaIndex = key.indexOf(',');
            const x = parseInt(key.substring(0, commaIndex));
            const y = parseInt(key.substring(commaIndex + 1));
            const distX = Math.abs(x - playerTileX);
            const distY = Math.abs(y - playerTileY);

            if (distX > DECORATION_CLEANUP_DISTANCE_X || distY > DECORATION_CLEANUP_DISTANCE_Y) {
                // OBJECT POOLING: Return sprites to pool instead of destroying (use for...of here too)
                for (const sprite of sprites) {
                    if (sprite) {
                        this.returnToPool(sprite);
                    }
                }
                this.renderedDecorations.delete(key);
            }
        }

        // Chunk cleanup is now handled by BiomeChunkSystem

        // Procedural decoration generation ON TOP of LDtk chunks
        // PERFORMANCE: Only render new decorations when player moves to new tile
        if (shouldRenderNewDecorations) {
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    // PERFORMANCE: Limit total decorations to prevent memory/FPS issues
                    if (this.renderedDecorations.size >= this.MAX_DECORATIONS) {
                        break; // Stop rendering if limit reached
                    }

                    const key = `${x},${y}`;

                    // Skip if decoration already rendered
                    if (this.renderedDecorations.has(key)) continue;

                    // Skip spawn building area
                    if (Math.abs(x - worldCenterTileX) < spawnMargin &&
                        Math.abs(y - worldCenterTileY) < spawnMargin) {
                        continue;
                    }

                    // Get decoration type for this tile
                    const decorationType = this.getDecoration(x, y);

                    if (decorationType) {
                        const sprites = this.renderDecoration(x, y, decorationType);
                        if (sprites && sprites.length > 0) {
                            this.renderedDecorations.set(key, sprites);
                        }
                    }
                }

                // PERFORMANCE: Break outer loop too if limit reached
                if (this.renderedDecorations.size >= this.MAX_DECORATIONS) {
                    break;
                }
            }
        }
    }

    seededRandom(seed) {
        // Simple seeded random using sin (stateless)
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Smooth noise function for biome generation (creates coherent regions)
    smoothNoise(x, y, scale, seed) {
        // Scale down coordinates to create larger features
        const scaledX = x / scale;
        const scaledY = y / scale;

        // Get integer coordinates
        const x0 = Math.floor(scaledX);
        const y0 = Math.floor(scaledY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        // Get fractional parts for interpolation
        const fx = scaledX - x0;
        const fy = scaledY - y0;

        // Smooth interpolation (smoothstep)
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);

        // Get random values at corners
        const v00 = this.seededRandom(seed + x0 * 7919 + y0 * 6563);
        const v10 = this.seededRandom(seed + x1 * 7919 + y0 * 6563);
        const v01 = this.seededRandom(seed + x0 * 7919 + y1 * 6563);
        const v11 = this.seededRandom(seed + x1 * 7919 + y1 * 6563);

        // Bilinear interpolation
        const top = v00 * (1 - sx) + v10 * sx;
        const bottom = v01 * (1 - sx) + v11 * sx;
        return top * (1 - sy) + bottom * sy;
    }

    updatePlayerIndicators() {
        if (!this.localPlayer || !this.localPlayer.spriteRenderer || !this.localPlayer.spriteRenderer.sprite) return;

        const camera = this.cameras.main;
        const screenWidth = camera.width;
        const screenHeight = camera.height;
        const padding = 30; // Distance from screen edge

        // Check each other player
        // PERFORMANCE: Iterate without creating new array
        for (const playerId in this.otherPlayers) {
            const player = this.otherPlayers[playerId];
            if (!player || !player.spriteRenderer || !player.spriteRenderer.sprite) {
                // Clean up indicator if player is gone
                if (this.playerIndicators[playerId]) {
                    this.playerIndicators[playerId].destroy();
                    delete this.playerIndicators[playerId];
                }
                return;
            }

            // Skip indicators for bots (don't show green arrows for bot Aldrics)
            if (player.data && player.data.isBot) {
                continue;
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
        }

        // Clean up indicators for players that no longer exist or are bots
        // PERFORMANCE: Iterate without creating new array
        for (const playerId in this.playerIndicators) {
            const player = this.otherPlayers[playerId];
            if (!player || (player.data && player.data.isBot)) {
                this.playerIndicators[playerId].destroy();
                delete this.playerIndicators[playerId];
            }
        }
    }

    /**
     * OBJECT POOLING: Get sprite from pool or create new one
     * Reduces garbage collection by reusing sprites instead of destroying them
     */
    getFromPool(decorationType, textureKey, frame) {
        const pool = this.decorationPools[decorationType];
        if (!pool || pool.length === 0) return null;

        // Get inactive sprite from pool
        const sprite = pool.pop();

        // Update texture and frame if needed
        if (textureKey) {
            sprite.setTexture(textureKey, frame);
        }

        return sprite;
    }

    /**
     * OBJECT POOLING: Return sprite to pool instead of destroying
     * Sprites are hidden and stored for later reuse
     */
    returnToPool(sprite) {
        if (!sprite || !sprite.poolType) {
            // Not a pooled sprite, destroy it normally
            if (sprite && sprite.destroy) {
                sprite.destroy();
            }
            return;
        }

        // Return to pool instead of destroying
        sprite.setActive(false);
        sprite.setVisible(false);

        // Reset properties to default state for reuse
        sprite.setScale(1);
        sprite.setRotation(0);
        sprite.setTint(0xffffff);
        sprite.setAlpha(1);

        const pool = this.decorationPools[sprite.poolType];
        if (pool && pool.length < this.MAX_POOL_SIZE) {
            pool.push(sprite);
        } else {
            // Pool is full or doesn't exist, destroy sprite
            sprite.destroy();
        }
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
        const seed = this.cachedNumericSeed;
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

            // Calculate tree depth based on bottom of tree (collision position + tileSize)
            // This will be the same for all tiles in the tree for proper Y-sorting
            // We'll update this once we find the collision tile, then apply to all sprites
            let treeDepth = py; // Default to tree base position

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

                    // OBJECT POOLING: Try to get sprite from pool, create new if pool is empty
                    let tileSprite = this.getFromPool(type, 'objects_d', tileFrame);
                    if (!tileSprite) {
                        tileSprite = this.add.sprite(0, 0, 'objects_d', tileFrame);
                        tileSprite.poolType = type; // Track which pool this sprite belongs to
                    }
                    tileSprite.setPosition(tilePx, tilePy);
                    tileSprite.setOrigin(0, 0);
                    tileSprite.setScale(scale);
                    tileSprite.setActive(true);
                    tileSprite.setVisible(true);
                    // Depth will be set after we find collision tile

                    // Don't add to tileContainer - add directly to scene for proper depth sorting
                    treeGroup.push(tileSprite);

                    // Add collision on specific tile
                    if (tileFrame === collisionTile) {
                        collisionY = tilePy;  // Top of the collision tile for depth sorting
                        treeDepth = collisionY + tileSize; // Bottom of collision tile = tree's ground position

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

            // Set depth for all tree tiles based on the tree's ground position
            // This ensures the entire tree (including top foliage) is sorted based on trunk position
            treeGroup.forEach(sprite => {
                sprite.setDepth(treeDepth);
            });

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
            const seed = this.cachedNumericSeed;
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

            // Calculate tree depth based on bottom of tree (collision position + tileSize)
            // This will be the same for all tiles in the tree for proper Y-sorting
            let treeDepth = py; // Default to tree base position

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

                    // OBJECT POOLING: Try to get sprite from pool, create new if pool is empty
                    let tileSprite = this.getFromPool('red_tree', 'red_trees', tileFrame);
                    if (!tileSprite) {
                        tileSprite = this.add.sprite(0, 0, 'red_trees', tileFrame);
                        tileSprite.poolType = 'red_tree'; // Track which pool this sprite belongs to
                    }
                    tileSprite.setPosition(tilePx, tilePy);
                    tileSprite.setOrigin(0, 0);
                    tileSprite.setScale(scale);
                    tileSprite.setActive(true);
                    tileSprite.setVisible(true);
                    // Depth will be set after we find collision tile

                    treeGroup.push(tileSprite);

                    // Add collision on the specified tile
                    if (row === collisionRow && col === collisionCol) {
                        collisionY = tilePy;
                        treeDepth = collisionY + tileSize; // Bottom of collision tile = tree's ground position

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

            // Set depth for all tree tiles based on the tree's ground position
            // This ensures the entire tree (including top foliage) is sorted based on trunk position
            treeGroup.forEach(sprite => {
                sprite.setDepth(treeDepth);
            });

            // Store red tree sprites
            this.treeSprites.push({
                sprites: treeGroup,
                collisionY: collisionY
            });

            // PERFORMANCE: Add to allSprites for cleanup
            allSprites.push(...treeGroup);

        } else if (type === 'flower_patch') {
            // FLOWER PATCH - Large cluster of flowers (green biome)
            const scale = tileSize / 48;
            const seed = this.cachedNumericSeed;
            const patchSeed = seed + x * 5003 + y * 7007;

            // Flower variants for patch
            const FLOWER_VARIANTS = [
                { frames: [12], scale: 0.7 },      // Red flower one
                { frames: [136], scale: 0.7 },     // Red flower two
                { frames: [137], scale: 0.7 },     // Blue flower one
                { frames: [138], scale: 0.7 },     // Blue flower two
                { frames: [139], scale: 0.7 },     // Blue flower three
                { frames: [140], scale: 0.7 },     // Cyan flower one
                { frames: [141], scale: 0.7 }      // Cyan flower two
            ];

            // Generate 6-12 flowers in a cluster around this position
            const numFlowers = 6 + Math.floor(this.seededRandom(patchSeed) * 7); // 6-12 flowers

            for (let i = 0; i < numFlowers; i++) {
                // Each flower gets its own position offset
                const flowerSeed = patchSeed + i * 1009;
                const offsetX = (this.seededRandom(flowerSeed) - 0.5) * tileSize * 2; // ±1 tile
                const offsetY = (this.seededRandom(flowerSeed + 1) - 0.5) * tileSize * 2;

                // Select random flower variant
                const variantIndex = Math.floor(this.seededRandom(flowerSeed + 2) * FLOWER_VARIANTS.length);
                const variant = FLOWER_VARIANTS[variantIndex];

                const flowerX = px + offsetX;
                const flowerY = py + offsetY;

                // OBJECT POOLING: Try to get sprite from pool, create new if pool is empty
                let flower = this.getFromPool('flower_patch', 'objects_d', variant.frames[0]);
                if (!flower) {
                    flower = this.add.sprite(0, 0, 'objects_d', variant.frames[0]);
                    flower.poolType = 'flower_patch'; // Track which pool this sprite belongs to
                }
                flower.setPosition(flowerX, flowerY);
                flower.setOrigin(0, 0);
                flower.setScale(scale * variant.scale);
                flower.setActive(true);
                flower.setVisible(true);
                flower.setDepth(flowerY + tileSize);
                // Decorations are added directly to scene, not to a container
                allSprites.push(flower);
            }

        } else if (type === 'red_flower_patch') {
            // RED FLOWER PATCH - Large cluster of red flowers (red biome)
            const scale = tileSize / 48;
            const seed = this.cachedNumericSeed;
            const patchSeed = seed + x * 5003 + y * 7007;

            // Red flower variants for patch
            const RED_FLOWER_VARIANTS = [
                { frames: [120], scale: 0.7 },   // Red flowers 1
                { frames: [136], scale: 0.7 },   // Red flowers 2
                { frames: [124], scale: 0.7 },   // Red tulip 1
                { frames: [125], scale: 0.7 }    // Red tulip 2
            ];

            // Generate 6-12 flowers in a cluster around this position
            const numFlowers = 6 + Math.floor(this.seededRandom(patchSeed) * 7); // 6-12 flowers

            for (let i = 0; i < numFlowers; i++) {
                // Each flower gets its own position offset
                const flowerSeed = patchSeed + i * 1009;
                const offsetX = (this.seededRandom(flowerSeed) - 0.5) * tileSize * 2; // ±1 tile
                const offsetY = (this.seededRandom(flowerSeed + 1) - 0.5) * tileSize * 2;

                // Select random flower variant
                const variantIndex = Math.floor(this.seededRandom(flowerSeed + 2) * RED_FLOWER_VARIANTS.length);
                const variant = RED_FLOWER_VARIANTS[variantIndex];

                const flowerX = px + offsetX;
                const flowerY = py + offsetY;

                // OBJECT POOLING: Try to get sprite from pool, create new if pool is empty
                let flower = this.getFromPool('red_flower_patch', 'red_decorations', variant.frames[0]);
                if (!flower) {
                    flower = this.add.sprite(0, 0, 'red_decorations', variant.frames[0]);
                    flower.poolType = 'red_flower_patch'; // Track which pool this sprite belongs to
                }
                flower.setPosition(flowerX, flowerY);
                flower.setOrigin(0, 0);
                flower.setScale(scale * variant.scale);
                flower.setActive(true);
                flower.setVisible(true);
                flower.setDepth(flowerY + tileSize);
                // Decorations are added directly to scene, not to a container
                allSprites.push(flower);
            }

        } else if (type === 'red_flower' || type === 'red_grass' || type === 'red_bush' ||
                   type === 'red_mushroom' || type === 'red_log' || type === 'red_stone' ||
                   type === 'red_stump' || type === 'red_trunk' || type === 'red_baby_tree') {
            // RED BIOME DECORATIONS from Fantasy_Outside_D_red.png
            const scale = tileSize / 48;
            const seed = this.cachedNumericSeed;
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

                // OBJECT POOLING: Try to get sprite from pool, create new if pool is empty
                let sprite = this.getFromPool(type, 'red_decorations', frame);
                if (!sprite) {
                    sprite = this.add.sprite(0, 0, 'red_decorations', frame);
                    sprite.poolType = type; // Track which pool this sprite belongs to
                }
                sprite.setPosition(tilePx, tilePy);
                sprite.setOrigin(0, 0);
                sprite.setScale(scale * variant.scale);
                sprite.setActive(true);
                sprite.setVisible(true);
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
                // Single tile - OBJECT POOLING
                let decoration = this.getFromPool(type, 'objects_d', frames[0]);
                if (!decoration) {
                    decoration = this.add.sprite(0, 0, 'objects_d', frames[0]);
                    decoration.poolType = type; // Track which pool this sprite belongs to
                }
                decoration.setPosition(px, py);
                decoration.setOrigin(0, 0);
                decoration.setScale(finalScale);
                decoration.setActive(true);
                decoration.setVisible(true);
                decoration.setDepth(py + tileSize);
                // Decorations are added directly to scene, not to a container
                allSprites.push(decoration); // PERFORMANCE: Track for cleanup

            } else if (frames.length === 2 && decoInfo.horizontal) {
                // Horizontal 1x2 (side by side) - OBJECT POOLING
                let sprite1 = this.getFromPool(type, 'objects_d', frames[0]);
                if (!sprite1) {
                    sprite1 = this.add.sprite(0, 0, 'objects_d', frames[0]);
                    sprite1.poolType = type; // Track which pool this sprite belongs to
                }
                sprite1.setPosition(px, py);
                sprite1.setOrigin(0, 0);
                sprite1.setScale(finalScale);
                sprite1.setActive(true);
                sprite1.setVisible(true);
                sprite1.setDepth(py + tileSize);
                // Decorations are added directly to scene, not to a container

                // Position sprite2 based on actual width of sprite1 to avoid gaps
                let sprite2 = this.getFromPool(type, 'objects_d', frames[1]);
                if (!sprite2) {
                    sprite2 = this.add.sprite(0, 0, 'objects_d', frames[1]);
                    sprite2.poolType = type; // Track which pool this sprite belongs to
                }
                sprite2.setPosition(px + sprite1.displayWidth, py);
                sprite2.setOrigin(0, 0);
                sprite2.setScale(finalScale);
                sprite2.setActive(true);
                sprite2.setVisible(true);
                sprite2.setDepth(py + tileSize);
                // Decorations are added directly to scene, not to a container

                allSprites.push(sprite1, sprite2); // PERFORMANCE: Track for cleanup

            } else if (frames.length === 2) {
                // Vertical 2x1 (stacked) - OBJECT POOLING
                let topSprite = this.getFromPool(type, 'objects_d', frames[0]);
                if (!topSprite) {
                    topSprite = this.add.sprite(0, 0, 'objects_d', frames[0]);
                    topSprite.poolType = type; // Track which pool this sprite belongs to
                }
                topSprite.setPosition(px, py);
                topSprite.setOrigin(0, 0);
                topSprite.setScale(finalScale);
                topSprite.setActive(true);
                topSprite.setVisible(true);
                topSprite.setDepth(py + tileSize * 2);
                // Decorations are added directly to scene, not to a container

                // Position bottomSprite based on actual height of topSprite to avoid gaps
                let bottomSprite = this.getFromPool(type, 'objects_d', frames[1]);
                if (!bottomSprite) {
                    bottomSprite = this.add.sprite(0, 0, 'objects_d', frames[1]);
                    bottomSprite.poolType = type; // Track which pool this sprite belongs to
                }
                bottomSprite.setPosition(px, py + topSprite.displayHeight);
                bottomSprite.setOrigin(0, 0);
                bottomSprite.setScale(finalScale);
                bottomSprite.setActive(true);
                bottomSprite.setVisible(true);
                bottomSprite.setDepth(py + tileSize * 2);
                // Decorations are added directly to scene, not to a container

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


        // Create particle texture if it doesn't exist
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);
            graphics.destroy();
        }

        // === LOAD LDTK MAP FOR SPAWN BUILDING ===

        const spawnMapData = this.loadLDtkMap('spawnMapLDtk', worldCenterX, worldCenterY, tileSize);

        if (spawnMapData) {

            // Store map data for later use
            this.spawnMapData = spawnMapData;

            // Set up collision with player (will be added later in setupPlayer)
            this.spawnCollisionBodies = spawnMapData.collisionBodies || [];

            // Store roof layers for transparency effect
            this.spawnRoofLayers = spawnMapData.roofLayers || [];

            // Process entities (doors, NPCs, etc.)
            spawnMapData.entities.forEach(entity => {

                // Handle door entities if you have them
                if (entity.identifier === 'Door') {
                    // Store door for interaction
                    if (!this.doorEntities) this.doorEntities = [];
                    this.doorEntities.push(entity);
                }
            });
        } else {
            console.error('❌ Failed to load LDtk spawn map!');
        }

        // === LOAD TOWN MAP (next to spawn building) ===
        // DISABLED: Switching to LDtk - will re-add later
        /*
        const townMap = this.make.tilemap({ key: 'townMap' });

        // Town is same size as spawn: 50x50 tiles
        const townWidthPx = 50 * tileSize;

        // Position town directly to the right of spawn building (no gap)
        const townOffsetX = mapOffsetX + mapWidthPx; // Start where spawn building ends
        const townOffsetY = mapOffsetY; // Same Y position as spawn building


        // Add tilesets in EXACT ORDER from town.tmj (order matters for tile ID mapping!)
        const townTilesets = [
            townMap.addTilesetImage('A2 - Terrain And Misc', 'terrain_misc'),           // firstgid 1
            townMap.addTilesetImage('A4 - Walls', 'walls'),                             // firstgid 2081
            townMap.addTilesetImage('Fantasy_Outside_A5', 'fantasy_outside_a5'),        // firstgid 2794
            townMap.addTilesetImage('A3 - Walls And Floors', 'walls_floors'),           // firstgid 2922
            townMap.addTilesetImage('Fantasy_Roofs', 'fantasy_roofs'),                  // firstgid 3434 ← ROOF TILES!
            townMap.addTilesetImage('Fantasy_Outside_B', 'fantasy_outside_b'),          // firstgid 3690
            townMap.addTilesetImage('!$Roof_center', 'roof_center'),                    // firstgid 3946
            townMap.addTilesetImage('A3 - Walls And Floors', 'walls_floors'),           // firstgid 4054 (duplicate)
            townMap.addTilesetImage('Fantasy_Roofs', 'fantasy_roofs'),                  // firstgid 4566 (duplicate)
            townMap.addTilesetImage('Fantasy_Roofs', 'fantasy_roofs'),                  // firstgid 4822 (duplicate)
            townMap.addTilesetImage('Fantasy_Outside_C', 'fantasy_outside_c')           // firstgid 5078
        ];


        // Create all layers from town map
        const townLayerNames = ['Ground', 'Paths', 'Walls', 'Roof1', 'Windows'];

        townLayerNames.forEach((layerName, index) => {
            const layer = townMap.createLayer(layerName, townTilesets, townOffsetX, townOffsetY);
            if (layer) {
                layer.setScale(scale);
                layer.setDepth(index); // Simple depth ordering

                // Check for collision property
                const collisionProp = layer.layer.properties?.find(p =>
                    (p.name === 'collision' || p.name === 'collides') && p.value === true
                );

                if (collisionProp) {
                    layer.setCollisionByExclusion([-1]);

                    if (!this.castleCollisionLayers) {
                        this.castleCollisionLayers = [];
                    }
                    this.castleCollisionLayers.push(layer);
                }

                // Check for roof property
                const roofProp = layer.layer.properties?.find(p =>
                    p.name === 'roof' && p.value === true
                );

                if (roofProp) {
                    layer.setDepth(5); // Roofs above walls and windows
                    if (!this.roofLayers) {
                        this.roofLayers = [];
                    }
                    this.roofLayers.push(layer);
                }
            } else {
                console.warn(`  ⚠️ Town layer not found: ${layerName}`);
            }
        });
        */
        // END DISABLED TOWN MAP

        // Spawn point from LDtk Spawn layer (grid 32,44 = pixel 1536,2112 in 2400x2400 map)
        // Map is centered at worldCenter, so offset is -1200, -1200
        const spawnX = worldCenterX + 336; // worldCenterX - 1200 + 1536
        const spawnY = worldCenterY + 912; // worldCenterY - 1200 + 2112

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

    }

    createUI() {
        // Create modern HUD system
        this.modernHUD = new ModernHUD(this, this.localPlayer);

        // Update username in HUD (in case it wasn't set during player creation)
        if (this.localPlayer && this.localPlayer.username) {
            this.modernHUD.updateUsername(this.localPlayer.username);
        }

        // Create inventory system (C key, hotbar 1-5)
        try {
            this.inventoryUI = new InventoryUI(this, this.localPlayer);

            // Always spawn with a health potion in slot 1
            this.inventoryUI.hotbar[0] = {
                type: 'health_potion',
                name: 'Health Potion'
            };
            this.inventoryUI.updateHotbarUI();
        } catch (error) {
            console.error('❌ Error creating InventoryUI:', error);
        }

        // Create skill selector system
        try {
            this.skillSelector = new SkillSelector(this);
        } catch (error) {
            console.error('❌ Error creating SkillSelector:', error);
        }

        // Create ability manager system (Q/E/R abilities)
        try {
            this.abilityManager = new AbilityManager(this, this.localPlayer);
        } catch (error) {
            console.error('❌ Error creating AbilityManager:', error);
        }

        // Create music system
        this.musicManager = new MusicManager(this);
        this.musicUI = new MusicUI(this, this.musicManager);

        // Create footstep manager
        this.footstepManager = new FootstepManager(this);

        // Start gameplay music
        this.musicManager.startGameplayMusic();

        // Create passive skills manager (attach to local player, not scene)
        this.localPlayer.passiveSkills = new PassiveSkills(this, this.localPlayer);
        // Keep scene-level reference for backward compatibility
        this.passiveSkills = this.localPlayer.passiveSkills;

        // Create merchant NPC at spawn
        this.createMerchantNPC();

        // Create skill shop NPC at spawn
        this.createSkillShopNPC();

        // Create banker NPC at spawn
        this.createBankerNPC();

        // Create pet merchant NPC at spawn
        this.createPetMerchantNPC();

        // Create pet storage NPC at spawn
        this.createPetStorageNPC();
    }

    createMerchantNPC() {
        // Try to spawn from LDtk spawn markers first
        const spawnPos = this.findNPCSpawnPoint('merchant');

        if (spawnPos) {
            this.merchantNPC = new MerchantNPC(this, spawnPos.x, spawnPos.y, 'Item Merchant');
            console.log('✅ Merchant spawned from LDtk at', spawnPos.x, spawnPos.y);
        } else {
            // Fallback to hardcoded position if not found in LDtk
            const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const merchantX = worldCenterX + 688;
            const merchantY = worldCenterY - 392;
            this.merchantNPC = new MerchantNPC(this, merchantX, merchantY, 'Item Merchant');
            console.log('⚠️ Merchant spawned at fallback position');
        }
    }

    createSkillShopNPC() {
        // Try to spawn from LDtk spawn markers first
        const spawnPos = this.findNPCSpawnPoint('skill_trader');

        if (spawnPos) {
            this.skillShopNPC = new SkillShopNPC(this, spawnPos.x, spawnPos.y, 'Skill Trader');
            console.log('✅ Skill Trader spawned from LDtk at', spawnPos.x, spawnPos.y);
        } else {
            // Fallback to hardcoded position if not found in LDtk
            const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const skillShopX = worldCenterX + 232;
            const skillShopY = worldCenterY - 392;
            this.skillShopNPC = new SkillShopNPC(this, skillShopX, skillShopY, 'Skill Trader');
            console.log('⚠️ Skill Trader spawned at fallback position');
        }
    }

    createBankerNPC() {
        // Try to spawn from LDtk spawn markers first
        const spawnPos = this.findNPCSpawnPoint('banker');

        if (spawnPos) {
            this.bankerNPC = new BankerNPC(this, spawnPos.x, spawnPos.y, 'Soul Banker');
            console.log('✅ Soul Banker spawned from LDtk at', spawnPos.x, spawnPos.y);
        } else {
            // Fallback to hardcoded position if not found in LDtk
            const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const bankerX = worldCenterX + 460; // Between merchant (688) and skill trader (232)
            const bankerY = worldCenterY - 392;
            this.bankerNPC = new BankerNPC(this, bankerX, bankerY, 'Soul Banker');
            console.log('⚠️ Soul Banker spawned at fallback position');
        }
    }

    createPetMerchantNPC() {
        // Try to spawn from LDtk spawn markers first
        const spawnPos = this.findNPCSpawnPoint('pet_merchant');

        if (spawnPos) {
            this.petMerchantNPC = new PetMerchantNPC(this, spawnPos.x, spawnPos.y, 'Pet Merchant');
            console.log('✅ Pet Merchant spawned from LDtk at', spawnPos.x, spawnPos.y);
        } else {
            // Fallback to hardcoded position if not found in LDtk
            const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const petMerchantX = worldCenterX + 0; // Center position
            const petMerchantY = worldCenterY - 392;
            this.petMerchantNPC = new PetMerchantNPC(this, petMerchantX, petMerchantY, 'Pet Merchant');
            console.log('⚠️ Pet Merchant spawned at fallback position');
        }

        // Create Blackjack Dealer NPC at spawn
        const dealerPos = this.findNPCSpawnPoint('blackjack_dealer');

        if (dealerPos) {
            this.blackjackDealerNPC = new BlackjackNPC(this, dealerPos.x, dealerPos.y, 'Dealer');
            console.log('✅ Blackjack Dealer spawned from LDtk at', dealerPos.x, dealerPos.y);
        } else {
            // Fallback position (near other NPCs)
            const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const dealerX = worldCenterX - 200;
            const dealerY = worldCenterY - 200;
            this.blackjackDealerNPC = new BlackjackNPC(this, dealerX, dealerY, 'Dealer');
            console.log('⚠️ Blackjack Dealer spawned at fallback position (add value 7 to NPC layer in LDtk)');
        }
    }

    createPetStorageNPC() {
        // Try to spawn from LDtk spawn markers first
        const spawnPos = this.findNPCSpawnPoint('pet_storage');

        if (spawnPos) {
            this.petStorageNPC = new PetStorageNPC(this, spawnPos.x, spawnPos.y, 'Pet Storage');
            console.log('✅ Pet Storage spawned from LDtk at', spawnPos.x, spawnPos.y);
        } else {
            // Fallback to hardcoded position if not found in LDtk
            const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
            const petStorageX = worldCenterX - 230;
            const petStorageY = worldCenterY - 392;
            this.petStorageNPC = new PetStorageNPC(this, petStorageX, petStorageY, 'Pet Storage');
            console.log('⚠️ Pet Storage spawned at fallback position (add value 8 to NPC layer in LDtk)');
        }
    }

    /**
     * Find NPC spawn point from LDtk IntGrid markers
     * @param {string} npcType - 'merchant' or 'skill_trader'
     * @returns {Object|null} {x, y} position or null if not found
     */
    findNPCSpawnPoint(npcType) {
        // IntGrid values we're looking for
        const NPC_MARKERS = {
            'merchant': 2,      // Value 2 in IntGrid = Item Merchant
            'skill_trader': 3,  // Value 3 in IntGrid = Skill Trader
            'banker': 4,        // Value 4 in IntGrid = Soul Banker
            'pet_merchant': 5,  // Value 5 in IntGrid = Pet Merchant
            'blackjack_dealer': 7, // Value 7 in IntGrid = Blackjack Dealer
            'pet_storage': 8    // Value 8 in IntGrid = Pet Storage
        };

        const markerValue = NPC_MARKERS[npcType];
        if (!markerValue) return null;

        // Load spawn map LDtk data
        const spawnMapData = this.cache.json.get('spawnMapLDtk');
        if (!spawnMapData || !spawnMapData.levels || spawnMapData.levels.length === 0) {
            console.warn('⚠️ Spawn map LDtk data not found');
            return null;
        }

        const level = spawnMapData.levels[0];

        // Find the NPC IntGrid layer specifically (not the Spawn layer)
        const spawnLayer = level.layerInstances?.find(layer =>
            layer.__type === 'IntGrid' &&
            layer.__identifier === 'NPC'
        );

        if (!spawnLayer) {
            // No IntGrid layer with NPC spawn markers - will use fallback position
            return null;
        }

        // Get world center where spawn building is located
        const worldCenterX = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;
        const worldCenterY = (this.gameData.world.size / 2) * GameConfig.GAME.TILE_SIZE;

        // Calculate spawn map offset (centered on world center)
        const mapWidth = level.pxWid;
        const mapHeight = level.pxHei;
        const offsetX = worldCenterX - (mapWidth / 2);
        const offsetY = worldCenterY - (mapHeight / 2);

        // Read IntGrid CSV data
        const intGrid = spawnLayer.intGridCsv;
        const gridWidth = spawnLayer.__cWid;
        const gridHeight = spawnLayer.__cHei;
        const tileSize = spawnLayer.__gridSize;

        // Find the marker in the grid
        for (let i = 0; i < intGrid.length; i++) {
            if (intGrid[i] === markerValue) {
                // Convert 1D index to 2D coordinates
                const gridX = i % gridWidth;
                const gridY = Math.floor(i / gridWidth);

                // Convert to world coordinates (center of tile)
                const worldX = offsetX + (gridX * tileSize) + (tileSize / 2);
                const worldY = offsetY + (gridY * tileSize) + (tileSize / 2);

                return { x: worldX, y: worldY };
            }
        }

        console.warn(`⚠️ Marker ${markerValue} not found in IntGrid for ${npcType}`);
        return null;
    }

    setupControls() {
        // Check if keyboard input is available
        if (!this.input || !this.input.keyboard) {
            console.warn('⚠️ Keyboard input not available in GameScene');
            return;
        }

        // Detect any keyboard input for UI switching (ignore mouse buttons)
        this.input.keyboard.on('keydown', (event) => {
            // Only switch to keyboard if it's an actual keyboard key (not a repeated event)
            if (this.controllerManager && !event.repeat) {
                this.controllerManager.detectKeyboardInput();
            }
        });

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
            // Don't use abilities if blackjack UI is open
            if (this.blackjackUIOpen) return;

            if (this.abilityManager) {
                this.abilityManager.useAbility('e');
            } else {
            }
        });

        this.keyR.on('down', () => {
            if (this.abilityManager) {
                this.abilityManager.useAbility('r');
            }
        });

        // F key for merchant interaction
        // F key for both merchant and skill shop interaction
        this.keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.keyF.on('down', () => {
            if (this.localPlayer) {
                const playerX = this.localPlayer.sprite.x;
                const playerY = this.localPlayer.sprite.y;

                // Check merchant NPC
                if (this.merchantNPC) {
                    const merchantInRange = this.merchantNPC.checkPlayerDistance(playerX, playerY);
                    if (merchantInRange) {
                        this.merchantNPC.toggleShop();
                        return; // Prioritize merchant if both are in range
                    }
                    // Close merchant shop if open (even when not in range)
                    if (this.merchantNPC.isShopOpen) {
                        this.merchantNPC.closeShop();
                    }
                }

                // Check skill shop NPC
                if (this.skillShopNPC) {
                    const skillShopInRange = this.skillShopNPC.checkPlayerDistance(playerX, playerY);
                    if (skillShopInRange) {
                        this.skillShopNPC.toggleShop();
                        return;
                    }
                    // Close skill shop if open (even when not in range)
                    if (this.skillShopNPC.isShopOpen) {
                        this.skillShopNPC.closeShop();
                    }
                }

                // Check banker NPC
                if (this.bankerNPC) {
                    const bankerInRange = this.bankerNPC.checkPlayerDistance(playerX, playerY);
                    if (bankerInRange) {
                        this.bankerNPC.toggleBank();
                        return;
                    }
                    // Close bank if open (even when not in range)
                    if (this.bankerNPC.isBankOpen) {
                        this.bankerNPC.closeBank();
                    }
                }

                // Check pet merchant NPC
                if (this.petMerchantNPC) {
                    const petMerchantInRange = this.petMerchantNPC.checkPlayerDistance(playerX, playerY);
                    if (petMerchantInRange) {
                        this.petMerchantNPC.toggleShop();
                        return;
                    }
                    // Close pet shop if open (even when not in range)
                    if (this.petMerchantNPC.isShopOpen) {
                        this.petMerchantNPC.closeShop();
                    }
                }

                // Check pet storage NPC
                if (this.petStorageNPC) {
                    const petStorageInRange = this.petStorageNPC.checkPlayerDistance(playerX, playerY);
                    if (petStorageInRange) {
                        this.petStorageNPC.toggleStorage();
                        return;
                    }
                    // Close pet storage if open (even when not in range)
                    if (this.petStorageNPC.isStorageOpen) {
                        this.petStorageNPC.closeStorage();
                    }
                }

                // Check blackjack dealer NPC
                if (this.blackjackDealerNPC) {
                    const dealerInRange = this.blackjackDealerNPC.checkPlayerDistance(playerX, playerY);
                    if (dealerInRange) {
                        this.blackjackDealerNPC.toggleGame();
                        return;
                    }
                    // Close blackjack if open (even when not in range)
                    if (this.blackjackDealerNPC.isGameOpen) {
                        this.blackjackDealerNPC.closeGame();
                    }
                }

                // Check chunk5 NPCs
                if (this.chunk5NPCs) {
                    for (const npc of this.chunk5NPCs) {
                        if (!npc) continue;

                        const npcInRange = npc.checkPlayerDistance(playerX, playerY);
                        if (npcInRange) {
                            // Toggle appropriate menu based on NPC type
                            if (npc.toggleShop) {
                                npc.toggleShop();
                            } else if (npc.toggleBank) {
                                npc.toggleBank();
                            }
                            return;
                        }
                        // Close NPC menu if open (even when not in range)
                        if (npc.isShopOpen) {
                            npc.closeShop();
                        } else if (npc.isBankOpen) {
                            npc.closeBank();
                        }
                    }
                }
            }
        });

        // Number keys for skill shop purchases
        this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.key1.on('down', () => {
            // Don't use skills if blackjack UI is open
            if (this.blackjackUIOpen) return;

            if (this.skillShopNPC) {
                this.skillShopNPC.tryPurchaseSkill('1');
            }
        });

        this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.key2.on('down', () => {
            // Don't use skills if blackjack UI is open
            if (this.blackjackUIOpen) return;

            if (this.skillShopNPC) {
                this.skillShopNPC.tryPurchaseSkill('2');
            }
        });

        this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
        this.key3.on('down', () => {
            // Don't use skills if blackjack UI is open
            if (this.blackjackUIOpen) return;

            if (this.skillShopNPC) {
                this.skillShopNPC.tryPurchaseSkill('3');
            }
        });

        this.key4 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
        this.key4.on('down', () => {
            // Don't use skills if blackjack UI is open
            if (this.blackjackUIOpen) return;

            if (this.skillShopNPC) {
                this.skillShopNPC.tryPurchaseSkill('4');
            }
        });

        // ESC key to close shops and blackjack
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keyESC.on('down', () => {
            if (this.merchantNPC && this.merchantNPC.isShopOpen) {
                this.merchantNPC.closeShop();
            }
            if (this.skillShopNPC && this.skillShopNPC.isShopOpen) {
                this.skillShopNPC.closeShop();
            }
            if (this.blackjackNPC && this.blackjackNPC.isGameOpen) {
                this.blackjackNPC.closeGame();
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

        // Particle spawn settings - PERFORMANCE OPTIMIZED
        this.particleSpawnRate = 200; // Spawn particle every 200ms
        this.maxAmbientParticles = 120; // Max particles on screen (reduced for better FPS)

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
        // PERFORMANCE: Iterate backwards and splice instead of filter (no array allocation)
        for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
            const particle = this.ambientParticles[i];
            if (!particle || !particle.sprite || !particle.sprite.scene) {
                this.ambientParticles.splice(i, 1);
            }
        }
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

    /**
     * Load an LDtk map file
     * @param {string} ldtkKey - The cache key for the loaded LDtk JSON
     * @param {number} worldCenterX - World center X position
     * @param {number} worldCenterY - World center Y position
     * @param {number} tileSize - Target tile size (default: 32)
     * @returns {Object} Map data with layers and entities
     */
    loadLDtkMap(ldtkKey, worldCenterX, worldCenterY, tileSize = 32, topLeft = false) {
        // Check if LDtkLoader is available
        if (typeof LDtkLoader === 'undefined') {
            console.error('❌ LDtkLoader not found! Make sure to include game/js/utils/LDtkLoader.js in index.html');
            return null;
        }

        // Get the cached LDtk JSON data
        const ldtkData = this.cache.json.get(ldtkKey);
        if (!ldtkData) {
            console.error(`❌ LDtk map "${ldtkKey}" not found in cache`);
            return null;
        }

        // Use static method to load the map
        const mapData = LDtkLoader.load(this, ldtkData, worldCenterX, worldCenterY, tileSize, topLeft);


        return mapData;
    }

    setupNetworkListeners() {
        // Store event handlers for cleanup
        this.networkHandlers = {};

        // Clear any existing listeners to prevent duplicates
        // This is critical when reconnecting with the same username
        const eventsToClear = [
            'player:joined', 'player:left', 'player:moved', 'player:changedMap', 'player:attacked',
            'player:damaged', 'player:levelup', 'player:died',
            'enemy:spawned', 'enemy:despawned', 'enemy:damaged', 'enemy:moved', 'enemies:moved:batch', 'enemy:killed',
            'minion:spawned', 'minion:moved', 'minion:died', 'minion:damaged', 'minion:healed',
            'item:spawned', 'item:collected', 'chat:message', 'passiveSkill:activated', 'piercingFireball:cast'
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

                // Load character's full stats from character definition
                const joinedCharDef = CHARACTERS[data.player.class.toUpperCase()];
                if (joinedCharDef && joinedCharDef.stats && joinedCharDef.stats.base) {
                    newPlayer.stats = {
                        ...newPlayer.stats,
                        ...joinedCharDef.stats.base
                    };
                }

                // Initialize map tracking (new players start on exterior)
                newPlayer.currentMap = data.player.currentMap || 'exterior';

                // Minions are now spawned via applyCharacterBuild() system

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

                // Add spawn building collision to new player
                if (this.spawnCollisionBodies) {
                    this.spawnCollisionBodies.forEach(body => {
                        this.physics.add.collider(newPlayer.sprite, body);
                    });
                }

                // Initialize passive skills if the player has any
                if (data.player.passiveSkills && data.player.passiveSkills.length > 0) {
                    newPlayer.passiveSkills = new PassiveSkills(this, newPlayer);
                    data.player.passiveSkills.forEach(skillId => {
                        newPlayer.passiveSkills.addSkill(skillId, false);
                    });
                }

                // Initialize pet if the player has one equipped
                if (data.player.activePet) {
                    this.spawnPetForOtherPlayer(newPlayer, data.player.activePet);
                }

                // Show join notification
                this.showPlayerNotification(`${data.player.username} joined the game`, '#00ff00');
            }
        });

        // Player update (e.g., currency changed from blackjack)
        networkManager.on('player:update', (data) => {
            // Update local player currency/souls
            if (data.id === networkManager.socket.id && this.localPlayer) {
                if (data.currency !== undefined) {
                    this.localPlayer.currency = data.currency;
                    this.modernHUD.updateCurrency(data.currency);
                    console.log(`💰 Your currency updated to: ${data.currency}`);
                }
                if (data.souls !== undefined) {
                    this.localPlayer.souls = data.souls;
                    console.log(`💰 Your souls updated to: ${data.souls}`);
                }
            }
        });

        // Player left
        networkManager.on('player:left', (data) => {

            const player = this.otherPlayers[data.playerId];
            if (player) {
                // Show leave notification
                this.showPlayerNotification(`${data.username} left the game`, '#ff6666');

                // Clean up pet if player has one
                if (player.petManager) {
                    player.petManager.destroy();
                    player.petManager = null;
                }

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
            }
        });

        // Player equipped pet
        networkManager.on('player:petEquipped', (data) => {
            const player = this.otherPlayers[data.playerId];
            if (player) {
                this.spawnPetForOtherPlayer(player, data.petType);
            }
        });

        // Player unequipped pet
        networkManager.on('player:petUnequipped', (data) => {
            const player = this.otherPlayers[data.playerId];
            if (player && player.petManager) {
                player.petManager.destroy();
                player.petManager = null;
            }
        });

        // Pet position/state update from other player
        networkManager.on('pet:updated', (data) => {
            const player = this.otherPlayers[data.playerId];
            if (player && player.petManager) {
                player.petManager.applyRemoteUpdate(data);
            }
        });

        // Player attacked
        networkManager.on('player:attacked', (data) => {
            // IMPORTANT: Only handle attacks from OTHER players/bots, not local player
            // Local player attacks are handled directly by AbilityManager

            // Safety check: NEVER process attacks from our own player ID
            if (!data.playerId || data.playerId === networkManager.currentPlayer?.id) {
                return; // Skip - this is us or invalid
            }

            // ONLY look in otherPlayers - NEVER touch localPlayer
            const player = this.otherPlayers[data.playerId];

            if (player && player.spriteRenderer && player.spriteRenderer.sprite) {
                // DO NOT call playAttackAnimation() - it broadcasts to network!
                // Instead, directly play the animation on the sprite
                const characterClass = player.data?.class || 'kelise';
                let attackAnimKey = `${characterClass.toLowerCase()}_attack`;

                // For Aldric, use attack variations
                if (characterClass === 'aldric') {
                    const variants = ['aldric_attack', 'aldric_attack2', 'aldric_attack3'];
                    attackAnimKey = variants[Math.floor(Math.random() * variants.length)];
                }

                // Play animation directly without broadcasting
                if (this.anims.exists(attackAnimKey)) {
                    player.spriteRenderer.sprite.play(attackAnimKey);
                }

                // Aldric uses sword hit/miss sounds in Player.js autoAttackEnemy()

                // Show attack effect
                this.showAttackEffect(data.position);
            }
        });

        // Player died
        networkManager.on('player:died', (data) => {
            // Handle other players dying (don't report to server, just animate)
            const player = this.otherPlayers[data.playerId];
            if (player) {
                player.playDeathAnimationOnly();
            }

            // Handle local player death (server says we died)
            if (data.playerId === networkManager.currentPlayer.id && this.localPlayer) {

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

                // Remove all pets on death (must buy again)
                if (this.petManager) {
                    this.petManager.removeAllPets();
                }

                // Clear skill selector state
                if (this.skillSelector) {
                    this.skillSelector.selectedSkills = [];
                }

            }
        });

        // Player respawned after death
        networkManager.on('player:respawned', (data) => {

            if (data.playerId === networkManager.currentPlayer.id || data.id === networkManager.currentPlayer.id) {

                try {
                    // Restore player from server state
                    this.restorePlayerFromDeath(data);
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

                    // Kill any active tweens on visual targets to prevent fade conflicts
                    if (player.spriteRenderer) {
                        const targets = player.spriteRenderer.getVisualTargets();
                        targets.forEach(target => {
                            if (target) {
                                this.tweens.killTweensOf(target);
                                target.setAlpha(1);
                                target.setVisible(true);
                            }
                        });
                    }

                    // Also restore main sprite and UI
                    this.tweens.killTweensOf(player.sprite);
                    player.sprite.setAlpha(1);
                    player.sprite.setVisible(true);

                    if (player.ui) {
                        this.tweens.killTweensOf(player.ui);
                        player.ui.setAlpha(1);
                        player.ui.setVisible(true);
                    }

                    // Position is already in pixels
                    player.sprite.setPosition(data.position.x, data.position.y);

                    // Reset abilities for other players
                    player.abilities = {};
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

                    // Auto-unlock abilities at specific levels with notification
                    this.checkAndUnlockAbilities(player, data.level);
                }
            }
        });

        // Skill sound from other players
        networkManager.on('skill:sound', (data) => {
            if (!this.localPlayer || !this.localPlayer.sprite) return;

            const { playerId, soundKey, position } = data;

            // Calculate distance from local player to sound source
            const distance = Phaser.Math.Distance.Between(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y,
                position.x,
                position.y
            );

            // Max hearing distance (in pixels)
            const maxDistance = 800;

            if (distance < maxDistance) {
                // Calculate volume based on distance (1.0 at source, 0.0 at max distance)
                const volumeFactor = 1 - (distance / maxDistance);
                let baseVolume = 0.35; // Default base volume

                // Adjust base volume per sound type
                if (soundKey === 'meteor_explosion') {
                    baseVolume = 0.4;
                } else if (soundKey === 'piercing_inferno') {
                    baseVolume = 0.3;
                } else if (soundKey === 'piercing_inferno_cast') {
                    baseVolume = 0.35;
                }

                const volume = baseVolume * volumeFactor;

                // Play the sound
                if (this.sound && volume > 0.05) { // Only play if volume is above threshold
                    this.sound.play(soundKey, { volume: volume });
                }
            }
        });

        // Enemy spawned
        networkManager.on('enemy:spawned', (data) => {
            if (data.enemy.type === 'wolf') {
                // Skip dead sword demons
                if (data.enemy.isAlive === false) {
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
                    return;
                }

                const emberclaw = new Emberclaw(this, data.enemy);
                this.emberclaws[data.enemy.id] = emberclaw;

                // Emberclaws fly - no collision needed
            } else {
                console.warn(`⚠️ Unknown enemy type "${data.enemy.type}" for enemy ${data.enemy.id} - skipping spawn`);
            }
        });

        // DYNAMIC SPAWN SYSTEM: Enemy despawned (region became inactive)
        networkManager.on('enemy:despawned', (data) => {
            const swordDemon = this.swordDemons[data.enemyId];
            const minotaur = this.minotaurs[data.enemyId];
            const mushroom = this.mushrooms[data.enemyId];
            const emberclaw = this.emberclaws[data.enemyId];
            const enemy = this.enemies[data.enemyId];

            if (swordDemon) {
                swordDemon.destroy();
                delete this.swordDemons[data.enemyId];
            } else if (minotaur) {
                minotaur.destroy();
                delete this.minotaurs[data.enemyId];
            } else if (mushroom) {
                mushroom.destroy();
                delete this.mushrooms[data.enemyId];
            } else if (emberclaw) {
                emberclaw.destroy();
                delete this.emberclaws[data.enemyId];
            } else if (enemy) {
                enemy.destroy();
                delete this.enemies[data.enemyId];
            }
        });

        // Enemy damaged
        networkManager.on('enemy:damaged', (data) => {
            const enemy = this.enemies[data.enemyId] || this.swordDemons[data.enemyId] || this.minotaurs[data.enemyId] || this.mushrooms[data.enemyId] || this.emberclaws[data.enemyId];
            if (enemy) {
                // Pass visual options for damage numbers (isCrit, damageType, etc.)
                const visualOptions = {
                    isCrit: data.isCrit || false,
                    damageType: data.damageType || 'physical'
                };
                enemy.takeDamage(data.damage, visualOptions);
            }
        });

        // Enemy position updated (knockback from Aldric's attacks)
        networkManager.on('enemy:position', (data) => {
            const enemy = this.enemies[data.enemyId] || this.swordDemons[data.enemyId] || this.minotaurs[data.enemyId] || this.mushrooms[data.enemyId] || this.emberclaws[data.enemyId];
            if (enemy && enemy.setTargetPosition) {
                // Ignore position updates for dead enemies
                if (!enemy.isAlive) {
                    return;
                }

                // Position from server is in TILES, convert to pixels
                const tileSize = GameConfig.GAME.TILE_SIZE;
                const targetX = data.position.x * tileSize + tileSize / 2;
                const targetY = data.position.y * tileSize + tileSize / 2;


                // Update enemy's target position for smooth movement
                enemy.setTargetPosition(targetX, targetY);
            } else {
            }
        });

        // Minion spawned by another player
        networkManager.on('minion:spawned', (data) => {

            // Don't create if we already have this minion
            if (this.minions[data.minionId]) {
                return;
            }

            // Position from server is now in PIXEL coordinates (already converted)
            const x = data.position.x;
            const y = data.position.y;


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
            }

            if (minion && minion.sprite && minion.sprite.active) {
                // Position from server is now in PIXEL coordinates (already converted)
                const targetX = data.position.x;
                const targetY = data.position.y;

                // Apply animation state and sprite flip
                if (data.animationState && minion.sprite.anims) {
                    const currentAnim = minion.sprite.anims.currentAnim?.key;
                    const isPlaying = minion.sprite.anims.isPlaying;

                    // DEBUG: Log animation changes occasionally
                    if (Math.random() < 0.01) {
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
                }
            }
        });

        // Minion died (from server broadcast)
        networkManager.on('minion:died', (data) => {
            const minion = this.minions[data.minionId];
            if (minion && minion.sprite && minion.sprite.active) {
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

            // Silently ignore movement for non-existent or dead enemies
            if (!enemy) {
                return;
            }

            // Ignore movement if enemy is dead/dying
            if (enemy.isDead || enemy.isDying || !enemy.sprite || !enemy.sprite.active) {
                return;
            }

            if (enemy.sprite) {
                // Ignore position updates for dead enemies
                if (!enemy.isAlive) {
                    return;
                }

                // Server now sends pixel coordinates directly for smooth interpolation
                if (data.isPixelCoordinates) {
                    // New format: pixel coordinates, use directly
                    if (enemy.setTargetPosition) {
                        enemy.setTargetPosition(data.position.x, data.position.y);
                    } else if (enemy.moveToPosition) {
                        // Emberclaw still needs tile coordinates
                        const tileSize = GameConfig.GAME.TILE_SIZE;
                        const tileX = (data.position.x - tileSize / 2) / tileSize;
                        const tileY = (data.position.y - tileSize / 2) / tileSize;
                        enemy.moveToPosition({ x: tileX, y: tileY });
                    }
                } else {
                    // Old format: tile coordinates, convert to pixels (backward compatibility)
                    enemy.data.position = data.position;

                    if (enemy.moveToPosition) {
                        enemy.moveToPosition(data.position);
                    } else if (enemy.setTargetPosition) {
                        const tileSize = GameConfig.GAME.TILE_SIZE;
                        const targetX = data.position.x * tileSize + tileSize / 2;
                        const targetY = data.position.y * tileSize + tileSize / 2;
                        enemy.setTargetPosition(targetX, targetY);
                    }
                }
            }
        });

        // Player damaged by enemy
        networkManager.on('player:damaged', (data) => {
            if (data.playerId === networkManager.currentPlayer.id && this.localPlayer) {
                // CLIENT-SIDE VALIDATION: Verify enemy is actually close enough to attack
                // Only validate if we have position data AND the enemy exists
                if (data.attackerId && data.enemyPosition) {
                    // Use dynamic enemy finder
                    const attacker = this.findEnemyById(data.attackerId);

                    if (attacker && attacker.sprite) {
                        const TILE_SIZE = GameConfig.GAME.TILE_SIZE;
                        const MAX_ATTACK_RANGE_PIXELS = 96; // 3 tiles = 96 pixels (generous to account for latency)

                        // Get enemy position (either pixels or tiles)
                        let enemyPixelX, enemyPixelY;
                        if (data.isPixelCoordinates) {
                            // Already in pixels
                            enemyPixelX = data.enemyPosition.x;
                            enemyPixelY = data.enemyPosition.y;
                        } else {
                            // Convert from tiles to pixels
                            enemyPixelX = data.enemyPosition.x * TILE_SIZE + TILE_SIZE / 2;
                            enemyPixelY = data.enemyPosition.y * TILE_SIZE + TILE_SIZE / 2;
                        }

                        // Calculate distance between enemy and player
                        const dx = this.localPlayer.sprite.x - enemyPixelX;
                        const dy = this.localPlayer.sprite.y - enemyPixelY;
                        const distanceInPixels = Math.sqrt(dx * dx + dy * dy);

                        // If enemy is too far away, log warning and skip damage
                        if (distanceInPixels > MAX_ATTACK_RANGE_PIXELS) {
                            console.warn(`⚠️ Rejected attack from ${data.attackerId}: enemy at (${enemyPixelX.toFixed(1)}, ${enemyPixelY.toFixed(1)}) is ${distanceInPixels.toFixed(1)} pixels away (max: ${MAX_ATTACK_RANGE_PIXELS})`);
                            console.warn(`   Player at pixels (${this.localPlayer.sprite.x.toFixed(0)}, ${this.localPlayer.sprite.y.toFixed(0)})`);
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

                    // Vibrate controller on damage
                    if (this.controllerManager) {
                        this.controllerManager.vibrateDamage();
                    }
                } else {
                    // If server sent health increase (healing), apply directly
                    this.localPlayer.health = data.health;
                    this.localPlayer.ui.updateHealthBar();
                }

                // Show damage effect
                this.cameras.main.shake(100, 0.005);
            } else {
                // Update health bar for other players in multiplayer
                const otherPlayer = this.otherPlayers[data.playerId];
                if (otherPlayer) {
                    otherPlayer.health = data.health;
                    if (otherPlayer.ui && otherPlayer.ui.updateHealthBar) {
                        otherPlayer.ui.updateHealthBar();
                    }
                }
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

        // Player healed (health potions, Malachar healing, etc.)
        networkManager.on('player:healed', (data) => {
            console.log(`💚 Player healed event:`, data);

            if (data.playerId === networkManager.currentPlayer.id && this.localPlayer) {
                // Update local player health
                this.localPlayer.health = data.health;
                if (this.localPlayer.ui && this.localPlayer.ui.updateHealthBar) {
                    this.localPlayer.ui.updateHealthBar();
                }
            } else {
                // Update health bar for other players
                const otherPlayer = this.otherPlayers[data.playerId];
                if (otherPlayer) {
                    otherPlayer.health = data.health;
                    if (otherPlayer.ui && otherPlayer.ui.updateHealthBar) {
                        otherPlayer.ui.updateHealthBar();
                    }
                }
            }
        });

        // Malachar ability used
        networkManager.on('ability:used', (data) => {
            console.log(`📩 Received ability event:`, data);
            console.log(`   My ID: ${this.localPlayer?.data?.id}, Target ID: ${data.targetPlayerId}`);
            console.log(`   Match: ${data.targetPlayerId === this.localPlayer?.data?.id}`);

            // Handle auto-attack visual effects (Command Bolt, Aldric attacks, Kelise attacks, etc.)
            if (data.abilityKey === 'autoattack') {
                console.log(`⚔️ Auto-attack visual effect: ${data.abilityName}`);
                this.playAutoAttackVisual(data);
                return;
            }

            // Handle Pact of Bones visual effects for other players
            if (data.abilityName === 'Pact of Bones' && data.effects && data.effects.minions) {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.effects.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`💀 Pact of Bones visual effect from ${data.playerName}`);
                this.playPactOfBonesVisual(data.effects);
                return;
            }

            // Handle Battle Rush (dash) visual effects for other players
            if (data.effects && data.effects.type === 'dash') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`🏃 Battle Rush visual effect from ${data.playerName}`);
                this.playBattleRushVisual(data.effects, data.playerId);
                return;
            }

            // Handle Kelise Dash Strike visual effects for other players
            if (data.effects && data.effects.type === 'kelise_dash') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`⚔️ Kelise Dash Strike visual effect from ${data.playerName}`);
                this.playKeliseDashVisual(data.effects, data.playerId);
                return;
            }

            // Handle Orion Arrow Barrage visual effects for other players
            if (data.effects && data.effects.type === 'orion_arrow_barrage') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`🏹 Orion Arrow Barrage visual effect from ${data.playerName}`);
                this.playOrionArrowBarrageVisual(data.effects, data.playerId);
                return;
            }

            // Handle Orion Shadow Roll visual effects for other players
            if (data.effects && data.effects.type === 'orion_roll') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`🌀 Orion Shadow Roll visual effect from ${data.playerName}`);
                this.playOrionShadowRollVisual(data.effects, data.playerId);
                return;
            }

            // Handle Lunare Boomerang Star visual effects for other players
            if (data.effects && data.effects.type === 'lunare_boomerang') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`⭐ Lunare Boomerang Star visual effect from ${data.playerName}`);
                this.playLunareBoomerangVisual(data.effects, data.playerId);
                return;
            }

            // Handle Lunare Shadow Vortex visual effects for other players
            if (data.effects && data.effects.type === 'lunare_vortex') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`🌀 Lunare Shadow Vortex visual effect from ${data.playerName}`);
                this.playLunareShadowVortexVisual(data.effects, data.playerId);
                return;
            }

            // Handle Kelise Life Drain visual effects for other players
            if (data.effects && data.effects.type === 'life_drain') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`💀 Life Drain visual effect from ${data.playerName}`);
                this.playLifeDrainVisual(data.effects, data.playerId);
                return;
            }

            // Handle Kelise Blood Harvest visual effects for other players
            if (data.effects && data.effects.type === 'blood_harvest') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`🩸 Blood Harvest visual effect from ${data.playerName}`);
                this.playBloodHarvestVisual(data.effects, data.playerId);
                return;
            }

            // Handle Shockwave visual effects for other players
            if (data.effects && data.effects.type === 'shockwave') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                console.log(`🌊 Shockwave visual effect from ${data.playerName}`);
                this.playShockwaveVisual(data.effects);
                return;
            }

            // Handle Titan's Fury visual effects for other players
            if (data.effects && data.effects.type === 'war_cry_slam') {
                // Don't play visuals for the caster (they already see their own effects)
                if (data.playerId === this.localPlayer?.data?.id) {
                    return;
                }
                this.playTitansFuryVisual(data.effects, data.playerId);
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

        // Listen for vortex explosion effects
        networkManager.on('vortex:explode', (data) => {
            console.log(`💥 Vortex explosion effect at (${data.position.x}, ${data.position.y})`);

            // Large explosion flash
            const explosionFlash = this.add.circle(data.position.x, data.position.y, data.radius, 0xFF0000, 0.6);
            explosionFlash.setDepth(10);
            explosionFlash.setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: explosionFlash,
                scale: 1.3,
                alpha: 0,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => explosionFlash.destroy()
            });

            // Explosion particles
            for (let i = 0; i < 16; i++) {
                const angle = (Math.PI * 2 * i) / 16;
                const particle = this.add.circle(
                    data.position.x,
                    data.position.y,
                    6,
                    0xFF0000
                );
                particle.setDepth(10);
                particle.setBlendMode(Phaser.BlendModes.ADD);

                this.tweens.add({
                    targets: particle,
                    x: data.position.x + Math.cos(angle) * data.radius * 0.8,
                    y: data.position.y + Math.sin(angle) * data.radius * 0.8,
                    alpha: 0,
                    duration: 400,
                    ease: 'Cubic.easeOut',
                    onComplete: () => particle.destroy()
                });
            }
        });

        // Orb collection synchronization
        networkManager.on('orb:collected', (data) => {
            // console.log(`💎 CLIENT RECEIVED orb:collected:`, data);
            // console.log(`   My player ID: ${this.localPlayer?.data?.id}`);
            // console.log(`   Collector ID: ${data.collectorId}`);

            // Don't process if I'm the one who collected it (already handled locally)
            if (data.collectorId === this.localPlayer?.data?.id) {
                console.log(`   ⏭️ I'm the collector, skipping (already handled locally)`);
                return;
            }

            // Find the orb
            const orb = this.experienceOrbs[data.orbId];
            console.log(`   Orb ${data.orbId} exists: ${!!orb}`);
            if (!orb) {
                return;
            }

            // Check if I'm on screen
            const camera = this.cameras.main;
            const myX = this.localPlayer.sprite.x;
            const myY = this.localPlayer.sprite.y;
            const onScreen = (myX >= camera.scrollX &&
                            myX <= camera.scrollX + camera.width &&
                            myY >= camera.scrollY &&
                            myY <= camera.scrollY + camera.height);

            console.log(`   My position: (${myX}, ${myY})`);
            console.log(`   Camera bounds: (${camera.scrollX}, ${camera.scrollY}) to (${camera.scrollX + camera.width}, ${camera.scrollY + camera.height})`);
            console.log(`   On screen: ${onScreen}`);

            if (onScreen) {
                console.log(`   ✅ I'm on screen! Playing collection effects and gaining XP`);

                // Play collection visual/sound from the orb's position
                orb.collect(data.collectorX, data.collectorY);

                // Give me the XP
                this.localPlayer.addExperience(data.expValue);
                console.log(`   💰 Added ${data.expValue} XP to my player`);
            } else {
                console.log(`   ⏭️ Not on screen, skipping effects but removing orb`);
            }

            // Remove the orb for everyone
            delete this.experienceOrbs[data.orbId];
            console.log(`   🗑️ Removed orb ${data.orbId} from my orb list`);
        });

        // Enemy attack (Emberclaw shooting)
        networkManager.on('enemy:attack', (data) => {
            console.log(`🎯 CLIENT RECEIVED enemy:attack - enemyId: ${data.enemyId}, targetPos: (${data.targetX}, ${data.targetY})`);
            const emberclaw = this.emberclaws[data.enemyId];
            if (emberclaw && emberclaw.shootProjectile) {
                console.log(`✅ Emberclaw found, calling shootProjectile(${data.targetX}, ${data.targetY})`);
                emberclaw.shootProjectile(data.targetX, data.targetY);
            } else {
                console.warn(`⚠️ Emberclaw ${data.enemyId} not found in emberclaws object`);
                console.warn(`   Available: ${Object.keys(this.emberclaws).join(', ')}`);
                console.warn(`   emberclaw exists: ${!!emberclaw}, has method: ${emberclaw && typeof emberclaw.shootProjectile === 'function'}`);
            }
        });

        // PERFORMANCE: Batched enemy movements (handles multiple enemies at once)
        networkManager.on('enemies:moved:batch', (data) => {
            if (!data.enemies || !Array.isArray(data.enemies)) return;

            // Process all enemy movements in the batch
            data.enemies.forEach(enemyData => {
                const enemy = this.enemies[enemyData.enemyId] || this.swordDemons[enemyData.enemyId] || this.minotaurs[enemyData.enemyId] || this.mushrooms[enemyData.enemyId] || this.emberclaws[enemyData.enemyId];

                // Silently ignore movement for non-existent or dead enemies
                if (!enemy || enemy.isDead || enemy.isDying || !enemy.sprite || !enemy.sprite.active || !enemy.isAlive) {
                    return;
                }

                // Server sends pixel coordinates
                if (enemyData.isPixelCoordinates) {
                    if (enemy.setTargetPosition) {
                        enemy.setTargetPosition(enemyData.position.x, enemyData.position.y);
                    } else if (enemy.moveToPosition) {
                        const tileSize = GameConfig.GAME.TILE_SIZE;
                        const tileX = (enemyData.position.x - tileSize / 2) / tileSize;
                        const tileY = (enemyData.position.y - tileSize / 2) / tileSize;
                        enemy.moveToPosition({ x: tileX, y: tileY });
                    }
                }
            });
        });

        // Enemy killed
        networkManager.on('enemy:killed', (data) => {
            // Use dynamic enemy finder
            const enemy = this.findEnemyById(data.enemyId);
            if (enemy) {
                const deathX = enemy.sprite.x;
                const deathY = enemy.sprite.y;

                // Only add blood splatter and sounds if death is on or near screen
                const camera = this.cameras.main;
                const screenBuffer = 200; // Add buffer zone around screen
                const onScreen = (
                    deathX >= camera.scrollX - screenBuffer &&
                    deathX <= camera.scrollX + camera.width + screenBuffer &&
                    deathY >= camera.scrollY - screenBuffer &&
                    deathY <= camera.scrollY + camera.height + screenBuffer
                );

                if (onScreen) {
                    this.addScreenBloodSplatter();
                }

                // Spawn experience orb at death location using server's orb ID
                const orbId = data.orbId || `exp_${this.expOrbIdCounter++}`;
                const orbValue = data.orbValue || 10;
                this.spawnExperienceOrbWithId(orbId, deathX, deathY, orbValue);

                // Pass onScreen flag to die() to control sounds
                enemy.die(onScreen);

                // Track kill if local player killed this enemy
                if (data.killedBy === networkManager.currentPlayer.id) {
                    if (this.modernHUD) {
                        this.modernHUD.addKill();
                    }
                }

                // Delete from correct collection dynamically
                this.deleteEnemyById(data.enemyId);

                // Check if killer is Malachar with special passives
                if (data.killedBy) {
                    const killer = data.killedBy === networkManager.currentPlayer.id
                        ? this.localPlayer
                        : this.otherPlayers[data.killedBy];

                    if (killer && killer.class && killer.class.toLowerCase() === 'malachar') {
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

                    if (killer && killer.class && killer.class.toLowerCase() === 'malachar') {
                        // 15% chance to summon minion (dark_harvest passive)
                        if (Math.random() < 0.15) {
                            this.spawnMinion(deathX, deathY, data.killerId);
                        }
                    }
                }
            }
        });

        // Item spawned (server sends: itemId, type, color, x, y)
        networkManager.on('item:spawned', (data) => {
            console.log('📦 Item spawned:', data);
            this.items[data.itemId] = new Item(this, {
                id: data.itemId,
                itemId: data.itemId,
                type: data.type,
                color: data.color,
                x: data.x,
                y: data.y
            });
        });

        // Item picked up by a player (removes from world for everyone)
        networkManager.on('item:picked', (data) => {
            console.log('📦 Item picked:', data);
            const item = this.items[data.itemId];
            if (item) {
                // Play pickup animation
                item.collect();
                delete this.items[data.itemId];

                // If local player picked it up
                if (data.playerId === networkManager.currentPlayer.id) {
                    // Souls/currency handled by server, other items go to inventory
                    if (data.itemType === 'soul') {
                        // Don't add currency here - server will handle it
                        // and broadcast the update via player:update event
                    } else {
                        if (this.inventoryUI) {
                            this.inventoryUI.addItem(data.itemType, 1, {
                                color: data.itemColor
                            });
                        }
                    }
                }
            }
        });

        // Piercing fireball cast by another player
        networkManager.on('piercingFireball:cast', (data) => {
            const { playerId, startX, startY, targetX, targetY } = data;

            // Don't create duplicate fireball for local player
            if (playerId === networkManager.currentPlayer.id) return;

            console.log(`🔥 Remote player ${playerId} cast Piercing Inferno`);

            // Find the remote player
            const player = this.otherPlayers[playerId];
            if (!player || !player.passiveSkills) {
                console.warn(`⚠️ Player ${playerId} not found or has no passive skills`);
                return;
            }

            // Create visual fireball (no damage)
            const effect = player.passiveSkills.activeEffects.piercing_fireball;
            if (effect) {
                player.passiveSkills.createPiercingFireballProjectile(
                    startX,
                    startY,
                    { x: targetX, y: targetY }, // Fake target object with just coordinates
                    effect,
                    false // dealDamage = false for remote players
                );
            }
        });

        // Bastion attack from another player
        networkManager.on('bastion:attack', (data) => {
            const { playerId, stance, angle, position, isManual } = data;

            // Don't create duplicate projectile for local player
            if (playerId === networkManager.currentPlayer.id) return;

            console.log(`🔫 Remote Bastion ${playerId} fired ${stance} at angle ${angle.toFixed(2)}`);

            // Find the remote player
            const player = this.otherPlayers[playerId];
            if (!player || !player.spriteRenderer) {
                console.warn(`⚠️ Bastion player ${playerId} not found`);
                return;
            }

            // Play attack animation
            const attackAnimKey = `bastion_${stance}_attack`;
            if (this.anims.exists(attackAnimKey) && player.spriteRenderer.sprite) {
                player.spriteRenderer.sprite.play(attackAnimKey);
            }

            // Play weapon sound
            this.playBastionWeaponSound(stance);

            // Create visual projectiles (no damage)
            this.createRemoteBastionProjectiles(position, stance, angle);
        });

        // Bank system events
        networkManager.on('bank:data', (data) => {
            console.log('💰 Received bank data:', data);
            if (this.bankerNPC) {
                this.bankerNPC.updateBankData(data.bankedSouls);
            }
        });

        networkManager.on('bank:depositConfirm', (data) => {
            console.log('✅ Deposit confirmed:', data);
            if (this.bankerNPC) {
                this.bankerNPC.updateBankData(data.bankedSouls);
            }
        });

        networkManager.on('bank:withdrawConfirm', (data) => {
            console.log('✅ Withdrawal confirmed:', data);
            if (this.bankerNPC) {
                this.bankerNPC.updateBankData(data.bankedSouls);
            }
        });

        networkManager.on('bank:error', (data) => {
            console.error('❌ Bank error:', data.error);
            if (this.bankerNPC) {
                this.bankerNPC.showFeedback(data.error, '#ff6666');
            }
        });

        // Chat
        // Passive skill activated by another player
        networkManager.on('passiveSkill:activated', (data) => {
            const { playerId, skillId, playerData } = data;

            console.log(`📡 Received passiveSkill:activated for player ${playerId}: ${skillId}`);
            console.log(`   playerData:`, playerData);
            console.log(`   playerData.passiveSkills:`, playerData?.passiveSkills);
            console.log(`   Current player ID: ${networkManager.currentPlayer.id}`);
            console.log(`   Is local player: ${playerId === networkManager.currentPlayer.id}`);

            // Find the player (could be local or remote)
            let player = null;
            if (playerId === networkManager.currentPlayer.id) {
                // It's the local player (already handled locally, but good to confirm)
                console.log(`   ⏭️ Skipping local player (already handled locally)`);
                return;
            } else {
                // It's a remote player
                player = this.otherPlayers[playerId];
                console.log(`   Found remote player:`, player ? 'YES' : 'NO');
            }

            if (!player) {
                console.warn(`⚠️ Player ${playerId} not found for passive skill activation`);
                return;
            }

            // Update player data (including shield value)
            if (playerData) {
                player.shield = playerData.shield || 0;
                player.health = playerData.health || player.health;
                player.maxHealth = playerData.maxHealth || player.maxHealth;
                console.log(`🛡️ Updated player ${playerId} shield to ${player.shield}`);

                // Update UI to show shield
                if (player.ui && player.ui.updateHealthBar) {
                    player.ui.updateHealthBar();
                }
            }

            // Create PassiveSkills manager for this player if it doesn't exist
            if (!player.passiveSkills) {
                player.passiveSkills = new PassiveSkills(this, player);
            }

            // Add the skill (isLocalPlayer = false, so no HUD display)
            player.passiveSkills.addSkill(skillId, false);

            console.log(`✅ Activated passive skill ${skillId} for remote player ${playerId}`);
        });

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
    }

    healPlayer() {
        if (this.localPlayer) {
            this.localPlayer.health = this.localPlayer.maxHealth;
            console.log('❤️ Player healed to full health');
        }
    }

    /**
     * Spawn a pet for another player
     */
    spawnPetForOtherPlayer(player, petType) {
        // Create PetManager for other player if they don't have one
        // Mark as remote so it receives position updates from network instead of calculating locally
        if (!player.petManager) {
            player.petManager = new PetManager(this, player, true); // isRemote = true
        }

        // Add the pet to their owned pets and equip it
        player.petManager.addPet(petType);

        console.log(`🦊 Spawned ${petType} for ${player.username} (remote)`);
    }

    spawnMinion(x, y, ownerId, isPermanent = false, providedMinionId = null, skipFormationUpdate = false) {
        // Use provided ID if spawning from network, otherwise generate new one with player ID prefix
        const minionId = providedMinionId || `${ownerId}_minion_${this.minionIdCounter++}`;

        console.log(`🔮 spawnMinion called: minionId=${minionId}, ownerId=${ownerId}, currentPlayerId=${networkManager.currentPlayer?.id}, providedId=${providedMinionId}`);

        // If this is a local player spawn (no provided ID), request from server instead
        if (!providedMinionId && ownerId === networkManager.currentPlayer.id) {
            const tileSize = GameConfig.GAME.TILE_SIZE;
            const gridPosition = {
                x: Math.floor(x / tileSize),
                y: Math.floor(y / tileSize)
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
        return this.spawnExperienceOrbWithId(orbId, x, y, expValue);
    }

    spawnExperienceOrbWithId(orbId, x, y, expValue = 10) {
        const orb = new ExperienceOrb(this, { x, y, expValue });
        this.experienceOrbs[orbId] = orb;

        const orbType = expValue >= 100 ? 'RARE' : 'common';
        // console.log(`💎 Spawned ${orbType} experience orb [${orbId}] at (${x.toFixed(0)}, ${y.toFixed(0)}) worth ${expValue} XP`);

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

        // Check if character changed - if so, recreate the player entirely
        const characterChanged = this.localPlayer.class !== playerData.class && playerData.class;

        if (characterChanged) {
            console.log(`🔄 Character changed from ${this.localPlayer.class} to ${playerData.class} - recreating player`);

            // Destroy old player completely
            if (this.localPlayer.spriteRenderer) {
                this.localPlayer.spriteRenderer.destroy();
            }
            if (this.localPlayer.ui) {
                this.localPlayer.ui.destroy();
            }

            // Create new player with updated character
            this.localPlayer = new Player(this, playerData, true);

            // Load character's full stats from character definition
            const respawnCharDef = CHARACTERS[playerData.class.toUpperCase()];
            if (respawnCharDef && respawnCharDef.stats && respawnCharDef.stats.base) {
                this.localPlayer.stats = {
                    ...this.localPlayer.stats,
                    ...respawnCharDef.stats.base
                };
            }

            console.log('✅ Player recreated with new character');
            return;
        }

        const player = this.localPlayer;

        // Reset player state
        player.isAlive = true;
        player.level = playerData.level || 1;
        player.experience = playerData.experience || 0;
        player.health = playerData.health;
        player.maxHealth = playerData.maxHealth;

        // Load character's full stats from character definition
        const currentCharDef = CHARACTERS[player.class.toUpperCase()];
        if (currentCharDef && currentCharDef.stats && currentCharDef.stats.base) {
            player.stats = {
                ...playerData.stats,
                ...currentCharDef.stats.base
            };
        } else {
            player.stats = playerData.stats || {
                strength: 10,
                agility: 10,
                intelligence: 10,
                vitality: 10,
                damage: 10,
                armor: 5
            };
        }

        // Clear all multipliers (reset to defaults)
        if (this.skillSelector) {
            this.skillSelector.initializePlayerMultipliers();
        }

        // Clear all passive skills (bought with stars)
        if (player.passiveSkills) {
            player.passiveSkills.clearAll();
        }

        // Reset abilities based on new level
        player.abilities = {};
        player.shownAbilityNotifications = {};

        // Re-unlock abilities based on current level
        this.checkAndUnlockAbilities(player, player.level);

        // Update ability UI to reflect reset
        if (this.abilityManager && this.abilityManager.updateCooldownUI) {
            this.abilityManager.updateCooldownUI();
        }

        // Teleport to respawn position (already in pixels)
        const respawnPos = playerData.respawnPosition || playerData.position;
        if (respawnPos) {
            console.log(`🎯 Teleporting to pixel position (${respawnPos.x}, ${respawnPos.y})`);

            // Update physics body position (this is the actual player position)
            player.sprite.x = respawnPos.x;
            player.sprite.y = respawnPos.y;
            player.sprite.body.setVelocity(0, 0);

            // Kill any active tweens on visual targets to prevent fade conflicts
            if (player.spriteRenderer) {
                const visualTargets = player.spriteRenderer.getVisualTargets();
                visualTargets.forEach(target => {
                    if (target) {
                        this.tweens.killTweensOf(target);
                    }
                });
            }

            // Kill tweens on main sprite and UI
            this.tweens.killTweensOf(player.sprite);
            if (player.ui) {
                this.tweens.killTweensOf(player.ui);
            }

            // Make main player sprite visible and ensure it's at proper depth
            player.sprite.setAlpha(1);
            player.sprite.setVisible(true);
            player.sprite.setDepth(5); // Ensure player is above ground/enemies

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
            this.cameras.main.centerOn(respawnPos.x, respawnPos.y);
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

        // Request skill restoration to respawn permanent minions
        networkManager.requestSkillRestore();

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

    playBastionWeaponSound(stance) {
        if (!this.sound) return;

        let soundKey;
        let volume = 0.3; // Default volume

        // Select sound based on stance
        switch (stance) {
            case 'scar':
                soundKey = 'bastion_scar';
                volume = 0.25; // SCAR is a bit quieter (rapid fire)
                break;
            case 'shield':
                soundKey = 'bastion_pistol';
                volume = 0.3; // Pistol medium volume
                break;
            case 'shotgun':
                soundKey = 'bastion_shotgun';
                volume = 0.4; // Shotgun is louder
                break;
        }

        // Play the sound
        if (soundKey) {
            this.sound.play(soundKey, { volume: volume });
        }
    }

    createRemoteBastionProjectiles(position, stance, angle) {
        // Create visual-only projectiles for remote Bastion attacks (no damage)
        const config = window.CharacterSystem.getCharacter('BASTION');
        if (!config || !config.stances[stance]) return;

        const stanceConfig = config.stances[stance];

        if (stance === 'shotgun') {
            // Create shotgun pellets
            for (let i = 0; i < stanceConfig.pellets; i++) {
                const spreadOffset = (i - 2) * (stanceConfig.spread / 180 * Math.PI);
                const pelletAngle = angle + spreadOffset;

                const projectile = this.add.circle(
                    position.x,
                    position.y,
                    3, // Pellet size
                    0xDC143C // Crimson red
                );
                projectile.setDepth(1000);

                // Animate the projectile
                this.tweens.add({
                    targets: projectile,
                    x: position.x + Math.cos(pelletAngle) * stanceConfig.range * 48,
                    y: position.y + Math.sin(pelletAngle) * stanceConfig.range * 48,
                    duration: (stanceConfig.range * 48) / stanceConfig.projectileSpeed * 1000,
                    onComplete: () => projectile.destroy()
                });
            }
        } else {
            // Create single bullet (SCAR or Pistol)
            const projectile = this.add.circle(
                position.x,
                position.y,
                4, // Bullet size
                stance === 'shield' ? 0xFFD700 : 0xFF4500 // Gold for pistol, orange for SCAR
            );
            projectile.setDepth(1000);

            // Animate the projectile
            this.tweens.add({
                targets: projectile,
                x: position.x + Math.cos(angle) * stanceConfig.range * 48,
                y: position.y + Math.sin(angle) * stanceConfig.range * 48,
                duration: (stanceConfig.range * 48) / stanceConfig.projectileSpeed * 1000,
                onComplete: () => projectile.destroy()
            });
        }
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

        // Dynamic chunk loading - load/unload chunks as player explores
        if (this.biomeChunks && this.localPlayer.sprite) {
            this.biomeChunks.update(this.localPlayer.sprite.x, this.localPlayer.sprite.y);
        }

            // PERFORMANCE FIX: Collision setup removed from update loop
            // This was causing O(n²) complexity every frame, killing FPS (10 FPS)
            // TODO: Implement proper tilemap collision layers in BiomeChunkSystem
            // For now, chunk collision is disabled to improve performance to 30+ FPS

            /* DISABLED FOR PERFORMANCE - was creating thousands of colliders every frame
            if (!this.processedChunkCollisions) {
                this.processedChunkCollisions = new Set();
            }

            this.biomeChunks.loadedChunks.forEach((chunk, key) => {
                if (this.processedChunkCollisions.has(key)) return;

                if (chunk.collisionBodies && chunk.collisionBodies.length > 0) {
                    chunk.collisionBodies.forEach(body => {
                        if (this.localPlayer && this.localPlayer.sprite) {
                            this.physics.add.collider(this.localPlayer.sprite, body);
                        }
                        if (this.players) {
                            Object.values(this.players).forEach(player => {
                                if (player && player.sprite) {
                                    this.physics.add.collider(player.sprite, body);
                                }
                            });
                        }
                        [this.swordDemons, this.minotaurs, this.mushrooms, this.emberclaws].forEach(collection => {
                            if (collection) {
                                Object.values(collection).forEach(enemy => {
                                    if (enemy && enemy.sprite) {
                                        this.physics.add.collider(enemy.sprite, body);
                                    }
                                });
                            }
                        });
                    });
                    console.log(`🧱 Added ${chunk.collisionBodies.length} collision bodies from chunk ${key}`);
                }
                this.processedChunkCollisions.add(key);
            });
            */

        // Update roof transparency based on player position (spawn roofs + chunk roofs)
        // PERFORMANCE: Only update when player moves to a new tile
        if (this.localPlayer && this.localPlayer.sprite) {
            const playerY = this.localPlayer.sprite.y;
            const playerX = this.localPlayer.sprite.x;
            const playerTileX = Math.floor(playerX / 48);
            const playerTileY = Math.floor(playerY / 48);

            // Initialize tracking variables if not exists
            if (this.lastRoofUpdateTileX === undefined) {
                this.lastRoofUpdateTileX = playerTileX;
                this.lastRoofUpdateTileY = playerTileY;
            }

            // Only update roofs when player moves to a new tile
            if (this.lastRoofUpdateTileX !== playerTileX || this.lastRoofUpdateTileY !== playerTileY) {
                this.lastRoofUpdateTileX = playerTileX;
                this.lastRoofUpdateTileY = playerTileY;

                let playerUnderAnyRoof = false; // Track if player is under any roof

                this.spawnRoofLayers.forEach(roofContainer => {
                // Use the actual roof tile bounds if available
                if (roofContainer.roofBounds) {
                    const bounds = roofContainer.roofBounds;

                    // Player is "under" the roof if they're inside the roof tile bounds
                    const isUnderRoof =
                        playerX >= bounds.x &&
                        playerX <= (bounds.x + bounds.width) &&
                        playerY >= bounds.y &&
                        playerY <= (bounds.y + bounds.height);

                    if (isUnderRoof) playerUnderAnyRoof = true;

                    // Set roof depth to render above player when they're underneath
                    // Player depth is set to player.y, so roof needs to be higher
                    const targetDepth = isUnderRoof ? (playerY + 100) : (bounds.y + bounds.height);

                    // Set depth on both container AND blitter (containers don't always propagate depth correctly)
                    roofContainer.setDepth(targetDepth);
                    if (roofContainer.blitter) {
                        roofContainer.blitter.setDepth(targetDepth);
                    }

                    // Smoothly transition alpha
                    const targetAlpha = isUnderRoof ? 0.0 : 1.0; // Fully transparent when under roof

                    // Set alpha instantly (no smooth transition)
                    if (roofContainer.blitter) {
                        roofContainer.blitter.alpha = targetAlpha;
                        roofContainer.alpha = targetAlpha;
                    } else {
                        roofContainer.alpha = targetAlpha;
                    }
                }
            });

            // Handle chunk roof layers from BiomeChunkSystem - OPTIMIZED to only check nearby chunks
            if (this.biomeChunks && this.localPlayer.sprite) {
                const playerChunkX = Math.floor(this.localPlayer.sprite.x / this.biomeChunks.CHUNK_SIZE_PIXELS);
                const playerChunkY = Math.floor(this.localPlayer.sprite.y / this.biomeChunks.CHUNK_SIZE_PIXELS);

                // Only check chunks within 2-chunk radius (5x5 grid = 25 chunks max, not all 729)
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        const chunkKey = `${playerChunkX + dx},${playerChunkY + dy}`;
                        const chunk = this.biomeChunks.loadedChunks.get(chunkKey);

                        if (chunk && chunk.roofLayers && chunk.roofLayers.length > 0) {
                            chunk.roofLayers.forEach(roofLayer => {
                                const bounds = roofLayer.bounds;

                                // Player is "under" the roof if they're inside the roof bounds
                                const isUnderRoof =
                                    playerX >= bounds.minX &&
                                    playerX <= bounds.maxX &&
                                    playerY >= bounds.minY &&
                                    playerY <= bounds.maxY;

                                if (isUnderRoof) playerUnderAnyRoof = true;

                                // Set roof depth to render above player when they're underneath
                                const targetDepth = isUnderRoof ? (playerY + 100) : bounds.maxY;
                                roofLayer.container.setDepth(targetDepth);

                                // Set alpha instantly (no smooth transition)
                                const targetAlpha = isUnderRoof ? 0.0 : 1.0; // Fully transparent when under roof
                                roofLayer.container.alpha = targetAlpha;
                            });
                        }
                    }
                }
            }

            // Update dark overlay - blackout rest of world when under roof
            if (this.roofDarkOverlay) {
                const targetOverlayAlpha = playerUnderAnyRoof ? 0.5 : 0; // 50% dark when under roof
                const currentOverlayAlpha = this.roofDarkOverlay.alpha;
                this.roofDarkOverlay.alpha = targetOverlayAlpha; // Set instantly (no smooth transition)

                // Debug logging when player enters/exits roof
                if (playerUnderAnyRoof && currentOverlayAlpha < 0.01) {
                    console.log('🌑 Player entered roof - overlay should appear');
                    console.log(`   Overlay alpha: ${targetOverlayAlpha} (target: 0.5)`);
                    console.log(`   Overlay visible: ${this.roofDarkOverlay.visible}`);
                } else if (!playerUnderAnyRoof && currentOverlayAlpha > 0.49) {
                    console.log('🌑 Player exited roof - overlay should fade');
                }
            }
            } // End of tile-based roof update guard
        }

        // Update music UI progress bar
        if (this.musicUI) {
            this.musicUI.update();
        }

        // Update ambient particles
        if (this.ambientParticles) {
            this.updateAmbientParticles(delta);
        }

        // Camera-based culling for birds and butterflies (performance optimization)
        const camera = this.cameras.main;
        const cameraBuffer = 200; // Extra buffer to prevent pop-in
        const cameraBounds = {
            left: camera.scrollX - cameraBuffer,
            right: camera.scrollX + camera.width + cameraBuffer,
            top: camera.scrollY - cameraBuffer,
            bottom: camera.scrollY + camera.height + cameraBuffer
        };

        // Cull butterflies outside camera view
        if (this.butterflies) {
            this.butterflies.forEach(butterfly => {
                if (!butterfly || !butterfly.active) return;
                const inView = butterfly.x >= cameraBounds.left &&
                               butterfly.x <= cameraBounds.right &&
                               butterfly.y >= cameraBounds.top &&
                               butterfly.y <= cameraBounds.bottom;
                butterfly.setVisible(inView);
                butterfly.setActive(inView);
            });
        }

        // Cull birds outside camera view
        if (this.birds) {
            this.birds.forEach(bird => {
                if (!bird || !bird.active) return;
                const inView = bird.x >= cameraBounds.left &&
                               bird.x <= cameraBounds.right &&
                               bird.y >= cameraBounds.top &&
                               bird.y <= cameraBounds.bottom;
                bird.setVisible(inView);
                bird.setActive(inView);
            });
        }

        // Update ability manager cooldowns
        if (this.abilityManager) {
            this.abilityManager.update(time, delta);
        }

        // Update pet manager
        if (this.petManager) {
            this.petManager.update(time, delta);
        }

        // PERFORMANCE: Removed duplicate roof transparency code (already handled at line 5723)

        // Update controller manager (handles all controller input internally)
        if (this.controllerManager) {
            this.controllerManager.update();
        }

        // PERFORMANCE: Removed performance timing system (saves 21+ performance.now() calls per frame)

        // Player movement (with speed multiplier)
        let velocityX = 0;
        let velocityY = 0;

        // Get mobile joystick input
        const mobileInput = typeof mobileControls !== 'undefined' ? mobileControls.getInput() : { x: 0, y: 0, active: false };

        // Get controller input
        const controllerInput = this.controllerManager ? this.controllerManager.getMovementInput() : { x: 0, y: 0, active: false };

        // Check if inventory is open - disable WASD movement
        const inventoryOpen = this.inventoryUI && this.inventoryUI.isOpen;

        // Check if player is channeling an ability (e.g., Aldric's Titan's Fury)
        const isChanneling = this.localPlayer && this.localPlayer.isChanneling;

        // Controller input (highest priority) - but not if channeling
        if (controllerInput.active && !isChanneling) {
            velocityX = controllerInput.x;
            velocityY = controllerInput.y;
        }
        // Mobile joystick input (second priority) - but not if channeling
        else if (mobileInput.active && !isChanneling) {
            velocityX = mobileInput.x;
            velocityY = mobileInput.y;
        }
        // Keyboard input (only if inventory is closed, no other input, not channeling, and blackjack UI not open)
        else if (!inventoryOpen && !isChanneling && !this.blackjackUIOpen && this.cursors && this.wasd) {
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

        // Decorations are now handled by updateVisibleDecorations only
        // Chunks are handled by BiomeChunkSystem in the main update loop
        if (velocityX !== 0 || velocityY !== 0 || !this.hasUpdatedTilesOnce) {
            this.updateVisibleDecorations();
            this.hasUpdatedTilesOnce = true;
        }

        // Update animations (once per frame)
        this.localPlayer.updateAnimation(delta);
        // PERFORMANCE: Iterate without creating new array
        for (const playerId in this.otherPlayers) {
            const player = this.otherPlayers[playerId];
            player.updateAnimation(delta);
            player.updateInterpolation(); // Smooth movement

            // Update pet if player has one
            if (player.petManager) {
                player.petManager.update(time, delta);
            }
        }

        // Update off-screen player indicators
        this.updatePlayerIndicators();

        // Update UI elements (name tags, health bars) less frequently
        if (!this.uiUpdateCounter) this.uiUpdateCounter = 0;
        this.uiUpdateCounter++;
        if (this.uiUpdateCounter >= 5) {  // Every 5 frames (~83ms at 60fps)
            this.uiUpdateCounter = 0;
            this.localPlayer.updateElements();
            // PERFORMANCE: Iterate without creating new array
            for (const playerId in this.otherPlayers) {
                this.otherPlayers[playerId].updateElements();
            }
        }

            // Update modern HUD
            if (this.modernHUD) {
                this.modernHUD.update();
            }

        // PERFORMANCE: Removed diagnostic logging and FPS counter (saves performance)

        // Update minions and cleanup dead ones
        // PERFORMANCE: Iterate without creating new array
        for (const minionId in this.minions) {
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
        }

        // PERFORMANCE: Update all enemies using direct iteration (no array allocation)
        const enemyCollections = [this.enemies, this.swordDemons, this.minotaurs,
                                  this.mushrooms, this.emberclaws];

        for (let c = 0; c < enemyCollections.length; c++) {
            const collection = enemyCollections[c];
            if (!collection) continue;

            for (const enemyId in collection) {
                const enemy = collection[enemyId];
                if (enemy && enemy.isAlive) {
                    enemy.update();
                }
            }
        }

        // Check for experience orb collection
        const playerX = this.localPlayer.sprite.x;
        const playerY = this.localPlayer.sprite.y;

        // PERFORMANCE: Iterate without creating new array
        for (const orbId in this.experienceOrbs) {
            const orb = this.experienceOrbs[orbId];
            if (orb && orb.checkCollision(playerX, playerY)) {
                // Collect the orb and pass player position
                orb.collect(playerX, playerY);

                // Add experience to local player
                this.localPlayer.addExperience(orb.expValue);

                // Broadcast orb collection to server so other players can collect it too
                console.log(`📡 Broadcasting orb collection: orbId=${orbId}, expValue=${orb.expValue}, pos=(${playerX}, ${playerY})`);
                console.log(`   networkManager exists: ${!!window.networkManager}, connected: ${window.networkManager?.connected}`);
                if (window.networkManager && window.networkManager.connected) {
                    window.networkManager.collectOrb(orbId, orb.expValue, playerX, playerY);
                    console.log(`   ✅ Broadcast sent`);
                } else {
                    console.warn(`   ❌ Cannot broadcast - networkManager not available or not connected`);
                }

                // Add experience to all other players that are visible on screen (local only for smooth UX)
                const camera = this.cameras.main;
                // PERFORMANCE: Iterate without creating new array
                for (const otherPlayerId in this.otherPlayers) {
                    const otherPlayer = this.otherPlayers[otherPlayerId];
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
                }

                // Remove from collection
                delete this.experienceOrbs[orbId];
            }
        }

        // Check for item collection (auto-pickup)
        // Only pick up items if inventory is not full
        if (this.inventoryUI && !this.inventoryUI.isFull()) {
            // PERFORMANCE: Iterate without creating new array
            for (const itemId in this.items) {
                const item = this.items[itemId];
                if (item && item.checkCollision(playerX, playerY)) {
                    // Request pickup from server
                    item.requestPickup();
                }
            }
        }

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

        // Update merchant NPC (check player distance for prompt)
        if (this.merchantNPC && this.localPlayer) {
            this.merchantNPC.checkPlayerDistance(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update skill shop NPC (check player distance for prompt)
        if (this.skillShopNPC && this.localPlayer) {
            this.skillShopNPC.checkPlayerDistance(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update banker NPC (check player distance for prompt)
        if (this.bankerNPC && this.localPlayer) {
            this.bankerNPC.checkPlayerDistance(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update pet merchant NPC (check player distance for prompt)
        if (this.petMerchantNPC && this.localPlayer) {
            this.petMerchantNPC.checkPlayerDistance(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update pet storage NPC (check player distance for prompt)
        if (this.petStorageNPC && this.localPlayer) {
            this.petStorageNPC.checkPlayerDistance(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update blackjack dealer NPC (check player distance for prompt)
        if (this.blackjackDealerNPC && this.localPlayer) {
            this.blackjackDealerNPC.checkPlayerDistance(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update chunk5 NPCs (check player distance for prompts)
        if (this.chunk5NPCs && this.localPlayer) {
            this.chunk5NPCs.forEach(npc => {
                if (npc) {
                    npc.checkPlayerDistance(
                        this.localPlayer.sprite.x,
                        this.localPlayer.sprite.y
                    );
                }
            });
        }

        // Update passive skills (orbital shield, etc.)
        if (this.passiveSkills && this.localPlayer) {
            this.passiveSkills.update(
                this.localPlayer.sprite.x,
                this.localPlayer.sprite.y
            );
        }

        // Update passive skills for remote players
        // PERFORMANCE: Iterate without creating new array
        for (const playerId in this.otherPlayers) {
            const player = this.otherPlayers[playerId];
            if (player.passiveSkills && player.sprite) {
                player.passiveSkills.update(
                    player.sprite.x,
                    player.sprite.y,
                    false // isLocalPlayer = false
                );
            }
        }

        // Depth sorting - use Y position for proper layering
        // Higher Y = further down screen = higher depth (in front)
        // PERFORMANCE: Only update depth for moving objects (players), NOT static objects (trees)

        // Set player depth based on Y position using PlayerSprite's updateDepth method
        // This properly updates all visual sprites (1x1 or 2x2), not just the collision box
        if (this.localPlayer && this.localPlayer.spriteRenderer) {
            this.localPlayer.spriteRenderer.updateDepth();
        }

        // Update other players' depth
        // PERFORMANCE: Iterate without creating new array
        for (const playerId in this.otherPlayers) {
            const player = this.otherPlayers[playerId];
            if (player && player.spriteRenderer && player.sprite && player.sprite.active) {
                player.spriteRenderer.updateDepth();
            }
        }

        // Update enemies' depth for Y-sorting with trees
        // PERFORMANCE: Only update depth every 10 frames to reduce display list sorting
        if (!this.depthUpdateCounter) this.depthUpdateCounter = 0;
        this.depthUpdateCounter++;
        if (this.depthUpdateCounter >= 10) {  // Changed from 3 to 10
            this.depthUpdateCounter = 0;

            // PERFORMANCE: Iterate without creating new array + change detection
            for (const enemyType in this.enemies) {
                const enemy = this.enemies[enemyType];
                if (enemy && enemy.sprite && enemy.sprite.active) {
                    const newDepth = enemy.sprite.y;
                    // Only update if Y position changed (avoid unnecessary sorting)
                    if (enemy._lastDepth !== newDepth) {
                        enemy.sprite.setDepth(newDepth);
                        enemy._lastDepth = newDepth;
                    }
                }
            }

            // Update minions' depth for Y-sorting with trees
            for (const minionId in this.minions) {
                const minion = this.minions[minionId];
                if (minion && minion.sprite && minion.sprite.active) {
                    const newDepth = minion.sprite.y;
                    // Only update if Y position changed (avoid unnecessary sorting)
                    if (minion._lastDepth !== newDepth) {
                        minion.sprite.setDepth(newDepth);
                        minion._lastDepth = newDepth;
                    }
                }
            }
        }

        // NOTE: Tree depths are set ONCE when created, not every frame!
        // This saves massive performance (was updating 100s of sprites every frame)

        // PERFORMANCE: Removed frame time tracking and slow frame logging
    }

    // Show player join/leave notification
    showPlayerNotification(message, color) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const notificationText = this.add.text(
            width / 2,
            height / 2 - 200,
            message,
            {
                font: 'bold 20px monospace',
                fill: color,
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        notificationText.setOrigin(0.5);
        notificationText.setDepth(1000);
        notificationText.setScrollFactor(0);

        this.tweens.add({
            targets: notificationText,
            y: notificationText.y - 40,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => notificationText.destroy()
        });
    }

    // Create atmospheric visual effects
    createAtmosphericEffects() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create particle texture if it doesn't exist
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(8, 8, 8);
            graphics.generateTexture('particle', 16, 16);
            graphics.destroy();
        }

        // ==== FLOATING DUST PARTICLES ====
        // Create large slow-moving dust particles in the air
        const dustParticles = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: -50, max: height + 50 },
            scale: { start: 0.4, end: 0.15 },
            alpha: { start: 0.2, end: 0.08 },
            tint: [0xffffcc, 0xffeeaa, 0xffddbb],
            speedY: { min: 5, max: 15 },
            speedX: { min: -5, max: 5 },
            lifespan: 8000,
            frequency: 80,
            blendMode: 'ADD',
            angle: { min: 0, max: 360 },
            rotate: { min: -2, max: 2 },
            quantity: 3
        });
        dustParticles.setScrollFactor(0.3); // Parallax effect
        dustParticles.setDepth(9990);

        // ==== AMBIENT FIREFLIES / LIGHT ORBS ====
        // Create glowing particles that float around
        const fireflies = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            scale: { start: 0.8, end: 1.2, ease: 'Sine.easeInOut' },
            alpha: { start: 0.8, end: 0.4, ease: 'Sine.easeInOut', yoyo: true },
            tint: [0xffff66, 0xffdd44, 0xffaa22],
            speed: 30,
            lifespan: 5000,
            frequency: 200,
            blendMode: 'ADD',
            angle: { min: 0, max: 360 },
            quantity: 3
        });
        fireflies.setScrollFactor(0.5); // Parallax
        fireflies.setDepth(9989);

        // ==== EMBER PARTICLES ====
        // Rising warm embers
        const embers = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: height + 20,
            scale: { start: 0.5, end: 0.2 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xff6633, 0xff8844, 0xffaa55],
            speedY: { min: -40, max: -80 },
            speedX: { min: -10, max: 10 },
            lifespan: 6000,
            frequency: 150,
            blendMode: 'ADD',
            angle: { min: 0, max: 360 },
            quantity: 2
        });
        embers.setScrollFactor(0.4);
        embers.setDepth(9991);

        // ==== SPARKLES ====
        // Small twinkling particles
        const sparkles = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            scale: { start: 0.3, end: 0.6, ease: 'Sine.easeInOut' },
            alpha: { start: 0.9, end: 0, ease: 'Cubic.easeOut' },
            tint: [0xffffff, 0xffffee, 0xffffcc],
            speed: 0,
            lifespan: 1500,
            frequency: 100,
            blendMode: 'ADD',
            angle: { min: 0, max: 360 },
            quantity: 2
        });
        sparkles.setScrollFactor(0.6);
        sparkles.setDepth(9992);

        // ==== ANIMATED BUTTERFLIES ====
        // Create butterfly animations if they don't exist
        const butterflyTypes = ['blue', 'grey', 'pink', 'red', 'white', 'yellow'];
        butterflyTypes.forEach(color => {
            const key = `butterfly_${color}`;
            if (!this.anims.exists(`${key}_fly`)) {
                this.anims.create({
                    key: `${key}_fly`,
                    frames: this.anims.generateFrameNumbers(key, { start: 0, end: 4 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
        });

        // Spawn butterflies in groups at random world positions
        this.butterflies = [];
        const numGroups = 20; // Number of butterfly groups (optimized for performance - approx 100 butterflies)
        const butterfliesPerGroup = Phaser.Math.Between(3, 8); // 3-8 butterflies per group
        const worldSize = this.gameData.world.size * GameConfig.GAME.TILE_SIZE;

        for (let g = 0; g < numGroups; g++) {
            // Pick a random group center position
            const groupCenterX = Phaser.Math.Between(300, worldSize - 300);
            const groupCenterY = Phaser.Math.Between(300, worldSize - 300);
            const groupSize = Phaser.Math.Between(3, 8); // Vary group size

            for (let i = 0; i < groupSize; i++) {
                const randomType = Phaser.Math.RND.pick(butterflyTypes);

                // Spawn within 100 pixels of group center
                const butterfly = this.add.sprite(
                    groupCenterX + Phaser.Math.Between(-100, 100),
                    groupCenterY + Phaser.Math.Between(-100, 100),
                    `butterfly_${randomType}`
                );

                butterfly.setScale(1.2); // Smaller size
                butterfly.setDepth(50); // Above ground, below players/enemies
                butterfly.setAlpha(0.9); // Slightly transparent

                // Play animation
                try {
                    butterfly.play(`butterfly_${randomType}_fly`);
                } catch (e) {
                    console.warn('Failed to play butterfly animation:', e);
                }

                // Store initial position for movement bounds
                const homeX = butterfly.x;
                const homeY = butterfly.y;
                const roamRadius = 200; // How far butterflies can wander

                // Continuous random movement pattern
                const moveButterfly = () => {
                    this.tweens.add({
                        targets: butterfly,
                        x: homeX + Phaser.Math.Between(-roamRadius, roamRadius),
                        y: homeY + Phaser.Math.Between(-roamRadius, roamRadius),
                        duration: Phaser.Math.Between(2000, 5000),
                        ease: 'Sine.easeInOut',
                        onComplete: moveButterfly
                    });
                };

                // Start movement after random delay
                this.time.delayedCall(Phaser.Math.Between(0, 3000), moveButterfly);

                // Random flip for variety
                this.tweens.add({
                    targets: butterfly,
                    scaleX: { from: 1.2, to: -1.2 },
                    duration: Phaser.Math.Between(1500, 3000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Linear'
                });

                // Slight vertical bobbing
                this.tweens.add({
                    targets: butterfly,
                    y: butterfly.y + Phaser.Math.Between(-15, 15),
                    duration: Phaser.Math.Between(800, 1500),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.butterflies.push(butterfly);
            }
        }

        console.log(`🦋 Spawned ${this.butterflies.length} butterflies in ${numGroups} groups across the world`);

        // ==== BIRDS ====
        // Check if bird texture is loaded
        if (!this.textures.exists('bird')) {
            console.error('❌ Bird texture not loaded! Skipping bird spawning.');
        } else {

            // Create bird animation (flying = frames 8-15)
            if (!this.anims.exists('bird_fly')) {
                this.anims.create({
                    key: 'bird_fly',
                    frames: this.anims.generateFrameNumbers('bird', { start: 8, end: 15 }),
                    frameRate: 12,
                    repeat: -1
                });
                console.log('✅ Created bird_fly animation');
            }

            // Spawn birds that fly across the world
            this.birds = [];
            const numBirds = 50; // Optimized for performance

            console.log(`Starting to create ${numBirds} birds. World size: ${worldSize}`);

            // Bird color variations
            const birdColors = [
                0xffffff, // White
                0xff6633, // Red/orange
                0x3366ff, // Blue
                0x8B4513, // Brown
                0x808080, // Gray
                0xffcc00, // Yellow
                0x000000, // Black
                0xff99cc  // Pink
            ];

            for (let i = 0; i < numBirds; i++) {
                // Spread birds across entire world
                const startX = (i / numBirds) * worldSize;
                const startY = Phaser.Math.Between(100, 500);

                const bird = this.add.sprite(startX, startY, 'bird', 8); // Use frame 8 (first flying frame)

                bird.setScale(3); // Good visible size
                bird.setDepth(10000); // Above players (players are usually < 1000)
                bird.setAlpha(0.9); // Slightly transparent so not too distracting
                bird.setScrollFactor(1); // Move with world

                // Apply random color tint
                const randomColor = Phaser.Math.RND.pick(birdColors);
                bird.setTint(randomColor);

                // Play animation
                try {
                    bird.play('bird_fly');
                    if (i === 0) {
                        console.log('Bird animation started successfully');
                    }
                } catch (e) {
                    console.error('Failed to play bird animation:', e);
                }

                // Birds fly continuously across the world
                const goingRight = i % 2 === 0; // Alternate directions
                bird.setFlipX(!goingRight);

                const flyBird = () => {
                    const direction = goingRight ? 1 : -1;
                    const speed = 100; // Pixels per second
                    const distance = worldSize + 200;
                    const duration = (distance / speed) * 1000;

                    this.tweens.add({
                        targets: bird,
                        x: goingRight ? worldSize + 100 : -100,
                        y: bird.y + Phaser.Math.Between(-50, 50), // Slight vertical variation
                        duration: duration,
                        ease: 'Linear',
                        onComplete: () => {
                            // Reset to opposite side
                            bird.x = goingRight ? -100 : worldSize + 100;
                            bird.y = Phaser.Math.Between(100, 600);
                            flyBird();
                        }
                    });
                };

                // Start flying immediately
                flyBird();

                // Slight vertical bobbing while flying
                this.tweens.add({
                    targets: bird,
                    y: bird.y + Phaser.Math.Between(-20, 20),
                    duration: Phaser.Math.Between(1000, 2000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.birds.push(bird);
            }

            console.log(`🐦 Spawned ${numBirds} birds flying across the world`);
        }

        // ==== GOD RAYS / LIGHT SHAFTS ====
        // Create animated light rays
        this.godRays = [];
        for (let i = 0; i < 3; i++) {
            const ray = this.add.rectangle(
                width * (0.2 + i * 0.3),
                -100,
                80,
                height + 200,
                0xffffdd,
                0.04
            );
            ray.setOrigin(0.5, 0);
            ray.setScrollFactor(0.2);
            ray.setDepth(9988);
            ray.setBlendMode(Phaser.BlendModes.ADD);
            ray.setAngle(15 + i * 5);
            this.godRays.push(ray);

            // Animate the ray
            this.tweens.add({
                targets: ray,
                alpha: { from: 0.04, to: 0.08 },
                duration: 3000 + i * 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // ==== DEPTH FOG LAYERS ====
        // Create multiple fog layers for depth
        const fogLayers = [
            { distance: 0.8, color: 0x9999ff, alpha: 0.03 },
            { distance: 0.6, color: 0xaaaaee, alpha: 0.04 },
            { distance: 0.4, color: 0xccccff, alpha: 0.05 }
        ];

        fogLayers.forEach((layer, index) => {
            const fog = this.add.rectangle(0, 0, width * 2, height * 2, layer.color, layer.alpha);
            fog.setOrigin(0, 0);
            fog.setScrollFactor(layer.distance);
            fog.setDepth(9987 - index);
            fog.setBlendMode(Phaser.BlendModes.ADD);
        });

        // COLOR GRADING, CONTRAST, and VIGNETTE removed for cleaner visuals

        console.log('✨ Advanced atmospheric effects added (particles, fog, god rays)');
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

        // Handle Aldric attack animations (aldric_attack, aldric_attack2, aldric_attack3)
        if (data.abilityName && data.abilityName.startsWith('aldric_attack')) {
            console.log(`⚔️ Playing Aldric attack visual: ${data.abilityName}`);

            if (this.anims.exists(data.abilityName)) {
                caster.spriteRenderer.sprite.play(data.abilityName);

                // Play corresponding sound
                const soundMap = {
                    'aldric_attack': 'aldric_attack1',
                    'aldric_attack2': 'aldric_attack2',
                    'aldric_attack3': 'aldric_attack3'
                };
                const soundKey = soundMap[data.abilityName];
                if (soundKey && this.sound) {
                    this.sound.play(soundKey, { volume: 0.25 });
                }

                // Return to appropriate animation when attack completes
                caster.spriteRenderer.sprite.once('animationcomplete', (anim) => {
                    if (anim.key === data.abilityName || anim.key.startsWith('aldric_attack')) {
                        // Check current movement state and play correct animation
                        const idleAnimKey = 'aldric_idle';
                        const runningAnimKey = 'aldric_running';

                        // Play running animation if currently moving, otherwise idle
                        if (caster.spriteRenderer.isMoving) {
                            if (this.anims.exists(runningAnimKey)) {
                                caster.spriteRenderer.sprite.play(runningAnimKey, true);
                            }
                        } else {
                            if (this.anims.exists(idleAnimKey)) {
                                caster.spriteRenderer.sprite.play(idleAnimKey, true);
                            }
                        }
                    }
                });
            }
            return;
        }

        // Handle Kelise swipe attacks
        if (data.abilityName && data.abilityName === 'kelise_attack') {
            console.log(`⚔️ Playing Kelise attack visual`);
            if (this.anims.exists('kelise_attack')) {
                caster.spriteRenderer.sprite.play('kelise_attack');
                if (this.sound) {
                    this.sound.play('swipe', { volume: 0.2 });
                }

                // Return to appropriate animation when attack completes
                caster.spriteRenderer.sprite.once('animationcomplete', (anim) => {
                    if (anim.key === 'kelise_attack') {
                        // Check current movement state and play correct animation
                        const idleAnimKey = 'kelise_idle';
                        const runningAnimKey = 'kelise_running';

                        // Play running animation if currently moving, otherwise idle
                        if (caster.spriteRenderer.isMoving) {
                            if (this.anims.exists(runningAnimKey)) {
                                caster.spriteRenderer.sprite.play(runningAnimKey, true);
                            }
                        } else {
                            if (this.anims.exists(idleAnimKey)) {
                                caster.spriteRenderer.sprite.play(idleAnimKey, true);
                            }
                        }
                    }
                });
            }
            return;
        }

        // ONLY handle Command Bolt from here - ignore everything else
        if (data.abilityName !== 'Command Bolt') {
            // Not a Command Bolt, nothing else to do
            return;
        }

        // Find the target minion (only for Command Bolt)
        const targetMinion = this.minions[data.targetMinionId];
        if (!targetMinion || !targetMinion.sprite) {
            console.warn(`⚠️ Cannot play Command Bolt visual: target minion not found`);
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

        // Staggered domino effect - 250ms delay between each explosion
        effects.minions.forEach((minionData, index) => {
            const delay = index * 250;
            const { explosionX, explosionY, minionId, teleportX, teleportY } = minionData;

            this.time.delayedCall(delay, () => {
                // Play explosion sound effect (quieter)
                if (this.sound) {
                    this.sound.play('minionexplosion', { volume: 0.15 });
                }

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
        });
    }

    playBattleRushVisual(effects, playerId) {
        console.log(`🏃 Playing Battle Rush visual effect`, effects);

        if (!effects.position) {
            console.warn('⚠️ No position data for Battle Rush visual');
            return;
        }

        // Find the player who used the ability
        const player = this.otherPlayers[playerId];
        if (!player || !player.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Battle Rush visual`);
            return;
        }

        // Get dash direction
        const facingRight = effects.facingRight !== false;
        const direction = facingRight ? 1 : -1;
        const dashDistance = effects.distance || 200;

        // Play running attack animation if available
        if (player.spriteRenderer && player.spriteRenderer.sprite) {
            const runAttackKey = 'aldric_run_attack';
            if (this.anims.exists(runAttackKey)) {
                player.spriteRenderer.sprite.stop();
                player.spriteRenderer.sprite.play(runAttackKey, true);
            }
        }

        // Visual feedback
        player.sprite.setAlpha(0.5);

        // Dash forward
        const startX = player.sprite.x;
        const endX = startX + (direction * dashDistance);

        this.tweens.add({
            targets: player.sprite,
            x: endX,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                player.sprite.setAlpha(1);
            }
        });

        console.log(`✅ Battle Rush visual played for ${playerId}`);
    }

    playKeliseDashVisual(effects, playerId) {
        console.log(`⚔️ Playing Kelise Dash Strike visual effect`, effects);

        if (!effects.position) {
            console.warn('⚠️ No position data for Kelise Dash Strike visual');
            return;
        }

        // Find the player who used the ability
        const player = this.otherPlayers[playerId];
        if (!player || !player.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Kelise Dash Strike visual`);
            return;
        }

        // Get dash direction
        const facingRight = effects.facingRight !== false;
        const direction = facingRight ? 1 : -1;
        const dashDistance = effects.range || 200;

        // Play Kelise attack animation
        if (player.spriteRenderer && player.spriteRenderer.sprite) {
            const attackKey = 'kelise_attack';
            if (this.anims.exists(attackKey)) {
                player.spriteRenderer.sprite.stop();
                player.spriteRenderer.sprite.play(attackKey, true);
            }
        }

        // Visual feedback
        player.sprite.setAlpha(0.7);

        // Dash forward
        const startX = player.sprite.x;
        const endX = startX + (direction * dashDistance);

        this.tweens.add({
            targets: player.sprite,
            x: endX,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                player.sprite.setAlpha(1);
            }
        });

        console.log(`✅ Kelise Dash Strike visual played for ${playerId}`);
    }

    playOrionArrowBarrageVisual(effects, playerId) {
        console.log(`🏹 Playing Orion Arrow Barrage visual effect`, effects);

        if (!effects.position || !effects.direction) {
            console.warn('⚠️ No position or direction data for Arrow Barrage visual');
            return;
        }

        // Find the player who used the ability
        const player = this.otherPlayers[playerId];
        if (!player || !player.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Arrow Barrage visual`);
            return;
        }

        const duration = effects.duration || 10000;
        const volleyInterval = effects.volleyInterval || 1000;
        const arrowsPerVolley = effects.arrowsPerVolley || 5;
        const coneSpread = effects.coneSpread || 30;
        const initialDirection = effects.direction;  // Store initial direction as fallback

        console.log(`🏹 Starting Arrow Barrage for other player - ${Math.floor(duration / volleyInterval)} volleys`);
        console.log(`🏹 Initial Direction: (${initialDirection.x.toFixed(2)}, ${initialDirection.y.toFixed(2)})`);

        // Track barrage state and last known direction
        let volleyCount = 0;
        const maxVolleys = Math.floor(duration / volleyInterval);
        let lastDirection = initialDirection;

        // Start the barrage
        const barrageInterval = this.time.addEvent({
            delay: volleyInterval,
            callback: () => {
                if (volleyCount >= maxVolleys || !player.isAlive) {
                    barrageInterval.remove();
                    console.log('🏹 Arrow Barrage complete for other player');
                    return;
                }

                // Get current facing direction of the player
                let currentDirection = lastDirection;

                // Try to get direction from player's current movement
                if (player.targetPosition) {
                    // Player is moving - calculate direction from current position to target
                    const dx = player.targetPosition.x - player.sprite.x;
                    const dy = player.targetPosition.y - player.sprite.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 1) {
                        currentDirection = {
                            x: dx / distance,
                            y: dy / distance
                        };
                        lastDirection = currentDirection; // Update last known direction
                    }
                } else if (player.sprite.body && (player.sprite.body.velocity.x !== 0 || player.sprite.body.velocity.y !== 0)) {
                    // Try to get direction from velocity
                    const vx = player.sprite.body.velocity.x;
                    const vy = player.sprite.body.velocity.y;
                    const magnitude = Math.sqrt(vx * vx + vy * vy);

                    if (magnitude > 0) {
                        currentDirection = {
                            x: vx / magnitude,
                            y: vy / magnitude
                        };
                        lastDirection = currentDirection; // Update last known direction
                    }
                }
                // If player isn't moving, use lastDirection (either from previous volley or initial)

                // Calculate base angle from the current direction
                const baseAngle = Math.atan2(currentDirection.y, currentDirection.x);

                // Shoot arrows in a cone
                for (let i = 0; i < arrowsPerVolley; i++) {
                    // Calculate spread angle for this arrow
                    const spreadRange = (coneSpread * Math.PI) / 180;
                    const angleOffset = (i / (arrowsPerVolley - 1) - 0.5) * spreadRange;
                    const arrowAngle = baseAngle + angleOffset;

                    // Calculate arrow direction
                    const arrowDirection = {
                        x: Math.cos(arrowAngle),
                        y: Math.sin(arrowAngle)
                    };

                    // Create the arrow projectile visual
                    this.createArrowProjectileVisual(player.sprite.x, player.sprite.y, arrowDirection);
                }

                volleyCount++;
            },
            loop: true
        });

        // Fire the first volley immediately
        barrageInterval.callback();

        console.log(`✅ Arrow Barrage visual started for ${playerId}`);
    }

    playOrionShadowRollVisual(effects, playerId) {
        console.log(`🌀 Playing Orion Shadow Roll visual effect`, effects);

        if (!effects.position || !effects.direction) {
            console.warn('⚠️ No position or direction data for Shadow Roll visual');
            return;
        }

        // Find the player who used the ability
        const player = this.otherPlayers[playerId];
        if (!player || !player.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Shadow Roll visual`);
            return;
        }

        const rollDistance = effects.range || 250;
        const rollDuration = effects.duration || 700;
        const direction = effects.direction;

        console.log(`🌀 Shadow Roll for other player - Distance: ${rollDistance}px, Duration: ${rollDuration}ms`);

        // Play roll animation if the player has one
        if (player.spriteRenderer && player.spriteRenderer.sprite) {
            if (this.anims.exists('orion_roll')) {
                player.spriteRenderer.sprite.play('orion_roll', true);
            }
        }

        const startX = player.sprite.x;
        const startY = player.sprite.y;
        const endX = startX + (direction.x * rollDistance);
        const endY = startY + (direction.y * rollDistance);

        // Create roll trail effect with purple arcane theme
        const trail = this.add.graphics();
        trail.setDepth(player.sprite.depth - 1);

        // Draw trail
        trail.lineStyle(4, 0x9370DB, 0.7); // Purple arcane color
        trail.beginPath();
        trail.moveTo(startX, startY);
        trail.lineTo(endX, endY);
        trail.strokePath();

        // Fade out trail
        this.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 400,
            onComplete: () => {
                trail.destroy();
            }
        });

        // Create afterimage effects during roll
        const afterimageCount = 5;
        const afterimageInterval = rollDuration / afterimageCount;

        for (let i = 0; i < afterimageCount; i++) {
            this.time.delayedCall(afterimageInterval * i, () => {
                if (player.sprite && player.spriteRenderer && player.spriteRenderer.sprite) {
                    const afterimage = this.add.sprite(
                        player.sprite.x,
                        player.sprite.y,
                        'orion'
                    );

                    // Match current frame and flip
                    afterimage.setFrame(player.spriteRenderer.sprite.frame.name);
                    afterimage.setFlipX(player.spriteRenderer.sprite.flipX);
                    afterimage.setScale(player.spriteRenderer.sprite.scaleX);
                    afterimage.setDepth(player.sprite.depth - 1);
                    afterimage.setTint(0x9370DB); // Purple tint
                    afterimage.setAlpha(0.5);

                    // Fade out afterimage
                    this.tweens.add({
                        targets: afterimage,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => afterimage.destroy()
                    });
                }
            });
        }

        // Perform the roll
        this.tweens.add({
            targets: player.sprite,
            x: endX,
            y: endY,
            duration: rollDuration,
            ease: 'Power2',
            onComplete: () => {
                console.log('🌀 Roll complete for other player');

                // Flash effect when ending
                if (player.sprite) {
                    this.tweens.add({
                        targets: player.sprite,
                        alpha: 0.7,
                        duration: 50,
                        yoyo: true,
                        repeat: 1
                    });
                }

                // Reset animation state
                if (player.spriteRenderer && player.spriteRenderer.sprite) {
                    player.spriteRenderer.isMoving = false;
                    if (this.anims.exists('orion_idle')) {
                        player.spriteRenderer.sprite.play('orion_idle', true);
                    }
                }
            }
        });

        console.log(`✅ Shadow Roll visual started for ${playerId}`);
    }

    playLunareBoomerangVisual(effects, playerId) {
        console.log(`⭐ Playing Lunare Boomerang Star visual effect`, effects);

        if (!effects.position || !effects.direction) {
            console.warn('⚠️ No position or direction data for Boomerang visual');
            return;
        }

        // Find the player
        const player = this.otherPlayers[playerId];
        if (!player || !player.spriteRenderer || !player.spriteRenderer.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Boomerang visual`);
            return;
        }

        // Switch player to "without boomerang" animation
        if (player.spriteRenderer.underglow) {
            player.spriteRenderer.underglowFollowsPlayer = false;
            const body = player.sprite.body;
            if (body) {
                const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
                const animKey = isMoving ? 'lunare_running_noboomerang' : 'lunare_idle_noboomerang';
                if (this.anims.exists(animKey)) {
                    player.spriteRenderer.sprite.play(animKey, true);
                }
            }
        }

        const startPos = effects.position;
        const direction = effects.direction;
        const range = effects.range || 300;
        const duration = effects.duration || 2000;

        // Calculate curve points
        const perpX = -direction.y;
        const perpY = direction.x;
        const arcOffset = range * 0.8;

        const midX = startPos.x + (direction.x * range * 0.5) + (perpX * arcOffset);
        const midY = startPos.y + (direction.y * range * 0.5) + (perpY * arcOffset);
        const endX = startPos.x + (direction.x * range);
        const endY = startPos.y + (direction.y * range);

        // Create star graphic
        const star = this.add.graphics();
        star.x = startPos.x;
        star.y = startPos.y - 10;

        const starSize = 12;
        star.fillStyle(0xFF0000, 1);
        star.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = (i % 2 === 0) ? starSize : starSize * 0.4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                star.moveTo(x, y);
            } else {
                star.lineTo(x, y);
            }
        }
        star.closePath();
        star.fillPath();

        const glow = this.add.circle(star.x, star.y, starSize * 1.5, 0xFF6B6B, 0.3);
        glow.setDepth(1);
        star.setDepth(2);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        const underglow = player.spriteRenderer.underglow;
        const outwardTime = duration * 0.5;
        const returnTime = duration * 0.4;

        // Spinning
        this.tweens.add({
            targets: star,
            rotation: Math.PI * 6,
            duration: outwardTime + returnTime,
            ease: 'Linear'
        });

        // Outward path
        this.tweens.add({
            targets: { t: 0 },
            t: 1,
            duration: outwardTime,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const t = tween.getValue();
                const oneMinusT = 1 - t;
                const x = oneMinusT * oneMinusT * startPos.x +
                         2 * oneMinusT * t * midX +
                         t * t * endX;
                const y = oneMinusT * oneMinusT * startPos.y +
                         2 * oneMinusT * t * midY +
                         t * t * endY;

                star.x = x;
                star.y = y;
                glow.x = x;
                glow.y = y;

                if (underglow) {
                    underglow.setPosition(x, y);
                }
            },
            onComplete: () => {
                // Return path
                this.tweens.add({
                    targets: [star, glow],
                    x: player.spriteRenderer.sprite.x,
                    y: player.spriteRenderer.sprite.y,
                    duration: returnTime,
                    ease: 'Sine.easeIn',
                    onUpdate: () => {
                        if (underglow) {
                            underglow.setPosition(star.x, star.y);
                        }
                    },
                    onComplete: () => {
                        star.destroy();
                        glow.destroy();

                        // Return underglow and animation
                        if (underglow && player.spriteRenderer.sprite) {
                            underglow.setPosition(
                                player.spriteRenderer.sprite.x,
                                player.spriteRenderer.sprite.y + 20
                            );
                            player.spriteRenderer.underglowFollowsPlayer = true;

                            const body = player.sprite.body;
                            if (body) {
                                const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
                                const animKey = isMoving ? 'lunare_running' : 'lunare_idle';
                                if (this.anims.exists(animKey)) {
                                    player.spriteRenderer.sprite.play(animKey, true);
                                }
                            }
                        }
                    }
                });
            }
        });

        console.log(`✅ Boomerang Star visual started for ${playerId}`);
    }

    playLunareShadowVortexVisual(effects, playerId) {
        console.log(`🌀 Playing Lunare Shadow Vortex visual effect`, effects);

        if (!effects.position || !effects.vortexPosition) {
            console.warn('⚠️ No position data for Shadow Vortex visual');
            return;
        }

        // Find the player
        const player = this.otherPlayers[playerId];
        if (!player || !player.spriteRenderer || !player.spriteRenderer.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Shadow Vortex visual`);
            return;
        }

        // Switch player to "without boomerang" animation
        if (player.spriteRenderer.underglow) {
            player.spriteRenderer.underglowFollowsPlayer = false;
            const body = player.sprite.body;
            if (body) {
                const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
                const animKey = isMoving ? 'lunare_running_noboomerang' : 'lunare_idle_noboomerang';
                if (this.anims.exists(animKey)) {
                    player.spriteRenderer.sprite.play(animKey, true);
                }
            }
        }

        const startPos = effects.position;
        const vortexPos = effects.vortexPosition;
        const holdDuration = effects.holdDuration || 3000;
        const pullRadius = effects.pullRadius || 200;
        const range = effects.range || 300;
        const direction = effects.direction;

        // Calculate curve points
        const perpX = -direction.y;
        const perpY = direction.x;
        const arcOffset = range * 0.8;
        const midX = startPos.x + (direction.x * range * 0.5) + (perpX * arcOffset);
        const midY = startPos.y + (direction.y * range * 0.5) + (perpY * arcOffset);

        // Create star graphic
        const star = this.add.graphics();
        star.x = startPos.x;
        star.y = startPos.y - 10;

        const starSize = 12;
        star.fillStyle(0xFF0000, 1);
        star.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = (i % 2 === 0) ? starSize : starSize * 0.4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                star.moveTo(x, y);
            } else {
                star.lineTo(x, y);
            }
        }
        star.closePath();
        star.fillPath();

        const glow = this.add.circle(star.x, star.y, starSize * 1.5, 0xFF6B6B, 0.3);
        glow.setDepth(1);
        star.setDepth(2);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        const underglow = player.spriteRenderer.underglow;
        const speed = 250;
        const outwardTime = (range / speed) * 1000;
        const returnTime = outwardTime * 0.8;

        // Spinning
        this.tweens.add({
            targets: star,
            rotation: Math.PI * 10,
            duration: outwardTime + holdDuration + returnTime,
            ease: 'Linear'
        });

        // Outward path
        this.tweens.add({
            targets: { t: 0 },
            t: 1,
            duration: outwardTime,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const t = tween.getValue();
                const oneMinusT = 1 - t;
                const x = oneMinusT * oneMinusT * startPos.x +
                         2 * oneMinusT * t * midX +
                         t * t * vortexPos.x;
                const y = oneMinusT * oneMinusT * startPos.y +
                         2 * oneMinusT * t * midY +
                         t * t * vortexPos.y;

                star.x = x;
                star.y = y;
                glow.x = x;
                glow.y = y;

                if (underglow) {
                    underglow.setPosition(x, y);
                }
            },
            onComplete: () => {
                // Create vortex visual
                const vortexCircle = this.add.circle(vortexPos.x, vortexPos.y, pullRadius, 0xFF0000, 0.1);
                vortexCircle.setDepth(0);
                vortexCircle.setBlendMode(Phaser.BlendModes.ADD);

                // Pulsing effect
                this.tweens.add({
                    targets: vortexCircle,
                    alpha: 0.2,
                    scale: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: Math.floor(holdDuration / 1000)
                });

                // Explosion right before returning
                this.time.delayedCall(holdDuration - 100, () => {
                    console.log(`💥 Vortex explosion visual effect (multiplayer)`);

                    // Large explosion flash
                    const explosionFlash = this.add.circle(vortexPos.x, vortexPos.y, pullRadius, 0xFF0000, 0.6);
                    explosionFlash.setDepth(10);
                    explosionFlash.setBlendMode(Phaser.BlendModes.ADD);

                    this.tweens.add({
                        targets: explosionFlash,
                        scale: 1.3,
                        alpha: 0,
                        duration: 300,
                        ease: 'Cubic.easeOut',
                        onComplete: () => explosionFlash.destroy()
                    });

                    // Explosion particles
                    for (let i = 0; i < 16; i++) {
                        const angle = (Math.PI * 2 * i) / 16;
                        const particle = this.add.circle(
                            vortexPos.x,
                            vortexPos.y,
                            6,
                            0xFF0000
                        );
                        particle.setDepth(10);
                        particle.setBlendMode(Phaser.BlendModes.ADD);

                        this.tweens.add({
                            targets: particle,
                            x: vortexPos.x + Math.cos(angle) * pullRadius * 0.8,
                            y: vortexPos.y + Math.sin(angle) * pullRadius * 0.8,
                            alpha: 0,
                            duration: 400,
                            ease: 'Cubic.easeOut',
                            onComplete: () => particle.destroy()
                        });
                    }
                });

                // After hold duration, return
                this.time.delayedCall(holdDuration, () => {
                    vortexCircle.destroy();

                    // Return path
                    this.tweens.add({
                        targets: [star, glow],
                        x: player.spriteRenderer.sprite.x,
                        y: player.spriteRenderer.sprite.y,
                        duration: returnTime,
                        ease: 'Sine.easeIn',
                        onUpdate: () => {
                            if (underglow) {
                                underglow.setPosition(star.x, star.y);
                            }
                        },
                        onComplete: () => {
                            star.destroy();
                            glow.destroy();

                            // Return underglow and animation
                            if (underglow && player.spriteRenderer.sprite) {
                                underglow.setPosition(
                                    player.spriteRenderer.sprite.x,
                                    player.spriteRenderer.sprite.y + 20
                                );
                                player.spriteRenderer.underglowFollowsPlayer = true;

                                const body = player.sprite.body;
                                if (body) {
                                    const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
                                    const animKey = isMoving ? 'lunare_running' : 'lunare_idle';
                                    if (this.anims.exists(animKey)) {
                                        player.spriteRenderer.sprite.play(animKey, true);
                                    }
                                }
                            }
                        }
                    });
                });
            }
        });

        console.log(`✅ Shadow Vortex visual started for ${playerId}`);
    }

    createArrowProjectileVisual(startX, startY, direction) {
        // Create arrow sprite
        const arrow = this.add.sprite(startX, startY, 'orion_projectile');
        arrow.setScale(1.0);
        arrow.setDepth(3);
        arrow.setRotation(Math.atan2(direction.y, direction.x));

        // Add physics
        this.physics.add.existing(arrow);
        arrow.body.setSize(16, 16);

        // Set velocity
        const speed = 800;  // Increased from 500 for faster arrows
        arrow.body.setVelocity(direction.x * speed, direction.y * speed);

        // Destroy after 2 seconds
        this.time.delayedCall(2000, () => {
            if (arrow && arrow.active) {
                arrow.destroy();
            }
        });
    }

    playLifeDrainVisual(effects, playerId) {
        console.log(`💀 Playing Life Drain visual effect`, effects);

        if (!effects.position) {
            console.warn('⚠️ No position data for Life Drain visual');
            return;
        }

        // Find the player who used the ability
        const player = this.otherPlayers[playerId];
        if (!player || !player.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Life Drain visual`);
            return;
        }

        const duration = effects.duration || 4000;
        const range = effects.range || 300;

        // Play sound effect
        if (this.sound) {
            this.sound.play('kelise_lifedrain', { volume: 0.4 });
        }

        // Create animation if it doesn't exist
        if (!this.anims.exists('kelise_lifedrain_aura')) {
            this.anims.create({
                key: 'kelise_lifedrain_aura',
                frames: this.anims.generateFrameNumbers('kelise_swiftdash', {
                    start: 15,
                    end: 29
                }),
                frameRate: 15,
                repeat: -1 // Loop indefinitely
            });
        }

        // Create drain visual effect (animated sprite)
        const drainAura = this.add.sprite(
            player.sprite.x,
            player.sprite.y,
            'kelise_swiftdash',
            15
        );
        drainAura.setDepth(player.sprite.depth - 1);
        drainAura.setScale(range / 32); // Scale to match the range (64px sprite to 300px range)
        drainAura.setAlpha(0.3); // More transparent to see drain lines
        drainAura.play('kelise_lifedrain_aura');

        // Update position to follow player
        const updateAura = () => {
            if (player.sprite && drainAura.active) {
                drainAura.x = player.sprite.x;
                drainAura.y = player.sprite.y;
            }
        };

        // Position update event
        const updateEvent = this.time.addEvent({
            delay: 16,
            callback: updateAura,
            loop: true
        });

        // Clean up after duration
        this.time.delayedCall(duration, () => {
            updateEvent.remove();
            drainAura.destroy();
        });

        console.log(`✅ Life Drain visual played for ${playerId}`);
    }

    playBloodHarvestVisual(effects, playerId) {
        console.log(`🩸 Playing Blood Harvest visual effect`, effects);

        if (!effects.position) {
            console.warn('⚠️ No position data for Blood Harvest visual');
            return;
        }

        // Find the player who used the ability
        const player = this.otherPlayers[playerId];
        if (!player || !player.sprite) {
            console.warn(`⚠️ Player ${playerId} not found for Blood Harvest visual`);
            return;
        }

        const duration = effects.duration || 30000; // 30 seconds

        // Play sound effect
        if (this.sound) {
            this.sound.play('kelise_bloodharvest', { volume: 0.4 });
        }

        // Create animation if it doesn't exist
        if (!this.anims.exists('kelise_bloodharvest_flash')) {
            this.anims.create({
                key: 'kelise_bloodharvest_flash',
                frames: this.anims.generateFrameNumbers('kelise_bloodharvest', {
                    start: 84,
                    end: 95
                }),
                frameRate: 30,
                repeat: 0 // Play once
            });
        }

        // Red highlight effect with animated sprite
        const redTint = this.add.sprite(
            player.sprite.x,
            player.sprite.y,
            'kelise_bloodharvest',
            84
        );
        redTint.setDepth(player.sprite.depth + 1);
        redTint.setScale(2); // Make it bigger to cover the player
        redTint.play('kelise_bloodharvest_flash');

        // Follow player
        const updateTint = () => {
            if (player.sprite && redTint.active) {
                redTint.x = player.sprite.x;
                redTint.y = player.sprite.y;
            }
        };

        const updateEvent = this.time.addEvent({
            delay: 16,
            callback: updateTint,
            loop: true
        });

        // Clean up after duration
        this.time.delayedCall(duration, () => {
            updateEvent.remove();
            redTint.destroy();
        });

        console.log(`✅ Blood Harvest visual played for ${playerId}`);
    }

    playShockwaveVisual(effects) {
        console.log(`🌊 Playing Shockwave visual effect`, effects);

        if (!effects.position) {
            console.warn('⚠️ No position data for Shockwave visual');
            return;
        }

        // Create animation if it doesn't exist
        if (!this.anims.exists('aldric_shockwave_anim')) {
            this.anims.create({
                key: 'aldric_shockwave_anim',
                frames: this.anims.generateFrameNumbers('aldric_shockwave', {
                    start: 50,
                    end: 58
                }),
                frameRate: 15,
                repeat: 0
            });
        }

        const facingRight = effects.facingRight !== undefined ? effects.facingRight : true;
        const direction = facingRight ? 1 : -1;
        const startX = effects.position.x;
        const startY = effects.position.y;

        // Create shockwave sprite
        const shockwave = this.add.sprite(startX, startY, 'aldric_shockwave', 50);
        shockwave.setDepth(9000);
        shockwave.setScale(1.5);
        shockwave.setFlipX(!facingRight);
        shockwave.play('aldric_shockwave_anim');

        // Ground impact particles
        for (let i = 0; i < 12; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.5 + (direction > 0 ? 0 : Math.PI);
            const particle = this.add.circle(
                startX,
                startY + 20,
                4 + Math.random() * 4,
                0x4169E1,
                0.8
            );
            particle.setDepth(8999);

            this.tweens.add({
                targets: particle,
                x: startX + Math.cos(angle) * (80 + Math.random() * 60),
                y: startY + 20 + Math.sin(angle) * 30,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }

        // Animate shockwave forward
        const maxDistance = 300;
        const duration = 600;

        this.tweens.add({
            targets: shockwave,
            x: startX + (direction * maxDistance),
            scaleX: 2.0 * (facingRight ? 1 : -1),
            scaleY: 2.0,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                shockwave.destroy();
            }
        });

        // Fade out shockwave
        this.tweens.add({
            targets: shockwave,
            alpha: 0,
            duration: duration,
            ease: 'Power2'
        });

        // Camera shake - only if player is close enough
        if (this.localPlayer) {
            const dx = this.localPlayer.sprite.x - effects.position.x;
            const dy = this.localPlayer.sprite.y - effects.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= 350) {
                this.cameras.main.shake(200, 0.005);
            }
        }

        // Play shockwave sound effect
        if (this.sound) {
            this.sound.play('aldric_shockwave', { volume: 0.1 });
        }

        console.log('✅ Shockwave visual effect created');
    }

    playTitansFuryVisual(effects, playerId) {
        console.log(`🔥 Playing Titan's Fury visual effect`, effects);

        if (!effects.position) {
            console.warn('⚠️ No position data for Titan\'s Fury visual');
            return;
        }

        const startX = effects.position.x;
        const startY = effects.position.y;
        const slamRadius = effects.slamRadius || 250;
        const slamCount = effects.slamCount || 3;
        const slamInterval = effects.slamInterval || 800;
        const tauntRadius = effects.tauntRadius || 400;
        const warCryDelay = 500;

        // Find the player who cast it to play protect animation
        const caster = playerId === this.localPlayer?.data?.id
            ? this.localPlayer
            : this.otherPlayers[playerId];

        if (caster && caster.spriteRenderer && caster.spriteRenderer.sprite) {
            // Play protect animation on the caster
            if (this.anims.exists('aldric_protect')) {
                caster.spriteRenderer.sprite.play('aldric_protect');
            }

            // Lock their movement
            if (caster !== this.localPlayer) {
                // Mark other player as channeling (so we don't move them)
                caster.isChanneling = true;
            }

            // Unlock after ability finishes
            const totalDuration = warCryDelay + (slamInterval * slamCount);
            this.time.delayedCall(totalDuration, () => {
                if (caster && caster.spriteRenderer && caster.spriteRenderer.sprite) {
                    caster.isChanneling = false;
                    // Return to appropriate animation
                    const idleKey = 'aldric_idle';
                    if (this.anims.exists(idleKey)) {
                        caster.spriteRenderer.sprite.play(idleKey, true);
                    }
                }
            });
        }

        // Play war cry sound
        if (this.sound) {
            this.sound.play('aldric_warcry', { volume: 0.2 });
        }

        // Create war cry visual effect (expanding ring)
        const warCryRing = this.add.circle(startX, startY, 50, 0xFF4500, 0);
        warCryRing.setStrokeStyle(4, 0xFF4500, 1);
        warCryRing.setDepth(9001);

        this.tweens.add({
            targets: warCryRing,
            radius: tauntRadius,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => warCryRing.destroy()
        });

        // Screen flash
        const flash = this.add.rectangle(
            this.cameras.main.scrollX + 640,
            this.cameras.main.scrollY + 360,
            1280, 720,
            0xFF4500, 0.3
        );
        flash.setDepth(10000);
        flash.setScrollFactor(0);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });

        // Camera shake for war cry - only if player is close enough
        if (this.localPlayer) {
            const dx = this.localPlayer.sprite.x - startX;
            const dy = this.localPlayer.sprite.y - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= 350) {
                this.cameras.main.shake(400, 0.008);
            }
        }

        // Execute ground slams
        // Note: aldric_titansfury animations/sounds not yet implemented
        // const explosionAnims = ['aldric_titansfury_1', 'aldric_titansfury_2', 'aldric_titansfury_3'];
        // const explosionStartFrames = [0, 98, 112];

        for (let i = 0; i < slamCount; i++) {
            this.time.delayedCall(warCryDelay + (slamInterval * i), () => {
                console.log(`💥 Titan's Fury slam ${i + 1}/${slamCount} visual`);

                // Create simple explosion circle instead of sprite animation
                const explosionCircle = this.add.circle(startX, startY, slamRadius * 0.5, 0xFF4500, 0.6);
                explosionCircle.setDepth(9000);

                this.tweens.add({
                    targets: explosionCircle,
                    radius: slamRadius,
                    alpha: 0,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => explosionCircle.destroy()
                });

                // Ground impact particles
                for (let j = 0; j < 12; j++) {
                    const angle = (Math.PI * 2 / 12) * j;
                    const particle = this.add.circle(
                        startX,
                        startY,
                        4 + Math.random() * 4,
                        0xFF4500,
                        0.8
                    );
                    particle.setDepth(8999);

                    this.tweens.add({
                        targets: particle,
                        x: startX + Math.cos(angle) * (slamRadius * 0.9),
                        y: startY + Math.sin(angle) * (slamRadius * 0.9),
                        alpha: 0,
                        scale: 0.3,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => particle.destroy()
                    });
                }

                // Camera shake - only if player is close enough
                if (this.localPlayer) {
                    const dx = this.localPlayer.sprite.x - startX;
                    const dy = this.localPlayer.sprite.y - startY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= 350) {
                        this.cameras.main.shake(250, 0.008);
                    }
                }

                // Play explosion sound (disabled - asset not loaded)
                // if (this.sound) {
                //     this.sound.play('aldric_titansfury', { volume: 0.5 });
                // }
            });
        }

        console.log('✅ Titan\'s Fury visual effect created');
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

    // DYNAMIC ENEMY SYSTEM: Get all enemies from all collections
    // This automatically includes any new enemy types added to the scene
    getAllEnemies() {
        // PERFORMANCE: Cache result for 100ms (reduces calls from 60/sec to 10/sec)
        const now = Date.now();
        if (this._cachedEnemies && now - this._cacheTime < 100) {
            return this._cachedEnemies;
        }

        // PERFORMANCE: Avoid creating arrays with Object.values - iterate directly
        const allEnemies = [];

        // Iterate through all enemy collections without creating intermediate arrays
        const collections = [this.enemies, this.swordDemons, this.minotaurs,
                           this.mushrooms, this.emberclaws];

        for (const collection of collections) {
            if (!collection) continue;
            for (const enemyId in collection) {
                allEnemies.push(collection[enemyId]);
            }
        }

        this._cachedEnemies = allEnemies;
        this._cacheTime = now;
        return allEnemies;
    }

    // DYNAMIC ENEMY SYSTEM: Find enemy by ID across all collections
    findEnemyById(enemyId) {
        const potentialEnemyCollections = [
            'enemies', 'swordDemons', 'minotaurs', 'mushrooms', 'emberclaws'
        ];

        for (const collectionName of potentialEnemyCollections) {
            if (this[collectionName] && this[collectionName][enemyId]) {
                return this[collectionName][enemyId];
            }
        }

        return null;
    }

    // DYNAMIC ENEMY SYSTEM: Delete enemy by ID from correct collection
    deleteEnemyById(enemyId) {
        const potentialEnemyCollections = [
            'enemies', 'swordDemons', 'minotaurs', 'mushrooms', 'emberclaws'
        ];

        for (const collectionName of potentialEnemyCollections) {
            if (this[collectionName] && this[collectionName][enemyId]) {
                delete this[collectionName][enemyId];
                return true;
            }
        }

        return false;
    }

    // Apply character's starting build (stats, minions, auto-attack)
    applyCharacterBuild(player) {
        if (!player) {
            console.error('❌ applyCharacterBuild: player is null');
            return;
        }

        const characterId = player.data?.characterId || player.class;

        // For Malachar, apply Bone Commander build
        if (characterId && characterId.toLowerCase() === 'malachar' && typeof window.getBuildById === 'function') {
            const boneCommander = window.getBuildById('bone_commander');

            if (boneCommander) {
                console.log('🦴 Applying Bone Commander build to Malachar');

                // Apply base stats
                if (boneCommander.stats) {
                    player.baseDamage = boneCommander.stats.playerDamage || 10;
                    player.baseMinionHealth = boneCommander.stats.minionHealth || 100;
                    player.baseMinionDamage = boneCommander.stats.minionDamage || 30;
                    player.minionCap = boneCommander.stats.minionCap || 5;
                }

                // Apply auto-attack
                if (boneCommander.autoAttack) {
                    player.autoAttackConfig = boneCommander.autoAttack;
                    console.log(`⚔️ Bone Commander auto-attack: ${boneCommander.autoAttack.name}`);
                }

                // Initialize Malachar Ability Handler for Q/E/R abilities
                if (typeof MalacharAbilityHandler !== 'undefined') {
                    this.malacharAbilityHandler = new MalacharAbilityHandler(this, player, boneCommander);
                    console.log(`✨ Malachar Ability Handler initialized`);
                } else {
                    console.error('❌ MalacharAbilityHandler class not found!');
                }

                // Spawn starting minions
                const networkManager = this.game.registry.get('networkManager');
                console.log(`🔍 Minion spawn check:`, {
                    hasNetworkManager: !!networkManager,
                    startingMinions: boneCommander.stats.startingMinions,
                    playerId: player.data?.id,
                    playerDataId: player.data?.id
                });

                if (networkManager && boneCommander.stats.startingMinions) {
                    const startingCount = boneCommander.stats.startingMinions;
                    console.log(`👥 Spawning ${startingCount} starting minions for player ${player.data.id}`);

                    // Get player position
                    const playerX = player.sprite.x;
                    const playerY = player.sprite.y;

                    // Spawn minions around player
                    for (let i = 0; i < startingCount; i++) {
                        console.log(`   Spawning minion ${i + 1}/${startingCount}`);

                        // Calculate spawn position in a circle around player
                        const angle = (Math.PI * 2 * i) / startingCount;
                        const spawnRadius = 80; // Spawn 80 pixels away from player
                        const spawnX = playerX + Math.cos(angle) * spawnRadius;
                        const spawnY = playerY + Math.sin(angle) * spawnRadius;

                        // Use the spawnMinion method which handles server communication
                        this.spawnMinion(spawnX, spawnY, player.data.id, true);
                    }
                    console.log(`✅ Requested ${startingCount} minions from server`);
                } else {
                    console.error('❌ Cannot spawn minions:', {
                        hasNetworkManager: !!networkManager,
                        startingMinions: boneCommander.stats.startingMinions
                    });
                }

                console.log('✅ Bone Commander build applied');
            }
        }

        // TODO: Add builds for Kelise and Aldric
    }

    // Auto-unlock abilities at specific levels with seamless notification
    checkAndUnlockAbilities(player, level) {
        if (!player) {
            console.error('❌ checkAndUnlockAbilities: player is null');
            return;
        }

        // Get character class (normalize to uppercase)
        const characterId = (player.data?.characterId || player.data?.class || player.class || '').toUpperCase();

        console.log(`🔍 Character ID: ${characterId}`);
        console.log(`🔍 Level: ${level}`);
        console.log(`🔍 player.data.characterId: ${player.data?.characterId}`);
        console.log(`🔍 player.data.class: ${player.data?.class}`);
        console.log(`🔍 player.class: ${player.class}`);
        console.log(`🔍 getAvailableChoices exists: ${typeof window.getAvailableChoices === 'function'}`);

        // For Malachar, check ability unlocks
        if (characterId && characterId.toLowerCase() === 'malachar' && typeof window.getAvailableChoices === 'function') {
            console.log(`🔍 ✅ Calling getAvailableChoices for level ${level}`);

            // Track unlocked abilities to avoid double-unlocking
            if (!this.unlockedAbilityIds) {
                this.unlockedAbilityIds = [];
            }

            const abilities = window.getAvailableChoices(level, this.unlockedAbilityIds);

            console.log(`🔍 getAvailableChoices returned:`, abilities);
            console.log(`🔍 Already unlocked abilities:`, this.unlockedAbilityIds);

            if (abilities && abilities.length > 0) {
                const ability = abilities[0]; // Only one ability per level

                console.log(`🎯 Unlocking ability:`, ability);

                // Check if already unlocked (prevent duplicates)
                if (this.unlockedAbilityIds.includes(ability.id)) {
                    return;
                }

                // Track unlocked ability IDs
                this.unlockedAbilityIds.push(ability.id);

                // Track unlocked abilities internally
                if (!this.unlockedAbilities) {
                    this.unlockedAbilities = [];
                }
                this.unlockedAbilities.push(ability);

                // Also update skillSelector for compatibility (but don't show UI)
                if (this.skillSelector) {
                    this.skillSelector.selectedSkills.push(ability);
                }

                // Register ability directly on player object so it shows in ability bar
                if (ability.abilityKey) {
                    console.log(`📝 Registering ability ${ability.name} with key ${ability.abilityKey} at level ${level}`);

                    // SAFETY CHECK: Prevent wrong abilities from being registered
                    if (level === 1 && ability.abilityKey !== 'e') {
                        console.error(`❌ BLOCKED: Attempted to register ${ability.abilityKey} at level 1 (only E should unlock)`);
                        return;
                    }
                    if (level === 5 && ability.abilityKey !== 'q') {
                        console.error(`❌ BLOCKED: Attempted to register ${ability.abilityKey} at level 5 (only Q should unlock)`);
                        return;
                    }
                    if (level === 10 && ability.abilityKey !== 'r') {
                        console.error(`❌ BLOCKED: Attempted to register ${ability.abilityKey} at level 10 (only R should unlock)`);
                        return;
                    }

                    // Initialize abilities object if needed
                    if (!player.abilities) {
                        player.abilities = {};
                    }

                    // Register ability on player (AbilityManager reads from player.abilities)
                    player.abilities[ability.abilityKey] = {
                        name: ability.name,
                        cooldown: ability.cooldown || 10000,
                        duration: ability.duration,
                        build: ability.build || {},
                        effect: ability.effects || {},
                        bonusEffect: {}
                    };

                    console.log(`✅ Ability registered:`, player.abilities[ability.abilityKey]);

                    // Force update the ability UI to show the new ability
                    if (this.abilityManager && this.abilityManager.updateCooldownUI) {
                        this.abilityManager.updateCooldownUI();
                        console.log(`🔄 Triggered ability UI update`);
                    }
                }

                // Show seamless notification instead of menu
                this.showAbilityUnlockedNotification(ability);

                console.log(`✅ Auto-unlocked ${ability.name} at level ${level}`);
            } else {
            }
        } else {
        }

        // ALDRIC: Auto-unlock abilities at specific levels
        if (characterId && characterId.toLowerCase() === 'aldric') {

            if (!player.abilities) {
                player.abilities = {};
            }

            // Track which notifications we've shown
            if (!player.shownAbilityNotifications) {
                player.shownAbilityNotifications = {};
            }

            // E - Shockwave (unlocked at level 1)
            if (level >= 1) {
                if (!player.abilities.e) {
                    console.log(`🔥 UNLOCKING SHOCKWAVE for Aldric at level ${level}`);
                    player.abilities.e = {
                        name: 'Shockwave',
                        cooldown: 10000, // 10 second cooldown
                        effect: {
                            type: 'shockwave',
                            radius: 300,
                            damage: 60
                        }
                    };
                }

                // Show notification if we haven't shown it yet
                if (!player.shownAbilityNotifications.e) {
                    this.showAbilityUnlockedNotification({
                        name: 'Shockwave',
                        description: 'Release a devastating shockwave that damages all nearby enemies.',
                        abilityKey: 'e'
                    });
                    player.shownAbilityNotifications.e = true;
                    console.log(`🎨 Finished calling showAbilityUnlockedNotification for Shockwave`);
                }
            }

            // Q - Battle Rush (unlocked at level 5)
            if (level >= 5) {
                if (!player.abilities.q) {
                    console.log(`🔥 UNLOCKING BATTLE RUSH for Aldric at level ${level}`);
                    player.abilities.q = {
                        name: 'Battle Rush',
                        cooldown: 8000, // 8 second cooldown
                        effect: {
                            type: 'dash',
                            distance: 200,
                            damage: 40,
                            iframesDuration: 300 // 0.3 seconds of invincibility
                        }
                    };
                }

                // Show notification if we haven't shown it yet
                if (!player.shownAbilityNotifications.q) {
                    this.showAbilityUnlockedNotification({
                        name: 'Battle Rush',
                        description: 'Dash forward, damaging enemies. Grants brief invincibility.',
                        abilityKey: 'q'
                    });
                    player.shownAbilityNotifications.q = true;
                    console.log(`🎨 Finished calling showAbilityUnlockedNotification for Battle Rush`);
                }
            }

            // R - Titan's Fury (unlocked at level 10)
            if (level >= 10) {
                if (!player.abilities.r) {
                    console.log(`🔥 UNLOCKING TITAN'S FURY for Aldric at level ${level}`);
                    player.abilities.r = {
                        name: "Titan's Fury",
                        cooldown: 20000,
                        levelRequired: 10,
                        effect: {
                            type: "war_cry_slam",
                            tauntDuration: 2000,
                            tauntRadius: 400,
                            slamCount: 3,
                            slamInterval: 800,
                            slamRadius: 250,
                            damagePerSlam: 80,
                            knockback: 100,
                            slowDuration: 1500
                        }
                    };
                }

                if (!player.shownAbilityNotifications.r) {
                    this.showAbilityUnlockedNotification({
                        name: "Titan's Fury",
                        description: 'Unleash a devastating war cry followed by three ground slams.',
                        abilityKey: 'r'
                    });
                    player.shownAbilityNotifications.r = true;
                    console.log(`🎨 Finished calling showAbilityUnlockedNotification for Titan's Fury`);
                }
            }

            // Force update ability UI
            if (this.abilityManager && this.abilityManager.updateCooldownUI) {
                this.abilityManager.updateCooldownUI();
            }
        }

        // KELISE: Auto-unlock abilities at specific levels
        if (characterId && characterId.toLowerCase() === 'kelise') {

            if (!player.abilities) {
                player.abilities = {};
            }

            // Track which notifications we've shown
            if (!player.shownAbilityNotifications) {
                player.shownAbilityNotifications = {};
            }

            // E - Dash Strike (unlocked at level 1)
            if (level >= 1) {
                if (!player.abilities.e) {
                    console.log(`🔥 UNLOCKING DASH STRIKE for Kelise at level ${level}`);
                    player.abilities.e = {
                        name: "Dash Strike",
                        cooldown: 4000,
                        effect: {
                            type: "kelise_dash",
                            damage: 40,
                            range: 200,
                            speed: 800
                        }
                    };
                }

                // Show notification if we haven't shown it yet
                if (!player.shownAbilityNotifications.e) {
                    this.showAbilityUnlockedNotification({
                        name: 'Dash Strike',
                        description: 'Dash forward and strike enemies in your path with a devastating burst.',
                        abilityKey: 'e'
                    });
                    player.shownAbilityNotifications.e = true;
                }
            }

            // Q - Life Drain (unlocked at level 5)
            if (level >= 5) {
                if (!player.abilities.q) {
                    console.log(`🔥 UNLOCKING LIFE DRAIN for Kelise at level ${level}`);
                    player.abilities.q = {
                        name: "Life Drain",
                        cooldown: 20000,
                        effect: {
                            type: "life_drain",
                            duration: 4000,
                            healPerEnemyPerSecond: 1,
                            range: 300
                        }
                    };
                }

                if (!player.shownAbilityNotifications.q) {
                    this.showAbilityUnlockedNotification({
                        name: 'Life Drain',
                        description: 'Channel to become invincible and drain life from nearby enemies.',
                        abilityKey: 'q'
                    });
                    player.shownAbilityNotifications.q = true;
                }
            }

            // R - Blood Harvest (unlocked at level 10)
            if (level >= 10) {
                if (!player.abilities.r) {
                    console.log(`🔥 UNLOCKING BLOOD HARVEST for Kelise at level ${level}`);
                    player.abilities.r = {
                        name: "Blood Harvest",
                        cooldown: 60000,  // 60 second cooldown
                        effect: {
                            type: "blood_harvest",
                            duration: 30000  // 30 seconds
                        }
                    };
                }

                if (!player.shownAbilityNotifications.r) {
                    this.showAbilityUnlockedNotification({
                        name: 'Blood Harvest',
                        description: 'Heal for all bleed damage dealt for 30 seconds.',
                        abilityKey: 'r'
                    });
                    player.shownAbilityNotifications.r = true;
                }
            }

            // Force update ability UI
            if (this.abilityManager && this.abilityManager.updateCooldownUI) {
                this.abilityManager.updateCooldownUI();
            }
        }
    }

    // Show a sleek ability unlock notification
    showAbilityUnlockedNotification(ability) {
        try {

            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

        // Create notification container
        const notifY = height / 2 - 100;
        const notifWidth = 400;
        const notifHeight = 120;

        // Background panel with gradient effect
        const panel = this.add.rectangle(
            width / 2,
            notifY,
            notifWidth,
            notifHeight,
            0x1a1a2e,
            0.95
        );
        panel.setStrokeStyle(3, 0x8b00ff, 1);
        panel.setScrollFactor(0);
        panel.setDepth(10000);

        // Glow effect
        const glow = this.add.rectangle(
            width / 2,
            notifY,
            notifWidth + 10,
            notifHeight + 10,
            0x8b00ff,
            0.3
        );
        glow.setScrollFactor(0);
        glow.setDepth(9999);

        // "ABILITY UNLOCKED" text
        const titleText = this.add.text(
            width / 2,
            notifY - 35,
            'ABILITY UNLOCKED',
            {
                font: 'bold 16px monospace',
                fill: '#ff00ff',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(10001);

        // Ability name
        const nameText = this.add.text(
            width / 2,
            notifY - 5,
            ability.name,
            {
                font: 'bold 20px monospace',
                fill: '#00ffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        nameText.setOrigin(0.5);
        nameText.setScrollFactor(0);
        nameText.setDepth(10001);

        // Key binding hint
        const keyText = this.add.text(
            width / 2,
            notifY + 25,
            `Press [${ability.abilityKey?.toUpperCase()}] to activate`,
            {
                font: '14px monospace',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        keyText.setOrigin(0.5);
        keyText.setScrollFactor(0);
        keyText.setDepth(10001);

        // Particle burst effect
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const distance = 60;
            const particle = this.add.circle(
                width / 2,
                notifY,
                4,
                Math.random() > 0.5 ? 0xff00ff : 0x00ffff,
                1
            );
            particle.setScrollFactor(0);
            particle.setDepth(10002);

            this.tweens.add({
                targets: particle,
                x: width / 2 + Math.cos(angle) * distance,
                y: notifY + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }

        // Animate notification in
        panel.setScale(0);
        glow.setScale(0);
        titleText.setAlpha(0);
        nameText.setAlpha(0);
        keyText.setAlpha(0);

        this.tweens.add({
            targets: [panel, glow],
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: [titleText, nameText, keyText],
            alpha: 1,
            duration: 400,
            delay: 200,
            ease: 'Power2'
        });

        // Pulse glow effect
        this.tweens.add({
            targets: glow,
            alpha: 0.5,
            scale: 1.05,
            duration: 600,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
        });

        // Auto-dismiss after 3 seconds
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: [panel, glow, titleText, nameText, keyText],
                alpha: 0,
                y: notifY - 50,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    panel.destroy();
                    glow.destroy();
                    titleText.destroy();
                    nameText.destroy();
                    keyText.destroy();
                }
            });
        });
        } catch (error) {
            console.error('❌ Error showing ability notification:', error);
        }
    }
}
