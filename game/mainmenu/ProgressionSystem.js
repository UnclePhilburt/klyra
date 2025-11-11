// PROGRESSION SYSTEM
// Manages character unlocks, selection, and player progression
// Stores data in localStorage

class ProgressionSystem {
    constructor() {
        this.saveKey = 'klyra_progression';
        this.data = this.loadData();

        console.log('✅ Progression System initialized');
        console.log('📊 Progression data:', this.data);
    }

    loadData() {
        const saved = localStorage.getItem(this.saveKey);

        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('⚠️ Failed to load progression data, using defaults');
                return this.getDefaultData();
            }
        }

        return this.getDefaultData();
    }

    getDefaultData() {
        return {
            selectedCharacter: 'ALDRIC',
            unlockedCharacters: [
                'ALDRIC',      // Knight - Unlocked by default
                'NYX',         // Rogue - Unlocked by default
                'MALACHAR',    // Necromancer - Unlocked by default
                'THRAIN',      // Berserker - Unlocked by default
                'ZEPHIRA',     // Mage - Unlocked by default
                'HIROSHI'      // Samurai - Unlocked by default
            ],
            stats: {
                totalRuns: 0,
                totalKills: 0,
                totalDeaths: 0,
                highestLevel: 1,
                playtime: 0
            },
            achievements: [],
            settings: {
                volume: 30,
                fullscreen: false,
                particleEffects: true
            }
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(this.data));
            console.log('💾 Progression saved');
        } catch (e) {
            console.error('❌ Failed to save progression:', e);
        }
    }

    // Character Management
    getSelectedCharacter() {
        return this.data.selectedCharacter || 'ALDRIC';
    }

    selectCharacter(characterId) {
        if (!this.isCharacterUnlocked(characterId)) {
            console.warn(`⚠️ Cannot select locked character: ${characterId}`);
            return false;
        }

        this.data.selectedCharacter = characterId;
        this.saveData();
        console.log(`✅ Character selected: ${characterId}`);
        return true;
    }

    isCharacterUnlocked(characterId) {
        return this.data.unlockedCharacters.includes(characterId);
    }

    unlockCharacter(characterId) {
        if (!this.isCharacterUnlocked(characterId)) {
            this.data.unlockedCharacters.push(characterId);
            this.saveData();
            console.log(`🎉 Character unlocked: ${characterId}`);
            return true;
        }
        return false;
    }

    getUnlockedCharacters() {
        return [...this.data.unlockedCharacters];
    }

    // Stats Management
    incrementRuns() {
        this.data.stats.totalRuns++;
        this.saveData();
    }

    incrementKills(count = 1) {
        this.data.stats.totalKills += count;
        this.saveData();
    }

    incrementDeaths() {
        this.data.stats.totalDeaths++;
        this.saveData();
    }

    updateHighestLevel(level) {
        if (level > this.data.stats.highestLevel) {
            this.data.stats.highestLevel = level;
            this.saveData();
        }
    }

    addPlaytime(seconds) {
        this.data.stats.playtime += seconds;
        this.saveData();
    }

    getStats() {
        return { ...this.data.stats };
    }

    // Achievements
    unlockAchievement(achievementId) {
        if (!this.data.achievements.includes(achievementId)) {
            this.data.achievements.push(achievementId);
            this.saveData();
            console.log(`🏆 Achievement unlocked: ${achievementId}`);
            return true;
        }
        return false;
    }

    hasAchievement(achievementId) {
        return this.data.achievements.includes(achievementId);
    }

    getAchievements() {
        return [...this.data.achievements];
    }

    // Settings
    getSetting(key) {
        return this.data.settings[key];
    }

    setSetting(key, value) {
        this.data.settings[key] = value;
        this.saveData();
    }

    // Utility
    resetProgress() {
        if (confirm('⚠️ Are you sure you want to reset ALL progress? This cannot be undone!')) {
            this.data = this.getDefaultData();
            this.saveData();
            console.log('🔄 Progress reset');
            return true;
        }
        return false;
    }

    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.data = imported;
            this.saveData();
            console.log('✅ Data imported successfully');
            return true;
        } catch (e) {
            console.error('❌ Failed to import data:', e);
            return false;
        }
    }
}

// Create global instance
const progressionSystem = new ProgressionSystem();
window.progressionSystem = progressionSystem;

// Connect to character select manager
if (window.characterSelectManager) {
    window.characterSelectManager.setProgressionSystem(progressionSystem);
    console.log('✅ Progression system connected to character select');
} else {
    // Wait for character select manager to load
    setTimeout(() => {
        if (window.characterSelectManager) {
            window.characterSelectManager.setProgressionSystem(progressionSystem);
            console.log('✅ Progression system connected to character select (delayed)');
        }
    }, 100);
}

console.log('💡 Progression System Commands:');
console.log('  - progressionSystem.getStats() - View your stats');
console.log('  - progressionSystem.getSelectedCharacter() - See selected character');
console.log('  - progressionSystem.getUnlockedCharacters() - See unlocked characters');
console.log('  - progressionSystem.resetProgress() - Reset all progress');
