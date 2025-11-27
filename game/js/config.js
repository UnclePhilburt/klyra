// Game Configuration v5.10 - Home Server
const GameConfig = {
    SERVER_URL: 'http://47.213.170.139:3001',

    GAME: {
        WIDTH: 1280,
        HEIGHT: 720,
        TILE_SIZE: 48,
        PIXEL_ART: true
    },

    PLAYER: {
        SPEED: 120,  // Reduced from 200 for more tactical kiting gameplay
        HEALTH: 100,
        // XP: Balanced curve - level 10 = ~126 souls (enough for pet or best skill)
        XP_BASE: 100,
        XP_EXPONENT: 0.15  // Logarithmic curve: Fast early levels, slower later
    },

    DEBUG: {
        ENABLED: false,  // Toggle all debug features
        SHOW_FPS: true,
        SHOW_DIAGNOSTICS: false,
        LOG_NETWORK: false,
        LOG_MOVEMENT: false,
        LOG_COMBAT: false
    },

    PERFORMANCE: {
        FPS_TARGET: 60,        // Realistic stable 60 FPS (game won't reach 144+ with all the rendering)
        FPS_MIN: 30,           // Minimum acceptable FPS before slowdown kicks in
        SMOOTH_STEP: true,     // Smooth frame timing for consistent feel
        DELTA_MIN: 4,          // Min delta time (ms) for smooth interpolation
        DELTA_MAX: 33,         // Max delta time (ms) to prevent large jumps
        BATCH_SIZE: 4096,      // WebGL batch size for sprite rendering
        POWER_PREFERENCE: 'high-performance'  // Use dedicated GPU if available
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
