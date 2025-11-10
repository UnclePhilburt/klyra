// Game Configuration
const GameConfig = {
    SERVER_URL: 'https://klyra-server.onrender.com',

    GAME: {
        WIDTH: 1280,
        HEIGHT: 720,
        TILE_SIZE: 32,
        PIXEL_ART: true
    },

    PLAYER: {
        SPEED: 200,
        HEALTH: 100
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
    }
};
