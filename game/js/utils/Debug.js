// Smart Debug System - Categorized, level-based logging
class Debug {
    constructor() {
        // Debug categories - can be toggled independently
        this.categories = {
            CORE: true,        // Game initialization, critical events
            NETWORK: false,    // Socket events, server communication
            COMBAT: false,     // Damage, kills, attacks
            SKILLS: true,      // Skill selection, leveling, abilities
            MOVEMENT: false,   // Player/enemy movement updates
            SPAWN: false,      // Entity spawning
            UI: false,         // UI updates, HUD changes
            PERFORMANCE: true, // FPS, render stats, diagnostics
            WORLD: false,      // World generation, chunks, biomes
            AUDIO: false,      // Music, sound effects
            MINIONS: false,    // Minion AI, spawning, stats
            ERRORS: true       // Always show errors
        };

        // Log levels
        this.levels = {
            ERROR: 0,   // Critical errors
            WARN: 1,    // Warnings
            INFO: 2,    // Important info
            DEBUG: 3,   // Detailed debugging
            TRACE: 4    // Everything (spam)
        };

        // Current log level (only show messages at or below this level)
        this.currentLevel = this.levels.INFO;

        // Spam prevention - track last message and count
        this.lastMessage = null;
        this.messageCount = 0;
        this.messageThrottle = {};
    }

    // Set log level
    setLevel(level) {
        this.currentLevel = this.levels[level] || this.levels.INFO;
        console.log(`🔧 Debug level set to: ${level}`);
    }

    // Enable/disable category
    setCategory(category, enabled) {
        if (this.categories.hasOwnProperty(category)) {
            this.categories[category] = enabled;
            console.log(`🔧 Debug category ${category}: ${enabled ? 'ON' : 'OFF'}`);
        }
    }

    // Enable all categories
    enableAll() {
        Object.keys(this.categories).forEach(cat => this.categories[cat] = true);
        console.log(`🔧 All debug categories enabled`);
    }

    // Disable all categories
    disableAll() {
        Object.keys(this.categories).forEach(cat => this.categories[cat] = false);
        this.categories.ERRORS = true; // Always keep errors
        console.log(`🔧 All debug categories disabled (except ERRORS)`);
    }

    // Check if we should log
    shouldLog(category, level) {
        // Always show errors
        if (category === 'ERRORS') return true;

        // Check category enabled
        if (!this.categories[category]) return false;

        // Check log level
        if (level > this.currentLevel) return false;

        return true;
    }

    // Throttle spam - only log once per interval
    throttle(key, intervalMs = 1000) {
        const now = Date.now();
        if (this.messageThrottle[key] && now - this.messageThrottle[key] < intervalMs) {
            return false;
        }
        this.messageThrottle[key] = now;
        return true;
    }

    // Log with category and level
    log(category, level, emoji, message, ...args) {
        if (!this.shouldLog(category, level)) return;

        const prefix = `${emoji} [${category}]`;
        console.log(prefix, message, ...args);
    }

    // Convenience methods
    error(category, message, ...args) {
        this.log(category, this.levels.ERROR, '❌', message, ...args);
    }

    warn(category, message, ...args) {
        this.log(category, this.levels.WARN, '⚠️', message, ...args);
    }

    info(category, message, ...args) {
        this.log(category, this.levels.INFO, 'ℹ️', message, ...args);
    }

    debug(category, message, ...args) {
        this.log(category, this.levels.DEBUG, '🔍', message, ...args);
    }

    trace(category, message, ...args) {
        this.log(category, this.levels.TRACE, '📍', message, ...args);
    }

    // Special logging for specific events
    levelUp(player, level) {
        if (!this.shouldLog('SKILLS', this.levels.INFO)) return;
        console.log(`🎉 [SKILLS] ${player} leveled up to ${level}!`);
    }

    skillSelected(skillName) {
        if (!this.shouldLog('SKILLS', this.levels.INFO)) return;
        console.log(`✨ [SKILLS] Selected: ${skillName}`);
    }

    enemyKilled(enemyType, killedBy) {
        if (!this.shouldLog('COMBAT', this.levels.DEBUG)) return;
        console.log(`💀 [COMBAT] ${enemyType} killed by ${killedBy}`);
    }

    networkEvent(event, data) {
        if (!this.shouldLog('NETWORK', this.levels.TRACE)) return;
        console.log(`📡 [NETWORK] ${event}:`, data);
    }

    performance(metric, value) {
        if (!this.shouldLog('PERFORMANCE', this.levels.INFO)) return;
        console.log(`📊 [PERFORMANCE] ${metric}: ${value}`);
    }

    // Performance timing helper
    startTimer(label) {
        if (!this.shouldLog('PERFORMANCE', this.levels.DEBUG)) return;
        console.time(`⏱️ [PERFORMANCE] ${label}`);
    }

    endTimer(label) {
        if (!this.shouldLog('PERFORMANCE', this.levels.DEBUG)) return;
        console.timeEnd(`⏱️ [PERFORMANCE] ${label}`);
    }

    // Group logs
    group(category, level, label) {
        if (!this.shouldLog(category, level)) return;
        console.group(`📁 [${category}] ${label}`);
    }

    groupEnd() {
        console.groupEnd();
    }

    // Get current config
    getConfig() {
        return {
            level: Object.keys(this.levels).find(k => this.levels[k] === this.currentLevel),
            categories: { ...this.categories }
        };
    }
}

// Create global instance
window.debug = new Debug();

// Quick access in console
console.log(`✅ Debug System Loaded`);
console.log(`   Use: debug.setLevel('DEBUG')  - Set log level`);
console.log(`   Use: debug.setCategory('NETWORK', true)  - Toggle category`);
console.log(`   Use: debug.enableAll()  - Enable all logging`);
console.log(`   Use: debug.disableAll()  - Disable all logging`);
console.log(`   Categories:`, Object.keys(window.debug.categories).join(', '));
