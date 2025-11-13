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
        // Malachar sprite sheet
        // Actual dimensions: 2720 x 896
        // User's frame math: 113 - 57 = 56 frames per row
        // 2720 / 56 = 48.57 per frame slot
        // Try 48x48 with 1px margin between frames
        this.load.spritesheet('malachar', 'assets/sprites/malachar.png', {
            frameWidth: 48,
            frameHeight: 48,
            margin: 1,
            spacing: 0
        });

        // Malachar's Minion sprite sheet (5 rows x 13 columns, 64x64px)
        this.load.spritesheet('malacharminion', 'assets/sprites/malacharminion.png', {
            frameWidth: 64,
            frameHeight: 64,
            spacing: 0,
            margin: 0
        });

        console.log('📦 Loading sprite: malachar from assets/sprites/malachar.png');
        console.log('📦 Loading sprite: malacharminion from assets/sprites/malacharminion.png');

        // Debug: Log spritesheet info after load
        this.load.once('complete', () => {
            const texture = this.textures.get('malachar');
            const frames = texture.getFrameNames();

            // Disable texture smoothing for pixel-perfect rendering
            texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

            console.log('🖼️ Malachar spritesheet loaded:');
            console.log('  - Total frames:', frames.length);
            console.log('  - Image size:', texture.source[0].width, 'x', texture.source[0].height);
            console.log('  - Frames per row:', Math.floor(texture.source[0].width / 64));
            console.log('  - Texture filtering: NEAREST (pixel-perfect)');
        });

        console.log('✅ Loaded character sprites: malachar');
        console.log('💡 Other characters will use colored placeholders');
    }

    async create() {
        console.log('🚀 Booting game assets...');

        // Malachar uses manual frame animation (2x2 tile character)
        // No Phaser animations needed

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

        console.log('✅ Created minion animations: idle (frames 39-42), walk (frames 26-37), attack (frames 0-12)');

        // Don't connect to server - custom menu handles that
        // Just load assets and wait for custom menu to call game.connect()
        console.log('✅ Game assets loaded - waiting for menu...');

        // Hide Phaser canvas initially (custom menu is shown)
        this.game.canvas.style.display = 'none';
    }
}
