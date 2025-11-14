// Music UI - Compact Synthwave Retro-Futuristic Design
class MusicUI {
    constructor(scene, musicManager) {
        this.scene = scene;
        this.musicManager = musicManager;
        this.elements = [];
        this.volumeSliderVisible = false;
        this.isAnimating = false;

        this.createUI();

        // Listen for track changes
        this.musicManager.onTrackChange = (track) => {
            this.updateTrackDisplay(track);
        };
    }

    createUI() {
        const width = this.scene.cameras.main.width;

        // Create main container - COMPACT and positioned in top-right corner
        this.mainContainer = this.scene.add.container(width - 200, 15);
        this.mainContainer.setScrollFactor(0);
        this.mainContainer.setDepth(99998);

        // Retro neon background with scanlines
        const bgGraphics = this.scene.add.graphics();
        
        // Dark base with gradient
        bgGraphics.fillGradientStyle(0x0a0a1f, 0x0a0a1f, 0x1a0a2e, 0x1a0a2e, 1, 1, 1, 1);
        bgGraphics.fillRoundedRect(0, 0, 190, 60, 8);
        
        // Neon pink/purple border
        bgGraphics.lineStyle(2, 0xff006e, 1);
        bgGraphics.strokeRoundedRect(0, 0, 190, 60, 8);
        
        // Inner cyan glow line
        bgGraphics.lineStyle(1, 0x00f0ff, 0.6);
        bgGraphics.strokeRoundedRect(2, 2, 186, 56, 7);
        
        // Add scanline overlay effect
        for (let i = 0; i < 60; i += 4) {
            bgGraphics.lineStyle(1, 0x000000, 0.15);
            bgGraphics.lineBetween(0, i, 190, i);
        }
        
        this.mainContainer.add(bgGraphics);
        this.elements.push(bgGraphics);

        // Retro corner accent triangles
        const accentGraphics = this.scene.add.graphics();
        accentGraphics.fillStyle(0xff006e, 0.3);
        accentGraphics.fillTriangle(0, 0, 15, 0, 0, 15);
        accentGraphics.fillTriangle(190, 0, 175, 0, 190, 15);
        accentGraphics.fillStyle(0x00f0ff, 0.2);
        accentGraphics.fillTriangle(0, 60, 15, 60, 0, 45);
        accentGraphics.fillTriangle(190, 60, 175, 60, 190, 45);
        this.mainContainer.add(accentGraphics);
        this.elements.push(accentGraphics);

        // Animated VU meter style bars (top left corner)
        this.createRetroVUMeter(15, 15);

        // Track title - compact with retro font styling
        this.trackTitle = this.scene.add.text(15, 30, '♪ LOADING...', {
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            fontSize: '8px',
            fill: '#00f0ff',
            stroke: '#ff006e',
            strokeThickness: 1
        });
        this.trackTitle.setOrigin(0, 0.5);
        this.trackTitle.setScrollFactor(0);
        this.trackTitle.setDepth(99999);
        
        // Retro glitch text effect
        this.scene.time.addEvent({
            delay: 3000,
            callback: () => this.glitchEffect(this.trackTitle),
            loop: true
        });
        
        this.mainContainer.add(this.trackTitle);
        this.elements.push(this.trackTitle);

        // Neon progress bar with retro styling
        this.createRetroProgressBar(15, 42);

        // Compact button row at bottom
        const buttonY = 52;
        const startX = 15;

        // Skip button
        this.skipButton = this.createRetroButton(startX, buttonY, '▶▶', () => {
            this.musicManager.skipTrack();
            this.flashButton(this.skipButton);
        });

        // Mute button
        this.muteButton = this.createRetroButton(startX + 35, buttonY, '♫', () => {
            const isMuted = this.musicManager.toggleMute();
            this.muteButton.setText(isMuted ? '✖' : '♫');
            this.flashButton(this.muteButton);
        });

        // Volume button
        this.volumeButton = this.createRetroButton(startX + 70, buttonY, '≡', () => {
            this.toggleVolumeSlider();
            this.flashButton(this.volumeButton);
        });

        // Volume percentage display (compact)
        this.volumeText = this.scene.add.text(startX + 100, buttonY, '100%', {
            fontFamily: '"Courier New", monospace',
            fontSize: '10px',
            fill: '#00f0ff',
            fontStyle: 'bold'
        });
        this.volumeText.setOrigin(0, 0.5);
        this.volumeText.setScrollFactor(0);
        this.volumeText.setDepth(99999);
        this.mainContainer.add(this.volumeText);
        this.elements.push(this.volumeText);

        // Compact volume slider (appears below main container)
        this.createRetroVolumeSlider(0, 70);

        // Pulsing neon glow on border
        this.createBorderPulse();

        // Update initial track display
        const currentTrack = this.musicManager.getCurrentTrack();
        if (currentTrack) {
            this.updateTrackDisplay(currentTrack);
        }
    }

