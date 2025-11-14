// Music UI - Top-edge music controls
class MusicUI {
    constructor(scene, musicManager) {
        this.scene = scene;
        this.musicManager = musicManager;
        this.elements = [];
        this.volumeSliderVisible = false;

        this.createUI();

        // Listen for track changes
        this.musicManager.onTrackChange = (track) => {
            this.updateTrackDisplay(track);
        };
    }

    createUI() {
        const width = this.scene.cameras.main.width;

        // Semi-transparent background bar
        this.background = this.scene.add.rectangle(
            width / 2, 15, width, 30, 0x000000, 0.7
        );
        this.background.setScrollFactor(0);
        this.background.setDepth(99998);
        this.elements.push(this.background);

        // Track title (center-left)
        this.trackTitle = this.scene.add.text(10, 15, '♪ Loading...', {
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: '13px',
            fontStyle: '500',
            fill: '#ffffff'
        });
        this.trackTitle.setOrigin(0, 0.5);
        this.trackTitle.setScrollFactor(0);
        this.trackTitle.setDepth(99999);
        this.elements.push(this.trackTitle);

        // Buttons container (right side)
        const buttonX = width - 150;
        const buttonY = 15;

        // Skip button
        this.skipButton = this.createButton(buttonX, buttonY, '⏭', () => {
            this.musicManager.skipTrack();
        });

        // Mute button
        this.muteButton = this.createButton(buttonX + 30, buttonY, '🔊', () => {
            const isMuted = this.musicManager.toggleMute();
            this.muteButton.setText(isMuted ? '🔇' : '🔊');
        });

        // Volume button (opens slider)
        this.volumeButton = this.createButton(buttonX + 60, buttonY, '🎚', () => {
            this.toggleVolumeSlider();
        });

        // Volume slider (initially hidden)
        this.createVolumeSlider(buttonX + 90, buttonY);

        // Update initial track display
        const currentTrack = this.musicManager.getCurrentTrack();
        if (currentTrack) {
            this.updateTrackDisplay(currentTrack);
        }
    }

    createButton(x, y, icon, callback) {
        const button = this.scene.add.text(x, y, icon, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fill: '#ffffff'
        });
        button.setOrigin(0.5);
        button.setScrollFactor(0);
        button.setDepth(99999);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerdown', callback);

        button.on('pointerover', () => {
            button.setScale(1.1);
            button.setTint(0x00ff00);
        });

        button.on('pointerout', () => {
            button.setScale(1.0);
            button.clearTint();
        });

        this.elements.push(button);
        return button;
    }

    createVolumeSlider(x, y) {
        // Slider container (initially hidden)
        this.sliderBg = this.scene.add.rectangle(x + 50, y, 100, 20, 0x222222, 0.9);
        this.sliderBg.setScrollFactor(0);
        this.sliderBg.setDepth(99999);
        this.sliderBg.setVisible(false);
        this.elements.push(this.sliderBg);

        // Slider fill
        this.sliderFill = this.scene.add.rectangle(
            x + 1, y, 98 * this.musicManager.getVolume(), 18, 0x00ff00
        );
        this.sliderFill.setOrigin(0, 0.5);
        this.sliderFill.setScrollFactor(0);
        this.sliderFill.setDepth(100000);
        this.sliderFill.setVisible(false);
        this.elements.push(this.sliderFill);

        // Slider handle
        this.sliderHandle = this.scene.add.circle(
            x + 1 + (98 * this.musicManager.getVolume()), y, 8, 0xffffff
        );
        this.sliderHandle.setScrollFactor(0);
        this.sliderHandle.setDepth(100001);
        this.sliderHandle.setVisible(false);
        this.sliderHandle.setInteractive({ draggable: true, useHandCursor: true });
        this.elements.push(this.sliderHandle);

        // Drag functionality
        this.sliderHandle.on('drag', (pointer) => {
            const sliderX = this.sliderBg.x - 50;
            const sliderWidth = 98;
            const newX = Phaser.Math.Clamp(pointer.x, sliderX + 1, sliderX + sliderWidth + 1);

            this.sliderHandle.x = newX;
            const volume = (newX - sliderX - 1) / sliderWidth;
            this.sliderFill.width = sliderWidth * volume;

            this.musicManager.setVolume(volume);
        });

        // Click on slider background to jump
        this.sliderBg.setInteractive({ useHandCursor: true });
        this.sliderBg.on('pointerdown', (pointer) => {
            const sliderX = this.sliderBg.x - 50;
            const sliderWidth = 98;
            const clickX = Phaser.Math.Clamp(pointer.x, sliderX + 1, sliderX + sliderWidth + 1);

            this.sliderHandle.x = clickX;
            const volume = (clickX - sliderX - 1) / sliderWidth;
            this.sliderFill.width = sliderWidth * volume;

            this.musicManager.setVolume(volume);
        });
    }

    toggleVolumeSlider() {
        this.volumeSliderVisible = !this.volumeSliderVisible;
        this.sliderBg.setVisible(this.volumeSliderVisible);
        this.sliderFill.setVisible(this.volumeSliderVisible);
        this.sliderHandle.setVisible(this.volumeSliderVisible);
    }

    updateTrackDisplay(track) {
        if (track && this.trackTitle) {
            this.trackTitle.setText(`♪ ${track.title}`);
        }
    }

    destroy() {
        this.elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.elements = [];
    }
}
