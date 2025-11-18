// Footstep Sound Manager
// Plays footstep sounds with variation (avoids immediate repeats)

class FootstepManager {
    constructor(scene) {
        this.scene = scene;
        this.footstepSounds = [];
        this.lastPlayedIndex = -1;
        this.volume = 0.15; // Louder footsteps

        // Load all 4 footstep sounds
        for (let i = 1; i <= 4; i++) {
            const sound = this.scene.sound.add(`footstep${i}`, { volume: this.volume });
            this.footstepSounds.push(sound);
        }

        console.log('🦶 FootstepManager initialized with 4 sound variations');
    }

    /**
     * Play a random footstep sound (avoiding immediate repeat)
     */
    playFootstep() {
        if (this.footstepSounds.length === 0) return;

        // Pick a random index that's different from the last one
        let randomIndex;
        do {
            randomIndex = Phaser.Math.Between(0, this.footstepSounds.length - 1);
        } while (randomIndex === this.lastPlayedIndex && this.footstepSounds.length > 1);

        // Play the sound
        this.footstepSounds[randomIndex].play();
        this.lastPlayedIndex = randomIndex;
    }

    /**
     * Set volume for all footstep sounds
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = volume;
        this.footstepSounds.forEach(sound => {
            sound.setVolume(volume);
        });
    }

    /**
     * Clean up
     */
    destroy() {
        this.footstepSounds.forEach(sound => {
            if (sound) sound.destroy();
        });
        this.footstepSounds = [];
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.FootstepManager = FootstepManager;
}