    createRetroVUMeter(x, y) {
        this.vuBars = [];
        const barCount = 8;
        const barWidth = 2;
        const barSpacing = 2;
        const colors = [0x00ff00, 0x7fff00, 0xffff00, 0xffa500, 0xff6b00, 0xff0000, 0xff006e, 0xff00ff];

        for (let i = 0; i < barCount; i++) {
            const bar = this.scene.add.rectangle(
                x + (i * (barWidth + barSpacing)),
                y,
                barWidth,
                8,
                colors[i]
            );
            bar.setOrigin(0.5, 1);
            bar.setScrollFactor(0);
            bar.setDepth(99999);

            // Random VU meter style animation
            this.scene.tweens.add({
                targets: bar,
                scaleY: { from: 0.2, to: 1 },
                duration: 200 + Math.random() * 300,
                yoyo: true,
                repeat: -1,
                ease: 'Linear'
            });

            this.mainContainer.add(bar);
            this.vuBars.push(bar);
            this.elements.push(bar);
        }
    }

    createRetroProgressBar(x, y) {
        const width = 160;

        // Retro pixel-style background
        const bgGraphics = this.scene.add.graphics();
        bgGraphics.fillStyle(0x1a0a2e, 1);
        bgGraphics.fillRect(x, y - 2, width, 4);
        bgGraphics.lineStyle(1, 0xff006e, 0.5);
        bgGraphics.strokeRect(x, y - 2, width, 4);
        this.mainContainer.add(bgGraphics);
        this.elements.push(bgGraphics);

        // Animated progress fill with gradient
        this.progressFill = this.scene.add.rectangle(x, y, 0, 4, 0x00f0ff);
        this.progressFill.setOrigin(0, 0.5);
        this.progressFill.setScrollFactor(0);
        this.progressFill.setDepth(100000);
        this.mainContainer.add(this.progressFill);
        this.elements.push(this.progressFill);

        // Store max width for real-time updates
        this.progressMaxWidth = width;
        this.progressBarX = x;

        // Moving scanline across progress
        const scanline = this.scene.add.rectangle(x, y, 2, 4, 0xffffff, 0.8);
        scanline.setOrigin(0, 0.5);
        scanline.setScrollFactor(0);
        scanline.setDepth(100001);
        this.mainContainer.add(scanline);
        this.elements.push(scanline);

        this.scene.tweens.add({
            targets: scanline,
            x: { from: x, to: x + width },
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    createRetroButton(x, y, text, callback) {
        // Button container with pixelated border
        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(0x1a0a2e, 1);
        btnBg.fillRect(x - 12, y - 8, 24, 16);
        btnBg.lineStyle(1, 0xff006e, 1);
        btnBg.strokeRect(x - 12, y - 8, 24, 16);
        this.mainContainer.add(btnBg);
        this.elements.push(btnBg);

        const button = this.scene.add.text(x, y, text, {
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            fill: '#00f0ff',
            fontStyle: 'bold'
        });
        button.setOrigin(0.5);
        button.setScrollFactor(0);
        button.setDepth(100000);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerdown', callback);

        button.on('pointerover', () => {
            button.setTint(0xff006e);
            btnBg.clear();
            btnBg.fillStyle(0xff006e, 0.3);
            btnBg.fillRect(x - 12, y - 8, 24, 16);
            btnBg.lineStyle(2, 0x00f0ff, 1);
            btnBg.strokeRect(x - 12, y - 8, 24, 16);
        });

        button.on('pointerout', () => {
            button.clearTint();
            btnBg.clear();
            btnBg.fillStyle(0x1a0a2e, 1);
            btnBg.fillRect(x - 12, y - 8, 24, 16);
            btnBg.lineStyle(1, 0xff006e, 1);
            btnBg.strokeRect(x - 12, y - 8, 24, 16);
        });

        this.mainContainer.add(button);
        button.bgGraphics = btnBg;
        this.elements.push(button);
        return button;
    }

    flashButton(button) {
        // Retro flash effect
        this.scene.tweens.add({
            targets: button,
            alpha: { from: 1, to: 0.3 },
            duration: 50,
            yoyo: true,
            repeat: 2
        });

        button.setTint(0xffffff);
        this.scene.time.delayedCall(150, () => {
            button.clearTint();
        });
    }

    createRetroVolumeSlider(x, y) {
        // Compact slider panel
        this.sliderPanel = this.scene.add.container(x + 10, y);
        this.sliderPanel.setScrollFactor(0);
        this.sliderPanel.setDepth(100002);
        this.sliderPanel.setVisible(false);

        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(0x0a0a1f, 1);
        panelBg.fillRoundedRect(0, 0, 170, 35, 6);
        panelBg.lineStyle(2, 0xff006e, 1);
        panelBg.strokeRoundedRect(0, 0, 170, 35, 6);
        panelBg.lineStyle(1, 0x00f0ff, 0.6);
        panelBg.strokeRoundedRect(2, 2, 166, 31, 5);
        this.sliderPanel.add(panelBg);

        // Slider label
        const label = this.scene.add.text(10, 10, 'VOLUME', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            fill: '#ff006e'
        });
        label.setOrigin(0, 0);
        this.sliderPanel.add(label);

        // Retro segmented slider track
        const trackGraphics = this.scene.add.graphics();
        const segments = 20;
        for (let i = 0; i < segments; i++) {
            const segX = 10 + (i * 7);
            trackGraphics.fillStyle(0x1a0a2e, 1);
            trackGraphics.fillRect(segX, 20, 5, 8);
            trackGraphics.lineStyle(1, 0xff006e, 0.3);
            trackGraphics.strokeRect(segX, 20, 5, 8);
        }
        this.sliderPanel.add(trackGraphics);

        // Filled segments
        this.sliderSegments = [];
        for (let i = 0; i < segments; i++) {
            const segX = 10 + (i * 7);
            const seg = this.scene.add.rectangle(segX + 2.5, 24, 5, 8, 0x00f0ff, 0);
            seg.setOrigin(0.5);
            this.sliderPanel.add(seg);
            this.sliderSegments.push(seg);
        }

        // Invisible interactive zone
        this.sliderZone = this.scene.add.rectangle(85, 24, 140, 15, 0xffffff, 0.01);
        this.sliderZone.setInteractive({ useHandCursor: true });
        this.sliderPanel.add(this.sliderZone);

        // Update segments based on volume
        this.updateVolumeSegments(this.musicManager.getVolume());

        this.sliderZone.on('pointerdown', (pointer) => {
            this.updateVolumeFromPointer(pointer);
        });

        this.sliderZone.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.updateVolumeFromPointer(pointer);
            }
        });

