// Boot Scene - Load assets and connect to server
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#00ff00'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
            percentText.setText(parseInt(value * 100) + '%');
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Load character sprite sheets
        // Kelise sprite sheet (32x32 frames, 1x1 tile character)
        this.load.spritesheet('kelise', 'assets/sprites/Kelise.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
        });

        // Malachar sprite sheets (individual animation files, all 140x140 frames)
        this.load.spritesheet('malachar_idle', 'assets/sprites/malachar/Idle.png', {
            frameWidth: 140,
            frameHeight: 140,
            margin: 0,
            spacing: 0
        });

        this.load.spritesheet('malachar_walk', 'assets/sprites/malachar/Walk.png', {
            frameWidth: 140,
            frameHeight: 140,
            margin: 0,
            spacing: 0
        });

        this.load.spritesheet('malachar_attack', 'assets/sprites/malachar/Attack.png', {
            frameWidth: 140,
            frameHeight: 140,
            margin: 0,
            spacing: 0
        });

        this.load.spritesheet('malachar_death', 'assets/sprites/malachar/Death.png', {
            frameWidth: 140,
            frameHeight: 140,
            margin: 0,
            spacing: 0
        });

        // Malachar's Minion sprite sheet (5 rows x 13 columns, 64x64px)
        this.load.spritesheet('malacharminion', 'assets/sprites/malacharminion.png', {
            frameWidth: 64,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });

        // Malachar's Auto Attack Effect sprite sheet (64x64px, row 2 has 15 frames)
        this.load.spritesheet('malacharautoattack', 'assets/skilleffects/malacharautoattack.png', {
            frameWidth: 64,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });

        console.log('📦 Loading sprite: kelise from assets/sprites/Kelise.png');
        console.log('📦 Loading Malachar animations:');
        console.log('  - Idle (10 frames)');
        console.log('  - Walk (8 frames)');
        console.log('  - Attack (13 frames)');
        console.log('  - Death (18 frames)');
        console.log('📦 Loading sprite: malacharminion from assets/sprites/malacharminion.png');

        // Load bone commander auto-attack aura (9 frames, 64x64px each)
        this.load.spritesheet('autoattackbonecommander', 'assets/sprites/malachar/autoattackbonecommander.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        console.log('📦 Loading sprite: autoattackbonecommander (bone commander aura)');

        // Load Legion's Call ability effect (row 3, 9 frames, 64x64px each)
        this.load.spritesheet('legionscall', 'assets/sprites/malachar/legionscall.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        console.log('📦 Loading sprite: legionscall (Legion\'s Call R ability)');

        // Load music files
        MusicManager.preload(this);

        console.log('✅ Loaded character sprites: kelise, malachar');
    }

    async create() {
        console.log('🚀 Booting game assets...');

        // Create Kelise animations (1x1 character with animated frames)
        this.anims.create({
            key: 'kelise_idle',
            frames: this.anims.generateFrameNumbers('kelise', { start: 0, end: 1 }),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'kelise_running',
            frames: this.anims.generateFrameNumbers('kelise', { start: 24, end: 31 }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'kelise_attack',
            frames: this.anims.generateFrameNumbers('kelise', { start: 64, end: 71 }),
            frameRate: 16,
            repeat: 0
        });

        this.anims.create({
            key: 'kelise_death',
            frames: this.anims.generateFrameNumbers('kelise', { start: 56, end: 63 }),
            frameRate: 10,
            repeat: 0
        });

        console.log('✅ Created Kelise animations: idle (0-1), running (24-31), attack (64-71), death (56-63)');

        // Create Malachar animations (1x1 character with 140x140 frames)
        this.anims.create({
            key: 'malachar_idle',
            frames: this.anims.generateFrameNumbers('malachar_idle', { start: 0, end: 9 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'malachar_walk',
            frames: this.anims.generateFrameNumbers('malachar_walk', { start: 0, end: 7 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'malachar_attack',
            frames: this.anims.generateFrameNumbers('malachar_attack', { start: 0, end: 12 }),
            frameRate: 16,
            repeat: 0
        });

        this.anims.create({
            key: 'malachar_death',
            frames: this.anims.generateFrameNumbers('malachar_death', { start: 0, end: 17 }),
            frameRate: 10,
            repeat: 0
        });

        console.log('✅ Created Malachar animations: idle (10 frames), walk (8 frames), attack (13 frames), death (18 frames)');

        // Create minion animations
        // 5 rows x 13 columns, 64x64px
        // Row 1 (index 0): attack animation, 13 frames (frames 0-12)
        // Row 3 (index 2): walking animation, 12 frames (frames 26-37)
        // Row 4 (index 3): idle animation, 4 frames (frames 39-42)

        this.anims.create({
            key: 'minion_idle',
            frames: this.anims.generateFrameNumbers('malacharminion', { start: 39, end: 42 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'minion_walk',
            frames: this.anims.generateFrameNumbers('malacharminion', { start: 26, end: 37 }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'minion_attack',
            frames: this.anims.generateFrameNumbers('malacharminion', { start: 0, end: 12 }),
            frameRate: 16,
            repeat: 0 // Play once, don't loop
        });

        // Malachar healing auto attack effect (row 2, 15 frames)
        this.anims.create({
            key: 'malachar_heal_attack',
            frames: this.anims.generateFrameNumbers('malacharautoattack', { start: 30, end: 44 }),
            frameRate: 20,
            repeat: 0 // Play once
        });

        // Bone Commander aura effect (row 1, tiles 0-8, 9 frames)
        // 10 sprites per row, row 1 starts at frame 10
        this.anims.create({
            key: 'bone_commander_aura',
            frames: this.anims.generateFrameNumbers('autoattackbonecommander', { start: 10, end: 18 }),
            frameRate: 12,
            repeat: 0 // Play once
        });

        // Legion's Call effect (row 3, tiles 0-8, 9 frames)
        // 10 sprites per row, row 3 starts at frame 30
        this.anims.create({
            key: 'legions_call',
            frames: this.anims.generateFrameNumbers('legionscall', { start: 30, end: 38 }),
            frameRate: 15,
            repeat: 0 // Play once
        });

        console.log('✅ Created minion animations: idle (frames 39-42), walk (frames 26-37), attack (frames 0-12)');
        console.log('✅ Created Malachar heal attack animation: (row 2, frames 30-44)');
        console.log('✅ Created Bone Commander aura animation: (row 1, frames 10-18)');
        console.log('✅ Created Legion\'s Call animation: (row 3, frames 30-38)');

        // Don't connect to server - custom menu handles that
        // Just load assets and wait for custom menu to call game.connect()
        console.log('✅ Game assets loaded - waiting for menu...');

        // Hide Phaser canvas initially (custom menu is shown)
        this.game.canvas.style.display = 'none';
    }
}
