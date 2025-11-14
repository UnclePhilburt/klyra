// Music UI - Dynamic Island Style
class MusicUI {
    constructor(scene, musicManager) {
        this.scene = scene;
        this.musicManager = musicManager;
        this.elements = [];
        this.isExpanded = false;
        this.isHovering = false;
        this.volumeSliderVisible = false;

        this.createUI();

        // Listen for track changes
        this.musicManager.onTrackChange = (track) => {
            this.updateTrackDisplay(track);
        };

        // Auto-collapse after inactivity
        this.idleTimer = null;
    }

    createUI() {
        const width = this.scene.cameras.main.width;
        const centerX = width / 2;

        // Main container - centered at top
        this.container = this.scene.add.container(centerX, 20);
        this.container.setScrollFactor(0);
        this.container.setDepth(99999);

        // Collapsed state dimensions
        this.collapsedWidth = 200;
        this.collapsedHeight = 32;
        
        // Expanded state dimensions
        this.expandedWidth = 380;
        this.expandedHeight = 48;

        // Current dimensions (start collapsed)
        this.currentWidth = this.collapsedWidth;
        this.currentHeight = this.collapsedHeight;

        // Background pill shape with blur effect
        this.background = this.scene.add.graphics();
        this.drawBackground();
        this.container.add(this.background);
        this.elements.push(this.background);

        // Subtle waveform animation (always visible)
        this.createWaveform();

        // Minimal progress indicator (subtle border fill)
        this.createProgressIndicator();

        // Track title (minimal in collapsed state)
        this.trackTitle = this.scene.add.text(0, 0, '♪ Loading...', {
            fontFamily: 'SF Pro Display, Inter, -apple-system, sans-serif',
            fontSize: '13px',
            fontStyle: '500',
            fill: '#ffffff',
            align: 'center'
        });
        this.trackTitle.setOrigin(0.5);
        this.trackTitle.setScrollFactor(0);
        this.trackTitle.setAlpha(0.9);
        this.container.add(this.trackTitle);
        this.elements.push(this.trackTitle);

        // Control buttons (hidden when collapsed)
        this.createControls();

        // Make the whole thing interactive for hover
        this.hitArea = this.scene.add.rectangle(0, 0, this.collapsedWidth, this.collapsedHeight, 0xffffff, 0.001);
        this.hitArea.setInteractive({ useHandCursor: true });
        this.container.add(this.hitArea);

        this.hitArea.on('pointerover', () => {
            this.onHoverStart();
        });

        this.hitArea.on('pointerout', () => {
            this.onHoverEnd();
        });

        // Volume slider container (appears inline)
        this.createVolumeSlider();

        // Update initial track
        const currentTrack = this.musicManager.getCurrentTrack();
        if (currentTrack) {
            this.updateTrackDisplay(currentTrack);
        }
    }

    drawBackground() {
        this.background.clear();
        
        const halfWidth = this.currentWidth / 2;
        const halfHeight = this.currentHeight / 2;
        const radius = this.currentHeight / 2;

        // Dark translucent background (blur effect simulation)
        this.background.fillStyle(0x000000, 0.85);
        this.background.fillRoundedRect(-halfWidth, -halfHeight, this.currentWidth, this.currentHeight, radius);
        
        // Subtle border with gradient effect
        this.background.lineStyle(1, 0xffffff, 0.15);
        this.background.strokeRoundedRect(-halfWidth, -halfHeight, this.currentWidth, this.currentHeight, radius);
        
        // Inner highlight (top edge)
        this.background.lineStyle(0.5, 0xffffff, 0.1);
        this.background.strokeRoundedRect(-halfWidth + 1, -halfHeight + 1, this.currentWidth - 2, this.currentHeight - 2, radius - 1);
    }

