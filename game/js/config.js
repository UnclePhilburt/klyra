// Game Configuration v5.9 - Force cache break
const GameConfig = {
    SERVER_URL: 'http://localhost:3001',

    GAME: {
        WIDTH: 1280,
        HEIGHT: 720,
        TILE_SIZE: 32,
        PIXEL_ART: true
    },

    PLAYER: {
        SPEED: 200,
        HEALTH: 100,
        // XP formula: baseXP * level^exponent
        XP_BASE: 100,
        XP_EXPONENT: 1.5
    },

    DEBUG: {
        ENABLED: false,  // Toggle all debug features
        SHOW_FPS: true,
        SHOW_DIAGNOSTICS: false,
        LOG_NETWORK: false,
        LOG_MOVEMENT: false,
        LOG_COMBAT: false
    },

    CLASSES: {
        warrior: { color: 0xff0000, name: 'Warrior' },
        mage: { color: 0x0000ff, name: 'Mage' },
        rogue: { color: 0x00ff00, name: 'Rogue' },
        archer: { color: 0xffff00, name: 'Archer' },
        paladin: { color: 0xffffff, name: 'Paladin' },
        necromancer: { color: 0x9d00ff, name: 'Necromancer' },
        malachar: { color: 0x8b0000, name: 'Malachar' }
    },

    COLORS: {
        PRIMARY: 0x00ff00,
        SECONDARY: 0xff00ff,
        ACCENT: 0x00ffff,
        DANGER: 0xff0000,
        WARNING: 0xffff00,
        BACKGROUND: 0x0a0a0a
    },

    // Helper functions
    getXPRequired(level) {
        // XP required = BASE * level^EXPONENT
        // Level 1: 100, Level 2: 282, Level 3: 519, Level 4: 800, Level 5: 1118, etc.
        return Math.floor(this.PLAYER.XP_BASE * Math.pow(level, this.PLAYER.XP_EXPONENT));
    }
};
