// Menu Scene - Main menu with class selection
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedClass = 'warrior';
        this.selectedDifficulty = 'normal';
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Title
        const title = this.add.text(width / 2, 100, 'KLYRA', {
            font: '64px monospace',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        });
        title.setOrigin(0.5);

        // Subtitle
        const subtitle = this.add.text(width / 2, 160, 'Multiplayer Roguelike', {
            font: '20px monospace',
            fill: '#00ffff'
        });
        subtitle.setOrigin(0.5);

        // Username label
        this.add.text(width / 2, 220, 'Username:', {
            font: '18px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Username input (HTML element)
        this.usernameInput = document.createElement('input');
        this.usernameInput.type = 'text';
        this.usernameInput.id = 'username-input';
        this.usernameInput.placeholder = 'Enter your name...';
        this.usernameInput.maxLength = 20;
        this.usernameInput.value = localStorage.getItem('klyra_username') || '';
        this.usernameInput.style.cssText = `
            position: absolute;
            left: 50%;
            top: 250px;
            transform: translateX(-50%);
            width: 300px;
            padding: 10px;
            font-family: monospace;
            font-size: 16px;
            background: #1a1a1a;
            border: 2px solid #00ff00;
            color: #00ff00;
            text-align: center;
        `;
        document.body.appendChild(this.usernameInput);

        // Class Selection
        this.add.text(width / 2, 320, 'Select Class:', {
            font: '18px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Class buttons
        const classes = ['warrior', 'mage', 'rogue', 'archer', 'paladin', 'necromancer', 'malachar'];
        const startX = width / 2 - 350;
        const startY = 360;
        this.classButtons = [];

        classes.forEach((className, index) => {
            // First row: 4 classes, Second row: 3 classes (centered)
            let x, y;
            if (index < 4) {
                // Top row: 4 classes
                x = startX + (index % 4) * 240;
                y = startY;
            } else {
                // Bottom row: 3 classes (centered)
                const bottomIndex = index - 4;
                x = startX + 120 + (bottomIndex * 240);
                y = startY + 80;
            }

            const classConfig = GameConfig.CLASSES[className];
            const button = this.add.rectangle(x, y, 200, 70, 0x222222);
            button.setStrokeStyle(2, classConfig.color);
            button.setInteractive({ useHandCursor: true });

            // Character preview sprite (avatar)
            let avatar;
            if (this.textures.exists(className)) {
                // Use actual sprite if available
                avatar = this.add.sprite(x - 60, y, className);
                avatar.setScale(0.8);
                if (this.anims.exists(`${className}_idle`)) {
                    avatar.play(`${className}_idle`);
                }
            } else {
                // Fallback to colored circle
                avatar = this.add.circle(x - 60, y, 20, classConfig.color);
            }

            const text = this.add.text(x + 10, y, classConfig.name, {
                font: '16px monospace',
                fill: Phaser.Display.Color.IntegerToRGB(classConfig.color).rgba
            });
            text.setOrigin(0.5);

            button.on('pointerover', () => {
                button.setFillStyle(classConfig.color, 0.3);
            });

            button.on('pointerout', () => {
                if (className !== this.selectedClass) {
                    button.setFillStyle(0x222222);
                }
            });

            button.on('pointerdown', () => {
                this.selectClass(className);
            });

            this.classButtons.push({ button, text, avatar, className, color: classConfig.color });
        });

        // Difficulty Selection
        this.add.text(width / 2, 540, 'Difficulty:', {
            font: '18px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const difficulties = ['easy', 'normal', 'hard', 'nightmare'];
        const diffColors = [0x00ff00, 0xffff00, 0xff8800, 0xff0000];
        this.diffButtons = [];
        const diffStartX = width / 2 - 300;

        difficulties.forEach((diff, index) => {
            const x = diffStartX + index * 160;
            const y = 580;

            const button = this.add.rectangle(x, y, 140, 50, 0x222222);
            button.setStrokeStyle(2, diffColors[index]);
            button.setInteractive({ useHandCursor: true });

            const text = this.add.text(x, y, diff.toUpperCase(), {
                font: '14px monospace',
                fill: Phaser.Display.Color.IntegerToRGB(diffColors[index]).rgba
            });
            text.setOrigin(0.5);

            button.on('pointerover', () => {
                button.setFillStyle(diffColors[index], 0.3);
            });

            button.on('pointerout', () => {
                if (diff !== this.selectedDifficulty) {
                    button.setFillStyle(0x222222);
                }
            });

            button.on('pointerdown', () => {
                this.selectDifficulty(diff);
            });

            this.diffButtons.push({ button, text, difficulty: diff, color: diffColors[index] });
        });

        // Play button
        const playButton = this.add.rectangle(width / 2, height - 80, 300, 60, 0x222222);
        playButton.setStrokeStyle(3, 0x00ff00);
        playButton.setInteractive({ useHandCursor: true });

        const playText = this.add.text(width / 2, height - 80, 'PLAY', {
            font: '24px monospace',
            fill: '#00ff00'
        });
        playText.setOrigin(0.5);

        playButton.on('pointerover', () => {
            playButton.setFillStyle(0x00ff00, 0.3);
        });

        playButton.on('pointerout', () => {
            playButton.setFillStyle(0x222222);
        });

        playButton.on('pointerdown', () => {
            this.startGame();
        });

        // Select default class
        this.selectClass('warrior');
        this.selectDifficulty('normal');

        // Version text
        this.add.text(10, height - 30, 'v2.0', {
            font: '12px monospace',
            fill: '#666666'
        });
    }

    selectClass(className) {
        this.selectedClass = className;

        this.classButtons.forEach(btn => {
            if (btn.className === className) {
                btn.button.setFillStyle(btn.color, 0.5);
            } else {
                btn.button.setFillStyle(0x222222);
            }
        });
    }

    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;

        this.diffButtons.forEach(btn => {
            if (btn.difficulty === difficulty) {
                btn.button.setFillStyle(btn.color, 0.5);
            } else {
                btn.button.setFillStyle(0x222222);
            }
        });
    }

    startGame() {
        const username = this.usernameInput.value.trim();

        if (!username) {
            this.usernameInput.style.borderColor = '#ff0000';
            this.usernameInput.placeholder = 'Please enter a username!';
            return;
        }

        // Save username
        localStorage.setItem('klyra_username', username);

        // Remove input
        this.usernameInput.remove();

        // Join game
        console.log(`🎮 Joining as ${username} (${this.selectedClass}, ${this.selectedDifficulty})`);
        networkManager.joinGame(username, this.selectedClass, this.selectedDifficulty);

        // Go directly to game (instant join - no lobby)
        this.scene.start('GameScene');
    }

    shutdown() {
        // Clean up input if scene is shut down
        if (this.usernameInput && this.usernameInput.parentNode) {
            this.usernameInput.remove();
        }
    }
}
