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

        // Clean background with subtle gradient
        const bgGradient = this.add.graphics();
        bgGradient.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a1a2a, 0x1a1a2a, 1, 1, 1, 1);
        bgGradient.fillRect(0, 0, width, height);

        // Left side - Character display
        const charX = width * 0.3;
        const charY = height / 2;

        // Spotlight effect behind character
        const spotlight = this.add.graphics();
        spotlight.fillGradientStyle(0x8b0000, 0x8b0000, 0x2a0000, 0x2a0000, 0.3, 0.3, 0, 0);
        spotlight.fillEllipse(charX, charY + 50, 400, 500);

        // Character sprite - HUGE
        if (this.textures.exists('malachar')) {
            this.characterSprite = this.add.sprite(charX, charY, 'malachar');
            this.characterSprite.setScale(4);
            if (this.anims.exists('malachar_idle')) {
                this.characterSprite.play('malachar_idle');
            }

            // Smooth idle breathing animation
            this.tweens.add({
                targets: this.characterSprite,
                y: charY - 15,
                scaleX: 4.05,
                scaleY: 3.95,
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Right side - Info panel
        const panelX = width * 0.65;
        const panelY = height / 2 - 50;

        // Character name - clean typography
        const nameText = this.add.text(panelX, panelY - 100, 'MALACHAR', {
            font: 'bold 72px Arial',
            fill: '#ffffff',
            letterSpacing: 4
        });
        nameText.setOrigin(0, 0.5);

        // Accent line under name
        const accentLine = this.add.graphics();
        accentLine.fillStyle(0xff1744, 1);
        accentLine.fillRect(panelX, panelY - 60, 200, 4);

        // Character role
        this.add.text(panelX, panelY - 30, 'DARK BERSERKER', {
            font: '20px Arial',
            fill: '#888888',
            letterSpacing: 2
        });

        // Stats - clean modern layout
        const statsStartY = panelY + 40;
        const stats = [
            { label: 'STRENGTH', value: 16, color: '#ff1744', bar: 0.94 },
            { label: 'HEALTH', value: 115, color: '#00e676', bar: 0.88 },
            { label: 'DEFENSE', value: 10, color: '#00b0ff', bar: 0.67 },
            { label: 'SPEED', value: 9, color: '#ffd600', bar: 0.60 }
        ];

        stats.forEach((stat, index) => {
            const y = statsStartY + (index * 60);

            // Stat name
            this.add.text(panelX, y, stat.label, {
                font: '14px Arial',
                fill: '#666666',
                letterSpacing: 1
            });

            // Stat value
            this.add.text(panelX + 250, y, stat.value.toString(), {
                font: 'bold 32px Arial',
                fill: stat.color
            }).setOrigin(1, 0);

            // Progress bar background
            const barBg = this.add.graphics();
            barBg.fillStyle(0x222222, 1);
            barBg.fillRoundedRect(panelX, y + 30, 250, 6, 3);

            // Progress bar fill
            const barFill = this.add.graphics();
            barFill.fillStyle(parseInt(stat.color.replace('#', '0x')), 1);
            barFill.fillRoundedRect(panelX, y + 30, 250 * stat.bar, 6, 3);

            // Animate bar fill
            barFill.scaleX = 0;
            barFill.setOrigin(0, 0);
            this.tweens.add({
                targets: barFill,
                scaleX: 1,
                duration: 1000,
                delay: 200 + (index * 100),
                ease: 'Power2'
            });
        });

        this.selectedClass = 'malachar';
        this.selectedDifficulty = 'normal';

        // Play button - clean and simple
        const playY = height - 80;

        const playButtonBg = this.add.graphics();
        playButtonBg.fillStyle(0xff1744, 1);
        playButtonBg.fillRoundedRect(panelX, playY - 25, 280, 60, 4);

        const playButton = this.add.rectangle(panelX + 140, playY, 280, 60, 0x000000, 0);
        playButton.setInteractive({ useHandCursor: true });

        const playText = this.add.text(panelX + 140, playY, 'PLAY NOW', {
            font: 'bold 24px Arial',
            fill: '#ffffff',
            letterSpacing: 2
        });
        playText.setOrigin(0.5);

        playButton.on('pointerover', () => {
            playButtonBg.clear();
            playButtonBg.fillStyle(0xff4569, 1);
            playButtonBg.fillRoundedRect(panelX, playY - 25, 280, 60, 4);
            this.tweens.add({
                targets: [playButtonBg],
                scaleX: 1.02,
                scaleY: 1.05,
                duration: 150
            });
        });

        playButton.on('pointerout', () => {
            playButtonBg.clear();
            playButtonBg.fillStyle(0xff1744, 1);
            playButtonBg.fillRoundedRect(panelX, playY - 25, 280, 60, 4);
            this.tweens.add({
                targets: [playButtonBg],
                scaleX: 1,
                scaleY: 1,
                duration: 150
            });
        });

        playButton.on('pointerdown', () => {
            this.startGame();
        });

        // Version text
        this.add.text(10, height - 30, 'v2.0', {
            font: '12px monospace',
            fill: '#666666'
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
