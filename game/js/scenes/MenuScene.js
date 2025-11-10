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

        // Bright white/cream background with subtle pattern
        this.cameras.main.setBackgroundColor('#f5f5f5');

        // Add colorful decorative elements
        this.createColorfulBackground(width, height);

        // Center card with character
        const cardX = width / 2;
        const cardY = height / 2 + 20;

        // Main card - white with soft shadow
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xffffff, 1);
        cardBg.fillRoundedRect(cardX - 300, cardY - 200, 600, 400, 24);

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.08);
        shadow.fillRoundedRect(cardX - 300, cardY - 195, 600, 400, 24);

        // Colorful accent stripe at top
        const accentStripe = this.add.graphics();
        const gradient = accentStripe.createLinearGradient(cardX - 300, 0, cardX + 300, 0);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.33, '#4ECDC4');
        gradient.addColorStop(0.66, '#FFE66D');
        gradient.addColorStop(1, '#A8E6CF');
        accentStripe.fillGradientStyle(0xFF6B6B, 0xA8E6CF, 0x4ECDC4, 0xFFE66D, 1);
        accentStripe.fillRoundedRect(cardX - 300, cardY - 200, 600, 8, 24, 24, 0, 0);

        // Character display on left side of card
        const charX = cardX - 150;
        const charDisplayY = cardY;

        // Colorful circle behind character
        const charBg = this.add.graphics();
        charBg.fillStyle(0xFFE66D, 0.2);
        charBg.fillCircle(charX, charDisplayY, 100);

        // Character sprite
        if (this.textures.exists('malachar')) {
            this.characterSprite = this.add.sprite(charX, charDisplayY, 'malachar');
            this.characterSprite.setScale(3);
            if (this.anims.exists('malachar_idle')) {
                this.characterSprite.play('malachar_idle');
            }

            // Gentle float animation
            this.tweens.add({
                targets: this.characterSprite,
                y: charDisplayY - 8,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Right side - Character info
        const infoX = cardX + 50;
        const infoY = cardY - 120;

        // Character name - colorful
        this.add.text(infoX, infoY, 'MALACHAR', {
            font: 'bold 48px Arial',
            fill: '#2C3E50',
            letterSpacing: 2
        });

        // Colorful underline
        const underline = this.add.graphics();
        underline.fillGradientStyle(0xFF6B6B, 0xA8E6CF, 0xFF6B6B, 0xA8E6CF, 1);
        underline.fillRoundedRect(infoX, infoY + 55, 180, 4, 2);

        // Role tag with bright background
        const roleTag = this.add.graphics();
        roleTag.fillStyle(0xFF6B6B, 1);
        roleTag.fillRoundedRect(infoX, infoY + 75, 160, 32, 16);

        this.add.text(infoX + 80, infoY + 91, 'DARK BERSERKER', {
            font: 'bold 14px Arial',
            fill: '#ffffff',
            letterSpacing: 1
        }).setOrigin(0.5);

        // Stats with bright colors
        const statsY = infoY + 130;
        const stats = [
            { label: 'STR', value: '16', color: 0xFF6B6B, bgColor: 0xFFE5E5 },
            { label: 'HP', value: '115', color: 0xA8E6CF, bgColor: 0xE5F9F2 },
            { label: 'DEF', value: '10', color: 0x4ECDC4, bgColor: 0xE0F7F6 },
            { label: 'SPD', value: '9', color: 0xFFE66D, bgColor: 0xFFF8E0 }
        ];

        stats.forEach((stat, index) => {
            const x = infoX + (index * 65);

            // Stat bubble
            const bubble = this.add.graphics();
            bubble.fillStyle(stat.bgColor, 1);
            bubble.fillRoundedRect(x, statsY, 55, 70, 12);

            // Stat value - BIG
            this.add.text(x + 27, statsY + 22, stat.value, {
                font: 'bold 28px Arial',
                fill: Phaser.Display.Color.IntegerToRGB(stat.color).rgba
            }).setOrigin(0.5);

            // Stat label
            this.add.text(x + 27, statsY + 50, stat.label, {
                font: 'bold 12px Arial',
                fill: '#7f8c8d'
            }).setOrigin(0.5);
        });

        this.selectedClass = 'malachar';
        this.selectedDifficulty = 'normal';

        // Bright colorful PLAY button
        const playY = cardY + 160;

        const playBg = this.add.graphics();
        playBg.fillStyle(0x4ECDC4, 1);
        playBg.fillRoundedRect(cardX - 120, playY - 30, 240, 60, 30);

        const playButton = this.add.rectangle(cardX, playY, 240, 60, 0x000000, 0);
        playButton.setInteractive({ useHandCursor: true });

        const playText = this.add.text(cardX, playY, '▶  PLAY NOW', {
            font: 'bold 24px Arial',
            fill: '#ffffff',
            letterSpacing: 2
        });
        playText.setOrigin(0.5);

        playButton.on('pointerover', () => {
            playBg.clear();
            playBg.fillStyle(0x3DBDB4, 1);
            playBg.fillRoundedRect(cardX - 120, playY - 30, 240, 60, 30);
            this.tweens.add({
                targets: playText,
                scale: 1.05,
                duration: 100
            });
        });

        playButton.on('pointerout', () => {
            playBg.clear();
            playBg.fillStyle(0x4ECDC4, 1);
            playBg.fillRoundedRect(cardX - 120, playY - 30, 240, 60, 30);
            this.tweens.add({
                targets: playText,
                scale: 1,
                duration: 100
            });
        });

        playButton.on('pointerdown', () => {
            this.startGame();
        });

        // Version text
        this.add.text(10, height - 30, 'v2.0', {
            font: '12px Arial',
            fill: '#95a5a6'
        });
    }

    createColorfulBackground(width, height) {
        // Floating colorful circles in background
        const colors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0xA8E6CF, 0x95E1D3];

        for (let i = 0; i < 8; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 40 + Math.random() * 80;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const circle = this.add.graphics();
            circle.fillStyle(color, 0.08);
            circle.fillCircle(x, y, size);

            // Gentle floating animation
            this.tweens.add({
                targets: circle,
                y: y + 20,
                duration: 3000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
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