        this.mainContainer.add(this.sliderPanel);
        this.elements.push(this.sliderPanel);
    }

    updateVolumeFromPointer(pointer) {
        const localX = pointer.x - this.mainContainer.x - this.sliderPanel.x - 10;
        const volume = Phaser.Math.Clamp(localX / 140, 0, 1);
        this.musicManager.setVolume(volume);
        this.updateVolumeSegments(volume);
        this.volumeText.setText(`${Math.round(volume * 100)}%`);
    }

    updateVolumeSegments(volume) {
        const activeSegments = Math.floor(volume * this.sliderSegments.length);
        this.sliderSegments.forEach((seg, i) => {
            if (i < activeSegments) {
                seg.setAlpha(1);
                // Color gradient from cyan to pink
                const color = i < 10 ? 0x00f0ff : (i < 15 ? 0x7f7fff : 0xff006e);
                seg.setFillStyle(color);
            } else {
                seg.setAlpha(0);
            }
        });
    }

    toggleVolumeSlider() {
        this.volumeSliderVisible = !this.volumeSliderVisible;
        
        if (this.volumeSliderVisible) {
            this.sliderPanel.setVisible(true);
            this.sliderPanel.setAlpha(0);
            this.scene.tweens.add({
                targets: this.sliderPanel,
                alpha: 1,
                y: 70,
                duration: 200,
                ease: 'Back.easeOut'
            });
        } else {
            this.scene.tweens.add({
                targets: this.sliderPanel,
                alpha: 0,
                y: 60,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    this.sliderPanel.setVisible(false);
                }
            });
        }
    }

    createBorderPulse() {
        const pulseGraphics = this.scene.add.graphics();
        pulseGraphics.lineStyle(2, 0x00f0ff, 0.5);
        pulseGraphics.strokeRoundedRect(0, 0, 190, 60, 8);
        this.mainContainer.add(pulseGraphics);
        this.elements.push(pulseGraphics);

        this.scene.tweens.add({
            targets: pulseGraphics,
            alpha: { from: 0.5, to: 0 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    glitchEffect(textObject) {
        const originalX = textObject.x;
        const originalText = textObject.text;
        
        // Random glitch displacement
        textObject.x = originalX + (Math.random() * 4 - 2);
        textObject.setTint(Math.random() > 0.5 ? 0xff006e : 0x00f0ff);
        
        this.scene.time.delayedCall(50, () => {
            textObject.x = originalX;
            textObject.clearTint();
        });
    }

    updateTrackDisplay(track) {
        if (track && this.trackTitle) {
            // Glitch transition effect
            const originalText = this.trackTitle.text;

            // Scramble text briefly
            const scrambleChars = '█▓▒░@#$%&*';
            let scrambled = '';
            for (let i = 0; i < originalText.length; i++) {
                scrambled += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            }

            this.trackTitle.setText(scrambled);
            this.trackTitle.setTint(0xff006e);

            this.scene.time.delayedCall(100, () => {
                this.trackTitle.setText(`♪ ${track.title.toUpperCase()}`);
                this.trackTitle.clearTint();
            });
        }
    }

    update() {
        // Update progress bar based on actual playback
        if (this.progressFill && this.musicManager) {
            const progress = this.musicManager.getProgress();
            this.progressFill.width = this.progressMaxWidth * progress;
        }
    }

    destroy() {
        this.elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.elements = [];
        
        if (this.mainContainer) {
            this.mainContainer.destroy();
        }
        if (this.sliderPanel) {
            this.sliderPanel.destroy();
        }
    }
}