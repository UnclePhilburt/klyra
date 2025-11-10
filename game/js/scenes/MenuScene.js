// Menu Scene - Cyberpunk Retro character select
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedClass = 'malachar';
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // WHITE background
        this.cameras.main.setBackgroundColor('#ffffff');

        // Colorful gradient orbs on white (brighter, more vibrant)
        const purpleOrb = this.add.circle(width * 0.2, height * 0.3, 150, 0xff00ff, 0.2);
        const blueOrb = this.add.circle(width * 0.8, height * 0.7, 200, 0x00ffff, 0.2);
        const greenOrb = this.add.circle(width * 0.5, height * 0.5, 180, 0x00ff00, 0.15);

        // Pulse animations
        this.tweens.add({
            targets: [purpleOrb, blueOrb, greenOrb],
            alpha: { from: 0.15, to: 0.08 },
            duration: 8000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Scanline overlay effect (subtle on white)
        const scanlines = this.add.graphics();
        for (let i = 0; i < height; i += 2) {
            scanlines.fillStyle(0x000000, 0.03);
            scanlines.fillRect(0, i, width, 1);
        }

        // Floating pixel particles
        for (let i = 0; i < 20; i++) {
            const colors = [0x00ff00, 0x00ffff, 0xff00ff];
            const particle = this.add.rectangle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(height, height + 200),
                4, 4,
                colors[i % 3],
                1
            );

            this.tweens.add({
                targets: particle,
                y: -50,
                x: particle.x + Phaser.Math.Between(-30, 30),
                alpha: { from: 0, to: 1 },
                duration: Phaser.Math.Between(3000, 5000),
                delay: Phaser.Math.Between(0, 2000),
                repeat: -1,
                repeatDelay: Phaser.Math.Between(1000, 3000)
            });
        }

        // Center card with neon glow
        const cardX = width * 0.5;
        const cardY = height * 0.5;
        const cardWidth = 900;
        const cardHeight = 520;

        // Light panel with neon green border
        const panelBg = this.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xffffff, 0.85);

        // Glowing neon border
        const borderGlow = this.add.rectangle(cardX, cardY, cardWidth + 4, cardHeight + 4, 0x00ff00, 0);
        borderGlow.setStrokeStyle(4, 0x00ff00, 1);

        // Pulsing border animation
        this.tweens.add({
            targets: borderGlow,
            alpha: { from: 0.6, to: 1 },
            scaleX: { from: 1, to: 1.002 },
            scaleY: { from: 1, to: 1.002 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Character section - left side
        const charX = cardX - 280;
        const charY = cardY;

        if (this.textures.exists('malachar')) {
            // Neon glow behind character
            const charGlow = this.add.circle(charX, charY, 200, 0x00ff00, 0.2);
            this.tweens.add({
                targets: charGlow,
                fillColor: { from: 0x00ff00, to: 0x00ffff },
                alpha: { from: 0.2, to: 0.3 },
                scale: { from: 1, to: 1.1 },
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.characterSprite = this.add.sprite(charX, charY, 'malachar');
            this.characterSprite.setScale(7);
            this.characterSprite.setDepth(10);

            // Floating animation
            this.tweens.add({
                targets: this.characterSprite,
                y: charY - 10,
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            if (this.anims.exists('malachar_idle')) {
                this.characterSprite.play('malachar_idle');
            }
        }

        // Info section - right side
        const infoX = cardX + 200;
        const infoY = cardY - 180;

        // Title with neon glow
        const titleText = this.add.text(infoX, infoY, 'MALACHAR', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '42px',
            fill: '#1a1a1a',
            stroke: '#00ff00',
            strokeThickness: 3
        }).setOrigin(0.5);

        titleText.setShadow(0, 0, '#00ff00', 20, false, true);

        // Glitch effect on title
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                titleText.setPosition(infoX + Phaser.Math.Between(-3, 3), infoY + Phaser.Math.Between(-2, 2));
                this.time.delayedCall(50, () => titleText.setPosition(infoX, infoY));
            },
            loop: true
        });

        // Subtitle
        this.add.text(infoX, infoY + 50, 'SHADOW WARRIOR', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fill: '#2a2a2a',
            letterSpacing: 4
        }).setOrigin(0.5).setShadow(0, 0, '#00ffff', 10, false, true);

        // Stats with neon borders
        const stats = [
            { label: 'STRENGTH', value: 16, color: '#00ff00', hex: 0x00ff00, x: -110, y: 0 },
            { label: 'HEALTH', value: 115, color: '#ff00ff', hex: 0xff00ff, x: 110, y: 0 },
            { label: 'DEFENSE', value: 10, color: '#00ffff', hex: 0x00ffff, x: -110, y: 90 },
            { label: 'SPEED', value: 9, color: '#ffff00', hex: 0xffff00, x: 110, y: 90 }
        ];

        stats.forEach(stat => {
            const statX = infoX + stat.x;
            const statY = infoY + 130 + stat.y;

            // Light card with colored border
            const statBg = this.add.rectangle(statX, statY, 170, 70, 0xffffff, 0.6);
            statBg.setStrokeStyle(3, stat.hex, 1);

            // Pulsing glow
            this.tweens.add({
                targets: statBg,
                alpha: { from: 0.6, to: 0.8 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Stat value (darker text with colored glow)
            this.add.text(statX, statY - 10, stat.value.toString(), {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '28px',
                fill: '#1a1a1a',
                stroke: stat.color,
                strokeThickness: 2
            }).setOrigin(0.5).setShadow(0, 0, stat.color, 15, false, true);

            // Stat label
            this.add.text(statX, statY + 22, stat.label, {
                fontFamily: 'monospace',
                fontSize: '9px',
                fill: '#808080',
                letterSpacing: 1
            }).setOrigin(0.5);
        });

        // Username input - cyberpunk style
        this.usernameInput = document.createElement('input');
        this.usernameInput.type = 'text';
        this.usernameInput.placeholder = 'ENTER USERNAME';
        this.usernameInput.maxLength = 20;
        this.usernameInput.value = localStorage.getItem('klyra_username') || '';
        this.usernameInput.style.cssText = `
            position: absolute;
            left: 50%;
            top: ${cardY + 140}px;
            transform: translateX(-50%);
            width: 420px;
            padding: 16px 24px;
            font-family: 'Press Start 2P', monospace;
            font-size: 12px;
            background: rgba(255, 255, 255, 0.9);
            border: 3px solid #00ff00;
            color: #1a1a1a;
            text-align: center;
            outline: none;
            transition: all 0.3s ease;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.6), inset 0 0 10px rgba(0, 255, 0, 0.1);
            text-transform: uppercase;
        `;
        this.usernameInput.addEventListener('focus', () => {
            this.usernameInput.style.borderColor = '#00ffff';
            this.usernameInput.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.8), inset 0 0 10px rgba(0, 255, 255, 0.2)';
            this.usernameInput.style.color = '#1a1a1a';
        });
        this.usernameInput.addEventListener('blur', () => {
            this.usernameInput.style.borderColor = '#00ff00';
            this.usernameInput.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6), inset 0 0 10px rgba(0, 255, 0, 0.1)';
            this.usernameInput.style.color = '#1a1a1a';
        });
        document.body.appendChild(this.usernameInput);

        // Play button with neon effect
        const playButton = this.add.rectangle(cardX, cardY + 215, 420, 50, 0xffffff, 0.8);
        playButton.setInteractive({ useHandCursor: true });
        playButton.setStrokeStyle(4, 0x00ff00, 1);

        const playText = this.add.text(cardX, cardY + 215, '> ENTER GAME <', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            fill: '#1a1a1a',
            stroke: '#00ff00',
            strokeThickness: 2,
            letterSpacing: 2
        }).setOrigin(0.5);
        playText.setShadow(0, 0, '#00ff00', 15, false, true);

        // Button animations
        playButton.on('pointerover', () => {
            playButton.setFillStyle(0x00ff00, 0.3);
            playButton.setStrokeStyle(4, 0x00ffff, 1);
            playText.setStroke('#00ffff', 2);
            playText.setShadow(0, 0, '#00ffff', 20, false, true);
            this.tweens.add({
                targets: [playButton, playText],
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Back.easeOut'
            });
        });

        playButton.on('pointerout', () => {
            playButton.setFillStyle(0xffffff, 0.8);
            playButton.setStrokeStyle(4, 0x00ff00, 1);
            playText.setStroke('#00ff00', 2);
            playText.setShadow(0, 0, '#00ff00', 15, false, true);
            this.tweens.add({
                targets: [playButton, playText],
                scaleX: 1,
                scaleY: 1,
                duration: 200
            });
        });

        playButton.on('pointerdown', () => {
            this.startGame();
        });

        // Add subtle pulsing to button
        this.tweens.add({
            targets: playText,
            alpha: { from: 1, to: 0.7 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
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
