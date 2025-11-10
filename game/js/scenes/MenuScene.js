// Menu Scene - Modern character select
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedClass = 'malachar';
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Dark modern background with subtle gradient
        this.cameras.main.setBackgroundColor('#0a0e27');

        // Animated gradient overlay
        const bgGradient = this.add.graphics();
        bgGradient.fillGradientStyle(0x1a1f3a, 0x0a0e27, 0x2d1b4e, 0x0a0e27, 1, 1, 1, 1);
        bgGradient.fillRect(0, 0, width, height);
        bgGradient.setAlpha(0.7);

        // Animated floating particles
        this.particles = this.add.particles(0, 0, 'white', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            speed: { min: 20, max: 50 },
            scale: { start: 0.1, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 4000,
            frequency: 200,
            blendMode: 'ADD'
        });

        // Left side - Character display
        const charX = width * 0.35;
        const charY = height * 0.5;

        // Character spotlight effect
        const spotlight = this.add.circle(charX, charY, 300, 0xffffff, 0.05);

        // Character sprite with modern scaling
        if (this.textures.exists('malachar')) {
            this.characterSprite = this.add.sprite(charX, charY, 'malachar');
            this.characterSprite.setScale(8);
            this.characterSprite.setDepth(10);

            // Subtle breathing animation
            this.tweens.add({
                targets: this.characterSprite,
                scaleX: 8.1,
                scaleY: 8.1,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            if (this.anims.exists('malachar_idle')) {
                this.characterSprite.play('malachar_idle');
            }

            // Glow effect around character
            const glow = this.add.circle(charX, charY, 280, 0x6366f1, 0.15);
            glow.setDepth(5);
            this.tweens.add({
                targets: glow,
                alpha: 0.25,
                scale: 1.05,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Right side - Info panel
        const panelX = width * 0.65;
        const panelY = height * 0.5;
        const panelWidth = 450;

        // Modern glass panel
        const panel = this.add.rectangle(panelX, panelY, panelWidth, 600, 0xffffff, 0.03);
        panel.setStrokeStyle(2, 0xffffff, 0.1);

        // Character name with modern font
        this.add.text(panelX, panelY - 220, 'MALACHAR', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '56px',
            fontStyle: 'bold',
            fill: '#ffffff',
            letterSpacing: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(panelX, panelY - 170, 'SHADOW WARRIOR', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fill: '#a0a0a0',
            letterSpacing: 2
        }).setOrigin(0.5);

        // Stats with modern cards
        const stats = [
            { label: 'STRENGTH', value: 16, color: '#ff6b9d', x: -100, y: -80 },
            { label: 'HEALTH', value: 115, color: '#c471f5', x: 100, y: -80 },
            { label: 'DEFENSE', value: 10, color: '#12d8fa', x: -100, y: 30 },
            { label: 'SPEED', value: 9, color: '#feca57', x: 100, y: 30 }
        ];

        stats.forEach(stat => {
            const cardX = panelX + stat.x;
            const cardY = panelY + stat.y;

            // Stat card
            const card = this.add.rectangle(cardX, cardY, 140, 80, 0xffffff, 0.05);
            card.setStrokeStyle(1, stat.color.replace('#', '0x'), 0.3);

            // Stat value
            this.add.text(cardX, cardY - 15, stat.value.toString(), {
                fontFamily: 'Arial, sans-serif',
                fontSize: '32px',
                fontStyle: 'bold',
                fill: stat.color
            }).setOrigin(0.5);

            // Stat label
            this.add.text(cardX, cardY + 20, stat.label, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '11px',
                fill: '#808080',
                letterSpacing: 1
            }).setOrigin(0.5);
        });

        // Username input - modern style
        this.usernameInput = document.createElement('input');
        this.usernameInput.type = 'text';
        this.usernameInput.placeholder = 'Enter your username';
        this.usernameInput.maxLength = 20;
        this.usernameInput.value = localStorage.getItem('klyra_username') || '';
        this.usernameInput.style.cssText = `
            position: absolute;
            left: 50%;
            top: ${panelY + 140}px;
            transform: translateX(-50%);
            width: 380px;
            padding: 18px 28px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            color: #ffffff;
            text-align: center;
            backdrop-filter: blur(10px);
            outline: none;
            transition: all 0.3s ease;
            letter-spacing: 1px;
        `;
        this.usernameInput.addEventListener('focus', () => {
            this.usernameInput.style.background = 'rgba(255, 255, 255, 0.12)';
            this.usernameInput.style.borderColor = 'rgba(99, 102, 241, 0.5)';
            this.usernameInput.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.3)';
        });
        this.usernameInput.addEventListener('blur', () => {
            this.usernameInput.style.background = 'rgba(255, 255, 255, 0.08)';
            this.usernameInput.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            this.usernameInput.style.boxShadow = 'none';
        });
        document.body.appendChild(this.usernameInput);

        // Modern play button
        const playButton = this.add.rectangle(panelX, panelY + 220, 380, 60, 0x6366f1, 1);
        playButton.setInteractive({ useHandCursor: true });
        playButton.setStrokeStyle(2, 0x8b5cf6, 0.5);

        const playText = this.add.text(panelX, panelY + 220, 'ENTER GAME', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            fill: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5);

        // Button hover effects
        playButton.on('pointerover', () => {
            this.tweens.add({
                targets: playButton,
                scaleX: 1.02,
                scaleY: 1.05,
                fillColor: 0x7c3aed,
                duration: 200,
                ease: 'Power2'
            });
            this.tweens.add({
                targets: playText,
                scale: 1.05,
                duration: 200
            });
        });

        playButton.on('pointerout', () => {
            this.tweens.add({
                targets: playButton,
                scaleX: 1,
                scaleY: 1,
                fillColor: 0x6366f1,
                duration: 200,
                ease: 'Power2'
            });
            this.tweens.add({
                targets: playText,
                scale: 1,
                duration: 200
            });
        });

        playButton.on('pointerdown', () => {
            this.startGame();
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
