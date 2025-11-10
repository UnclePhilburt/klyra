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
        // Malachar sprite sheet (8x8 grid)
        this.load.spritesheet('malachar', 'assets/sprites/malachar.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        // Add other character sprites as they become available
        this.load.spritesheet('warrior', 'assets/sprites/warrior.png', {
            frameWidth: 64,
            frameHeight: 64
        }).on('loaderror', () => {
            console.log('Warrior sprite not found, using placeholder');
        });

        this.load.spritesheet('mage', 'assets/sprites/mage.png', {
            frameWidth: 64,
            frameHeight: 64
        }).on('loaderror', () => {
            console.log('Mage sprite not found, using placeholder');
        });

        this.load.spritesheet('rogue', 'assets/sprites/rogue.png', {
            frameWidth: 64,
            frameHeight: 64
        }).on('loaderror', () => {
            console.log('Rogue sprite not found, using placeholder');
        });

        this.load.spritesheet('archer', 'assets/sprites/archer.png', {
            frameWidth: 64,
            frameHeight: 64
        }).on('loaderror', () => {
            console.log('Archer sprite not found, using placeholder');
        });

        this.load.spritesheet('paladin', 'assets/sprites/paladin.png', {
            frameWidth: 64,
            frameHeight: 64
        }).on('loaderror', () => {
            console.log('Paladin sprite not found, using placeholder');
        });

        this.load.spritesheet('necromancer', 'assets/sprites/necromancer.png', {
            frameWidth: 64,
            frameHeight: 64
        }).on('loaderror', () => {
            console.log('Necromancer sprite not found, using placeholder');
        });
    }

    async create() {
        console.log('🚀 Booting game...');

        // Create walking animations for all characters
        this.createCharacterAnimations();

        try {
            await networkManager.connect();
            console.log('✅ Connected to server');

            // Wait a moment then go to menu
            this.time.delayedCall(500, () => {
                this.scene.start('MenuScene');
            });

        } catch (error) {
            console.error('❌ Failed to connect:', error);

            // Show error message
            const errorText = this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'Failed to connect to server\nClick to retry',
                {
                    font: '24px monospace',
                    fill: '#ff0000',
                    align: 'center'
                }
            );
            errorText.setOrigin(0.5);

            this.input.once('pointerdown', () => {
                this.scene.restart();
            });
        }
    }

    createCharacterAnimations() {
        const characters = ['warrior', 'mage', 'rogue', 'archer', 'paladin', 'necromancer', 'malachar'];

        characters.forEach(char => {
            // Check if sprite sheet loaded
            if (!this.textures.exists(char)) {
                return;
            }

            // Idle animation (first row)
            this.anims.create({
                key: `${char}_idle`,
                frames: this.anims.generateFrameNumbers(char, { start: 0, end: 7 }),
                frameRate: 8,
                repeat: -1
            });

            // Walk down animation (row 2)
            this.anims.create({
                key: `${char}_walk_down`,
                frames: this.anims.generateFrameNumbers(char, { start: 8, end: 15 }),
                frameRate: 10,
                repeat: -1
            });

            // Walk up animation (row 3)
            this.anims.create({
                key: `${char}_walk_up`,
                frames: this.anims.generateFrameNumbers(char, { start: 16, end: 23 }),
                frameRate: 10,
                repeat: -1
            });

            // Walk left animation (row 4)
            this.anims.create({
                key: `${char}_walk_left`,
                frames: this.anims.generateFrameNumbers(char, { start: 24, end: 31 }),
                frameRate: 10,
                repeat: -1
            });

            // Walk right animation (row 5)
            this.anims.create({
                key: `${char}_walk_right`,
                frames: this.anims.generateFrameNumbers(char, { start: 32, end: 39 }),
                frameRate: 10,
                repeat: -1
            });

            // Attack animation (row 6)
            this.anims.create({
                key: `${char}_attack`,
                frames: this.anims.generateFrameNumbers(char, { start: 40, end: 47 }),
                frameRate: 12,
                repeat: 0
            });

            console.log(`✅ Created animations for ${char}`);
        });
    }
}
