// Music Manager - Handles background music playback
class MusicManager {
    constructor(scene) {
        this.scene = scene;
        this.currentTrack = null;
        this.lastTrack = null;
        this.volume = 0.5; // Default volume (50%)
        this.isMuted = false;

        // All available tracks (excluding menu music)
        this.gameplayTracks = [
            { key: '8-bit-takeover', title: '8-Bit Takeover' },
            { key: 'platform-shoes', title: 'Platform Shoes' },
            { key: 'oink55', title: 'Oink55' },
            { key: 'tower-defense', title: 'Tower Defense' },
            { key: 'pixelated-dreams', title: 'Pixelated Dreams' },
            { key: 'fight-for-future', title: 'Fight for the Future' },
            { key: 'bransboyrd', title: 'Bransboyrd' },
            { key: 'phonk', title: 'Phonk' },
            { key: 'julia', title: 'Julia' },
            { key: 'lady-of-80s', title: 'Lady of the 80s' },
            { key: 'return-to-8-bit', title: 'Return to the 8-Bit' }
        ];

        this.menuTrack = { key: 'poltergeist', title: 'Poltergeist and a Piano' };
    }

    // Load all music files
    static preload(scene) {
        console.log('🎵 Loading music files...');

        // Menu music
        scene.load.audio('poltergeist', 'assets/music/poltergeist-and-a-piano.mp3');

        // Gameplay music
        scene.load.audio('8-bit-takeover', 'assets/music/8-bit-takeover.mp3');
        scene.load.audio('platform-shoes', 'assets/music/platform-shoes-8-bit.mp3');
        scene.load.audio('oink55', 'assets/music/Oink55.mp3');
        scene.load.audio('tower-defense', 'assets/music/tower-defense-8-bit-.mp3');
        scene.load.audio('pixelated-dreams', 'assets/music/pixelated-dreams.mp3');
        scene.load.audio('fight-for-future', 'assets/music/fight-for-the-future.mp3');
        scene.load.audio('bransboyrd', 'assets/music/Bransboyrd.mp3');
        scene.load.audio('phonk', 'assets/music/phonk.mp3');
        scene.load.audio('julia', 'assets/music/julia.mp3');
        scene.load.audio('lady-of-80s', 'assets/music/lady-of-the-80s.mp3');
        scene.load.audio('return-to-8-bit', 'assets/music/return-to-the-8-bit.mp3');

        console.log('✅ Queued 12 music tracks for loading');
    }

    // Play menu music
    playMenuMusic() {
        this.stopCurrentTrack();

        if (!this.scene.sound.get(this.menuTrack.key)) {
            this.currentTrack = this.scene.sound.add(this.menuTrack.key, {
                volume: this.isMuted ? 0 : this.volume,
                loop: true
            });
            this.currentTrack.play();
            console.log(`🎵 Playing menu music: ${this.menuTrack.title}`);
        }
    }

    // Start gameplay music (random rotation)
    startGameplayMusic() {
        this.playRandomTrack();
    }

    // Play a random track (never the same as last track)
    playRandomTrack() {
        this.stopCurrentTrack();

        // Get available tracks (exclude last played)
        let availableTracks = [...this.gameplayTracks];
        if (this.lastTrack) {
            availableTracks = availableTracks.filter(t => t.key !== this.lastTrack.key);
        }

        // Pick random track
        const randomIndex = Math.floor(Math.random() * availableTracks.length);
        const track = availableTracks[randomIndex];

        // Play track
        this.currentTrack = this.scene.sound.add(track.key, {
            volume: this.isMuted ? 0 : this.volume,
            loop: false
        });

        // When track ends, play another random track
        this.currentTrack.once('complete', () => {
            this.playRandomTrack();
        });

        this.currentTrack.play();
        this.lastTrack = track;

        console.log(`🎵 Now playing: ${track.title}`);

        // Notify UI of track change
        if (this.onTrackChange) {
            this.onTrackChange(track);
        }
    }

    // Skip to next random track
    skipTrack() {
        if (this.currentTrack && this.currentTrack.isPlaying) {
            console.log('⏭️ Skipping track...');
            this.playRandomTrack();
        }
    }

    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.currentTrack) {
            this.currentTrack.setVolume(this.isMuted ? 0 : this.volume);
        }
        console.log(`🔇 Music ${this.isMuted ? 'muted' : 'unmuted'}`);
        return this.isMuted;
    }

    // Set volume (0 to 1)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.currentTrack && !this.isMuted) {
            this.currentTrack.setVolume(this.volume);
        }
        console.log(`🔊 Volume set to ${Math.round(this.volume * 100)}%`);
    }

    // Get current track info
    getCurrentTrack() {
        return this.lastTrack;
    }

    // Get volume (0 to 1)
    getVolume() {
        return this.volume;
    }

    // Check if muted
    isMutedState() {
        return this.isMuted;
    }

    // Stop current track
    stopCurrentTrack() {
        if (this.currentTrack) {
            this.currentTrack.stop();
            this.currentTrack.destroy();
            this.currentTrack = null;
        }
    }

    // Cleanup
    destroy() {
        this.stopCurrentTrack();
    }
}