    createWaveform() {
        // Minimal waveform bars (3 bars)
        this.waveformBars = [];
        const barCount = 3;
        const barWidth = 2;
        const barSpacing = 3;
        const startX = -((barCount * (barWidth + barSpacing)) / 2);

        for (let i = 0; i < barCount; i++) {
            const bar = this.scene.add.rectangle(
                startX + (i * (barWidth + barSpacing)) - 70,
                0,
                barWidth,
                8,
                0xffffff,
                0.4
            );
            bar.setOrigin(0.5, 0.5);
            bar.setScrollFactor(0);

            // Subtle pulsing animation
            this.scene.tweens.add({
                targets: bar,
                scaleY: { from: 0.5, to: 1 },
                alpha: { from: 0.3, to: 0.6 },
                duration: 400 + (i * 100),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.container.add(bar);
            this.waveformBars.push(bar);
            this.elements.push(bar);
        }
    }

    createProgressIndicator() {
        // Minimal progress line at bottom of pill
        this.progressIndicator = this.scene.add.graphics();
        this.container.add(this.progressIndicator);
        this.elements.push(this.progressIndicator);
    }

    createControls() {
        // Control buttons container
        this.controlsContainer = this.scene.add.container(60, 0);
        this.controlsContainer.setAlpha(0);
        this.controlsContainer.setScale(0.8);
        this.container.add(this.controlsContainer);

        // Skip button
        this.skipButton = this.createMinimalButton(0, 0, '⏭', () => {
            this.musicManager.skipTrack();
            this.pulseButton(this.skipButton);
        });

        // Mute button  
        this.muteButton = this.createMinimalButton(35, 0, '🔊', () => {
            const isMuted = this.musicManager.toggleMute();
            this.muteButton.setText(isMuted ? '🔇' : '🔊');
            this.pulseButton(this.muteButton);
        });

        // Volume button
        this.volumeButton = this.createMinimalButton(70, 0, '🎚', () => {
            this.toggleVolumeSlider();
            this.pulseButton(this.volumeButton);
        });
    }

    createMinimalButton(x, y, icon, callback) {
        const button = this.scene.add.text(x, y, icon, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fill: '#ffffff'
        });
        button.setOrigin(0.5);
        button.setScrollFactor(0);
        button.setAlpha(0.7);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerdown', callback);

        button.on('pointerover', () => {
            this.scene.tweens.add({
                targets: button,
                alpha: 1,
                scale: 1.15,
                duration: 150,
                ease: 'Back.easeOut'
            });
        });

        button.on('pointerout', () => {
            this.scene.tweens.add({
                targets: button,
                alpha: 0.7,
                scale: 1,
                duration: 150,
                ease: 'Power2'
            });
        });

        this.controlsContainer.add(button);
        this.elements.push(button);
        return button;
    }

    createVolumeSlider() {
        // Slider appears inline, replacing controls temporarily
        this.sliderContainer = this.scene.add.container(40, 0);
        this.sliderContainer.setAlpha(0);
        this.sliderContainer.setVisible(false);
        this.container.add(this.sliderContainer);

        // Slider track
        const trackWidth = 120;
        const trackHeight = 3;

        const trackBg = this.scene.add.rectangle(0, 0, trackWidth, trackHeight, 0xffffff, 0.2);
        trackBg.setScrollFactor(0);
        this.sliderContainer.add(trackBg);

        // Slider fill
        const initialVolume = this.musicManager.getVolume();
        this.sliderFill = this.scene.add.rectangle(
            -(trackWidth / 2),
            0,
            trackWidth * initialVolume,
            trackHeight,
            0xffffff,
            0.8
        );
        this.sliderFill.setOrigin(0, 0.5);
        this.sliderFill.setScrollFactor(0);
        this.sliderContainer.add(this.sliderFill);

        // Slider handle
        this.sliderHandle = this.scene.add.circle(
            -(trackWidth / 2) + (trackWidth * initialVolume),
            0,
            6,
            0xffffff
        );
        this.sliderHandle.setScrollFactor(0);
        this.sliderHandle.setInteractive({ draggable: true, useHandCursor: true });
        this.sliderContainer.add(this.sliderHandle);

        // Volume percentage
        this.volumeText = this.scene.add.text(trackWidth / 2 + 20, 0, `${Math.round(initialVolume * 100)}%`, {
            fontFamily: 'SF Pro Display, sans-serif',
            fontSize: '11px',
            fill: '#ffffff'
        });
        this.volumeText.setOrigin(0, 0.5);
        this.volumeText.setAlpha(0.6);
        this.volumeText.setScrollFactor(0);
        this.sliderContainer.add(this.volumeText);

        // Store bounds
        this.trackWidth = trackWidth;
        this.trackMinX = -(trackWidth / 2);
        this.trackMaxX = trackWidth / 2;

        // Drag handlers
        this.sliderHandle.on('drag', (pointer) => {
            const localX = pointer.x - this.container.x - this.sliderContainer.x;
            const clampedX = Phaser.Math.Clamp(localX, this.trackMinX, this.trackMaxX);
            
            this.sliderHandle.x = clampedX;
            const volume = (clampedX - this.trackMinX) / this.trackWidth;
            this.sliderFill.width = this.trackWidth * volume;
            
            this.musicManager.setVolume(volume);
            this.volumeText.setText(`${Math.round(volume * 100)}%`);
        });

        // Click on track
        trackBg.setInteractive({ useHandCursor: true });
        trackBg.on('pointerdown', (pointer) => {
            const localX = pointer.x - this.container.x - this.sliderContainer.x;
            const clampedX = Phaser.Math.Clamp(localX, this.trackMinX, this.trackMaxX);
            
            this.scene.tweens.add({
                targets: this.sliderHandle,
                x: clampedX,
                duration: 150,
                ease: 'Power2'
            });
            
            const volume = (clampedX - this.trackMinX) / this.trackWidth;
            
            this.scene.tweens.add({
                targets: this.sliderFill,
                width: this.trackWidth * volume,
                duration: 150,
                ease: 'Power2'
            });
            
            this.musicManager.setVolume(volume);
            this.volumeText.setText(`${Math.round(volume * 100)}%`);
        });

        this.elements.push(this.sliderContainer);
    }

    onHoverStart() {
        this.isHovering = true;
        this.expand();
        
        // Clear idle timer
        if (this.idleTimer) {
            this.idleTimer.remove();
            this.idleTimer = null;
        }
    }

    onHoverEnd() {
        this.isHovering = false;
        
        // Set idle timer to collapse after 2 seconds
        this.idleTimer = this.scene.time.delayedCall(2000, () => {
            if (!this.isHovering && !this.volumeSliderVisible) {
                this.collapse();
            }
        });
    }

    expand() {
        if (this.isExpanded) return;
        this.isExpanded = true;

        // Animate size change
        this.scene.tweens.add({
            targets: this,
            currentWidth: this.expandedWidth,
            currentHeight: this.expandedHeight,
            duration: 300,
            ease: 'Power2.easeOut',
            onUpdate: () => {
                this.drawBackground();
                this.hitArea.setSize(this.currentWidth, this.currentHeight);
            }
        });

        // Fade in controls
        this.scene.tweens.add({
            targets: this.controlsContainer,
            alpha: 1,
            scale: 1,
            duration: 250,
            delay: 100,
            ease: 'Back.easeOut'
        });

        // Adjust track title position
        this.scene.tweens.add({
            targets: this.trackTitle,
            x: -40,
            duration: 300,
            ease: 'Power2.easeOut'
        });

        // Move waveform
        this.waveformBars.forEach((bar, i) => {
            this.scene.tweens.add({
                targets: bar,
                x: bar.x - 30,
                duration: 300,
                ease: 'Power2.easeOut'
            });
        });
    }

    collapse() {
        if (!this.isExpanded) return;
        this.isExpanded = false;

        // Hide volume slider if visible
        if (this.volumeSliderVisible) {
            this.hideVolumeSlider();
        }

        // Animate size change
        this.scene.tweens.add({
            targets: this,
            currentWidth: this.collapsedWidth,
            currentHeight: this.collapsedHeight,
            duration: 300,
            ease: 'Power2.easeIn',
            onUpdate: () => {
                this.drawBackground();
                this.hitArea.setSize(this.currentWidth, this.currentHeight);
            }
        });

        // Fade out controls
        this.scene.tweens.add({
            targets: this.controlsContainer,
            alpha: 0,
            scale: 0.8,
            duration: 200,
            ease: 'Power2.easeIn'
        });

        // Reset track title position
        this.scene.tweens.add({
            targets: this.trackTitle,
            x: 0,
            duration: 300,
            ease: 'Power2.easeIn'
        });

        // Reset waveform
        const barCount = this.waveformBars.length;
        const barWidth = 2;
        const barSpacing = 3;
        const startX = -((barCount * (barWidth + barSpacing)) / 2);

        this.waveformBars.forEach((bar, i) => {
            this.scene.tweens.add({
                targets: bar,
                x: startX + (i * (barWidth + barSpacing)) - 70,
                duration: 300,
                ease: 'Power2.easeIn'
            });
        });
    }

    toggleVolumeSlider() {
        if (this.volumeSliderVisible) {
            this.hideVolumeSlider();
        } else {
            this.showVolumeSlider();
        }
    }

    showVolumeSlider() {
        this.volumeSliderVisible = true;

        // Hide controls
        this.scene.tweens.add({
            targets: this.controlsContainer,
            alpha: 0,
            scale: 0.8,
            duration: 200,
            ease: 'Power2.easeIn'
        });

        // Show slider
        this.sliderContainer.setVisible(true);
        this.scene.tweens.add({
            targets: this.sliderContainer,
            alpha: 1,
            duration: 250,
            delay: 150,
            ease: 'Power2.easeOut'
        });

        // Hide track title temporarily
        this.scene.tweens.add({
            targets: this.trackTitle,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeIn'
        });
    }

    hideVolumeSlider() {
        this.volumeSliderVisible = false;

        // Hide slider
        this.scene.tweens.add({
            targets: this.sliderContainer,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.sliderContainer.setVisible(false);
            }
        });

        // Show controls
        this.scene.tweens.add({
            targets: this.controlsContainer,
            alpha: 1,
            scale: 1,
            duration: 250,
            delay: 150,
            ease: 'Back.easeOut'
        });

        // Show track title
        this.scene.tweens.add({
            targets: this.trackTitle,
            alpha: 0.9,
            duration: 250,
            delay: 150,
            ease: 'Power2.easeOut'
        });
    }

