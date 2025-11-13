// ModernHUD - Ultra-lightweight, performance-optimized HUD
class ModernHUD {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Cache for optimization - CRITICAL FPS FIX
        this.lastHealth = null;
        this.lastMaxHealth = null;
        this.lastLevel = null;
        this.lastExperience = null;
        this.lastStats = null;

        // Simple text elements only
        this.healthText = null;
        this.levelText = null;
        this.xpText = null;
        this.statsText = null;
        this.killCounterText = null;

        // Simple rectangles for bars
        this.healthBarBg = null;
        this.healthBarFill = null;
        this.xpBarBg = null;
        this.xpBarFill = null;

        this.create();
    }

    create() {
        const width = this.scene.cameras.main.width;

        // Health bar (top left)
        this.healthBarBg = this.scene.add.rectangle(20, 20, 200, 20, 0x000000, 0.7);
        this.healthBarBg.setOrigin(0, 0);
        this.healthBarBg.setScrollFactor(0);
        this.healthBarBg.setDepth(1000);

        this.healthBarFill = this.scene.add.rectangle(20, 20, 200, 20, 0x10b981, 1);
        this.healthBarFill.setOrigin(0, 0);
        this.healthBarFill.setScrollFactor(0);
        this.healthBarFill.setDepth(1001);

        // Health text
        this.healthText = this.scene.add.text(120, 30, '100/100', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // Level text
        this.levelText = this.scene.add.text(20, 50, 'LVL 1', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'bold',
            fill: '#6366f1',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(1002);

        // XP bar
        this.xpBarBg = this.scene.add.rectangle(20, 80, 150, 8, 0x000000, 0.7);
        this.xpBarBg.setOrigin(0, 0);
        this.xpBarBg.setScrollFactor(0);
        this.xpBarBg.setDepth(1000);

        this.xpBarFill = this.scene.add.rectangle(20, 80, 150, 8, 0x6366f1, 1);
        this.xpBarFill.setOrigin(0, 0);
        this.xpBarFill.setScrollFactor(0);
        this.xpBarFill.setDepth(1001);

        // XP text
        this.xpText = this.scene.add.text(95, 70, 'XP: 0 / 100', {
            fontFamily: 'Arial',
            fontSize: '10px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1002);

        // Stats text
        this.statsText = this.scene.add.text(20, 100, '', {
            fontFamily: 'Arial',
            fontSize: '12px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(1002);

        // Kill counter (top right)
        this.killCounterText = this.scene.add.text(width - 20, 20, 'Kills: 0', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'bold',
            fill: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1002);

        // Initial update
        this.update();
    }

    update() {
        if (!this.player) return;

        // Only update health bar if health changed (CRITICAL FPS FIX)
        if (this.player.health !== this.lastHealth || this.player.maxHealth !== this.lastMaxHealth) {
            this.updateHealthBar();
            this.lastHealth = this.player.health;
            this.lastMaxHealth = this.player.maxHealth;
        }

        // Only update XP bar if XP/level changed
        if (this.player.experience !== this.lastExperience || this.player.level !== this.lastLevel) {
            this.updateXPBar();
            this.updateLevel();
            this.lastExperience = this.player.experience;
            this.lastLevel = this.player.level;
        }

        // Only update stats if they changed
        const statsChanged = !this.lastStats ||
            this.player.stats.strength !== this.lastStats.strength ||
            this.player.stats.defense !== this.lastStats.defense;

        if (statsChanged) {
            this.updateStats();
            this.lastStats = { ...this.player.stats };
        }
    }

    updateHealthBar() {
        const health = this.player.health;
        const maxHealth = this.player.maxHealth;
        const healthPercent = health / maxHealth;

        // Update bar width
        this.healthBarFill.width = 200 * healthPercent;

        // Update color based on health
        let color;
        if (healthPercent > 0.6) {
            color = 0x10b981; // Green
        } else if (healthPercent > 0.4) {
            color = 0xfbbf24; // Yellow
        } else if (healthPercent > 0.25) {
            color = 0xf97316; // Orange
        } else {
            color = 0xef4444; // Red
        }
        this.healthBarFill.setFillStyle(color, 1);

        // Update text
        this.healthText.setText(`${Math.ceil(health)}/${Math.ceil(maxHealth)}`);
    }

    updateLevel() {
        const level = this.player.level || 1;
        this.levelText.setText(`LVL ${level}`);
    }

    updateXPBar() {
        const xp = this.player.experience || 0;
        const xpToNext = 100; // TODO: Get from game config
        const xpPercent = Math.min(xp / xpToNext, 1);

        // Update bar width
        this.xpBarFill.width = 150 * xpPercent;

        // Update text
        this.xpText.setText(`XP: ${xp} / ${xpToNext}`);
    }

    updateStats() {
        const stats = this.player.stats || {};
        const statsLines = [
            `ATK: ${stats.attack || 10}`,
            `DEF: ${stats.defense || 5}`,
            `SPD: ${stats.speed || 100}`,
            `CRT: ${stats.critical || 5}%`
        ];

        this.statsText.setText(statsLines.join('  '));
    }

    updateKills(kills) {
        if (this.killCounterText) {
            this.killCounterText.setText(`Kills: ${kills}`);
        }
    }

    destroy() {
        // Destroy all elements
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.healthBarFill) this.healthBarFill.destroy();
        if (this.healthText) this.healthText.destroy();
        if (this.levelText) this.levelText.destroy();
        if (this.xpBarBg) this.xpBarBg.destroy();
        if (this.xpBarFill) this.xpBarFill.destroy();
        if (this.xpText) this.xpText.destroy();
        if (this.statsText) this.statsText.destroy();
        if (this.killCounterText) this.killCounterText.destroy();
    }
}
