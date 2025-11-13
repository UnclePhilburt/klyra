// ModernHUD - Sleek, magical UI system for in-game display
class ModernHUD {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Container for all UI elements
        this.container = null;

        // UI Elements
        this.healthOrb = null;
        this.healthGlow = null;
        this.healthText = null;
        this.healthPercentText = null;
        this.portraitFrame = null;
        this.levelBadge = null;
        this.levelText = null;
        this.xpBar = null;
        this.xpBarFill = null;
        this.xpText = null;
        this.statsPanel = null;
        this.statsText = null;
        this.killCounter = null;
        this.killCounterText = null;

        // Animation tweens
        this.healthPulseTween = null;
        this.xpShimmerTween = null;

        // Cache for optimization - CRITICAL FPS FIX
        this.lastHealth = null;
        this.lastMaxHealth = null;
        this.lastLevel = null;
        this.lastExperience = null;
        this.lastStats = null;

        this.create();
    }

    create() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Create health orb (top left)
        this.createHealthOrb();

        // Create character portrait frame
        this.createPortraitFrame();

        // Create level badge
        this.createLevelBadge();

        // Create XP bar
        this.createXPBar();

        // Create stats panel
        this.createStatsPanel();

        // Create kill counter (top right)
        this.createKillCounter(width);

        // Initial update
        this.update();
    }

    createHealthOrb() {
        const x = 90;
        const y = 90;
        const radius = 50;

        // Outer glow (pulsing)
        this.healthGlow = this.scene.add.graphics();
        this.healthGlow.setScrollFactor(0);
        this.healthGlow.setDepth(1000);

        // Main health circle (glass effect)
        this.healthOrb = this.scene.add.graphics();
        this.healthOrb.setScrollFactor(0);
        this.healthOrb.setDepth(1001);

        // Health text (center)
        this.healthText = this.scene.add.text(x, y, '100', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            fontSize: '32px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // Health percentage
        this.healthPercentText = this.scene.add.text(x, y + 25, '100%', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            fontSize: '12px',
            fill: '#a0a0a0',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // Pulse animation
        this.healthPulseTween = this.scene.tweens.add({
            targets: this.healthGlow,
            alpha: { from: 0.6, to: 0.3 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createPortraitFrame() {
        const x = 90;
        const y = 90;
        const size = 70;

        // Portrait frame (glassmorphism)
        this.portraitFrame = this.scene.add.graphics();
        this.portraitFrame.setScrollFactor(0);
        this.portraitFrame.setDepth(999);

        // Draw glass frame
        this.portraitFrame.fillStyle(0x0a0a0a, 0.6);
        this.portraitFrame.fillRoundedRect(x - size/2, y - size/2, size, size, 8);

        // Glossy border
        this.portraitFrame.lineStyle(2, 0x4a5568, 0.8);
        this.portraitFrame.strokeRoundedRect(x - size/2, y - size/2, size, size, 8);

        // Inner glow
        this.portraitFrame.lineStyle(1, 0x818cf8, 0.4);
        this.portraitFrame.strokeRoundedRect(x - size/2 + 2, y - size/2 + 2, size - 4, size - 4, 6);
    }

    createLevelBadge() {
        const x = 125;
        const y = 60;

        // Badge background (gradient effect)
        this.levelBadge = this.scene.add.graphics();
        this.levelBadge.setScrollFactor(0);
        this.levelBadge.setDepth(1003);

        // Draw badge
        this.levelBadge.fillStyle(0x6366f1, 1);
        this.levelBadge.fillRoundedRect(x - 15, y - 12, 30, 24, 4);

        // Glossy highlight
        this.levelBadge.fillStyle(0xffffff, 0.2);
        this.levelBadge.fillRoundedRect(x - 15, y - 12, 30, 10, 4);

        // Level text
        const level = this.player?.level || 1;
        this.levelText = this.scene.add.text(x, y, `${level}`, {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            fontSize: '16px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1004);
    }

    createXPBar() {
        const x = 50;
        const y = 155;
        const width = 80;
        const height = 8;

        // XP bar background (glass)
        const xpBg = this.scene.add.graphics();
        xpBg.setScrollFactor(0);
        xpBg.setDepth(1001);

        xpBg.fillStyle(0x000000, 0.5);
        xpBg.fillRoundedRect(x, y, width, height, 4);
        xpBg.lineStyle(1, 0x4a5568, 0.6);
        xpBg.strokeRoundedRect(x, y, width, height, 4);

        // XP bar fill
        this.xpBarFill = this.scene.add.graphics();
        this.xpBarFill.setScrollFactor(0);
        this.xpBarFill.setDepth(1002);

        // XP text
        this.xpText = this.scene.add.text(x + width/2, y - 10, 'XP: 0 / 100', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            fontSize: '10px',
            fill: '#a0a0a0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
    }

    createStatsPanel() {
        const x = 20;
        const y = 200;
        const width = 160;
        const height = 80;

        // Stats panel background (glassmorphism)
        this.statsPanel = this.scene.add.graphics();
        this.statsPanel.setScrollFactor(0);
        this.statsPanel.setDepth(1000);

        this.statsPanel.fillStyle(0x0a0a0a, 0.7);
        this.statsPanel.fillRoundedRect(x, y, width, height, 12);

        // Border with gradient feel
        this.statsPanel.lineStyle(1, 0x4a5568, 0.8);
        this.statsPanel.strokeRoundedRect(x, y, width, height, 12);

        // Inner highlight
        this.statsPanel.lineStyle(1, 0x818cf8, 0.3);
        this.statsPanel.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, 10);

        // Stats text
        this.statsText = this.scene.add.text(x + 15, y + 15, '', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            fontSize: '11px',
            fill: '#e2e8f0',
            lineSpacing: 6
        }).setScrollFactor(0).setDepth(1001);
    }

    createKillCounter(screenWidth) {
        const x = screenWidth - 30;
        const y = 30;
        const size = 60;

        // Kill counter panel (glassmorphism)
        this.killCounter = this.scene.add.graphics();
        this.killCounter.setScrollFactor(0);
        this.killCounter.setDepth(1000);

        this.killCounter.fillStyle(0x0a0a0a, 0.7);
        this.killCounter.fillRoundedRect(x - size, y, size, 50, 10);

        this.killCounter.lineStyle(1, 0xfbbf24, 0.6);
        this.killCounter.strokeRoundedRect(x - size, y, size, 50, 10);

        // Skull icon (emoji as placeholder)
        this.scene.add.text(x - size/2, y + 10, '💀', {
            fontSize: '20px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // Kill counter text
        this.killCounterText = this.scene.add.text(x - size/2, y + 35, '0', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            fontSize: '16px',
            fontStyle: 'bold',
            fill: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    }

    update() {
        if (!this.player) return;

        // Only update health orb if health changed (CRITICAL FPS FIX)
        if (this.player.health !== this.lastHealth || this.player.maxHealth !== this.lastMaxHealth) {
            this.updateHealthOrb();
            this.lastHealth = this.player.health;
            this.lastMaxHealth = this.player.maxHealth;
        }

        // Only update XP bar if XP/level changed
        if (this.player.experience !== this.lastExperience || this.player.level !== this.lastLevel) {
            this.updateXPBar();
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

    updateHealthOrb() {
        const health = this.player.health;
        const maxHealth = this.player.maxHealth;
        const healthPercent = health / maxHealth;

        const x = 90;
        const y = 90;
        const radius = 50;

        // Clear and redraw
        this.healthGlow.clear();
        this.healthOrb.clear();

        // Determine color based on health
        let color, glowColor;
        if (healthPercent > 0.6) {
            color = 0x10b981; // Emerald
            glowColor = 0x34d399;
        } else if (healthPercent > 0.4) {
            color = 0xfbbf24; // Amber
            glowColor = 0xfcd34d;
        } else if (healthPercent > 0.25) {
            color = 0xf97316; // Orange
            glowColor = 0xfb923c;
        } else {
            color = 0xef4444; // Red
            glowColor = 0xf87171;
        }

        // Outer glow
        this.healthGlow.fillStyle(glowColor, 0.4);
        this.healthGlow.fillCircle(x, y, radius + 10);

        // Glass background
        this.healthOrb.fillStyle(0x1e293b, 0.8);
        this.healthOrb.fillCircle(x, y, radius);

        // Health arc (circular progress)
        const startAngle = Phaser.Math.DegToRad(-90);
        const endAngle = startAngle + Phaser.Math.DegToRad(360 * healthPercent);

        this.healthOrb.lineStyle(8, color, 1);
        this.healthOrb.beginPath();
        this.healthOrb.arc(x, y, radius - 6, startAngle, endAngle, false);
        this.healthOrb.strokePath();

        // Inner glow
        this.healthOrb.lineStyle(2, glowColor, 0.6);
        this.healthOrb.strokeCircle(x, y, radius - 12);

        // Border
        this.healthOrb.lineStyle(2, 0x334155, 0.8);
        this.healthOrb.strokeCircle(x, y, radius);

        // Update text
        this.healthText.setText(`${Math.ceil(health)}`);
        this.healthPercentText.setText(`${Math.ceil(healthPercent * 100)}%`);

        // Color text based on health
        if (healthPercent <= 0.25) {
            this.healthText.setFill('#ef4444');
        } else {
            this.healthText.setFill('#ffffff');
        }
    }

    updateXPBar() {
        const xp = this.player.experience || 0;
        const xpToNext = 100; // TODO: Get from game config
        const xpPercent = Math.min(xp / xpToNext, 1);

        const x = 50;
        const y = 155;
        const width = 80;
        const height = 8;

        this.xpBarFill.clear();

        // XP gradient fill
        const fillWidth = width * xpPercent;

        // Glow
        this.xpBarFill.fillStyle(0x818cf8, 0.3);
        this.xpBarFill.fillRoundedRect(x - 1, y - 1, fillWidth + 2, height + 2, 4);

        // Main fill
        this.xpBarFill.fillStyle(0x6366f1, 1);
        this.xpBarFill.fillRoundedRect(x, y, fillWidth, height, 4);

        // Glossy highlight
        this.xpBarFill.fillStyle(0xffffff, 0.3);
        this.xpBarFill.fillRoundedRect(x, y, fillWidth, height * 0.4, 4);

        // Update text
        this.xpText.setText(`XP: ${xp} / ${xpToNext}`);
    }

    updateStats() {
        const stats = this.player.stats || {};
        const statsLines = [
            `⚔️  ATK: ${stats.attack || 10}`,
            `🛡️  DEF: ${stats.defense || 5}`,
            `⚡  SPD: ${stats.speed || 100}`,
            `🎯  CRT: ${stats.critical || 5}%`
        ];

        this.statsText.setText(statsLines.join('\n'));
    }

    updateKills(kills) {
        if (this.killCounterText) {
            this.killCounterText.setText(`${kills}`);

            // Bounce animation on kill
            this.scene.tweens.add({
                targets: this.killCounterText,
                scale: { from: 1.5, to: 1 },
                duration: 300,
                ease: 'Back.easeOut'
            });
        }
    }

    destroy() {
        if (this.healthPulseTween) this.healthPulseTween.remove();
        if (this.xpShimmerTween) this.xpShimmerTween.remove();

        if (this.healthOrb) this.healthOrb.destroy();
        if (this.healthGlow) this.healthGlow.destroy();
        if (this.healthText) this.healthText.destroy();
        if (this.healthPercentText) this.healthPercentText.destroy();
        if (this.portraitFrame) this.portraitFrame.destroy();
        if (this.levelBadge) this.levelBadge.destroy();
        if (this.levelText) this.levelText.destroy();
        if (this.xpBarFill) this.xpBarFill.destroy();
        if (this.xpText) this.xpText.destroy();
        if (this.statsPanel) this.statsPanel.destroy();
        if (this.statsText) this.statsText.destroy();
        if (this.killCounter) this.killCounter.destroy();
        if (this.killCounterText) this.killCounterText.destroy();
    }
}