    pulseButton(button) {
        this.scene.tweens.add({
            targets: button,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
    }

    updateTrackDisplay(track) {
        if (track && this.trackTitle) {
            this.scene.tweens.add({
                targets: this.trackTitle,
                alpha: 0,
                duration: 150,
                onComplete: () => {
                    // Truncate long titles in collapsed state
                    let displayTitle = track.title;
                    if (!this.isExpanded && displayTitle.length > 20) {
                        displayTitle = displayTitle.substring(0, 20) + '...';
                    }
                    this.trackTitle.setText(`♪ ${displayTitle}`);

                    this.scene.tweens.add({
                        targets: this.trackTitle,
                        alpha: 0.9,
                        duration: 150
                    });
                }
            });
        }
    }

    update() {
        // Update progress indicator
        if (this.progressIndicator && this.musicManager) {
            const progress = this.musicManager.getProgress();

            this.progressIndicator.clear();

            // Draw subtle progress line at bottom of pill
            const halfWidth = this.currentWidth / 2;
            const halfHeight = this.currentHeight / 2;
            const radius = this.currentHeight / 2;
            const progressWidth = this.currentWidth * progress;

            if (progressWidth > 0) {
                // Subtle white accent line showing progress
                this.progressIndicator.lineStyle(2, 0xffffff, 0.4);

                // Calculate the path for rounded bottom
                const startX = -halfWidth;
                const endX = -halfWidth + progressWidth;
                const y = halfHeight - 1;

                // Draw line with rounded caps
                this.progressIndicator.beginPath();
                this.progressIndicator.moveTo(startX + radius, y);

                if (progressWidth < this.currentWidth - radius) {
                    this.progressIndicator.lineTo(endX, y);
                } else {
                    // Follow the rounded corner if near the end
                    this.progressIndicator.lineTo(halfWidth - radius, y);
                    this.progressIndicator.arc(halfWidth - radius, y - radius, radius, Math.PI / 2, 0, true);
                }

                this.progressIndicator.strokePath();
            }
        }
    }

    destroy() {
        if (this.idleTimer) {
            this.idleTimer.remove();
        }
        
        this.elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.elements = [];
        
        if (this.container) {
            this.container.destroy();
        }
    }
}