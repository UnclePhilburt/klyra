// SkillSelector - Roguelike skill selection system on level up
class SkillSelector {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.selectedSkills = []; // Skills the player has chosen

        // UI elements
        this.overlay = null;
        this.cards = [];
        this.titleText = null;
    }

    show(playerClass, currentLevel) {
        if (this.isActive) return;
        this.isActive = true;

        // Pause the game
        this.scene.physics.pause();

        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Dark overlay
        this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.85);
        this.overlay.setOrigin(0, 0);
        this.overlay.setScrollFactor(0);
        this.overlay.setDepth(2000);

        // Title
        this.titleText = this.scene.add.text(width / 2, 80, 'LEVEL UP! Choose Your Power', {
            fontFamily: 'Arial',
            fontSize: '32px',
            fontStyle: 'bold',
            fill: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        // Get available skills for this class and level
        const availableSkills = this.getAvailableSkills(playerClass, currentLevel);

        // Show 3 random skill cards
        const skillChoices = this.selectRandomSkills(availableSkills, 3);
        const cardWidth = 250;
        const cardHeight = 350;
        const spacing = 30;
        const totalWidth = (cardWidth * 3) + (spacing * 2);
        const startX = (width - totalWidth) / 2;
        const startY = 180;

        skillChoices.forEach((skill, index) => {
            const x = startX + (cardWidth / 2) + (index * (cardWidth + spacing));
            const y = startY + cardHeight / 2;

            const card = this.createSkillCard(skill, x, y, cardWidth, cardHeight);
            this.cards.push(card);
        });
    }

    createSkillCard(skill, x, y, width, height) {
        const card = {
            skill: skill,
            elements: []
        };

        // Card background
        const bg = this.scene.add.rectangle(x, y, width, height, 0x1a1a2e, 1);
        bg.setStrokeStyle(3, 0x6366f1, 1);
        bg.setScrollFactor(0);
        bg.setDepth(2001);
        bg.setInteractive({ useHandCursor: true });
        card.elements.push(bg);

        // Hover effect
        bg.on('pointerover', () => {
            bg.setStrokeStyle(5, 0xfbbf24, 1);
            bg.setScale(1.05);
        });

        bg.on('pointerout', () => {
            bg.setStrokeStyle(3, 0x6366f1, 1);
            bg.setScale(1.0);
        });

        // Click to select
        bg.on('pointerdown', () => {
            this.selectSkill(skill);
        });

        // Skill icon/emoji
        const icon = this.scene.add.text(x, y - 120, skill.icon, {
            fontSize: '64px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        card.elements.push(icon);

        // Skill name
        const name = this.scene.add.text(x, y - 40, skill.name, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        card.elements.push(name);

        // Skill description
        const desc = this.scene.add.text(x, y + 40, skill.description, {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#cccccc',
            wordWrap: { width: width - 30 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        card.elements.push(desc);

        // Rarity indicator
        const rarityColors = {
            common: '#ffffff',
            uncommon: '#10b981',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b'
        };
        const rarityText = this.scene.add.text(x, y + 130, skill.rarity.toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: '12px',
            fontStyle: 'bold',
            fill: rarityColors[skill.rarity] || '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        card.elements.push(rarityText);

        return card;
    }

    selectSkill(skill) {
        console.log(`✨ Selected skill: ${skill.name}`);

        // Add to player's skills
        this.selectedSkills.push(skill);

        // Apply skill effect
        this.applySkill(skill);

        // Hide UI
        this.hide();

        // Resume game
        this.scene.physics.resume();
    }

    applySkill(skill) {
        const player = this.scene.localPlayer;
        if (!player) return;

        console.log(`🔮 Applying skill: ${skill.id}`);

        switch(skill.id) {
            case 'summon_minion':
                // Spawn another permanent minion
                this.scene.spawnMinion(
                    player.sprite.x + 60,
                    player.sprite.y,
                    player.data.id,
                    true // permanent
                );
                console.log('👹 Summoned additional permanent minion!');
                break;

            case 'minion_power':
                // Increase all minion damage by 100%
                Object.values(this.scene.minions).forEach(minion => {
                    minion.damage *= 2;
                    console.log(`💪 Minion ${minion.minionId} damage: ${minion.damage}`);
                });

                // Store multiplier for future minions
                if (!player.minionDamageMultiplier) {
                    player.minionDamageMultiplier = 1;
                }
                player.minionDamageMultiplier *= 2;
                console.log('⚡ All minion damage doubled!');
                break;

            case 'health_boost':
                // Increase max health by 50
                player.maxHealth += 50;
                player.health += 50;
                console.log(`❤️ Max health increased to ${player.maxHealth}`);
                break;

            case 'damage_boost':
                // Increase player damage by 50%
                player.stats.strength = Math.floor(player.stats.strength * 1.5);
                console.log(`⚔️ Strength increased to ${player.stats.strength}`);
                break;

            default:
                console.warn(`Unknown skill: ${skill.id}`);
        }
    }

    hide() {
        if (this.overlay) this.overlay.destroy();
        if (this.titleText) this.titleText.destroy();

        this.cards.forEach(card => {
            card.elements.forEach(element => element.destroy());
        });

        this.cards = [];
        this.isActive = false;
    }

    getAvailableSkills(playerClass, currentLevel) {
        // Define all available skills
        const allSkills = {
            // Malachar-specific skills
            summon_minion: {
                id: 'summon_minion',
                name: 'Dark Summoning',
                description: 'Summon another permanent minion to fight alongside you. Build your undead army!',
                icon: '👹',
                rarity: 'uncommon',
                classes: ['MALACHAR'],
                maxStacks: 5 // Can take this skill multiple times
            },
            minion_power: {
                id: 'minion_power',
                name: 'Abyssal Empowerment',
                description: 'Your minions deal 100% more damage. Make them unstoppable!',
                icon: '💀',
                rarity: 'rare',
                classes: ['MALACHAR'],
                maxStacks: 3
            },

            // Universal skills
            health_boost: {
                id: 'health_boost',
                name: 'Vitality Surge',
                description: 'Increase maximum health by 50. Survive longer in battle.',
                icon: '❤️',
                rarity: 'common',
                classes: ['ALL'],
                maxStacks: 10
            },
            damage_boost: {
                id: 'damage_boost',
                name: 'Power Strike',
                description: 'Increase your attack damage by 50%. Hit harder!',
                icon: '⚔️',
                rarity: 'common',
                classes: ['ALL'],
                maxStacks: 5
            }
        };

        // Filter skills by class and how many times they've been taken
        const available = [];
        for (let skillId in allSkills) {
            const skill = allSkills[skillId];

            // Check class requirement
            if (!skill.classes.includes('ALL') && !skill.classes.includes(playerClass)) {
                continue;
            }

            // Check max stacks
            const timesTaken = this.selectedSkills.filter(s => s.id === skill.id).length;
            if (timesTaken >= skill.maxStacks) {
                continue;
            }

            available.push(skill);
        }

        return available;
    }

    selectRandomSkills(skills, count) {
        // Shuffle and take first N
        const shuffled = [...skills].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, skills.length));
    }

    hasSkill(skillId) {
        return this.selectedSkills.some(s => s.id === skillId);
    }

    getSkillCount(skillId) {
        return this.selectedSkills.filter(s => s.id === skillId).length;
    }

    destroy() {
        this.hide();
    }
}
