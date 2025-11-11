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

        console.log('📦 Loading sprite: malachar from assets/sprites/malachar.png');

        // Debug: Log spritesheet info after load
        this.load.once('complete', () => {
            const texture = this.textures.get('malachar');
            const frames = texture.getFrameNames();
            console.log('🖼️ Malachar spritesheet loaded:');
            console.log('  - Total frames:', frames.length);
            console.log('  - Image size:', texture.source[0].width, 'x', texture.source[0].height);
            console.log('  - Frames per row:', Math.floor(texture.source[0].width / 64));
            console.log('  - Frame test - trying to display frame 57, 113, etc.');
        });

        console.log('✅ Loaded character sprites: malachar');
        console.log('💡 Other characters will use colored placeholders');
    }

    async create() {
        console.log('🚀 Booting game assets...');

        // Malachar uses manual frame animation (2x2 tile character)
        // No Phaser animations needed

        // Don't connect to server - custom menu handles that
        // Just load assets and wait for custom menu to call game.connect()
        console.log('✅ Game assets loaded - waiting for menu...');

        // Hide Phaser canvas initially (custom menu is shown)
        this.game.canvas.style.display = 'none';
    }
}
