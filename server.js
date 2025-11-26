require('dotenv').config(); // Load environment variables

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const auth = require('./auth');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: ["https://unclephilburt.github.io", "https://klyra.lol", "http://localhost:3000", "http://localhost:5500", "*"], // Allow GitHub Pages, klyra.lol, and local development
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    transports: ['websocket', 'polling'],
    allowEIO3: true // Allow Engine.IO v3 clients
});

app.use(cors({
    origin: ["https://unclephilburt.github.io", "https://klyra.lol", "http://localhost:3000", "http://localhost:5500", "*"],
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

// Serve static game files (game directory only)
app.use(express.static('game'));

// Health check endpoint for client status checking
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'online', timestamp: Date.now() });
});

const PORT = process.env.PORT || 3001;

// Family-safe random name generator for guests
// Cute random username components (internet-style fun names)
const CUTE_WORDS = [
    'Smol', 'Chonky', 'Sleepy', 'Cozy', 'Snuggly', 'Fuzzy', 'Fluffy', 'Silly',
    'Mighty', 'Tiny', 'Mega', 'Super', 'Ultra', 'Epic', 'Legendary', 'Cool',
    'Happy', 'Jolly', 'Merry', 'Sunny', 'Starry', 'Dreamy', 'Cloudy', 'Breezy',
    'Sweet', 'Sugar', 'Honey', 'Candy', 'Cookie', 'Mocha', 'Latte', 'Matcha',
    'Fully', 'Partly', 'Mostly', 'Totally', 'Literally', 'Actually', 'Probably', 'Maybe'
];

const CUTE_ANIMALS = [
    'Bunny', 'Puppy', 'Kitty', 'Birb', 'Doggo', 'Catto', 'Pupper', 'Floof',
    'Panda', 'Koala', 'Otter', 'Seal', 'Penguin', 'Hamster', 'Hedgehog', 'Axolotl',
    'Dragon', 'Unicorn', 'Phoenix', 'Griffin', 'Chimera', 'Pegasus', 'Wyrm', 'Drake'
];

const CUTE_THINGS = [
    'Cloud', 'Star', 'Moon', 'Sun', 'Rainbow', 'Thunder', 'Lightning', 'Aurora',
    'Bean', 'Potato', 'Nugget', 'Muffin', 'Biscuit', 'Waffle', 'Pancake', 'Toast',
    'Wizard', 'Knight', 'Ninja', 'Pirate', 'Hero', 'Legend', 'Champion', 'Master',
    'Gamer', 'Player', 'Noob', 'Pro', 'Boss', 'King', 'Queen', 'Prince'
];

const CUTE_MODIFIERS = [
    'Boi', 'Girl', 'Bro', 'Sis', 'Dude', 'Pal', 'Buddy', 'Friend',
    'Lord', 'Lady', 'Sir', 'Dame', 'Fan', 'Lover', 'Stan', 'Simp',
    'McFly', 'Face', 'Pants', 'Boots', 'Hat', 'Squad', 'Gang', 'Crew',
    'inator', 'omatic', 'tron', 'bot', 'zilla', 'saurus', 'corn', 'puff'
];

function generateGuestName() {
    const patterns = [
        // "FullyBunnt" style (word + animal/thing with letter doubling)
        () => {
            const word = CUTE_WORDS[Math.floor(Math.random() * CUTE_WORDS.length)];
            const thing = Math.random() > 0.5
                ? CUTE_ANIMALS[Math.floor(Math.random() * CUTE_ANIMALS.length)]
                : CUTE_THINGS[Math.floor(Math.random() * CUTE_THINGS.length)];
            // Double a random letter for internet style
            const doubled = thing.replace(/[aeiou]/i, match => match + match);
            return word + doubled;
        },
        // "UnicornRCool" style (thing + R + adjective)
        () => {
            const thing = Math.random() > 0.5
                ? CUTE_ANIMALS[Math.floor(Math.random() * CUTE_ANIMALS.length)]
                : CUTE_THINGS[Math.floor(Math.random() * CUTE_THINGS.length)];
            const word = CUTE_WORDS[Math.floor(Math.random() * CUTE_WORDS.length)];
            return thing + 'R' + word;
        },
        // "SmolBeanBoi" style (word + thing + modifier)
        () => {
            const word = CUTE_WORDS[Math.floor(Math.random() * CUTE_WORDS.length)];
            const thing = Math.random() > 0.5
                ? CUTE_ANIMALS[Math.floor(Math.random() * CUTE_ANIMALS.length)]
                : CUTE_THINGS[Math.floor(Math.random() * CUTE_THINGS.length)];
            const modifier = CUTE_MODIFIERS[Math.floor(Math.random() * CUTE_MODIFIERS.length)];
            return word + thing + modifier;
        },
        // "CozyCatto123" style (word + animal + number)
        () => {
            const word = CUTE_WORDS[Math.floor(Math.random() * CUTE_WORDS.length)];
            const animal = CUTE_ANIMALS[Math.floor(Math.random() * CUTE_ANIMALS.length)];
            const num = Math.floor(Math.random() * 1000);
            return word + animal + num;
        }
    ];

    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern();
}

// Game constants
const TILE_SIZE = 48; // CRITICAL: Client uses 48px tiles (was 32px)
const MAX_PLAYERS_PER_LOBBY = 10;
const LOBBY_START_DELAY = 5000; // 5 seconds before game starts
const RECONNECT_TIMEOUT = 30000; // 30 seconds to reconnect
const AFK_TIMEOUT = 180000; // 3 minutes AFK kick
const RATE_LIMIT_INTERVAL = 100; // Min ms between actions
const MAX_MESSAGE_LENGTH = 200;

// Data structures
const lobbies = new Map();
const players = new Map();
const disconnectedPlayers = new Map(); // For reconnection
const rateLimits = new Map(); // Rate limiting per player
const uniquePlayerUsernames = new Set(); // Track unique players who have ever connected

// Performance metrics
const metrics = {
    totalGames: 0,
    totalPlayers: 0,
    averageGameDuration: 0,
    peakPlayers: 0
};

// Free Character Rotation System (rotates every 30 minutes)
const AVAILABLE_CHARACTERS = ['KELISE', 'MALACHAR', 'ALDRIC', 'ZENRYU', 'ORION', 'LUNARE'];
let currentFreeCharacter = AVAILABLE_CHARACTERS[Math.floor(Math.random() * AVAILABLE_CHARACTERS.length)];
let freeCharacterRotationTime = Date.now();

function rotateFreeCharacter() {
    const previousCharacter = currentFreeCharacter;
    // Pick a different character than the current one
    let newCharacter;
    do {
        newCharacter = AVAILABLE_CHARACTERS[Math.floor(Math.random() * AVAILABLE_CHARACTERS.length)];
    } while (newCharacter === currentFreeCharacter && AVAILABLE_CHARACTERS.length > 1);

    currentFreeCharacter = newCharacter;
    freeCharacterRotationTime = Date.now();

    console.log(`🎲 Free character rotated: ${previousCharacter} → ${currentFreeCharacter}`);

    // Broadcast to all connected clients
    io.emit('freeCharacter:update', {
        character: currentFreeCharacter,
        rotationTime: freeCharacterRotationTime
    });
}

// Rotate free character every 30 minutes (1800000 ms)
setInterval(rotateFreeCharacter, 30 * 60 * 1000);
console.log(`🎲 Free character rotation started. Current free character: ${currentFreeCharacter}`);

// Helper function to calculate enemy drops based on type
function calculateEnemyDrops(enemy) {
    let xp = 10;  // Base XP (normal enemy)
    let souls = 1; // Base soul drop

    // Adjust based on enemy type
    if (enemy.type === 'mushroom') {
        // Swarmers: Weak, fast to kill
        xp = 5;
        souls = 1;
    } else if (enemy.type === 'swordDemon') {
        // Fast DPS: Normal rewards
        xp = 10;
        souls = 1;
    } else if (enemy.type === 'minotaur') {
        // Tanks: Tough, better rewards
        xp = 20;
        souls = 2;
    }

    // Bonus for elite/boss
    if (enemy.isElite) {
        xp *= 2;
        souls += 2;
    }
    if (enemy.isBoss) {
        xp *= 3;
        souls += 5;
    }

    // 10% chance for bonus soul drop (+3-5 souls)
    const bonusSouls = Math.random() < 0.1 ? (3 + Math.floor(Math.random() * 3)) : 0;

    return {
        xp: xp,
        souls: souls + bonusSouls,
        hasBonus: bonusSouls > 0
    };
}

// Player class
class Player {
    constructor(socketId, username) {
        this.id = socketId;
        this.username = this.sanitizeUsername(username);
        this.lobbyId = null;
        this.position = { x: 0, y: 0 };
        this.health = 100;
        this.maxHealth = 100;
        this.shield = 0; // Shield absorbs damage before health (e.g., from Chad's Shield passive)
        this.level = 1;
        this.experience = 0;
        this.class = 'warrior';
        this.isAlive = true;
        this.isReady = false;
        this.inventory = [];
        this.stats = this.getClassStats('warrior');
        this.kills = 0;
        this.deaths = 0;
        this.damageDealt = 0; // Track damage dealt for stats
        this.damageTaken = 0; // Track damage taken for stats
        this.itemsCollected = 0;
        this.sessionStartTime = Date.now(); // Track playtime
        this.lastActivity = Date.now();
        this.isReconnecting = false;
        this.disconnectedAt = null;
        this.currentMap = 'exterior'; // Track which map instance player is in
        this.userId = null; // Link to user account (null for guests)

        // New stat tracking
        this.bossKills = 0;
        this.eliteKills = 0;
        this.deepestFloor = 0;
        this.totalFloors = 0;
        this.gamesCompleted = 0;
        this.totalGold = 0;
        this.gold = 0; // Current session gold (for purchasing)
        this.currency = 0; // Earned souls from killing enemies (used for blackjack)
        this.souls = 0; // Banked souls (separate system)
        this.legendaryItems = 0;
        this.rareItems = 0;
        this.totalItems = 0;
        this.distanceTraveled = 0;
        this.lastPosition = { x: 0, y: 0 };
        this.abilitiesUsed = 0;
        this.potionsConsumed = 0;
        this.mushroomsKilled = 0;

        // Skill system
        this.selectedSkills = []; // Array of skill IDs/objects
        this.permanentMinions = []; // Track permanent minion IDs for restoration
        this.initializeMultipliers();

        // Pet system
        this.ownedPets = []; // Array of owned pet types
        this.activePet = null; // Currently equipped pet type (e.g., 'red_panda')
    }

    initializeMultipliers() {
        // Minion multipliers
        this.minionHealthMultiplier = 1;
        this.minionDamageMultiplier = 1;
        this.minionSpeedMultiplier = 1;
        this.minionAttackSpeedMultiplier = 1;
        this.minionAllStatsMultiplier = 1;
        this.minionSizeMultiplier = 1;
        this.minionDefenseMultiplier = 1;
        this.minionArmor = 0;

        // Minion special stats
        this.minionLifesteal = 0;
        this.minionRegen = 0;
        this.minionKnockback = false;
        // Removed minionStun - replaced with bleed mechanic
        this.minionCleave = false;
        this.minionUnstoppable = false;
        this.minionCritChance = 0;
        this.minionCritDamage = 2.0;

        // Player multipliers
        this.damageMultiplier = 1;
        this.xpMultiplier = 1;

        // Player special stats
        this.healPerKill = 0;
        this.healOnKillPercent = 0;
        this.regenPerMinion = 0;
        this.packDamageBonus = 0;
        this.groupedDefense = 0;
        this.coordinatedDamage = 0;
        this.perMinionBonus = 0;
        this.maxMinionBonus = 2.0;

        // Special effects
        this.berserkerDamage = 0;
        this.berserkerThreshold = 0.4;
        this.executeThreshold = 0;
        this.executeDamage = 2.0;
        this.bossDamage = 1.0;
        this.armorPen = 0;
        this.chainAttack = null;
        this.splashDamage = null;
        this.dualWield = false;
        this.attacksPerStrike = 1;
        this.commandAura = null;
        this.flankDamage = 1.0;
        this.killDamageStack = 0;
        this.maxKillStacks = 20;
        this.currentKillStacks = 0;
        this.reapersMarkThreshold = 0;
        this.reapersMarkDamage = 1.0;

        // God-tier effects
        this.minionCap = 20;
        this.legionBuffMultiplier = 1.0;
        this.instantRevive = false;
        this.shockwaveRadius = 0;
        this.deathAura = null;
        this.deathImmunity = false;
    }

    sanitizeUsername(username) {
        if (!username || typeof username !== 'string') {
            return generateGuestName();
        }
        // Remove special chars, limit length
        return username.slice(0, 20).replace(/[^a-zA-Z0-9_-]/g, '') || generateGuestName();
    }

    getClassStats(characterClass) {
        const classStats = {
            malachar: { strength: 6, defense: 6, speed: 9, health: 100 },    // Summoner: weak attacks, relies on minions
            aldric: { strength: 11, defense: 30, speed: 8, health: 180 },    // Tank: moderate damage, high survivability
            kelise: { strength: 16, defense: 14, speed: 12, health: 120 },   // Rogue: high damage, medium survivability
            zenryu: { strength: 18, defense: 6, speed: 12, health: 90 }      // Glass cannon: highest damage, lowest HP
        };

        const stats = classStats[characterClass] || classStats.malachar;
        this.maxHealth = stats.health;
        this.health = stats.health;
        return {
            strength: stats.strength,
            defense: stats.defense,
            speed: stats.speed
        };
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    isAFK() {
        return Date.now() - this.lastActivity > AFK_TIMEOUT;
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            position: this.position,
            health: this.health,
            maxHealth: this.maxHealth,
            shield: this.shield || 0,
            level: this.level,
            experience: this.experience,
            currency: this.currency,
            souls: this.souls,
            class: this.class,
            isAlive: this.isAlive,
            isReady: this.isReady,
            isBot: this.isBot || false,
            stats: this.stats,
            kills: this.kills,
            itemsCollected: this.itemsCollected,
            selectedSkills: this.selectedSkills,
            permanentMinions: this.permanentMinions,
            // Pet system
            ownedPets: this.ownedPets,
            activePet: this.activePet,
            // Include all multipliers and special effects
            minionHealthMultiplier: this.minionHealthMultiplier,
            minionDamageMultiplier: this.minionDamageMultiplier,
            minionSpeedMultiplier: this.minionSpeedMultiplier,
            minionAttackSpeedMultiplier: this.minionAttackSpeedMultiplier,
            minionAllStatsMultiplier: this.minionAllStatsMultiplier,
            minionSizeMultiplier: this.minionSizeMultiplier,
            minionDefenseMultiplier: this.minionDefenseMultiplier,
            minionArmor: this.minionArmor,
            minionLifesteal: this.minionLifesteal,
            minionRegen: this.minionRegen,
            minionKnockback: this.minionKnockback,
            // minionStun removed - replaced with bleed mechanic
            minionCleave: this.minionCleave,
            minionUnstoppable: this.minionUnstoppable,
            minionCritChance: this.minionCritChance,
            minionCritDamage: this.minionCritDamage,
            damageMultiplier: this.damageMultiplier,
            xpMultiplier: this.xpMultiplier,
            healPerKill: this.healPerKill,
            healOnKillPercent: this.healOnKillPercent,
            regenPerMinion: this.regenPerMinion,
            packDamageBonus: this.packDamageBonus,
            groupedDefense: this.groupedDefense,
            coordinatedDamage: this.coordinatedDamage,
            perMinionBonus: this.perMinionBonus,
            maxMinionBonus: this.maxMinionBonus,
            berserkerDamage: this.berserkerDamage,
            berserkerThreshold: this.berserkerThreshold,
            executeThreshold: this.executeThreshold,
            executeDamage: this.executeDamage,
            bossDamage: this.bossDamage,
            armorPen: this.armorPen,
            chainAttack: this.chainAttack,
            splashDamage: this.splashDamage,
            dualWield: this.dualWield,
            attacksPerStrike: this.attacksPerStrike,
            commandAura: this.commandAura,
            flankDamage: this.flankDamage,
            killDamageStack: this.killDamageStack,
            maxKillStacks: this.maxKillStacks,
            currentKillStacks: this.currentKillStacks,
            reapersMarkThreshold: this.reapersMarkThreshold,
            reapersMarkDamage: this.reapersMarkDamage,
            minionCap: this.minionCap,
            legionBuffMultiplier: this.legionBuffMultiplier,
            instantRevive: this.instantRevive,
            shockwaveRadius: this.shockwaveRadius,
            deathAura: this.deathAura,
            deathImmunity: this.deathImmunity,
            passiveSkills: this.passiveSkills || []
        };
    }
}

// AI Bot class - extends Player to act like a real player
class AIBot extends Player {
    constructor(lobbyId, botClass = null, patrolCenter = null) {
        const botNames = {
            'kelise': 'Bot Kelise',
            'malachar': 'Bot Malachar',
            'aldric': 'Bot Aldric'
        };

        // Use provided class or pick random
        const selectedClass = botClass || ['kelise', 'malachar', 'aldric'][Math.floor(Math.random() * 3)];
        const botName = botNames[selectedClass];

        super(`bot_${Date.now()}_${Math.random()}`, botName);

        this.isBot = true;
        this.lobbyId = lobbyId;
        this.class = selectedClass;
        this.stats = this.getClassStats(selectedClass);
        this.isReady = true;

        // Patrol center - defaults to null (will use world center)
        this.patrolCenter = patrolCenter;

        // BUFF BOTS - Make them actually useful!
        this.maxHealth = 200; // 2x health of normal players
        this.health = 200;
        this.damageMultiplier = 1.5; // 50% more damage

        // AI behavior properties
        this.target = null; // Current enemy target
        this.wanderTarget = null; // Exploration destination
        this.lastMoveTime = Date.now() - 200;
        this.lastAttackTime = 0;
        this.lastBroadcastPosition = { x: 0, y: 0 };
        this.lastAbilityTime = 0;
        this.lastHealTime = 0;
        this.moveInterval = 60; // Update movement every 60ms (more responsive)
        this.attackCooldown = 700; // Attack faster - every 0.7 seconds
        this.aggroRange = 800; // More tactical engagement distance
        this.followRange = 1000; // Will chase enemies moderately far
        this.retreatThreshold = 0.4; // Retreat when below 40% HP (smarter survival)
        this.isRetreating = false;
        this.kiteDistance = 250; // Optimal kiting distance for ranged

        // Pack behavior - Enhanced intelligence
        this.focusFireEnabled = true; // Bots coordinate attacks
        this.preferredAlly = null; // Bot will stick near this player
        this.teamworkRadius = 600; // Stay within this distance of allies
        this.avoidOverlapDistance = 100; // Avoid getting too close to allies

        // Auto-revive system
        this.respawnDelay = 10000; // Respawn after 10 seconds
        this.deathTime = null;

        // Stuck detection
        this.lastPositionCheck = { x: 0, y: 0 };
        this.lastPositionCheckTime = Date.now();
        this.stuckCheckInterval = 2000; // Check every 2 seconds

        // Ability cooldowns by class
        this.abilityCooldowns = this.getAbilityCooldowns(selectedClass);

        // Auto-select skills for the bot based on class
        this.selectedSkills = this.getDefaultSkills(selectedClass);

        // Orb collection range by class
        this.orbCollectionRange = this.getOrbCollectionRange(selectedClass);

        // Aldric is invincible - unlimited life for patrol duty
        this.isInvincible = (selectedClass === 'aldric');
    }

    getAbilityCooldowns(characterClass) {
        // Return cooldowns in milliseconds for each class
        switch(characterClass) {
            case 'aldric':
                return { e: 8000 }; // Shockwave - 8 second cooldown
            case 'malachar':
                return { q: 10000 }; // Pact of Bones placeholder
            case 'kelise':
                return {}; // No special abilities yet
            default:
                return {};
        }
    }

    getOrbCollectionRange(characterClass) {
        // Return orb collection range in pixels for each class
        switch(characterClass) {
            case 'aldric':
                return 75; // Aldric has short collection range (tank must get close)
            case 'malachar':
                return 300; // Malachar has standard range
            case 'kelise':
                return 300; // Kelise has standard range
            default:
                return 300;
        }
    }

    getDefaultSkills(characterClass) {
        // Return default skill selections for each class
        switch(characterClass) {
            case 'aldric':
                return [
                    'damage_boost',        // Level 2: +10% damage
                    'attack_speed',        // Level 3: +15% attack speed
                    'critical_strike',     // Level 4: 10% crit chance
                    'health_boost',        // Level 5: +20% max health
                    'area_damage'          // Level 6: Area damage boost
                ];
            case 'malachar':
                return [
                    'minion_damage',       // Level 2: +20% minion damage
                    'minion_count',        // Level 3: +1 max minions
                    'minion_health',       // Level 4: +30% minion health
                    'dark_harvest',        // Level 5: Enhanced minion spawn on kill
                    'minion_speed'         // Level 6: +25% minion speed
                ];
            case 'kelise':
                return [
                    'attack_speed',        // Level 2: +15% attack speed
                    'damage_boost',        // Level 3: +10% damage
                    'lifesteal',           // Level 4: 5% lifesteal
                    'critical_damage',     // Level 5: +50% crit damage
                    'mobility'             // Level 6: Enhanced movement
                ];
            default:
                return [];
        }
    }

    // AI decision making - called every tick
    update(lobby) {
        const now = Date.now();

        // Collect nearby XP orbs
        this.collectNearbyOrbs(lobby);

        // Check if stuck (hasn't moved much in 2 seconds)
        if (now - this.lastPositionCheckTime > this.stuckCheckInterval) {
            const dx = this.position.x - this.lastPositionCheck.x;
            const dy = this.position.y - this.lastPositionCheck.y;
            const distMoved = Math.sqrt(dx * dx + dy * dy);

            if (distMoved < 50) { // Moved less than 50 pixels in 2 seconds = stuck
                console.log(`⚠️ Bot ${this.username} is stuck! Resetting patrol...`);
                // Pick a new random wander target to get unstuck
                this.wanderTarget = null;
                this.target = null; // Also clear enemy target if stuck
                this.preferredSide = null; // Reset side preference
                this.patrolAngle = Math.random() * Math.PI * 2; // Reset patrol angle
            }

            this.lastPositionCheck = { x: this.position.x, y: this.position.y };
            this.lastPositionCheckTime = now;
        }

        // Check if we need to retreat (low health)
        // Invincible bots (Aldric) never retreat
        const healthPercent = this.health / this.maxHealth;
        if (!this.isInvincible && healthPercent < this.retreatThreshold && this.isAlive) {
            this.isRetreating = true;
        } else if (healthPercent > 0.6) {
            this.isRetreating = false; // Stop retreating when healed
        }

        // Self-heal when retreating
        if (this.isRetreating && now - this.lastHealTime > 2000) {
            this.heal(lobby, 10); // Heal 10 HP every 2 seconds
            this.lastHealTime = now;
        }

        // Find best target (use focus fire if enabled) - invincible bots always target
        if (!this.isRetreating || this.isInvincible) {
            this.findTarget(lobby);
        } else {
            this.target = null; // Don't engage while retreating
        }

        // Move towards target, retreat, or follow allies
        if (now - this.lastMoveTime > this.moveInterval) {
            this.makeMovement(lobby);
            this.lastMoveTime = now;
        }

        // Use abilities intelligently
        if (!this.isRetreating || this.isInvincible) {
            this.useAbilities(lobby);
        }

        // Attack if in range and not retreating (invincible bots always attack)
        if (this.target && (!this.isRetreating || this.isInvincible) && now - this.lastAttackTime > this.attackCooldown) {
            this.attemptAttack(lobby);
            this.lastAttackTime = now;
        }
    }

    heal(lobby, amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);

        // Broadcast heal event
        lobby.broadcast('player:healed', {
            playerId: this.id,
            health: this.health,
            maxHealth: this.maxHealth,
            healAmount: amount
        });
    }

    findTarget(lobby) {
        if (!lobby.gameState || !lobby.gameState.enemies) return;

        
        let bestTarget = null;
        let bestScore = -Infinity;

        // FOCUS FIRE: Check what real players are attacking
        let playerTargets = new Map(); // enemy -> number of players attacking it
        if (this.focusFireEnabled) {
            lobby.players.forEach(player => {
                if (!player.isBot && player.lastAttackedEnemy) {
                    const count = playerTargets.get(player.lastAttackedEnemy) || 0;
                    playerTargets.set(player.lastAttackedEnemy, count + 1);
                }
            });
        }

        lobby.gameState.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;

            // Enemy positions are already in pixels
            const dx = enemy.position.x - this.position.x;
            const dy = enemy.position.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.aggroRange) {
                // SMART TARGETING with multiple factors
                const healthPercent = enemy.health / enemy.maxHealth;
                const distanceScore = 1 - (dist / this.aggroRange); // Closer = higher score
                const healthScore = 1 - healthPercent; // Lower health = higher score

                // PRIORITY: Dangerous enemies (bosses, elites)
                let threatScore = 0;
                const enemyType = enemy.type?.toLowerCase() || '';
                if (enemyType.includes('boss') || enemyType.includes('minotaur')) {
                    threatScore = 0.8; // High priority on bosses
                } else if (enemyType.includes('wolf') || enemyType.includes('emberclaw')) {
                    threatScore = 0.4; // Medium priority on dangerous mobs
                } else {
                    threatScore = 0.1; // Low priority on weak mobs
                }

                // FOCUS FIRE BONUS: Massive boost if players are attacking this enemy
                const focusFireBonus = playerTargets.get(enemy.id) || 0;

                // ADVANCED WEIGHTED SCORING:
                // 1. Focus fire (50%) - strongly coordinate with players
                // 2. Low health (25%) - finish off weak enemies quickly
                // 3. Threat level (15%) - prioritize dangerous enemies
                // 4. Distance (10%) - prefer closer enemies
                let score = (focusFireBonus * 0.5) + (healthScore * 0.25) + (threatScore * 0.15) + (distanceScore * 0.1);

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = enemy;
                }
            }
        });

        // SMART TARGET SWITCHING: Only switch if significantly better
        if (this.target && this.target.isAlive) {
            const dx = (this.target.position.x * TILE_SIZE) - this.position.x;
            const dy = (this.target.position.y * TILE_SIZE) - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Switch if current target too far or new target is WAY better
            if (dist > this.followRange) {
                this.target = bestTarget;
            } else if (bestTarget && bestScore > 0.8) {
                // Only switch if new target scores 80%+ (prevents constant switching)
                this.target = bestTarget;
            }
        } else {
            this.target = bestTarget;
        }
    }

    makeMovement(lobby) {
        
        const moveSpeed = 5; // Pixels per update

        // RETREAT BEHAVIOR: Run away from danger when low HP
        if (this.isRetreating) {
            const nearbyEnemies = this.getNearbyEnemies(lobby, 400);

            if (nearbyEnemies.length > 0) {
                // Calculate average enemy position
                let avgX = 0, avgY = 0;
                nearbyEnemies.forEach(enemy => {
                    avgX += enemy.position.x * TILE_SIZE;
                    avgY += enemy.position.y * TILE_SIZE;
                });
                avgX /= nearbyEnemies.length;
                avgY /= nearbyEnemies.length;

                // Run AWAY from enemies
                const dx = this.position.x - avgX;
                const dy = this.position.y - avgY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    this.position.x += (dx / dist) * moveSpeed * 2; // Run faster when retreating!
                    this.position.y += (dy / dist) * moveSpeed * 2;
                }
            }

            // Broadcast retreat movement
            const dx = this.position.x - this.lastBroadcastPosition.x;
            const dy = this.position.y - this.lastBroadcastPosition.y;
            const distMoved = Math.sqrt(dx * dx + dy * dy);

            if (distMoved > 20) {
                lobby.broadcast('player:moved', {
                    playerId: this.id,
                    position: this.position
                });
                this.lastBroadcastPosition = { x: this.position.x, y: this.position.y };
            }

            return; // Skip normal movement
        }

        // ALDRIC SPECIAL BEHAVIOR: Always patrol, even when fighting
        if (this.isInvincible) {
            // Check for nearby orbs first
            let shouldSeekOrb = false;
            let orbTarget = null;

            if (lobby.gameState && lobby.gameState.experienceOrbs) {
                let closestOrb = null;
                let closestDist = 200; // Only seek orbs within 200 pixels

                lobby.gameState.experienceOrbs.forEach((orb, orbId) => {
                    const dx = orb.x - this.position.x;
                    const dy = orb.y - this.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < closestDist) {
                        closestDist = dist;
                        closestOrb = { x: orb.x, y: orb.y, id: orbId, dist };
                    }
                });

                if (closestOrb) {
                    shouldSeekOrb = true;
                    orbTarget = closestOrb;
                }
            }

            if (shouldSeekOrb && orbTarget) {
                // Temporarily move toward nearby orb
                const dx = orbTarget.x - this.position.x;
                const dy = orbTarget.y - this.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 10) {
                    this.position.x += (dx / dist) * moveSpeed * 2; // Move faster toward orbs
                    this.position.y += (dy / dist) * moveSpeed * 2;
                }
            } else {
                // Random roaming around patrol center
                // Use bot's patrol center, or world center if not set
                const patrolCenterX = this.patrolCenter ? this.patrolCenter.x : (lobby.WORLD_SIZE * TILE_SIZE) / 2;
                const patrolCenterY = this.patrolCenter ? this.patrolCenter.y : (lobby.WORLD_SIZE * TILE_SIZE) / 2;

                // Spawn bot: wider roam (3000px). Chunk5 bots: stay near chunk (1000px)
                const maxRoamDistance = this.isSpawnBot ? 3000 : 1000;

                // Pick a new random destination if we don't have one or reached it
                if (!this.wanderTarget) {
                    // Pick random point within roam area around patrol center
                    const randomAngle = Math.random() * Math.PI * 2;
                    const randomDistance = Math.random() * maxRoamDistance;

                    this.wanderTarget = {
                        x: patrolCenterX + Math.cos(randomAngle) * randomDistance,
                        y: patrolCenterY + Math.sin(randomAngle) * randomDistance
                    };
                }

                // Move toward wander target
                const dx = this.wanderTarget.x - this.position.x;
                const dy = this.wanderTarget.y - this.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // If reached destination (within 100 pixels), pick new one
                if (dist < 100) {
                    this.wanderTarget = null;
                } else {
                    // Move steadily toward destination
                    this.position.x += (dx / dist) * moveSpeed * 1.5;
                    this.position.y += (dy / dist) * moveSpeed * 1.5;
                }
            }
        } else if (this.target) {
            // Normal bot behavior - position near target
            // Calculate target position
            const targetX = this.target.position.x * TILE_SIZE;
            const targetY = this.target.position.y * TILE_SIZE;

            // Check leash distance - don't chase enemies too far from patrol route
            // Use bot's patrol center, or world center if not set
            const patrolCenterX = this.patrolCenter ? this.patrolCenter.x : (lobby.WORLD_SIZE * TILE_SIZE) / 2;
            const patrolCenterY = this.patrolCenter ? this.patrolCenter.y : (lobby.WORLD_SIZE * TILE_SIZE) / 2;
            const botDistFromCenter = Math.sqrt(
                Math.pow(this.position.x - patrolCenterX, 2) +
                Math.pow(this.position.y - patrolCenterY, 2)
            );
            // Spawn bot: wider roam (3500px). Chunk5 bots: stay near chunk (1200px = ~67% of chunk size)
            const maxLeashDistance = this.isSpawnBot ? 3500 : 1200;

            if (botDistFromCenter > maxLeashDistance) {
                // Bot is too far - disengage and actively move back toward patrol center
                this.target = null;
                this.wanderTarget = null; // Force picking new patrol waypoint
                this.preferredSide = null;

                // Only log once when first leashed
                if (!this.isLeashed) {
                    console.log(`🔗 Bot ${this.username} leashed - returning to patrol route (${botDistFromCenter.toFixed(0)}px from patrol center)`);
                    this.isLeashed = true;
                }

                // Move directly toward patrol center to get back in range
                const dx = patrolCenterX - this.position.x;
                const dy = patrolCenterY - this.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 10) {
                    this.position.x += (dx / dist) * moveSpeed;
                    this.position.y += (dy / dist) * moveSpeed;
                }
                return;
            } else {
                // Back in range - reset leash flag
                if (this.isLeashed) {
                    console.log(`✅ Bot ${this.username} returned to patrol area`);
                    this.isLeashed = false;
                }
            }

            // Position to the left or right of enemy (for horizontal auto-attacks)
            // Choose a side offset if we don't have one yet
            if (!this.preferredSide) {
                this.preferredSide = Math.random() < 0.5 ? -1 : 1; // -1 = left, 1 = right
            }

            const attackRange = 120; // Optimal attack range (3-4 tiles)
            const sideOffset = attackRange * this.preferredSide; // Position to left or right

            // Ideal position: to the side of the enemy at attack range
            const idealX = targetX + sideOffset;
            const idealY = targetY; // Same Y level for horizontal attacks

            const dx = idealX - this.position.x;
            const dy = idealY - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Move towards ideal position if not close enough
            if (dist > 30) { // Allow some tolerance (30 pixels)
                this.position.x += (dx / dist) * moveSpeed;
                this.position.y += (dy / dist) * moveSpeed;
            }
        } else {
            // No enemy target - check for nearby orbs first, then patrol
            this.preferredSide = null;

            // ORB SEEKING: Look for nearby orbs and move toward them
            if (lobby.gameState && lobby.gameState.experienceOrbs) {
                let closestOrb = null;
                let closestDist = 400; // Only seek orbs within 400 pixels

                lobby.gameState.experienceOrbs.forEach((orb, orbId) => {
                    const dx = orb.x - this.position.x;
                    const dy = orb.y - this.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < closestDist) {
                        closestDist = dist;
                        closestOrb = { x: orb.x, y: orb.y, id: orbId, dist };
                    }
                });

                // If found a nearby orb, move toward it
                if (closestOrb) {
                    const dx = closestOrb.x - this.position.x;
                    const dy = closestOrb.y - this.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 10) {
                        this.position.x += (dx / dist) * moveSpeed * 1.5; // Move faster toward orbs
                        this.position.y += (dy / dist) * moveSpeed * 1.5;

                        // Broadcast movement
                        lobby.broadcast('player:moved', {
                            playerId: this.id,
                            position: this.position
                        });
                        this.lastBroadcastPosition = { x: this.position.x, y: this.position.y };
                    }
                    return; // Skip patrol movement
                }
            }

            // No orbs nearby - patrol around the safe zone perimeter
            const worldCenter = (lobby.WORLD_SIZE * TILE_SIZE) / 2;
            const safeZoneRadius = 800; // Safe zone is ~800 pixels from center
            const patrolRadius = safeZoneRadius + 300; // Patrol 300 pixels outside safe zone (where enemies spawn)

            // Initialize patrol angle if not set
            if (this.patrolAngle === undefined) {
                this.patrolAngle = Math.random() * Math.PI * 2; // Start at random position on circle
            }

            // Pick a new patrol destination if we don't have one or reached it
            if (!this.wanderTarget) {
                // Pick next point on patrol circle
                this.patrolAngle += (Math.PI / 4) + (Math.random() * Math.PI / 4); // Move 45-90 degrees around circle

                this.wanderTarget = {
                    x: worldCenter + Math.cos(this.patrolAngle) * patrolRadius,
                    y: worldCenter + Math.sin(this.patrolAngle) * patrolRadius
                };

                // Ensure wander target is within world bounds
                const maxPos = lobby.WORLD_SIZE * TILE_SIZE;
                const margin = 200;
                this.wanderTarget.x = Math.max(margin, Math.min(maxPos - margin, this.wanderTarget.x));
                this.wanderTarget.y = Math.max(margin, Math.min(maxPos - margin, this.wanderTarget.y));
            }

            // Move towards patrol waypoint
            const dx = this.wanderTarget.x - this.position.x;
            const dy = this.wanderTarget.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // If reached destination (within 150 pixels), pick new one
            if (dist < 150) {
                this.wanderTarget = null;
            } else {
                // Move steadily towards patrol waypoint
                this.position.x += (dx / dist) * moveSpeed * 2;
                this.position.y += (dy / dist) * moveSpeed * 2;
            }
        }

        // Keep in bounds
        const maxPos = lobby.WORLD_SIZE * TILE_SIZE;
        this.position.x = Math.max(0, Math.min(maxPos, this.position.x));
        this.position.y = Math.max(0, Math.min(maxPos, this.position.y));

        // Only broadcast if moved significantly (reduces animation spam)
        const dx = this.position.x - this.lastBroadcastPosition.x;
        const dy = this.position.y - this.lastBroadcastPosition.y;
        const distMoved = Math.sqrt(dx * dx + dy * dy);

        if (distMoved > 20) { // Only broadcast if moved more than 20 pixels
            lobby.broadcast('player:moved', {
                playerId: this.id,
                position: this.position
            });
            this.lastBroadcastPosition = { x: this.position.x, y: this.position.y };
        }
    }

    attemptAttack(lobby) {
        if (!this.target || !this.target.isAlive) return;

        
        const targetX = this.target.position.x * TILE_SIZE;
        const targetY = this.target.position.y * TILE_SIZE;
        const dx = targetX - this.position.x;
        const dy = targetY - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Attack range (invincible bots have longer reach)
        const attackRange = this.isInvincible ? 150 : 96; // Aldric: 150px, others: 96px
        if (dist < attackRange) {
            // Calculate facing direction based on target position
            const angle = Math.atan2(dy, dx);
            const facingDirection = angle > -Math.PI/4 && angle < Math.PI/4 ? 'right' :
                                  angle >= Math.PI/4 && angle < 3*Math.PI/4 ? 'down' :
                                  angle >= -3*Math.PI/4 && angle < -Math.PI/4 ? 'up' : 'left';

            // Broadcast the attack animation to all players with facing direction
            lobby.broadcast('player:attacked', {
                playerId: this.id,
                position: this.position,
                targetPosition: { x: targetX, y: targetY },
                direction: facingDirection
            });

            // BUFFED BOT DAMAGE - Bots hit HARD!
            let baseDamage = 40 + (this.level * 10); // Double base damage

            // ALDRIC: Lower damage but stronger knockback
            if (this.class === 'aldric') {
                baseDamage = 20 + (this.level * 5); // Halved damage for crowd control focus
            }

            const damage = Math.floor(baseDamage * this.damageMultiplier);

            // Deal damage to enemy
            this.target.health -= damage;

            // ALDRIC KNOCKBACK - Push enemies back when hit
            if (this.class === 'aldric') {
                const knockbackDistance = 3.0; // 3 tiles knockback (increased from 1.5)
                const knockbackAngle = Math.atan2(dy, dx);

                const oldX = this.target.position.x;
                const oldY = this.target.position.y;

                // Apply knockback to enemy position (in tiles)
                this.target.position.x += Math.cos(knockbackAngle) * knockbackDistance;
                this.target.position.y += Math.sin(knockbackAngle) * knockbackDistance;

                console.log(`💥 KNOCKBACK: Enemy ${this.target.id} from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.target.position.x.toFixed(1)}, ${this.target.position.y.toFixed(1)})`);

                // Stun enemy briefly to prevent immediate return movement
                this.target.stunned = true;
                this.target.stunnedUntil = Date.now() + 500; // 0.5 second stun

                // Broadcast enemy position update for knockback
                lobby.broadcast('enemy:position', {
                    enemyId: this.target.id,
                    position: this.target.position
                });

                console.log(`📡 Broadcasting enemy:position for ${this.target.id}`);
            }

            if (this.target.health <= 0) {
                this.target.health = 0;
                this.target.isAlive = false;
                this.kills++;

                // Spawn XP orb at enemy death location
                const orbId = `orb_${Date.now()}_${Math.random()}`;
                const orbValue = 1; // Base XP value (1 soul per orb)
                lobby.gameState.experienceOrbs.set(orbId, {
                    x: targetX,
                    y: targetY,
                    expValue: orbValue
                });

                // Always drop a soul (currency)
                const soulId = uuidv4();
                const soulTileX = this.target.position.x;
                const soulTileY = this.target.position.y;

                lobby.gameState.items.set(soulId, {
                    id: soulId,
                    type: 'soul',
                    color: 0x9d00ff, // Purple color for souls
                    position: {
                        x: soulTileX,
                        y: soulTileY
                    },
                    spawnedAt: Date.now()
                });

                lobby.broadcast('item:spawned', {
                    itemId: soulId,
                    type: 'soul',
                    color: 0x9d00ff, // Purple color for souls
                    x: soulTileX,
                    y: soulTileY
                });

                // Broadcast enemy death (client will spawn orb visual)
                lobby.broadcast('enemy:killed', {
                    enemyId: this.target.id,
                    killedBy: this.id,
                    killerName: this.username,
                    position: this.target.position,
                    orbId: orbId,
                    orbValue: orbValue
                });

                // Malachar's Dark Harvest passive: 15% chance to spawn minion on kill
                if (this.class === 'malachar' && Math.random() < 0.15) {
                    this.spawnMinion(lobby, this.target.position);
                }

                this.target = null;
            } else {
                // Broadcast damage
                lobby.broadcast('enemy:damaged', {
                    enemyId: this.target.id,
                    damage: damage,
                    attackerId: this.id
                });
            }
        }
    }

    spawnMinion(lobby, enemyPosition) {
        // Generate unique minion ID
        const minionId = `minion_${this.id}_${Date.now()}_${Math.random()}`;

        // Convert enemy tile position to pixel position for minion spawn
        
        const minionPosition = {
            x: enemyPosition.x,
            y: enemyPosition.y
        };

        // Add minion to game state
        if (!lobby.gameState.minions) {
            lobby.gameState.minions = new Map();
        }

        lobby.gameState.minions.set(minionId, {
            id: minionId,
            position: minionPosition,
            ownerId: this.id,
            isPermanent: false,
            lastUpdate: Date.now()
        });

        // Broadcast minion spawn to all players
        lobby.broadcast('minion:spawned', {
            minionId: minionId,
            position: minionPosition,
            ownerId: this.id,
            ownerName: this.username,
            isPermanent: false,
            animationState: 'minion_idle'
        });

        console.log(`💀 Bot ${this.username} spawned minion ${minionId} at (${minionPosition.x}, ${minionPosition.y})`);
    }

    useAbilities(lobby) {
        const now = Date.now();

        // Use abilities based on character class
        switch(this.class) {
            case 'aldric':
                this.useAldricAbilities(lobby, now);
                break;
            case 'malachar':
                this.useMalacharAbilities(lobby, now);
                break;
            case 'kelise':
                this.useKeliseAbilities(lobby, now);
                break;
        }
    }

    useAldricAbilities(lobby, now) {
        // Aldric's E ability: Shockwave
        const shockwaveCooldown = this.abilityCooldowns.e || 8000;
        if (!this.lastAbilityTime || now - this.lastAbilityTime > shockwaveCooldown) {
            // Count nearby enemies
            const nearbyEnemies = this.getNearbyEnemies(lobby, 300);

            // SMART USAGE: Use shockwave when:
            // 1. Surrounded by 3+ enemies (efficient AOE)
            // 2. OR 2+ enemies AND we're below 60% health (need space)
            // 3. OR see enemy with low health that shockwave can finish (smart cleanup)
            const healthPercent = this.health / this.maxHealth;
            const hasLowHealthEnemy = nearbyEnemies.some(e => e.health < 80);
            const shouldUseShockwave = nearbyEnemies.length >= 3 ||
                                      (nearbyEnemies.length >= 2 && healthPercent < 0.6) ||
                                      (nearbyEnemies.length >= 2 && hasLowHealthEnemy);

            if (shouldUseShockwave) {
                // Calculate facing direction based on nearest enemy
                let facingRight = true; // Default to right
                if (nearbyEnemies.length > 0) {
                    // Face towards the nearest enemy
                    const nearestEnemy = nearbyEnemies[0];
                    
                    facingRight = (nearestEnemy.position.x * TILE_SIZE) > this.position.x;
                } else if (this.target) {
                    // Face towards current target if no nearby enemies
                    
                    facingRight = (this.target.position.x * TILE_SIZE) > this.position.x;
                }

                // Deal damage to all nearby enemies
                const shockwaveDamage = 60 + (this.level * 15); // Strong AOE damage
                nearbyEnemies.forEach(enemy => {
                    enemy.health -= shockwaveDamage;

                    if (enemy.health <= 0) {
                        enemy.health = 0;
                        enemy.isAlive = false;
                        this.kills++;

                        // Spawn XP orb
                        const orbId = `orb_${Date.now()}_${Math.random()}`;
                        const orbValue = 1;
                        lobby.gameState.experienceOrbs.set(orbId, {
                            x: enemy.position.x, // Already in pixels, no conversion needed
                            y: enemy.position.y, // Already in pixels, no conversion needed
                            expValue: orbValue
                        });

                        // Broadcast enemy death
                        lobby.broadcast('enemy:killed', {
                            enemyId: enemy.id,
                            killedBy: this.id,
                            killerName: this.username,
                            position: enemy.position,
                            orbId: orbId,
                            orbValue: orbValue
                        });
                    } else {
                        // Broadcast damage
                        lobby.broadcast('enemy:damaged', {
                            enemyId: enemy.id,
                            damage: shockwaveDamage,
                            attackerId: this.id
                        });
                    }
                });

                // Use proximity broadcast for ability effects (only nearby players hear it)
                lobby.broadcastProximity('ability:used', {
                    playerId: this.id,
                    playerName: this.username,
                    abilityKey: 'aldric_attack3',
                    abilityName: 'Shockwave',
                    position: this.position,
                    effects: {
                        type: 'shockwave',
                        playerId: this.id,
                        position: this.position,
                        radius: 300,
                        facingRight: facingRight
                    }
                }, this.position, 350); // Very close range - need to be standing by bot

                // Also trigger player:attacked for the animation (proximity-based)
                lobby.broadcastProximity('player:attacked', {
                    playerId: this.id,
                    attackKey: 'aldric_attack3',
                    targetPosition: this.position,
                    position: this.position
                }, this.position, 350);

                this.lastAbilityTime = now;
                this.abilityCooldowns.e = now;
                console.log(`⚡ Bot ${this.username} used Shockwave on ${nearbyEnemies.length} enemies`);
            }
        }

        // Aldric's R ability: Titan's Fury (War Cry + Ground Slam combo)
        const titansFuryCooldown = 20000; // 20 second cooldown
        if (!this.lastRAbilityTime || now - this.lastRAbilityTime > titansFuryCooldown) {
            // Count nearby enemies for R ability (larger radius)
            const nearbyEnemies = this.getNearbyEnemies(lobby, 400);

            // SMART USAGE: Use Titan's Fury when:
            // 1. Surrounded by 5+ enemies (super efficient ultimate)
            // 2. OR 4+ enemies AND we're below 50% health (emergency ultimate)
            // 3. OR boss/elite enemy nearby with 3+ adds
            const healthPercent = this.health / this.maxHealth;
            const shouldUseTitansFury = nearbyEnemies.length >= 5 ||
                                       (nearbyEnemies.length >= 4 && healthPercent < 0.5);

            if (shouldUseTitansFury) {
                // Broadcast the ultimate ability
                lobby.broadcastProximity('ability:used', {
                    playerId: this.id,
                    playerName: this.username,
                    abilityKey: 'r',
                    abilityName: 'Titan\'s Fury',
                    position: this.position,
                    effects: {
                        type: 'war_cry_slam',
                        playerId: this.id,
                        position: this.position,
                        tauntRadius: 400,
                        tauntDuration: 2000,
                        slamCount: 3,
                        slamInterval: 800,
                        slamRadius: 250,
                        damagePerSlam: 80 + (this.level * 20)
                    }
                }, this.position, 350);

                // Schedule the slam damage ticks
                const slamDamage = 80 + (this.level * 20);
                const slamCount = 3;
                const slamInterval = 800;

                for (let i = 0; i < slamCount; i++) {
                    setTimeout(() => {
                        // Get enemies in range at time of slam
                        const slamEnemies = this.getNearbyEnemies(lobby, 250);

                        slamEnemies.forEach(enemy => {
                            enemy.health -= slamDamage;

                            if (enemy.health <= 0) {
                                enemy.health = 0;
                                enemy.isAlive = false;
                                this.kills++;

                                // Spawn XP orb
                                const orbId = `orb_${Date.now()}_${Math.random()}`;
                                const orbValue = 1;
                                lobby.gameState.experienceOrbs.set(orbId, {
                                    x: enemy.position.x,
                                    y: enemy.position.y,
                                    expValue: orbValue
                                });

                                // Broadcast enemy death
                                lobby.broadcast('enemy:killed', {
                                    enemyId: enemy.id,
                                    killedBy: this.id,
                                    killerName: this.username,
                                    position: enemy.position,
                                    orbId: orbId,
                                    orbValue: orbValue
                                });
                            } else {
                                // Broadcast damage
                                lobby.broadcast('enemy:damaged', {
                                    enemyId: enemy.id,
                                    damage: slamDamage,
                                    attackerId: this.id
                                });
                            }
                        });

                        console.log(`💥 Bot ${this.username} Titan's Fury slam ${i + 1}/${slamCount} hit ${slamEnemies.length} enemies`);
                    }, i * slamInterval);
                }

                this.lastRAbilityTime = now;
                console.log(`🔥 Bot ${this.username} used Titan's Fury on ${nearbyEnemies.length} enemies`);
            }
        }
    }

    useMalacharAbilities(lobby, now) {
        // Malachar's Q ability: Pact of Bones (spawn multiple minions)
        const pactCooldown = this.abilityCooldowns.q || 10000;
        if (!this.lastAbilityTime || now - this.lastAbilityTime > pactCooldown) {
            const nearbyEnemies = this.getNearbyEnemies(lobby, 400);

            // SMART USAGE: Spawn minions when:
            // 1. Lots of enemies (6+) and we don't have many minions
            // 2. OR fighting a boss/elite and need backup
            // 3. OR we're low health and need meat shields
            const ourMinions = this.countOurMinions(lobby);
            const healthPercent = this.health / this.maxHealth;
            const hasBossNearby = nearbyEnemies.some(e =>
                e.type?.toLowerCase().includes('boss') ||
                e.type?.toLowerCase().includes('minotaur')
            );

            const shouldSummon = (nearbyEnemies.length >= 6 && ourMinions < 4) ||
                                (hasBossNearby && ourMinions < 5) ||
                                (healthPercent < 0.4 && nearbyEnemies.length >= 3 && ourMinions < 3);

            if (shouldSummon) {
                const minions = [];

                // Spawn 3 minions
                for (let i = 0; i < 3; i++) {
                    const minionPos = {
                        x: this.position.x / 32 + (Math.random() - 0.5) * 3,
                        y: this.position.y / 32 + (Math.random() - 0.5) * 3
                    };
                    this.spawnMinion(lobby, minionPos);
                    minions.push(minionPos);
                }

                // Use proximity broadcast for ability effects (only nearby players hear it)
                lobby.broadcastProximity('ability:used', {
                    playerId: this.id,
                    playerName: this.username,
                    abilityKey: 'malachar_summon',
                    abilityName: 'Pact of Bones',
                    position: this.position,
                    effects: {
                        type: 'pact_of_bones',
                        playerId: this.id,
                        position: this.position,
                        minions: minions
                    }
                }, this.position, 350);

                // Also trigger player:attacked for the animation (proximity-based)
                lobby.broadcastProximity('player:attacked', {
                    playerId: this.id,
                    attackKey: 'malachar_summon',
                    targetPosition: this.position,
                    position: this.position
                }, this.position, 350);

                this.lastAbilityTime = now;
                console.log(`💀 Bot ${this.username} used Pact of Bones`);
            }
        }
    }

    useKeliseAbilities(lobby, now) {
        // Kelise's abilities - Swift Strike (AOE damage)
        const nearbyEnemies = this.getNearbyEnemies(lobby, 350);

        // SMART USAGE: Use Swift Strike when:
        // 1. Surrounded by 5+ enemies (clear space)
        // 2. OR 4+ enemies and we're below 40% health (danger!)
        // 3. OR fighting elites and need burst damage
        const healthPercent = this.health / this.maxHealth;
        const hasEliteNearby = nearbyEnemies.some(e =>
            e.type?.toLowerCase().includes('wolf') ||
            e.type?.toLowerCase().includes('emberclaw') ||
            e.type?.toLowerCase().includes('minotaur')
        );

        const shouldUseAbility = nearbyEnemies.length >= 5 ||
                                (nearbyEnemies.length >= 4 && healthPercent < 0.4) ||
                                (hasEliteNearby && nearbyEnemies.length >= 3);

        if (shouldUseAbility) {
            const abilityCooldown = 6000;
            if (!this.lastAbilityTime || now - this.lastAbilityTime > abilityCooldown) {
                // Deal damage to all nearby enemies
                const swiftStrikeDamage = 50 + (this.level * 12); // Fast AOE damage
                nearbyEnemies.forEach(enemy => {
                    enemy.health -= swiftStrikeDamage;

                    if (enemy.health <= 0) {
                        enemy.health = 0;
                        enemy.isAlive = false;
                        this.kills++;

                        // Spawn XP orb
                        const orbId = `orb_${Date.now()}_${Math.random()}`;
                        const orbValue = 1;
                        lobby.gameState.experienceOrbs.set(orbId, {
                            x: enemy.position.x, // Already in pixels, no conversion needed
                            y: enemy.position.y, // Already in pixels, no conversion needed
                            expValue: orbValue
                        });

                        // Broadcast enemy death
                        lobby.broadcast('enemy:killed', {
                            enemyId: enemy.id,
                            killedBy: this.id,
                            killerName: this.username,
                            position: enemy.position,
                            orbId: orbId,
                            orbValue: orbValue
                        });
                    } else {
                        // Broadcast damage
                        lobby.broadcast('enemy:damaged', {
                            enemyId: enemy.id,
                            damage: swiftStrikeDamage,
                            attackerId: this.id
                        });
                    }
                });

                // Use proximity broadcast for ability effects (only nearby players hear it)
                lobby.broadcastProximity('ability:used', {
                    playerId: this.id,
                    playerName: this.username,
                    abilityKey: 'kelise_attack2',
                    abilityName: 'Swift Strike',
                    position: this.position,
                    effects: {
                        type: 'swift_strike',
                        playerId: this.id,
                        position: this.position
                    }
                }, this.position, 350);

                // Also trigger player:attacked for the animation (proximity-based)
                lobby.broadcastProximity('player:attacked', {
                    playerId: this.id,
                    attackKey: 'kelise_attack2',
                    targetPosition: this.position,
                    position: this.position
                }, this.position, 350);

                this.lastAbilityTime = now;
                console.log(`✨ Bot ${this.username} used Swift Strike on ${nearbyEnemies.length} enemies`);
            }
        }
    }

    getNearbyEnemies(lobby, range) {
        if (!lobby.gameState || !lobby.gameState.enemies) return [];

        
        const nearbyEnemies = [];

        lobby.gameState.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;

            // Enemy positions are already in pixels
            const dx = enemy.position.x - this.position.x;
            const dy = enemy.position.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < range) {
                nearbyEnemies.push(enemy);
            }
        });

        return nearbyEnemies;
    }

    countOurMinions(lobby) {
        if (!lobby.gameState || !lobby.gameState.minions) return 0;

        let count = 0;
        lobby.gameState.minions.forEach(minion => {
            if (minion.ownerId === this.id) {
                count++;
            }
        });

        return count;
    }

    findNearestRealPlayer(lobby) {
        if (!lobby.players || lobby.players.size === 0) return null;

        let nearestPlayer = null;
        let nearestDist = Infinity;

        lobby.players.forEach(player => {
            // Skip ourselves and other bots
            if (player.id === this.id || player.isBot) return;

            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPlayer = player;
            }
        });

        return nearestPlayer;
    }

    collectNearbyOrbs(lobby) {
        if (!lobby.gameState || !lobby.gameState.experienceOrbs) {
            console.log(`⚠️ Bot ${this.username} - no gameState or experienceOrbs`);
            return;
        }

        const COLLECTION_RANGE = this.orbCollectionRange; // Character-specific collection range
        const orbsToCollect = [];

        // DEBUG: Log orb collection attempt with actual orb positions
        if (Math.random() < 0.02) { // 2% of the time
            console.log(`🔍 Bot ${this.username} checking for orbs - Total orbs: ${lobby.gameState.experienceOrbs.size}, Bot position: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);

            // Log first 3 orb positions for debugging
            let count = 0;
            lobby.gameState.experienceOrbs.forEach((orb, orbId) => {
                if (count < 3) {
                    const dx = orb.x - this.position.x;
                    const dy = orb.y - this.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    console.log(`   Orb ${orbId}: pos=(${orb.x.toFixed(1)}, ${orb.y.toFixed(1)}), distance=${dist.toFixed(1)}px`);
                    count++;
                }
            });
        }

        // Find nearby orbs
        lobby.gameState.experienceOrbs.forEach((orb, orbId) => {
            const dx = orb.x - this.position.x;
            const dy = orb.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < COLLECTION_RANGE) {
                orbsToCollect.push({ orbId, orb });
            }
        });

        // DEBUG: Log if we found orbs
        if (orbsToCollect.length > 0) {
            console.log(`✨ Bot ${this.username} found ${orbsToCollect.length} orbs nearby!`);
        }

        // Collect each orb
        orbsToCollect.forEach(({ orbId, orb }) => {
            const expValue = orb.expValue || 1;
            console.log(`🤖 Bot ${this.username} collecting orb ${orbId} (${expValue} XP) at (${orb.x.toFixed(1)}, ${orb.y.toFixed(1)})`);

            // Award XP to bot
            this.experience += expValue;

            // Check for level up
            const xpNeeded = this.level * 100;
            if (this.experience >= xpNeeded) {
                this.level++;
                this.experience = 0;
                this.maxHealth += 10;
                this.health = Math.min(this.health + 10, this.maxHealth);

                // Broadcast level up
                lobby.broadcast('player:levelup', {
                    playerId: this.id,
                    username: this.username,
                    level: this.level,
                    maxHealth: this.maxHealth
                });
            }

            // Remove orb from game state
            lobby.gameState.experienceOrbs.delete(orbId);

            // Broadcast orb collection only to nearby players for shared XP
            const SHARE_DISTANCE = 800; // Share XP within ~800 pixels (about 1 screen)
            lobby.broadcast('orb:collected', {
                orbId: orbId,
                expValue: expValue,
                collectorId: this.id,
                collectorName: this.username,
                collectorX: this.position.x,
                collectorY: this.position.y
            }, (player, data) => {
                // Only send to players within SHARE_DISTANCE of the bot
                const dx = player.position.x - this.position.x;
                const dy = player.position.y - this.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist <= SHARE_DISTANCE;
            });
        });
    }
}

// Multiplayer Blackjack Table
class BlackjackTable {
    constructor(lobbyId) {
        this.lobbyId = lobbyId;
        this.phase = 'waiting'; // waiting, countdown, playing, dealer_turn, payout
        this.players = new Map(); // socketId -> { hand, bet, status, turnTime }
        this.spectators = new Set(); // socketIds watching
        this.dealer = { hand: [] };
        this.deck = [];
        this.currentPlayerIndex = 0;
        this.countdownTimer = null;
        this.turnTimer = null;
        this.COUNTDOWN_TIME = 5; // seconds
        this.TURN_TIME = 15; // seconds
        this.MAX_PLAYERS = 6; // Maximum 6 players at table
    }

    // Join table as spectator
    addSpectator(socketId) {
        this.spectators.add(socketId);
    }

    // Remove spectator
    removeSpectator(socketId) {
        this.spectators.delete(socketId);
    }

    // Player wants to join next round
    joinNextRound(socketId) {
        // Check if table is full (max 6 players)
        if (this.players.size >= this.MAX_PLAYERS) {
            return false; // Table full, player becomes spectator
        }

        if (!this.players.has(socketId)) {
            this.players.set(socketId, {
                socketId: socketId,
                hand: [],
                bet: 0,
                status: 'waiting', // waiting, playing, standing, bust, blackjack
                turnTime: 0
            });
            return true;
        }
        return true;
    }

    // Player places bet (starts round if first player)
    placeBet(socketId, amount) {
        const player = this.players.get(socketId);
        if (!player || player.bet > 0) return false;

        player.bet = amount;
        player.status = 'waiting';

        // First player to bet starts countdown
        if (this.phase === 'waiting') {
            this.startCountdown();
        }

        return true;
    }

    // Start 5-second countdown before round begins
    startCountdown() {
        this.phase = 'countdown';
        let timeLeft = this.COUNTDOWN_TIME;

        this.countdownTimer = setInterval(() => {
            timeLeft--;

            // Broadcast countdown
            this.broadcast('blackjack:countdown', { timeLeft });

            if (timeLeft <= 0) {
                clearInterval(this.countdownTimer);
                this.startRound();
            }
        }, 1000);
    }

    // Start the round (deal cards)
    startRound() {
        this.phase = 'playing';
        this.deck = this.createDeck();
        this.shuffleDeck();

        // Deal initial cards
        this.dealer.hand = [this.drawCard(), this.drawCard()];

        this.players.forEach(player => {
            if (player.bet > 0) {
                player.hand = [this.drawCard(), this.drawCard()];
                player.status = 'waiting';
            }
        });

        // Start first player's turn
        this.currentPlayerIndex = 0;
        this.startPlayerTurn();
    }

    // Start a player's turn with 15-second timer
    startPlayerTurn() {
        const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);

        if (this.currentPlayerIndex >= activePlayers.length) {
            // All players done, dealer's turn
            this.dealerTurn();
            return;
        }

        const currentPlayer = activePlayers[this.currentPlayerIndex];
        currentPlayer.status = 'playing';
        currentPlayer.turnTime = this.TURN_TIME;

        // Check for blackjack
        if (this.getHandValue(currentPlayer.hand) === 21) {
            currentPlayer.status = 'blackjack';
            this.nextPlayer();
            return;
        }

        // Start turn timer
        this.turnTimer = setInterval(() => {
            currentPlayer.turnTime--;

            this.broadcast('blackjack:state', this.getGameState());

            if (currentPlayer.turnTime <= 0) {
                // Auto-stand on timeout
                this.playerStand(currentPlayer.socketId);
            }
        }, 1000);

        this.broadcast('blackjack:state', this.getGameState());
    }

    // Player hits
    playerHit(socketId) {
        const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);
        const currentPlayer = activePlayers[this.currentPlayerIndex];

        if (!currentPlayer || currentPlayer.socketId !== socketId) return false;
        if (currentPlayer.status !== 'playing') return false;

        // Draw card
        currentPlayer.hand.push(this.drawCard());

        const handValue = this.getHandValue(currentPlayer.hand);

        if (handValue > 21) {
            // Bust
            currentPlayer.status = 'bust';
            this.nextPlayer();
        } else if (handValue === 21) {
            // Auto-stand on 21
            currentPlayer.status = 'standing';
            this.nextPlayer();
        }

        this.broadcast('blackjack:state', this.getGameState());
        return true;
    }

    // Player stands
    playerStand(socketId) {
        const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);
        const currentPlayer = activePlayers[this.currentPlayerIndex];

        if (!currentPlayer || currentPlayer.socketId !== socketId) return false;

        currentPlayer.status = 'standing';
        this.nextPlayer();

        return true;
    }

    // Player doubles down
    playerDoubleDown(socketId) {
        const lobby = lobbies.get(this.lobbyId);
        if (!lobby) return false;

        const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);
        const currentPlayer = activePlayers[this.currentPlayerIndex];

        if (!currentPlayer || currentPlayer.socketId !== socketId) return false;
        if (currentPlayer.status !== 'playing') return false;
        if (currentPlayer.hand.length !== 2) return false; // Can only double on first two cards

        const playerData = players.get(socketId);
        if (!playerData || playerData.souls < currentPlayer.bet) {
            return false; // Not enough souls to double
        }

        // Double the bet
        playerData.souls -= currentPlayer.bet;
        currentPlayer.bet *= 2;
        currentPlayer.doubledDown = true;

        // Draw exactly one card
        currentPlayer.hand.push(this.drawCard());

        const handValue = this.getHandValue(currentPlayer.hand);

        if (handValue > 21) {
            currentPlayer.status = 'bust';
        } else {
            currentPlayer.status = 'standing'; // Must stand after double down
        }

        this.nextPlayer();
        this.broadcast('blackjack:state', this.getGameState());
        return true;
    }

    // Player buys insurance
    playerInsurance(socketId) {
        const lobby = lobbies.get(this.lobbyId);
        if (!lobby) return false;

        const player = this.players.get(socketId);
        if (!player || player.bet === 0) return false;

        // Can only buy insurance if dealer shows an ace
        if (this.dealer.hand.length === 0 || this.dealer.hand[0].value !== 'ace') {
            return false;
        }

        // Insurance costs half the original bet
        const insuranceCost = Math.floor(player.bet / 2);
        const playerData = players.get(socketId);

        if (!playerData || playerData.souls < insuranceCost) {
            return false; // Not enough souls
        }

        playerData.souls -= insuranceCost;
        player.insurance = insuranceCost;

        this.broadcast('blackjack:state', this.getGameState());
        return true;
    }

    // Check if player can split
    canSplit(player) {
        if (player.hand.length !== 2) return false;

        // Check if both cards have the same value
        const card1Value = this.getCardValue(player.hand[0]);
        const card2Value = this.getCardValue(player.hand[1]);

        return card1Value === card2Value;
    }

    // Player splits their hand
    playerSplit(socketId) {
        const lobby = lobbies.get(this.lobbyId);
        if (!lobby) return false;

        const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);
        const currentPlayer = activePlayers[this.currentPlayerIndex];

        if (!currentPlayer || currentPlayer.socketId !== socketId) return false;
        if (currentPlayer.status !== 'playing') return false;
        if (!this.canSplit(currentPlayer)) return false;
        if (currentPlayer.splitHand) return false; // Already split

        const playerData = players.get(socketId);
        if (!playerData || playerData.souls < currentPlayer.bet) {
            return false; // Not enough souls to split
        }

        // Deduct bet for second hand
        playerData.souls -= currentPlayer.bet;

        // Split the hand
        const card1 = currentPlayer.hand[0];
        const card2 = currentPlayer.hand[1];

        currentPlayer.hand = [card1];
        currentPlayer.splitHand = [card2];
        currentPlayer.currentHandIndex = 0; // Start with first hand

        // Deal one card to each hand
        currentPlayer.hand.push(this.drawCard());
        currentPlayer.splitHand.push(this.drawCard());

        this.broadcast('blackjack:state', this.getGameState());
        return true;
    }

    // Move to next player
    nextPlayer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }

        this.currentPlayerIndex++;
        this.startPlayerTurn();
    }

    // Dealer's turn
    dealerTurn() {
        this.phase = 'dealer_turn';
        this.broadcast('blackjack:state', this.getGameState());

        // Dealer hits until 17+ (and must hit soft 17)
        setTimeout(() => {
            while (this.getHandValue(this.dealer.hand) < 17 || this.isSoft17(this.dealer.hand)) {
                this.dealer.hand.push(this.drawCard());
                console.log(`🃏 Dealer draws card. Hand value: ${this.getHandValue(this.dealer.hand)}, Soft 17: ${this.isSoft17(this.dealer.hand)}`);
            }
            console.log(`🃏 Dealer stands at ${this.getHandValue(this.dealer.hand)}`);

            this.calculatePayouts();
        }, 2000); // 2-second delay for dramatic effect
    }

    // Calculate payouts
    calculatePayouts() {
        this.phase = 'payout';
        const dealerValue = this.getHandValue(this.dealer.hand);
        const dealerBust = dealerValue > 21;

        const results = [];
        const lobby = lobbies.get(this.lobbyId);

        this.players.forEach(player => {
            if (player.bet === 0) return;

            const playerValue = this.getHandValue(player.hand);
            let payout = 0;
            let result = '';

            if (player.status === 'bust') {
                result = 'BUST';
                payout = 0;
            } else if (player.status === 'blackjack') {
                // Blackjack pays 3:2
                payout = Math.floor(player.bet * 2.5);
                result = 'BLACKJACK';
            } else if (dealerBust) {
                payout = player.bet * 2;
                result = 'WIN';
            } else if (playerValue > dealerValue) {
                payout = player.bet * 2;
                result = 'WIN';
            } else if (playerValue < dealerValue) {
                payout = 0;
                result = 'LOSE';
            } else {
                // Push
                payout = player.bet;
                result = 'PUSH';
            }

            // Award currency to player
            if (payout > 0 && lobby) {
                const lobbyPlayer = players.get(player.socketId);
                if (lobbyPlayer) {
                    // Initialize currency to 0 if undefined
                    if (lobbyPlayer.currency === null || lobbyPlayer.currency === undefined) {
                        lobbyPlayer.currency = 0;
                    }
                    lobbyPlayer.currency = lobbyPlayer.currency + payout;

                    // Broadcast currency update to lobby
                    lobby.broadcast('player:update', {
                        id: player.socketId,
                        currency: lobbyPlayer.currency
                    });

                    console.log(`🃏 Blackjack payout: ${lobbyPlayer.username} ${result} - won ${payout} souls (bet: ${player.bet})`);
                }
            } else if (payout === 0 && lobby) {
                const lobbyPlayer = players.get(player.socketId);
                if (lobbyPlayer) {
                    console.log(`🃏 Blackjack loss: ${lobbyPlayer.username} ${result} - lost ${player.bet} souls`);
                }
            }

            results.push({
                socketId: player.socketId,
                result: result,
                payout: payout
            });
        });

        this.broadcast('blackjack:payout', { results, dealerValue });

        // Broadcast game state so clients see the payout phase
        this.broadcast('blackjack:state', this.getGameState());

        // Reset for next round after 3 seconds
        setTimeout(() => {
            this.resetRound();
        }, 3000);
    }

    // Reset for next round
    resetRound() {
        this.phase = 'waiting';
        this.dealer.hand = [];
        this.currentPlayerIndex = 0;

        // Reset players
        this.players.forEach(player => {
            player.hand = [];
            player.bet = 0;
            player.status = 'waiting';
            player.turnTime = 0;
        });

        this.broadcast('blackjack:state', this.getGameState());
    }

    // Player leaves table
    playerLeave(socketId) {
        const player = this.players.get(socketId);

        if (player && this.phase === 'playing') {
            // If it's their turn, auto-stand
            const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);
            const currentPlayer = activePlayers[this.currentPlayerIndex];

            if (currentPlayer && currentPlayer.socketId === socketId) {
                this.playerStand(socketId);
            }
        }

        this.players.delete(socketId);
        this.spectators.delete(socketId);

        // If no players left, reset
        if (this.players.size === 0) {
            if (this.countdownTimer) clearInterval(this.countdownTimer);
            if (this.turnTimer) clearInterval(this.turnTimer);
            this.resetRound();
        }

        this.broadcast('blackjack:state', this.getGameState());
    }

    // Card deck management
    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        const deck = [];

        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }

        return deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.deck = this.createDeck();
            this.shuffleDeck();
        }
        return this.deck.pop();
    }

    getCardValue(card) {
        if (card.value === 'ace') return 11;
        if (['jack', 'queen', 'king'].includes(card.value)) return 10;
        return parseInt(card.value);
    }

    getHandValue(hand) {
        let value = 0;
        let aces = 0;

        hand.forEach(card => {
            const cardValue = this.getCardValue(card);
            value += cardValue;
            if (card.value === 'ace') aces++;
        });

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    // Check if hand is a soft 17 (ace counted as 11 making 17)
    isSoft17(hand) {
        const value = this.getHandValue(hand);
        if (value !== 17) return false;

        // Check if there's an ace being counted as 11
        let hasAce = false;
        let hardValue = 0;

        hand.forEach(card => {
            const cardValue = this.getCardValue(card);
            hardValue += cardValue;
            if (card.value === 'ace') hasAce = true;
        });

        // If we have an ace and hard value (all aces as 1) is 7 or less,
        // then we have a soft 17 (ace is being counted as 11)
        return hasAce && hardValue <= 7;
    }

    // Get game state for clients
    getGameState() {
        const activePlayers = Array.from(this.players.values()).filter(p => p.bet > 0);
        const currentPlayer = activePlayers[this.currentPlayerIndex];

        return {
            phase: this.phase,
            dealer: {
                hand: this.dealer.hand,
                value: this.phase === 'dealer_turn' || this.phase === 'payout'
                    ? this.getHandValue(this.dealer.hand)
                    : null
            },
            players: Array.from(this.players.values()).map(p => {
                // Get username from the global players Map
                const playerData = players.get(p.socketId);
                return {
                    socketId: p.socketId,
                    username: playerData ? playerData.username : 'Unknown',
                    hand: p.hand,
                    bet: p.bet,
                    status: p.status,
                    value: p.hand.length > 0 ? this.getHandValue(p.hand) : 0,
                    turnTime: p.turnTime,
                    isCurrentTurn: currentPlayer && currentPlayer.socketId === p.socketId
                };
            }),
            currentTurn: currentPlayer ? currentPlayer.socketId : null
        };
    }

    // Broadcast to all players and spectators
    broadcast(event, data) {
        const lobby = lobbies.get(this.lobbyId);
        if (!lobby) return;

        // Broadcast to all players at table
        this.players.forEach(player => {
            const socket = Array.from(io.sockets.sockets.values())
                .find(s => s.id === player.socketId);
            if (socket) {
                socket.emit(event, data);
            }
        });

        // Broadcast to spectators
        this.spectators.forEach(socketId => {
            const socket = Array.from(io.sockets.sockets.values())
                .find(s => s.id === socketId);
            if (socket) {
                socket.emit(event, data);
            }
        });
    }

    // Remove player from table
    removePlayer(socketId) {
        this.players.delete(socketId);
        this.spectators.delete(socketId);
    }
}

// Lobby class with infinite chunk-based world
class Lobby {
    constructor(difficulty = 'normal') {
        this.id = uuidv4();
        this.players = new Map();
        this.maxPlayers = MAX_PLAYERS_PER_LOBBY;
        this.status = 'active'; // Always active - instant join!
        this.difficulty = difficulty;
        this.gameState = {
            floor: 1,
            enemies: [],
            items: new Map(), // Track dropped items (itemId -> {type, x, y, color})
            minions: new Map(), // Track all spawned minions
            experienceOrbs: new Map(), // Track XP orbs (orbId -> {x, y, expValue})
            vortexes: new Map(), // Track active vortexes (vortexId -> {x, y, pullRadius, pullStrength, expiresAt})
            startTime: Date.now(),
            endTime: null
        };
        this.createdAt = Date.now();
        this.readyPlayers = new Set();
        this.votes = new Map();
        this.shutdownTimer = null; // Timer for delayed shutdown when all players leave

        // Large static world - generated once
        this.WORLD_SIZE = 1000; // 1000x1000 tiles (massive world)
        this.worldSeed = `${this.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Biome system constants (matching client BiomeChunkSystem)
        this.CHUNK_SIZE_PIXELS = 1776; // 37 tiles * 48px
        this.numericSeed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Generate the entire world once
        this.world = this.generateCompleteWorld();
        metrics.totalGames++;

        // DYNAMIC WOLF SYSTEM: Track active regions and despawn inactive ones
        this.activeRegions = new Map(); // regionKey -> { lastActiveTime, playerCount }
        this.regionEnemies = new Map(); // regionKey -> Set of enemy IDs
        this.regionClearedTime = new Map(); // regionKey -> timestamp when region was cleared
        this.REGION_INACTIVE_TIMEOUT = 120000; // Despawn wolves after 2 minutes of no players
        this.REGION_RESPAWN_COOLDOWN = 30000; // Wait 30 seconds before respawning in cleared region

        // FLANKING HORDE SYSTEM: Spawn additional hordes to pincer players
        this.playerFlankingCooldowns = new Map(); // playerId -> timestamp of last flanking spawn
        this.FLANKING_COOLDOWN = 12000; // 12 seconds between flanking spawns per player (increased frequency)
        this.FLANKING_ENEMY_THRESHOLD = 8; // Trigger when fighting 8+ enemies (lowered threshold)

        // Start dynamic cleanup interval - runs every 30 seconds
        this.dynamicSpawnCleanup = setInterval(() => {
            this.cleanupInactiveRegions();
        }, 30000);

        // AI Bot system
        this.bots = new Map(); // botId -> AIBot

        // Blackjack table system
        this.blackjackTable = new BlackjackTable(this.id);
        this.spawnBotsToFillSlots();

        // Start AI bot update loop - runs every 100ms
        this.botUpdateInterval = setInterval(() => {
            this.updateBots();
        }, 100);
    }

    spawnBotsToFillSlots() {
        // Count real players (non-bots)
        const realPlayerCount = Array.from(this.players.values()).filter(p => !p.isBot).length;

        if (realPlayerCount === 0) {
            // No bots if no players (empty server)
            if (this.bots.size > 0) {
                // Remove all bots
                this.bots.forEach((bot, botId) => {
                    this.players.delete(botId);
                    this.broadcast('player:left', {
                        playerId: botId,
                        username: bot.username
                    });
                });
                this.bots.clear();
            }
            return;
        }

        // Only spawn bots once when first player joins
        if (this.bots.size > 0) return;

        const worldCenter = (this.WORLD_SIZE * TILE_SIZE) / 2;
        const botClass = 'aldric';

        // Spawn 1 bot at spawn building
        const spawnBot = new AIBot(this.id, botClass, { x: worldCenter, y: worldCenter });
        spawnBot.position = {
            x: worldCenter + (Math.random() - 0.5) * 400,
            y: worldCenter + (Math.random() - 0.5) * 400
        };
        spawnBot.botAreaName = 'Spawn';
        spawnBot.isSpawnBot = true; // Mark as spawn bot for wider patrol range
        this.bots.set(spawnBot.id, spawnBot);
        this.players.set(spawnBot.id, spawnBot);
        console.log(`🤖 Spawned AI bot: ${spawnBot.username} at Spawn Building`);
        this.broadcast('player:joined', { player: spawnBot.toJSON() });
        // Broadcast bot's initial position
        this.broadcast('player:moved', { playerId: spawnBot.id, position: spawnBot.position });

        // Scan for Dark Forest chunk5s in a radius around spawn
        const spawnChunkX = Math.floor(worldCenter / this.CHUNK_SIZE_PIXELS);
        const spawnChunkY = Math.floor(worldCenter / this.CHUNK_SIZE_PIXELS);
        const scanRadius = 20; // Scan 20 chunks in each direction (41x41 grid) since chunk5 is extremely rare (1%)

        const chunk5Locations = [];

        for (let dx = -scanRadius; dx <= scanRadius; dx++) {
            for (let dy = -scanRadius; dy <= scanRadius; dy++) {
                const chunkX = spawnChunkX + dx;
                const chunkY = spawnChunkY + dy;

                // Skip spawn chunk
                if (dx === 0 && dy === 0) continue;

                // Check if this chunk is Dark Forest chunk5
                if (this.isDarkForestChunk5(chunkX, chunkY)) {
                    const chunkCenterX = chunkX * this.CHUNK_SIZE_PIXELS + this.CHUNK_SIZE_PIXELS / 2;
                    const chunkCenterY = chunkY * this.CHUNK_SIZE_PIXELS + this.CHUNK_SIZE_PIXELS / 2;

                    chunk5Locations.push({
                        chunkX,
                        chunkY,
                        x: chunkCenterX,
                        y: chunkCenterY
                    });
                }
            }
        }

        console.log(`🌲 Found ${chunk5Locations.length} Dark Forest chunk5 locations`);

        // Spawn a bot at each Dark Forest chunk5 location
        chunk5Locations.forEach((loc, index) => {
            const bot = new AIBot(this.id, botClass, { x: loc.x, y: loc.y });
            bot.position = {
                x: loc.x + (Math.random() - 0.5) * 400,
                y: loc.y + (Math.random() - 0.5) * 400
            };
            bot.botAreaName = `DarkForest_Chunk5_${loc.chunkX},${loc.chunkY}`;
            bot.isSpawnBot = false; // Mark as chunk5 bot for tighter patrol range
            this.bots.set(bot.id, bot);
            this.players.set(bot.id, bot);
            console.log(`🤖 Spawned AI bot #${index + 2}: ${bot.username} at Dark Forest chunk5 (${loc.chunkX}, ${loc.chunkY})`);
            this.broadcast('player:joined', { player: bot.toJSON() });
            // Broadcast bot's initial position
            this.broadcast('player:moved', { playerId: bot.id, position: bot.position });
        });

        console.log(`✅ Spawned ${this.bots.size} total bots (1 spawn + ${chunk5Locations.length} Dark Forest chunk5s)`);

    }

    updateBots() {
        const now = Date.now();
        this.bots.forEach(bot => {
            if (bot.isAlive) {
                bot.update(this);
            } else {
                // AUTO-REVIVE: Bots respawn automatically after death
                if (!bot.deathTime) {
                    bot.deathTime = now;
                    console.log(`💀 Bot ${bot.username} died - will respawn in ${bot.respawnDelay/1000}s`);
                } else if (now - bot.deathTime > bot.respawnDelay) {
                    // RESPAWN THE BOT!
                    bot.isAlive = true;
                    bot.health = bot.maxHealth;
                    bot.deathTime = null;
                    bot.isRetreating = false;

                    // Respawn at patrol center with offset (or world center if not set)
                    const respawnCenterX = bot.patrolCenter ? bot.patrolCenter.x : (this.WORLD_SIZE * TILE_SIZE) / 2;
                    const respawnCenterY = bot.patrolCenter ? bot.patrolCenter.y : (this.WORLD_SIZE * TILE_SIZE) / 2;
                    bot.position = {
                        x: respawnCenterX + (Math.random() - 0.5) * 500,
                        y: respawnCenterY + (Math.random() - 0.5) * 500
                    };

                    console.log(`✨ Bot ${bot.username} RESPAWNED at patrol center (${respawnCenterX.toFixed(0)}, ${respawnCenterY.toFixed(0)})`);

                    // Broadcast respawn
                    this.broadcast('player:respawned', {
                        playerId: bot.id,
                        username: bot.username,
                        position: bot.position,
                        health: bot.health,
                        maxHealth: bot.maxHealth
                    });
                }
            }
        });

        // UPDATE MINIONS - Make bot minions move and attack
        this.updateMinions(now);
    }

    updateMinions(now) {
        if (!this.gameState || !this.gameState.minions) return;

        
        const MINION_MOVE_SPEED = 80; // Pixels per update (2.5 tiles)
        const MINION_ATTACK_RANGE = 48; // Pixels (1.5 tiles)
        const MINION_ATTACK_COOLDOWN = 1000; // 1 second
        const MINION_SIGHT_RANGE = 480; // Pixels (15 tiles)
        const MINION_DAMAGE = 15;
        const MINION_LIFETIME = 30000; // 30 seconds

        const minionsToDelete = [];

        this.gameState.minions.forEach((minion, minionId) => {
            // Clean up old minions
            if (now - minion.lastUpdate > MINION_LIFETIME) {
                minionsToDelete.push(minionId);
                return;
            }

            // Initialize minion properties if needed
            if (!minion.target) minion.target = null;
            if (!minion.lastAttackTime) minion.lastAttackTime = 0;

            // Find nearest enemy
            let nearestEnemy = null;
            let nearestDist = Infinity;

            if (this.gameState.enemies) {
                this.gameState.enemies.forEach(enemy => {
                    if (!enemy.health || enemy.health <= 0) return;

                    const dx = enemy.position.x - minion.position.x;
                    const dy = enemy.position.y - minion.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < nearestDist && dist < MINION_SIGHT_RANGE) {
                        nearestDist = dist;
                        nearestEnemy = enemy;
                    }
                });
            }

            if (nearestEnemy) {
                minion.target = nearestEnemy;

                // Check if in attack range
                const dx = nearestEnemy.position.x - minion.position.x;
                const dy = nearestEnemy.position.y - minion.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= MINION_ATTACK_RANGE) {
                    // ATTACK!
                    if (now - minion.lastAttackTime >= MINION_ATTACK_COOLDOWN) {
                        nearestEnemy.health -= MINION_DAMAGE;

                        // Broadcast damage
                        this.broadcast('enemy:damaged', {
                            enemyId: nearestEnemy.id,
                            damage: MINION_DAMAGE,
                            attackerId: minionId,
                            isMinion: true
                        });

                        // Check if enemy died
                        if (nearestEnemy.health <= 0) {
                            this.broadcast('enemy:killed', {
                                enemyId: nearestEnemy.id,
                                killerId: minion.ownerId, // Credit owner
                                position: nearestEnemy.position
                            });

                            // Grant XP to owner (only if real player, not bot)
                            const owner = this.players.get(minion.ownerId) || this.bots.get(minion.ownerId);
                            if (owner && owner.addXP) {
                                const xpGain = nearestEnemy.xpReward || 10;
                                owner.addXP(xpGain, this);
                            }

                            // Remove enemy from array
                            this.gameState.enemies = this.gameState.enemies.filter(e => e.id !== nearestEnemy.id);
                        }

                        minion.lastAttackTime = now;
                    }
                } else {
                    // MOVE towards enemy
                    const moveX = (dx / dist) * MINION_MOVE_SPEED;
                    const moveY = (dy / dist) * MINION_MOVE_SPEED;

                    minion.position.x += moveX;
                    minion.position.y += moveY;

                    // Broadcast position update (throttled - every 200ms)
                    if (!minion.lastBroadcast || now - minion.lastBroadcast > 200) {
                        this.broadcast('minion:update', {
                            minionId: minionId,
                            position: minion.position,
                            ownerId: minion.ownerId
                        });
                        minion.lastBroadcast = now;
                    }
                }
            }

            minion.lastUpdate = now;
        });

        // Clean up old minions
        minionsToDelete.forEach(minionId => {
            this.gameState.minions.delete(minionId);
            this.broadcast('minion:died', { minionId });
        });
    }

    removeBot(botId) {
        const bot = this.bots.get(botId);
        if (bot) {
            this.bots.delete(botId);
            this.players.delete(botId);
            console.log(`🤖 Removed AI bot: ${bot.username}`);
        }
    }

    addPlayer(player) {
        // Count only real players (not bots) for capacity check
        const realPlayerCount = Array.from(this.players.values()).filter(p => !p.isBot).length;
        if (realPlayerCount >= this.maxPlayers) {
            return { success: false, error: 'Game is full' };
        }

        // Ensure player is alive when joining
        if (!player.isAlive) {
            console.log(`⚠️ Resetting ${player.username} to alive (was dead when joining)`);
            player.isAlive = true;
            player.health = player.maxHealth;
        }

        this.players.set(player.id, player);
        player.lobbyId = this.id;

        // Assign spawn position (use modulo to wrap around if more players+bots than spawn points)
        const spawnPoints = this.getSpawnPoints();
        const spawnIndex = (this.players.size - 1) % spawnPoints.length;
        player.position = spawnPoints[spawnIndex];

        console.log(`✅ ${player.username} joined game ${this.id.slice(0, 8)} (${this.players.size}/${this.maxPlayers})`);
        console.log(`📍 Assigned spawn position (PIXELS): (${player.position.x}, ${player.position.y})`);

        return { success: true };
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
            console.log(`❌ ${player.username} left game ${this.id.slice(0, 8)} (${this.players.size}/${this.maxPlayers})`);

            // Mark as finished if empty and auto-close
            if (this.players.size === 0) {
                this.status = 'finished';
                this.gameState.endTime = Date.now();

                // Calculate game duration and update average
                const gameDuration = this.gameState.endTime - this.gameState.startTime;
                const completedGames = metrics.totalGames; // Total games that have started
                if (completedGames > 0) {
                    // Running average formula: ((oldAvg * (n-1)) + newValue) / n
                    metrics.averageGameDuration = ((metrics.averageGameDuration * (completedGames - 1)) + gameDuration) / completedGames;
                }

                console.log(`🗑️  Room ${this.id.slice(0, 8)} closed - all players left (duration: ${(gameDuration / 1000 / 60).toFixed(1)}min)`);
            }
        }
    }

    generateCompleteWorld() {
        console.log(`🗺️ Generating world metadata for room ${this.id.slice(0, 8)}...`);
        const startTime = Date.now();

        // DON'T spawn all enemies upfront - way too laggy!
        // Enemies will spawn dynamically as players explore
        this.spawnedRegions = new Set(); // Track which regions have enemies

        const elapsed = Date.now() - startTime;
        console.log(`✅ World metadata generated in ${elapsed}ms`);
        console.log(`   Size: ${this.WORLD_SIZE}x${this.WORLD_SIZE} tiles`);
        console.log(`   Enemies: Spawned on-demand (dynamic)`);
        console.log(`   Seed: ${this.worldSeed} (client will generate terrain)`);

        // Don't send tiles/biomes/decorations - client generates them from seed
        return {
            size: this.WORLD_SIZE,
            seed: this.worldSeed
        };
    }

    // Create Sword Demon (wolf) with variant stats - Fast melee strikers
    createWolfVariant(variant, baseId, position, healthMultiplier = 1.0) {
        const variants = {
            small: {
                scale: 0.7,
                health: 25,
                maxHealth: 25,
                strength: 8,      // Damage dealt
                defense: 2,       // Damage reduction
                speed: 1200,      // Fast strikers (120 px/s)
                sightRange: 12,
                glowColor: 0xff6666, // Light red
                glowSize: 6
            },
            normal: {
                scale: 1.0,
                health: 45,
                maxHealth: 45,
                strength: 12,
                defense: 4,
                speed: 1100,      // Balanced speed (110 px/s)
                sightRange: 15,
                glowColor: 0xff0000, // Red
                glowSize: 8
            },
            boss: {
                scale: 1.5,
                health: 90,
                maxHealth: 90,
                strength: 18,
                defense: 8,
                speed: 1000,      // Still fast for boss (100 px/s)
                sightRange: 20,
                glowColor: 0xff0066, // Dark pink/red
                glowSize: 12
            }
        };

        const stats = variants[variant];

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'wolf',
            variant: variant, // Track variant type
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.strength,
            defense: stats.defense,
            speed: stats.speed,
            scale: stats.scale,
            glowColor: stats.glowColor,
            glowSize: stats.glowSize,
            isAlive: true,
            sightRange: stats.sightRange,
            lastMove: 0
        };
    }

    // Create Minotaur with variant stats - Tanky bruisers
    createMinotaurVariant(variant, baseId, position, healthMultiplier = 1.0) {
        const variants = {
            small: {
                scale: 0.8,
                health: 60,
                maxHealth: 60,
                strength: 10,     // Moderate damage
                defense: 8,       // Tanky
                speed: 700,       // Slow (70 px/s)
                sightRange: 10
            },
            normal: {
                scale: 1.0,
                health: 100,
                maxHealth: 100,
                strength: 15,
                defense: 12,
                speed: 650,       // Slower (65 px/s)
                sightRange: 12
            },
            boss: {
                scale: 1.3,
                health: 180,
                maxHealth: 180,
                strength: 22,
                defense: 20,
                speed: 600,       // Very slow but tanky (60 px/s)
                sightRange: 15
            }
        };

        const stats = variants[variant];

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'minotaur',
            variant: variant,
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.strength,
            defense: stats.defense,
            speed: stats.speed,
            scale: stats.scale,
            isAlive: true,
            sightRange: stats.sightRange,
            lastMove: 0
        };
    }

    // Create Mushroom with variant stats - Weak swarmers
    createMushroomVariant(variant, baseId, position, healthMultiplier = 1.0) {
        const variants = {
            small: {
                scale: 0.8,
                health: 15,
                maxHealth: 15,
                strength: 4,      // Weak damage
                defense: 0,       // No armor, fragile
                speed: 800,       // Medium speed (80 px/s)
                sightRange: 8
            },
            normal: {
                scale: 1.0,
                health: 30,
                maxHealth: 30,
                strength: 7,
                defense: 2,
                speed: 750,       // Slightly slower (75 px/s)
                sightRange: 10
            },
            boss: {
                scale: 1.4,
                health: 70,
                maxHealth: 70,
                strength: 12,
                defense: 5,
                speed: 900,       // Faster boss (90 px/s)
                sightRange: 14
            }
        };

        const stats = variants[variant];

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'mushroom',
            variant: variant,
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.strength,
            defense: stats.defense,
            speed: stats.speed,
            scale: stats.scale,
            isAlive: true,
            sightRange: stats.sightRange,
            lastMove: 0
        };
    }

    // Create Emberclaw - Flying ranged enemy (glass cannon)
    createEmberclaw(baseId, position, healthMultiplier = 1.0) {
        const stats = {
            health: 30,
            maxHealth: 30,
            strength: 20,     // High damage ranged
            defense: 0,       // No armor, fragile
            speed: 850,       // Fast flyer (85 px/s)
            sightRange: 12,   // Long sight range
            attackRange: 8,   // Ranged attack distance (tiles)
            attackCooldown: 2000  // 2 seconds between shots
        };

        // Apply co-op health scaling
        const scaledHealth = Math.floor(stats.health * healthMultiplier);
        const scaledMaxHealth = Math.floor(stats.maxHealth * healthMultiplier);

        return {
            id: baseId,
            type: 'emberclaw',
            position: position,
            health: scaledHealth,
            maxHealth: scaledMaxHealth,
            damage: stats.strength,
            defense: stats.defense,
            speed: stats.speed,
            isAlive: true,
            sightRange: stats.sightRange,
            attackRange: stats.attackRange,
            attackCooldown: stats.attackCooldown,
            lastAttack: 0,
            lastMove: 0,
            preferredDistance: 6  // Tiles to maintain from players (kiting distance)
        };
    }


    // Get the dominant biome for a region (UPDATED to match client's 50/50 split)
    getRegionBiome(regionX, regionY) {
        const REGION_SIZE = 50;
        const CHUNK_SIZE = 100;
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Biome distribution thresholds - UPDATED to match client (50% Dark Forest, 50% Ember Wilds)
        const darkGreenThreshold = 0.5; // 50% Dark Forest, 50% Ember Wilds

        // Get center of region
        const regionCenterX = regionX * REGION_SIZE + REGION_SIZE / 2;
        const regionCenterY = regionY * REGION_SIZE + REGION_SIZE / 2;

        // Determine chunk for region center
        const chunkX = Math.floor(regionCenterX / CHUNK_SIZE);
        const chunkY = Math.floor(regionCenterY / CHUNK_SIZE);

        // Use chunk coordinates to determine biome
        const chunkHash = this.seededRandom(seed + chunkX * 1000 + chunkY);

        // Return biome based on hash - only dark_green and red now
        if (chunkHash < darkGreenThreshold) return 'dark_green';
        else return 'red';
    }

    // Spawn enemies in a region (called when players explore new areas)
    spawnEnemiesInRegion(regionX, regionY) {
        const regionKey = `${regionX},${regionY}`;

        // DYNAMIC: Mark region as active and count players
        const playersInRegion = this.getPlayersInRegion(regionX, regionY);
        const playerCount = playersInRegion.length;

        this.activeRegions.set(regionKey, {
            lastActiveTime: Date.now(),
            playerCount: playerCount
        });

        // Skip if already spawned
        if (this.spawnedRegions.has(regionKey)) {
            return [];
        }

        // PERFORMANCE: Global enemy cap per lobby (prevents runaway spawning)
        const MAX_ENEMIES_TOTAL = 2000; // Doubled to support much higher enemy density
        if (this.gameState.enemies.length >= MAX_ENEMIES_TOTAL) {
            console.log(`⚠️ Enemy cap reached (${this.gameState.enemies.length}/${MAX_ENEMIES_TOTAL}), skipping spawn in region ${regionKey}`);
            return [];
        }

        // CHECK: Don't spawn enemies if the region has living enemies or was recently cleared
        // This prevents respawning on top of players who just cleared the area
        const regionEnemies = this.regionEnemies.get(regionKey);
        if (regionEnemies && regionEnemies.size > 0) {
            // Check if any enemies in this region are still alive
            let hasLivingEnemies = false;
            regionEnemies.forEach(enemyId => {
                const enemy = this.gameState.enemies.find(e => e.id === enemyId);
                if (enemy && enemy.isAlive) {
                    hasLivingEnemies = true;
                }
            });

            if (hasLivingEnemies) {
                return []; // Don't respawn if enemies still alive
            }
        }

        // CHECK: Don't spawn if players are currently in this region
        // Allow respawn only after players have left the area
        if (playersInRegion.length > 0 && this.regionEnemies.has(regionKey)) {
            // Region was previously spawned and players are still here - don't respawn yet
            return [];
        }

        // CHECK: Respawn cooldown - don't respawn too quickly after clearing
        const clearedTime = this.regionClearedTime.get(regionKey);
        if (clearedTime) {
            const timeSinceCleared = Date.now() - clearedTime;
            if (timeSinceCleared < this.REGION_RESPAWN_COOLDOWN) {
                // Still on cooldown
                return [];
            } else {
                // Cooldown expired, remove the timer
                this.regionClearedTime.delete(regionKey);
            }
        }

        this.spawnedRegions.add(regionKey);
        this.regionEnemies.set(regionKey, new Set()); // Track enemies in this region

        const REGION_SIZE = 50; // 50x50 tile regions
        const newEnemies = [];

        // Calculate distance from world center (spawn point)
        const worldCenterX = this.WORLD_SIZE / 2;
        const worldCenterY = this.WORLD_SIZE / 2;
        const safeZoneRadius = 30; // Safe zone covers spawn building (50x50 tiles, need 25+ radius)
        const regionCenterX = regionX * REGION_SIZE + REGION_SIZE / 2;
        const regionCenterY = regionY * REGION_SIZE + REGION_SIZE / 2;
        const distanceFromSpawn = Math.sqrt(
            Math.pow(regionCenterX - worldCenterX, 2) +
            Math.pow(regionCenterY - worldCenterY, 2)
        );

        // Distance-based pack sizing - Easy near spawn, progressively harder further out
        let packsToSpawn = 1;
        let minPackSize = 1;
        let maxPackSize = 2;
        let bossChance = 0;
        let emberclawSupportChance = 0; // Chance for emberclaw support packs

        if (distanceFromSpawn < 25) {
            // Very close to spawn: STARTER ENEMIES - Right outside safe zone
            packsToSpawn = 6 + Math.floor(Math.random() * 4); // 6-9 packs (doubled from 3-5)
            minPackSize = 3;
            maxPackSize = 6; // 3-6 enemies per pack (up from 2-4)
            bossChance = 0.05;
            emberclawSupportChance = 0; // No emberclaws this close
        } else if (distanceFromSpawn < 50) {
            // Near spawn: EASY START - More enemies for more action
            packsToSpawn = 8 + Math.floor(Math.random() * 5); // 8-12 packs (doubled from 4-7)
            minPackSize = 5;
            maxPackSize = 9; // 5-9 enemies per pack (up from 3-6)
            bossChance = 0.08;
            emberclawSupportChance = 0.2; // 20% emberclaw support (up from 10%)
        } else if (distanceFromSpawn < 100) {
            // Close to spawn: EASY - Increased density
            packsToSpawn = 10 + Math.floor(Math.random() * 6); // 10-15 packs (doubled from 5-8)
            minPackSize = 6;
            maxPackSize = 12; // 6-12 enemies per pack (up from 4-8)
            bossChance = 0.1;
            emberclawSupportChance = 0.4; // 40% chance for emberclaw support (up from 30%)
        } else if (distanceFromSpawn < 200) {
            // Medium distance: MODERATE - More intense battles
            packsToSpawn = 12 + Math.floor(Math.random() * 7); // 12-18 packs (doubled from 6-10)
            minPackSize = 8;
            maxPackSize = 15; // 8-15 enemies per pack (up from 6-10)
            bossChance = 0.12;
            emberclawSupportChance = 0.55; // 55% chance for emberclaw support (up from 45%)
        } else if (distanceFromSpawn < 350) {
            // Far: HARD - Big battles
            packsToSpawn = 16 + Math.floor(Math.random() * 8); // 16-23 packs (doubled from 8-12)
            minPackSize = 12;
            maxPackSize = 20; // 12-20 enemies per pack (up from 10-15)
            bossChance = 0.15;
            emberclawSupportChance = 0.7; // 70% chance for emberclaw support (up from 60%)
        } else {
            // Very far: BRUTAL - Massive hordes
            packsToSpawn = 20 + Math.floor(Math.random() * 10); // 20-29 packs (doubled from 10-15)
            minPackSize = 18;
            maxPackSize = 30; // 18-30 enemies per pack (up from 15-22)
            bossChance = 0.2;
            emberclawSupportChance = 0.9; // 90% chance for emberclaw support (up from 80%)
        }

        // CO-OP SCALING: Diablo-style diminishing returns
        // More players = more enemies with more health (PERFORMANCE OPTIMIZED - reduced from 4x to 2.5x max)
        let spawnMultiplier = 1.0;
        let healthMultiplier = 1.0;

        if (playerCount === 1) {
            spawnMultiplier = 1.0;
            healthMultiplier = 1.0;
        } else if (playerCount === 2) {
            spawnMultiplier = 1.3;
            healthMultiplier = 1.2;
        } else if (playerCount === 3) {
            spawnMultiplier = 1.7;
            healthMultiplier = 1.4;
        } else if (playerCount === 4) {
            spawnMultiplier = 2.0;
            healthMultiplier = 1.6;
        } else if (playerCount === 5) {
            spawnMultiplier = 2.2;
            healthMultiplier = 1.8;
        } else { // 6+ players
            spawnMultiplier = 2.5; // PERFORMANCE: Capped at 2.5x (was 4x)
            healthMultiplier = 2.0; // Capped at 2x
        }

        // Apply spawn multiplier
        packsToSpawn = Math.floor(packsToSpawn * spawnMultiplier);

        // Hard cap: Max 300 enemies per region (increased from 200 for bigger battles)
        const estimatedEnemies = packsToSpawn * ((minPackSize + maxPackSize) / 2);
        if (estimatedEnemies > 300) {
            const scale = 300 / estimatedEnemies;
            packsToSpawn = Math.floor(packsToSpawn * scale);
        }

        // Log co-op scaling (for debugging/balancing)
        if (playerCount > 1) {
            console.log(`🔥 CO-OP SCALING: ${playerCount} players in region ${regionKey} → ${spawnMultiplier.toFixed(1)}x spawns, ${healthMultiplier.toFixed(1)}x health`);
        }

        // Use seed for consistent spawning
        const seed = this.worldSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const regionSeed = seed + regionX * 7919 + regionY * 6563;

        // Log region spawn
        const spawnPixelX = worldCenterX * TILE_SIZE;
        const spawnPixelY = worldCenterY * TILE_SIZE;
        console.log(`🌍 Spawning enemies in region ${regionKey} at distance ${distanceFromSpawn.toFixed(1)} tiles from spawn`);
        console.log(`   → Spawn center: (${spawnPixelX}, ${spawnPixelY}) pixels | ${packsToSpawn} packs, ${minPackSize}-${maxPackSize} enemies per pack`);

        // Spawn packs
        for (let packIndex = 0; packIndex < packsToSpawn; packIndex++) {
            const packSeed = regionSeed + packIndex * 10000;

            // Determine pack size
            const packSize = Math.floor(
                minPackSize + this.seededRandom(packSeed) * (maxPackSize - minPackSize + 1)
            );

            // Choose pack location in region
            const packX = regionX * REGION_SIZE + Math.floor(this.seededRandom(packSeed + 1) * REGION_SIZE);
            const packY = regionY * REGION_SIZE + Math.floor(this.seededRandom(packSeed + 2) * REGION_SIZE);

            // Check if pack location is in safe zone
            const isInSafeZone = (
                packX >= (worldCenterX - safeZoneRadius) &&
                packX < (worldCenterX + safeZoneRadius) &&
                packY >= (worldCenterY - safeZoneRadius) &&
                packY < (worldCenterY + safeZoneRadius)
            );

            if (isInSafeZone) continue; // Skip this pack

            // Decide if this pack has a boss
            const hasBoss = this.seededRandom(packSeed + 3) < bossChance;
            let bossSpawned = false;

            // Determine enemy type based on ROLE, not biome
            // Role distribution: 35% Swarmers (Mushrooms), 30% Fast DPS (Sword Demons), 35% Tanks (Minotaurs)
            // Emberclaws spawn separately as support units
            let enemyType;
            const roleRoll = this.seededRandom(packSeed + 50);

            if (roleRoll < 0.35) {
                enemyType = 'mushroom'; // SWARMERS - high count, low HP
            } else if (roleRoll < 0.65) {
                enemyType = 'swordDemon'; // FAST DPS - quick attacks, medium HP
            } else {
                enemyType = 'minotaur'; // TANKS - slow, high HP, heavy damage
            }

            // Spawn appropriate enemy type in pack
            if (enemyType === 'swordDemon') {
                // Spawn sword demons (wolves) in pack
                for (let i = 0; i < packSize; i++) {
                    const wolfSeed = packSeed + i * 100;

                    // Position in tight cluster (within 5 tiles of pack center)
                    const offsetX = Math.floor((this.seededRandom(wolfSeed + 10) - 0.5) * 10);
                    const offsetY = Math.floor((this.seededRandom(wolfSeed + 11) - 0.5) * 10);
                    const gridX = Math.max(0, Math.min(this.WORLD_SIZE - 1, packX + offsetX));
                    const gridY = Math.max(0, Math.min(this.WORLD_SIZE - 1, packY + offsetY));

                    // Check if individual enemy position is in safe zone
                    const isEnemyInSafeZone = (
                        gridX >= (worldCenterX - safeZoneRadius) &&
                        gridX < (worldCenterX + safeZoneRadius) &&
                        gridY >= (worldCenterY - safeZoneRadius) &&
                        gridY < (worldCenterY + safeZoneRadius)
                    );
                    if (isEnemyInSafeZone) continue; // Skip this enemy

                    // Convert to pixel coordinates immediately
                    
                    const x = gridX * TILE_SIZE + TILE_SIZE / 2;
                    const y = gridY * TILE_SIZE + TILE_SIZE / 2;

                    // Determine sword demon variant
                    let variant = 'normal';

                    if (hasBoss && !bossSpawned && i === 0) {
                        variant = 'boss';
                        bossSpawned = true;
                    } else if (distanceFromSpawn < 100) {
                        variant = this.seededRandom(wolfSeed + 20) < 0.7 ? 'small' : 'normal';
                    } else if (distanceFromSpawn < 200) {
                        variant = this.seededRandom(wolfSeed + 20) < 0.3 ? 'small' : 'normal';
                    } else {
                        variant = 'normal';
                    }

                    const wolfId = `${this.id}_wolf_${regionKey}_p${packIndex}_${i}`;
                    const wolf = this.createWolfVariant(variant, wolfId, { x, y }, healthMultiplier);

                    // Track region
                    wolf.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(wolf.id);

                    this.gameState.enemies.push(wolf);
                    newEnemies.push(wolf);

                    if (packIndex === 0 && i === 0) {
                        console.log(`   → Created ${variant} Sword Demon at pixel (${x.toFixed(0)}, ${y.toFixed(0)}) = grid (${gridX}, ${gridY})`);
                    }
                }
            } else if (enemyType === 'minotaur') {
                // Spawn minotaurs in pack (smaller packs since they're tougher)
                const minotaurPackSize = Math.max(1, Math.floor(packSize / 2)); // Half the size
                for (let i = 0; i < minotaurPackSize; i++) {
                    const minotaurSeed = packSeed + i * 100;

                    // Position in cluster
                    const offsetX = Math.floor((this.seededRandom(minotaurSeed + 10) - 0.5) * 10);
                    const offsetY = Math.floor((this.seededRandom(minotaurSeed + 11) - 0.5) * 10);
                    const gridX = Math.max(0, Math.min(this.WORLD_SIZE - 1, packX + offsetX));
                    const gridY = Math.max(0, Math.min(this.WORLD_SIZE - 1, packY + offsetY));

                    // Check if individual enemy position is in safe zone
                    const isEnemyInSafeZone = (
                        gridX >= (worldCenterX - safeZoneRadius) &&
                        gridX < (worldCenterX + safeZoneRadius) &&
                        gridY >= (worldCenterY - safeZoneRadius) &&
                        gridY < (worldCenterY + safeZoneRadius)
                    );
                    if (isEnemyInSafeZone) continue; // Skip this enemy

                    // Convert to pixel coordinates immediately
                    
                    const x = gridX * TILE_SIZE + TILE_SIZE / 2;
                    const y = gridY * TILE_SIZE + TILE_SIZE / 2;

                    // Determine minotaur variant
                    let variant = 'normal';
                    if (hasBoss && !bossSpawned && i === 0) {
                        variant = 'boss';
                        bossSpawned = true;
                    }

                    const minotaurId = `${this.id}_minotaur_${regionKey}_p${packIndex}_${i}`;
                    const minotaur = this.createMinotaurVariant(variant, minotaurId, { x, y }, healthMultiplier);

                    // Track region
                    minotaur.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(minotaur.id);

                    this.gameState.enemies.push(minotaur);
                    newEnemies.push(minotaur);
                }
            } else if (enemyType === 'mushroom') {
                // Spawn mushrooms in pack (SWARMERS - larger packs)
                const mushroomPackSize = Math.floor(packSize * 1.5); // 50% more mushrooms (swarmers)
                for (let i = 0; i < mushroomPackSize; i++) {
                    const mushroomSeed = packSeed + i * 100;

                    // Position in cluster
                    const offsetX = Math.floor((this.seededRandom(mushroomSeed + 10) - 0.5) * 10);
                    const offsetY = Math.floor((this.seededRandom(mushroomSeed + 11) - 0.5) * 10);
                    const gridX = Math.max(0, Math.min(this.WORLD_SIZE - 1, packX + offsetX));
                    const gridY = Math.max(0, Math.min(this.WORLD_SIZE - 1, packY + offsetY));

                    // Check if individual enemy position is in safe zone
                    const isEnemyInSafeZone = (
                        gridX >= (worldCenterX - safeZoneRadius) &&
                        gridX < (worldCenterX + safeZoneRadius) &&
                        gridY >= (worldCenterY - safeZoneRadius) &&
                        gridY < (worldCenterY + safeZoneRadius)
                    );
                    if (isEnemyInSafeZone) continue; // Skip this enemy

                    // Convert to pixel coordinates immediately
                    
                    const x = gridX * TILE_SIZE + TILE_SIZE / 2;
                    const y = gridY * TILE_SIZE + TILE_SIZE / 2;

                    // Determine mushroom variant
                    let variant = 'normal';

                    if (hasBoss && !bossSpawned && i === 0) {
                        variant = 'boss';
                        bossSpawned = true;
                    } else if (distanceFromSpawn < 100) {
                        variant = this.seededRandom(mushroomSeed + 20) < 0.7 ? 'small' : 'normal';
                    } else if (distanceFromSpawn < 200) {
                        variant = this.seededRandom(mushroomSeed + 20) < 0.3 ? 'small' : 'normal';
                    } else {
                        variant = 'normal';
                    }

                    const mushroomId = `${this.id}_mushroom_${regionKey}_p${packIndex}_${i}`;
                    const mushroom = this.createMushroomVariant(variant, mushroomId, { x, y }, healthMultiplier);

                    // Track region
                    mushroom.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(mushroom.id);

                    this.gameState.enemies.push(mushroom);
                    newEnemies.push(mushroom);
                }
            }
        }

        // EMBERCLAW SUPPORT SPAWNING - Separate from main packs
        // Emberclaws spawn as support units to provide ranged cover for other enemies
        const emberclawSupportRoll = this.seededRandom(regionSeed + 99999);
        if (emberclawSupportRoll < emberclawSupportChance && newEnemies.length > 0) {
            // Spawn 1-3 emberclaw support packs
            const supportPackCount = 1 + Math.floor(this.seededRandom(regionSeed + 88888) * 3);

            for (let supportPackIndex = 0; supportPackIndex < supportPackCount; supportPackIndex++) {
                const supportPackSeed = regionSeed + 77777 + supportPackIndex * 5555;

                // Emberclaws spawn in small groups (2-4)
                const emberclawCount = 2 + Math.floor(this.seededRandom(supportPackSeed) * 3);

                // Choose a random location in the region
                const supportPackX = regionX * REGION_SIZE + Math.floor(this.seededRandom(supportPackSeed + 1) * REGION_SIZE);
                const supportPackY = regionY * REGION_SIZE + Math.floor(this.seededRandom(supportPackSeed + 2) * REGION_SIZE);

                // Check if location is in safe zone
                const isInSafeZone = (
                    supportPackX >= (worldCenterX - safeZoneRadius) &&
                    supportPackX < (worldCenterX + safeZoneRadius) &&
                    supportPackY >= (worldCenterY - safeZoneRadius) &&
                    supportPackY < (worldCenterY + safeZoneRadius)
                );

                if (isInSafeZone) continue;

                for (let i = 0; i < emberclawCount; i++) {
                    const emberclawSeed = supportPackSeed + i * 333;

                    // Emberclaws spread out more (they fly and provide ranged support)
                    const offsetX = Math.floor((this.seededRandom(emberclawSeed + 10) - 0.5) * 20);
                    const offsetY = Math.floor((this.seededRandom(emberclawSeed + 11) - 0.5) * 20);
                    const gridX = Math.max(0, Math.min(this.WORLD_SIZE - 1, supportPackX + offsetX));
                    const gridY = Math.max(0, Math.min(this.WORLD_SIZE - 1, supportPackY + offsetY));

                    // Check if individual emberclaw position is in safe zone
                    const isEnemyInSafeZone = (
                        gridX >= (worldCenterX - safeZoneRadius) &&
                        gridX < (worldCenterX + safeZoneRadius) &&
                        gridY >= (worldCenterY - safeZoneRadius) &&
                        gridY < (worldCenterY + safeZoneRadius)
                    );
                    if (isEnemyInSafeZone) continue; // Skip this emberclaw

                    // Convert to pixel coordinates
                    
                    const x = gridX * TILE_SIZE + TILE_SIZE / 2;
                    const y = gridY * TILE_SIZE + TILE_SIZE / 2;

                    const emberclawId = `${this.id}_emberclaw_support_${regionKey}_sp${supportPackIndex}_${i}`;
                    const emberclaw = this.createEmberclaw(emberclawId, { x, y }, healthMultiplier);

                    // Track region
                    emberclaw.regionKey = regionKey;
                    this.regionEnemies.get(regionKey).add(emberclaw.id);

                    this.gameState.enemies.push(emberclaw);
                    newEnemies.push(emberclaw);
                }
            }
        }

        console.log(`✨ Spawned ${newEnemies.length} enemies in ${packsToSpawn} pack(s) at region (${regionX}, ${regionY}) [Distance: ${Math.floor(distanceFromSpawn)}] ${emberclawSupportRoll < emberclawSupportChance ? '+ EMBERCLAW SUPPORT' : ''}`);

        return newEnemies;
    }

    // DYNAMIC SPAWN SYSTEM: Get players in a specific region
    getPlayersInRegion(regionX, regionY) {
        // Using global TILE_SIZE (48px)
        const REGION_SIZE = 50;
        const players = [];

        this.players.forEach(player => {
            // Skip players without position
            if (!player.position) return;

            // Convert pixel position to grid position for region calculation
            const gridX = Math.floor(player.position.x / TILE_SIZE);
            const gridY = Math.floor(player.position.y / TILE_SIZE);
            const playerRegionX = Math.floor(gridX / REGION_SIZE);
            const playerRegionY = Math.floor(gridY / REGION_SIZE);

            // Check if player is in this region or adjacent regions (visibility range)
            if (Math.abs(playerRegionX - regionX) <= 1 && Math.abs(playerRegionY - regionY) <= 1) {
                players.push(player);
            }
        });

        return players;
    }

    // FLANKING HORDE SYSTEM: Spawn enemies to pincer/flank players in combat
    checkAndSpawnFlankingHorde(player) {
        const now = Date.now();

        // Skip players without position
        if (!player.position) return;

        // Check cooldown
        const lastFlankTime = this.playerFlankingCooldowns.get(player.id) || 0;
        if (now - lastFlankTime < this.FLANKING_COOLDOWN) {
            return; // Still on cooldown
        }

        // Count nearby enemies (within 15 tiles)
        const playerGridX = Math.floor(player.position.x / TILE_SIZE);
        const playerGridY = Math.floor(player.position.y / TILE_SIZE);
        const nearbyEnemies = this.gameState.enemies.filter(enemy => {
            if (!enemy.isAlive) return false;
            const enemyGridX = Math.floor(enemy.position.x / TILE_SIZE);
            const enemyGridY = Math.floor(enemy.position.y / TILE_SIZE);
            const dist = Math.sqrt(
                Math.pow(enemyGridX - playerGridX, 2) +
                Math.pow(enemyGridY - playerGridY, 2)
            );
            return dist < 15; // Within 15 tiles
        });

        // Only spawn flanking horde if fighting a big group
        if (nearbyEnemies.length < this.FLANKING_ENEMY_THRESHOLD) {
            return;
        }

        // Determine flanking spawn direction (opposite side or perpendicular)
        // Find the average direction of current enemies
        let avgDx = 0;
        let avgDy = 0;
        nearbyEnemies.forEach(enemy => {
            const ex = Math.floor(enemy.position.x / TILE_SIZE);
            const ey = Math.floor(enemy.position.y / TILE_SIZE);
            avgDx += (ex - playerGridX);
            avgDy += (ey - playerGridY);
        });
        avgDx /= nearbyEnemies.length;
        avgDy /= nearbyEnemies.length;

        // Spawn from opposite direction (behind the player relative to enemy horde)
        // Add some randomness (±45 degrees) to make it less predictable
        const angle = Math.atan2(avgDy, avgDx) + Math.PI + (Math.random() - 0.5) * (Math.PI / 2);
        const spawnDistance = 10 + Math.floor(Math.random() * 5); // 10-14 tiles away

        const flankX = playerGridX + Math.floor(Math.cos(angle) * spawnDistance);
        const flankY = playerGridY + Math.floor(Math.sin(angle) * spawnDistance);

        // Clamp to world bounds
        const spawnX = Math.max(5, Math.min(this.WORLD_SIZE - 5, flankX));
        const spawnY = Math.max(5, Math.min(this.WORLD_SIZE - 5, flankY));

        // Spawn a flanking pack (8-12 enemies for more intense hordes)
        const flankPackSize = 8 + Math.floor(Math.random() * 5);
        const newEnemies = [];

        for (let i = 0; i < flankPackSize; i++) {
            const offsetX = Math.floor((Math.random() - 0.5) * 6);
            const offsetY = Math.floor((Math.random() - 0.5) * 6);
            const x = Math.max(0, Math.min(this.WORLD_SIZE - 1, spawnX + offsetX));
            const y = Math.max(0, Math.min(this.WORLD_SIZE - 1, spawnY + offsetY));

            // Random enemy type (wolf/minotaur/mushroom)
            const types = ['wolf', 'minotaur', 'mushroom'];
            const enemyType = types[Math.floor(Math.random() * types.length)];

            const flankingId = `${this.id}_flanking_${player.id}_${now}_${i}`;
            let enemy;

            if (enemyType === 'wolf') {
                enemy = this.createWolfVariant('normal', flankingId, { x, y }, 1.0);
            } else if (enemyType === 'minotaur') {
                enemy = this.createMinotaurVariant('normal', flankingId, { x, y }, 1.0);
            } else {
                enemy = this.createMushroomVariant('normal', flankingId, { x, y }, 1.0);
            }

            enemy.isFlanking = true; // Mark as flanking enemy
            this.gameState.enemies.push(enemy);
            newEnemies.push(enemy);
        }

        // Update cooldown
        this.playerFlankingCooldowns.set(player.id, now);

        // Broadcast flanking enemies to all players (positions already in pixels)
        newEnemies.forEach(enemy => {
            this.broadcast('enemy:spawned', { enemy });
        });

        console.log(`⚔️ FLANKING HORDE spawned ${flankPackSize} enemies behind ${player.username} (fighting ${nearbyEnemies.length} enemies)`);
    }

    // DYNAMIC SPAWN SYSTEM: Cleanup wolves from inactive regions
    cleanupInactiveRegions() {
        const now = Date.now();
        const REGION_SIZE = 50;
        const regionsToCleanup = [];

        // Find inactive regions
        this.activeRegions.forEach((regionData, regionKey) => {
            const timeSinceActive = now - regionData.lastActiveTime;

            // Check if any players are still near this region
            const [regionX, regionY] = regionKey.split(',').map(Number);
            const playersNearby = this.getPlayersInRegion(regionX, regionY);

            if (playersNearby.length > 0) {
                // Update last active time if players nearby
                this.activeRegions.set(regionKey, {
                    lastActiveTime: now,
                    playerCount: playersNearby.length
                });
            } else if (timeSinceActive > this.REGION_INACTIVE_TIMEOUT) {
                // Region has been inactive for too long
                regionsToCleanup.push(regionKey);
            }
        });

        // Cleanup inactive regions
        regionsToCleanup.forEach(regionKey => {
            const enemyIds = this.regionEnemies.get(regionKey);
            if (enemyIds && enemyIds.size > 0) {
                let despawnedCount = 0;

                // Remove enemies from this region
                this.gameState.enemies = this.gameState.enemies.filter(enemy => {
                    if (enemyIds.has(enemy.id)) {
                        despawnedCount++;

                        // Broadcast despawn to all players
                        this.broadcast('enemy:despawned', { enemyId: enemy.id });
                        return false; // Remove this enemy
                    }
                    return true; // Keep other enemies
                });

                console.log(`🌙 Despawned ${despawnedCount} wolves from inactive region ${regionKey}`);
            }

            // Clear region data so it can respawn later
            this.spawnedRegions.delete(regionKey);
            this.activeRegions.delete(regionKey);
            this.regionEnemies.delete(regionKey);

            // Mark when this region was cleared (for respawn cooldown)
            this.regionClearedTime.set(regionKey, Date.now());
        });

        if (regionsToCleanup.length > 0) {
            console.log(`♻️ Dynamic cleanup: ${regionsToCleanup.length} regions cleared, ${this.gameState.enemies.length} wolves remaining`);
        }
    }

    getWorldData() {
        return this.world;
    }

    // Seeded random number generator for consistent procedural generation
    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Perlin-like noise for natural terrain generation
    noise2D(x, y, seed) {
        const n = x + y * 57 + seed * 131;
        let noise = Math.sin(n) * 43758.5453;
        return noise - Math.floor(noise);
    }

    generateFantasyWorld(width, height, seedString) {
        // Convert seed string to number
        const seed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const tiles = Array(height).fill(null).map(() => Array(width).fill(null));
        const biomes = Array(height).fill(null).map(() => Array(width).fill(null));
        const decorations = [];

        // Calculate randomized biome distribution from seed (matches client)
        const weight1 = this.seededRandom(seed + 1234) * 40 + 15; // 15-55%
        const weight2 = this.seededRandom(seed + 5678) * 40 + 15; // 15-55%
        const weight3 = this.seededRandom(seed + 9012) * 40 + 15; // 15-55%

        // Normalize to 100%
        const total = weight1 + weight2 + weight3;
        const greenThreshold = weight1 / total;
        const darkGreenThreshold = greenThreshold + (weight2 / total);

        // Biome definitions - 3 biomes with 12 tile variations each
        const BIOMES = {
            GREEN: { id: 'green', tiles: [10,11,12,13,14,15,16,17,18,19,20,21] },           // terrain_green 104-115
            DARK_GREEN: { id: 'dark_green', tiles: [30,31,32,33,34,35,36,37,38,39,40,41] }, // forest_extended 78-89
            RED: { id: 'red', tiles: [50,51,52,53,54,55,56,57,58,59,60,61] }                // forest_extended 468-479
        };

        const biomeStats = {};

        console.log(`🌍 Server biome distribution: Green=${(greenThreshold*100).toFixed(1)}% DarkGreen=${((darkGreenThreshold-greenThreshold)*100).toFixed(1)}% Red=${((1-darkGreenThreshold)*100).toFixed(1)}%`);

        // CHUNK-BASED BIOMES: Assign biome per large chunk instead of per tile
        const CHUNK_SIZE = 100; // 100x100 tile chunks = large biome regions

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Determine chunk coordinates
                const chunkX = Math.floor(x / CHUNK_SIZE);
                const chunkY = Math.floor(y / CHUNK_SIZE);

                // Use chunk coordinates to determine biome (one biome per chunk)
                const chunkHash = this.seededRandom(seed + chunkX * 1000 + chunkY);

                // Determine biome based on chunk hash and distribution
                let selectedBiome;
                if (chunkHash < greenThreshold) selectedBiome = BIOMES.GREEN;
                else if (chunkHash < darkGreenThreshold) selectedBiome = BIOMES.DARK_GREEN;
                else selectedBiome = BIOMES.RED;

                biomes[y][x] = selectedBiome.id;

                // Select random tile variation from biome
                const tileVariation = Math.floor(this.seededRandom(seed + x * 100 + y) * selectedBiome.tiles.length);
                tiles[y][x] = selectedBiome.tiles[tileVariation];

                // Track biome stats
                biomeStats[selectedBiome.id] = (biomeStats[selectedBiome.id] || 0) + 1;
            }
        }

        // Add decorations (trees, rocks, flowers, grass, logs, etc.)
        const decorationCount = Math.floor(width * height * 0.005); // 0.5% coverage for better performance
        for (let i = 0; i < decorationCount; i++) {
            const x = Math.floor(this.seededRandom(seed + i * 1000) * width);
            const y = Math.floor(this.seededRandom(seed + i * 1001) * height);
            const biome = biomes[y][x];

            let decorationType;
            const rand = this.seededRandom(seed + i);

            if (biome === 'grassland') {
                // Grassland: lots of flowers and grass (GREEN ONLY)
                if (rand < 0.5) decorationType = 'flower';
                else if (rand < 0.8) decorationType = 'grass';
                else if (rand < 0.95) decorationType = 'rock';
                else decorationType = 'baby_tree';
            }
            else if (biome === 'forest') {
                // Forest: lots of trees and vegetation (DARK GREEN)
                if (rand < 0.4) decorationType = 'tree';
                else if (rand < 0.6) decorationType = 'bush';
                else if (rand < 0.75) decorationType = 'log';
                else if (rand < 0.9) decorationType = 'tree_stump';
                else decorationType = 'grass';
            }
            else if (biome === 'desert') {
                // Desert: sparse red/orange terrain with rocks and dead trees
                if (rand < 0.4) decorationType = 'rock';
                else if (rand < 0.7) decorationType = 'dead_tree';
                else if (rand < 0.9) decorationType = 'log';
                else decorationType = 'skull';
            }
            else if (biome === 'dark') {
                // Dark Woods: spooky stuff
                if (rand < 0.4) decorationType = 'dead_tree';
                else if (rand < 0.6) decorationType = 'skull';
                else if (rand < 0.85) decorationType = 'log';
                else decorationType = 'rock';
            }
            else {
                // Fallback for other biomes
                decorationType = 'rock';
            }

            decorations.push({ x, y, type: decorationType, biome });
        }

        const biomeList = Object.entries(biomeStats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name}(${Math.round(count / (width * height) * 100)}%)`);

        return { tiles, biomes, decorations, biomeStats: biomeList };
    }

    getSpawnPoints() {
        const points = [];
        // Spawn at exact point from LDtk Spawn layer (grid 32,44 in 50x50 map = offset +7,+19 from center)
        // Map is 2400x2400px centered at world center, spawn at pixel 1536,2112 in map
        // Offset from map center: +336px, +912px = +7 tiles, +19 tiles

        const centerX = Math.floor(this.WORLD_SIZE / 2);
        const centerY = Math.floor(this.WORLD_SIZE / 2);
        const spawnGridX = centerX + 7;  // LDtk spawn offset
        const spawnGridY = centerY + 19; // LDtk spawn offset
        const radius = 2; // Small radius around spawn point for multiple players

        for (let i = 0; i < this.maxPlayers; i++) {
            const angle = (2 * Math.PI * i) / this.maxPlayers;
            const gridX = Math.round(spawnGridX + radius * Math.cos(angle));
            const gridY = Math.round(spawnGridY + radius * Math.sin(angle));

            // Convert to pixel coordinates
            points.push({
                x: gridX * TILE_SIZE + TILE_SIZE / 2,
                y: gridY * TILE_SIZE + TILE_SIZE / 2
            });
        }
        return points;
    }


    broadcast(event, data, filter = null) {
        this.players.forEach(player => {
            // Skip bots - they don't have sockets
            if (player.isBot) return;

            // Interest management: filter irrelevant updates
            if (filter && !filter(player, data)) {
                return; // Skip this player
            }
            io.to(player.id).emit(event, data);
        });
    }

    // Broadcast only to players within a certain distance (for proximity-based audio/effects)
    broadcastProximity(event, data, sourcePosition, maxDistance = 2560) {
        this.players.forEach(player => {
            // Skip bots - they don't have sockets
            if (player.isBot) return;

            // Skip players without position
            if (!player.position) return;

            // Calculate distance from source
            const dx = player.position.x - sourcePosition.x;
            const dy = player.position.y - sourcePosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Only send to players within range
            if (distance <= maxDistance) {
                io.to(player.id).emit(event, data);
            }
        });
    }

    cleanupDistantEnemies() {
        // Remove enemies that are >100 tiles from ALL players
        const CLEANUP_DISTANCE = 100;

        this.gameState.enemies = this.gameState.enemies.filter(enemy => {
            // Check if ANY player is within range
            let nearPlayer = false;
            const cleanupDistSquared = CLEANUP_DISTANCE * CLEANUP_DISTANCE;
            this.players.forEach(player => {
                // PERFORMANCE: Use squared distance for cleanup check
                const dx = player.position.x - enemy.position.x;
                const dy = player.position.y - enemy.position.y;
                const distSquared = dx * dx + dy * dy;
                if (distSquared < cleanupDistSquared) {
                    nearPlayer = true;
                }
            });

            // If enemy is dead or far from all players, remove it
            if (!nearPlayer && !enemy.isAlive) {
                // Also clear the region so it can respawn later if player returns
                const REGION_SIZE = 50;
                const regionX = Math.floor(enemy.position.x / REGION_SIZE);
                const regionY = Math.floor(enemy.position.y / REGION_SIZE);
                const regionKey = `${regionX},${regionY}`;
                this.spawnedRegions.delete(regionKey);
                return false; // Remove
            }

            return nearPlayer || enemy.isAlive; // Keep if near player or still alive
        });
    }

    updateEnemies() {
        const tileSize = 32;
        const now = Date.now();
        let movedCount = 0;

        // PERFORMANCE: Batch enemy movements to reduce network broadcasts
        const enemyMovements = [];

        // Cleanup distant enemies occasionally
        if (!this.lastCleanup) this.lastCleanup = 0;
        if (now - this.lastCleanup > 10000) { // Every 10 seconds
            this.cleanupDistantEnemies();
            this.lastCleanup = now;
        }

        // Check for flanking horde spawns every 2 seconds
        if (!this.lastFlankingCheck) this.lastFlankingCheck = 0;
        if (now - this.lastFlankingCheck > 2000) { // Every 2 seconds
            this.players.forEach(player => {
                this.checkAndSpawnFlankingHorde(player);
            });
            this.lastFlankingCheck = now;
        }

        // Debug: Check if we have enemies
        if (this.gameState.enemies.length === 0) return;

        this.gameState.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;

            // Check if enemy is stunned from knockback
            if (enemy.stunned && now < enemy.stunnedUntil) {
                return; // Skip movement while stunned
            } else if (enemy.stunned && now >= enemy.stunnedUntil) {
                // Clear stun flag when expired
                enemy.stunned = false;
            }

            // Apply pull forces from active vortexes (overrides normal movement)
            let pulledByVortex = false;
            this.gameState.vortexes.forEach((vortex, vortexId) => {
                const dx = vortex.x - enemy.position.x;
                const dy = vortex.y - enemy.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Only pull if within radius
                if (distance < vortex.pullRadius && distance > 10) {
                    // Calculate pull direction (normalized)
                    const pullX = (dx / distance) * vortex.pullStrength;
                    const pullY = (dy / distance) * vortex.pullStrength;

                    // Apply pull force directly to position
                    enemy.position.x += pullX;
                    enemy.position.y += pullY;
                    pulledByVortex = true;

                    // Debug log occasionally
                    if (Math.random() < 0.01) {
                        console.log(`🌀 SERVER: Enemy pulled by ${vortexId} - distance: ${distance.toFixed(0)}px, force: (${pullX.toFixed(2)}, ${pullY.toFixed(2)})`);
                    }
                }
            });

            // If pulled by vortex, skip normal movement
            if (pulledByVortex) {
                return;
            }

            // PERFORMANCE: Update every 100ms to match game loop (was 50ms)
            if (now - enemy.lastMove < 100) return;
            enemy.lastMove = now;
            movedCount++;

            // Find nearest target (player or minion)
            let target = null;
            let maxAggro = 0; // Track highest aggro value (not infinity!)

            // Skip if no players in lobby
            if (this.players.size === 0) return;

            // Debug: Log player positions for first enemy occasionally
            if (movedCount === 0 && Math.random() < 0.1) { // 10% chance for first enemy
                this.players.forEach(p => {
                    console.log(`👤 Player ${p.username} at (${p.position.x}, ${p.position.y}) for enemy targeting`);
                });
            }

            // RANGED ENEMY TARGETING: Prioritize players over minions
            const isRangedEnemy = enemy.type === 'emberclaw';
            
            const sightRangeSquared = (enemy.sightRange * TILE_SIZE) * (enemy.sightRange * TILE_SIZE); // PERFORMANCE: Squared comparison in pixels

            // Check players first if ranged enemy, minions first if melee
            const checkPlayersFirst = isRangedEnemy;

            if (checkPlayersFirst) {
                // RANGED: Check players first (high priority)
                this.players.forEach(player => {
                    if (!player.isAlive) {
                        return;
                    }

                    // Player position is already in pixels
                    const dx = player.position.x - enemy.position.x;
                    const dy = player.position.y - enemy.position.y;
                    const distSquared = dx * dx + dy * dy;

                    const hasAggro = enemy.aggro && enemy.aggro.has(player.id);
                    const inSightRange = distSquared <= sightRangeSquared;

                    if (!hasAggro && !inSightRange) {
                        return;
                    }

                    const dist = Math.sqrt(distSquared);
                    let aggroValue = 100 / (dist + 1);

                    if (hasAggro) {
                        aggroValue += enemy.aggro.get(player.id);
                    }

                    // RANGED BONUS: Players get 2x aggro for ranged enemies
                    aggroValue *= 2.0;

                    if (aggroValue > maxAggro) {
                        maxAggro = aggroValue;
                        target = { position: { x: player.position.x, y: player.position.y }, id: player.id };
                        // DEBUG: Log player position vs enemy position
                        if (Math.random() < 0.02) {
                            console.log(`🎯 TARGETING: Enemy at (${Math.round(enemy.position.x)}, ${Math.round(enemy.position.y)}) targeting player at (${Math.round(player.position.x)}, ${Math.round(player.position.y)}), dist=${Math.round(dist)}`);
                        }
                    }
                });

                // RANGED: Check minions as fallback (lower priority)
                if (this.gameState.minions) {
                    this.gameState.minions.forEach((minion, minionId) => {
                        if (Date.now() - minion.lastUpdate > 5000) {
                            this.gameState.minions.delete(minionId);
                            return;
                        }

                        // Skip minions with spawn invulnerability (first 2 seconds after spawn)
                        const spawnTime = minion.spawnTime || 0;
                        const spawnInvulnerabilityDuration = 2000; // 2 seconds
                        if (Date.now() - spawnTime < spawnInvulnerabilityDuration) {
                            return; // Minion is invulnerable, skip targeting
                        }

                        // Minion position is already in pixels
                        const dx = minion.position.x - enemy.position.x;
                        const dy = minion.position.y - enemy.position.y;
                        const distSquared = dx * dx + dy * dy;

                        const hasAggro = enemy.aggro && enemy.aggro.has(minionId);
                        const inSightRange = distSquared <= sightRangeSquared;

                        if (!hasAggro && !inSightRange) {
                            return;
                        }

                        const dist = Math.sqrt(distSquared);
                        let aggroValue = 100 / (dist + 1);

                        if (hasAggro) {
                            aggroValue += enemy.aggro.get(minionId);
                        }

                        // No multiplier for minions vs ranged (base priority)
                        aggroValue *= 1.0;

                        if (aggroValue > maxAggro) {
                            maxAggro = aggroValue;
                            target = { position: { x: minion.position.x, y: minion.position.y }, id: minionId, isMinion: true };
                        }
                    });
                }
            } else {
                // MELEE: Check minions first (tank role - higher priority)
                if (this.gameState.minions) {
                    this.gameState.minions.forEach((minion, minionId) => {
                        if (Date.now() - minion.lastUpdate > 5000) {
                            this.gameState.minions.delete(minionId);
                            return;
                        }

                        // Skip minions with spawn invulnerability (first 2 seconds after spawn)
                        const spawnTime = minion.spawnTime || 0;
                        const spawnInvulnerabilityDuration = 2000; // 2 seconds
                        if (Date.now() - spawnTime < spawnInvulnerabilityDuration) {
                            return; // Minion is invulnerable, skip targeting
                        }

                        // Minion position is already in pixels
                        const dx = minion.position.x - enemy.position.x;
                        const dy = minion.position.y - enemy.position.y;
                        const distSquared = dx * dx + dy * dy;

                        const hasAggro = enemy.aggro && enemy.aggro.has(minionId);
                        const inSightRange = distSquared <= sightRangeSquared;

                        if (!hasAggro && !inSightRange) {
                            return;
                        }

                        const dist = Math.sqrt(distSquared);
                        let aggroValue = 100 / (dist + 1);

                        if (hasAggro) {
                            aggroValue += enemy.aggro.get(minionId);
                        }

                        // Minions get 1.5x aggro multiplier (tank role)
                        aggroValue *= 1.5;

                        if (aggroValue > maxAggro) {
                            maxAggro = aggroValue;
                            target = { position: { x: minion.position.x, y: minion.position.y }, id: minionId, isMinion: true };
                        }
                    });
                }

                // MELEE: Check players (lower priority - can be body-blocked)
                this.players.forEach(player => {
                    if (!player.isAlive) {
                        return;
                    }

                    // Skip players without position
                    if (!player.position) return;

                    // Player position is already in pixels
                    const dx = player.position.x - enemy.position.x;
                    const dy = player.position.y - enemy.position.y;
                    const distSquared = dx * dx + dy * dy;

                    const hasAggro = enemy.aggro && enemy.aggro.has(player.id);
                    const inSightRange = distSquared <= sightRangeSquared;

                    if (!hasAggro && !inSightRange) {
                        return;
                    }

                    const dist = Math.sqrt(distSquared);
                    let aggroValue = 100 / (dist + 1);

                    if (hasAggro) {
                        aggroValue += enemy.aggro.get(player.id);
                    }

                    // No multiplier for players vs melee (base priority)
                    aggroValue *= 1.0;

                    if (aggroValue > maxAggro) {
                        maxAggro = aggroValue;
                        target = { position: { x: player.position.x, y: player.position.y }, id: player.id };
                    }
                });
            }

            // Skip if no target found
            if (!target) return;

            // DEBUG: Log when we find a target
            if (Math.random() < 0.02) {
                console.log(`🎯 Enemy ${enemy.id} found target: ${target.id}, isMinion: ${target.isMinion}, targetPos: (${target.position.x.toFixed(1)}, ${target.position.y.toFixed(1)}), enemyPos: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
            }

            // Move toward target (or away for kiting enemies)
            const dx = target.position.x - enemy.position.x;
            const dy = target.position.y - enemy.position.y;
            const distanceSquared = dx * dx + dy * dy;

            // Only calculate sqrt when needed (for movement normalization or debug)
            let distance = null;

            // Debug: Log first enemy movement occasionally
            if (movedCount === 1 && Math.random() < 0.05) {
                distance = Math.sqrt(distanceSquared);
                console.log(`🧟 ${enemy.type} at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) targeting (${target.position.x.toFixed(1)}, ${target.position.y.toFixed(1)}), dist: ${distance.toFixed(1)}`);
            }

            // EMBERCLAW KITING BEHAVIOR
            if (enemy.type === 'emberclaw') {
                if (distance === null) distance = Math.sqrt(distanceSquared);
                
                const preferredDistance = (enemy.preferredDistance || 6) * TILE_SIZE; // Convert tiles to pixels
                const attackRange = (enemy.attackRange || 8) * TILE_SIZE; // Convert tiles to pixels

                // DEBUG: Always log emberclaw behavior decisions
                console.log(`🔥 Emberclaw ${enemy.id}: dist=${distance.toFixed(1)}, preferred=${preferredDistance}, attackRange=${attackRange}, lastAttack=${Date.now() - enemy.lastAttack}ms ago`);

                // If too close, kite away
                if (distance < preferredDistance) {
                    // Double-check enemy is alive before moving
                    if (!enemy.isAlive) return;

                    const moveDistance = enemy.speed / 200;
                    // Move AWAY from target
                    const newX = enemy.position.x - (dx / distance) * moveDistance;
                    const newY = enemy.position.y - (dy / distance) * moveDistance;

                    // SAFE ZONE CHECK (convert to tiles for comparison)
                    
                    const worldCenterX = (this.WORLD_SIZE / 2) * TILE_SIZE;
                    const worldCenterY = (this.WORLD_SIZE / 2) * TILE_SIZE;
                    const safeZoneRadius = 25 * TILE_SIZE;

                    const wouldEnterSpawnSafeZone = (
                        newX >= (worldCenterX - safeZoneRadius) &&
                        newX <= (worldCenterX + safeZoneRadius) &&
                        newY >= (worldCenterY - safeZoneRadius) &&
                        newY <= (worldCenterY + safeZoneRadius)
                    );

                    if (!wouldEnterSpawnSafeZone) {
                        enemy.position.x = newX;
                        enemy.position.y = newY;

                        // PERFORMANCE: Add to batch instead of broadcasting immediately
                        enemyMovements.push({
                            enemyId: enemy.id,
                            position: { x: newX, y: newY },
                            isPixelCoordinates: true
                        });
                    }
                }
                // If in attack range, shoot projectile
                else if (distance <= attackRange) {
                    const now = Date.now();
                    if (now - enemy.lastAttack >= enemy.attackCooldown) {
                        enemy.lastAttack = now;

                        // Target position is already in pixels
                        console.log(`🔥 Emberclaw ${enemy.id} shooting at ${target.isMinion ? 'minion' : 'player'} ${target.id}`);

                        // Broadcast to clients to trigger shooting animation
                        // Clients will handle projectile collision and send player:hit when it connects
                        const attackData = {
                            enemyId: enemy.id,
                            targetX: target.position.x,
                            targetY: target.position.y,
                            targetId: target.id
                        };
                        console.log(`📡 Broadcasting enemy:attack:`, attackData);
                        this.broadcast('enemy:attack', attackData);
                        console.log(`✅ Broadcast sent to ${this.players.size} players`);

                        // Note: Damage will be applied when the projectile actually hits via player:hit event
                        // This prevents instant damage before the projectile visual reaches the target
                    }
                }
                // If too far, move closer (but maintain distance)
                else if (distance > attackRange) {
                    // Double-check enemy is alive before moving
                    if (!enemy.isAlive) return;

                    const moveDistance = enemy.speed / 200;
                    const newX = enemy.position.x + (dx / distance) * moveDistance;
                    const newY = enemy.position.y + (dy / distance) * moveDistance;

                    // SAFE ZONE CHECK (convert to pixels)
                    
                    const worldCenterX = (this.WORLD_SIZE / 2) * TILE_SIZE;
                    const worldCenterY = (this.WORLD_SIZE / 2) * TILE_SIZE;
                    const safeZoneRadius = 25 * TILE_SIZE;

                    const wouldEnterSpawnSafeZone = (
                        newX >= (worldCenterX - safeZoneRadius) &&
                        newX <= (worldCenterX + safeZoneRadius) &&
                        newY >= (worldCenterY - safeZoneRadius) &&
                        newY <= (worldCenterY + safeZoneRadius)
                    );

                    if (!wouldEnterSpawnSafeZone) {
                        enemy.position.x = newX;
                        enemy.position.y = newY;

                        // PERFORMANCE: Add to batch instead of broadcasting immediately
                        enemyMovements.push({
                            enemyId: enemy.id,
                            position: { x: newX, y: newY },
                            isPixelCoordinates: true
                        });
                    }
                }

                return; // Skip normal melee movement
            }

            // NORMAL MELEE ENEMY MOVEMENT
            const MIN_DISTANCE_TO_PLAYER = 15; // Minimum distance in pixels
            const MIN_DISTANCE_SQUARED = MIN_DISTANCE_TO_PLAYER * MIN_DISTANCE_TO_PLAYER;

            if (distanceSquared > MIN_DISTANCE_SQUARED) {  // Only move if farther than minimum distance
                // Double-check enemy is alive before moving
                if (!enemy.isAlive) return;

                if (distance === null) distance = Math.sqrt(distanceSquared);  // Calculate only if needed
                const moveDistance = enemy.speed / 200; // Pixels per update (50ms = 1/20th second)

                // Calculate new position
                const newX = enemy.position.x + (dx / distance) * moveDistance;
                const newY = enemy.position.y + (dy / distance) * moveDistance;

                // Check if new position would be too close to player
                const newDx = target.position.x - newX;
                const newDy = target.position.y - newY;
                const newDistanceSquared = newDx * newDx + newDy * newDy;

                // Don't move if it would bring us closer than minimum distance
                if (newDistanceSquared < MIN_DISTANCE_SQUARED) {
                    return; // Stay at current position
                }

                // SAFE ZONE CHECK: Prevent enemies from entering spawn building
                
                const worldCenterX = (this.WORLD_SIZE / 2) * TILE_SIZE;
                const worldCenterY = (this.WORLD_SIZE / 2) * TILE_SIZE;
                const safeZoneRadius = 25 * TILE_SIZE; // 50x50 tiles = 25 tiles from center in each direction

                const wouldEnterSpawnSafeZone = (
                    newX >= (worldCenterX - safeZoneRadius) &&
                    newX < (worldCenterX + safeZoneRadius) &&
                    newY >= (worldCenterY - safeZoneRadius) &&
                    newY < (worldCenterY + safeZoneRadius)
                );

                // Only move if it doesn't enter the safe zone
                if (!wouldEnterSpawnSafeZone) {
                    enemy.position.x = newX;
                    enemy.position.y = newY;
                } else {
                    // Enemy is blocked by safe zone - clear aggro so they wander away
                    if (enemy.aggro) {
                        enemy.aggro.clear();
                    }
                }

                // PERFORMANCE: Add to batch instead of broadcasting immediately (proximity filter will be applied when batch is sent)
                enemyMovements.push({
                    enemyId: enemy.id,
                    position: {
                        x: enemy.position.x,
                        y: enemy.position.y
                    },
                    isPixelCoordinates: true
                });
            }

            // Attack if close enough (48 pixels = 1.5 tiles)
            const attackRangePixels = 1.5 * TILE_SIZE; // 48 pixels
            const attackRangeSquared = attackRangePixels * attackRangePixels; // 2304

            if (distanceSquared < attackRangeSquared) {
                // Check attack cooldown (1 second between attacks)
                const ATTACK_COOLDOWN = 1000; // 1 second
                if (!enemy.lastAttackTime) enemy.lastAttackTime = 0;

                if (now - enemy.lastAttackTime < ATTACK_COOLDOWN) {
                    return; // Skip attack, still on cooldown
                }

                enemy.lastAttackTime = now;

                // Attack target (player or minion)
                if (target.isMinion) {
                    // Attack minion - apply defense reduction
                    // Minions have 12 defense (hardcoded, matches client-side Minion.js)
                    const minionDefense = 12;
                    const damageMultiplier = 100 / (100 + minionDefense);
                    const finalDamage = Math.max(1, Math.floor(enemy.damage * damageMultiplier));

                    this.broadcast('minion:damaged', {
                        minionId: target.id,
                        damage: finalDamage,
                        attackerId: enemy.id,
                        enemyPosition: { x: enemy.position.x, y: enemy.position.y },
                        isPixelCoordinates: true
                    });
                } else {
                    // Attack player
                    const damageTarget = Array.from(this.players.values()).find(p => p.id === target.id);
                    if (damageTarget && damageTarget.isAlive) {
                        // Check if player is invincible (Bot Aldric)
                        if (!damageTarget.isInvincible) {
                            // Apply defense reduction using diminishing returns formula
                            // Formula: damage * (100 / (100 + defense))
                            const defense = damageTarget.stats?.defense || 0;
                            const damageMultiplier = 100 / (100 + defense);
                            const finalDamage = Math.max(1, Math.floor(enemy.damage * damageMultiplier));

                            damageTarget.health -= finalDamage;

                            // Track damage taken for stats
                            if (damageTarget.damageTaken !== undefined) {
                                damageTarget.damageTaken += finalDamage;
                            }

                            console.log(`⚔️ Enemy ${enemy.id} melee attack: ${enemy.damage} damage (defense: ${defense}, reduced to: ${finalDamage})`);
                        } else {
                            console.log(`🛡️ ${damageTarget.username} is invincible - melee damage ignored!`);
                        }

                        if (!damageTarget.isInvincible && damageTarget.health <= 0) {
                            damageTarget.isAlive = false;
                            damageTarget.health = 0;
                            damageTarget.deaths++;

                            console.log(`💀 ${damageTarget.username} died - resetting to level 1`);

                            // FULL RESET - Roguelike death penalty
                            damageTarget.level = 1;
                            damageTarget.experience = 0;
                            damageTarget.selectedSkills = [];
                            // Keep permanent minions so they can be restored on respawn
                            // damageTarget.permanentMinions = [];

                            // Reset stats to class defaults
                            damageTarget.stats = damageTarget.getClassStats(damageTarget.class);
                            damageTarget.health = damageTarget.maxHealth;

                            // Reset all multipliers
                            damageTarget.initializeMultipliers();

                            // Delete all minions owned by this player from the game state
                            if (this.gameState && this.gameState.minions) {
                                const minionsToDelete = [];
                                this.gameState.minions.forEach((minion, minionId) => {
                                    if (minion.ownerId === damageTarget.id) {
                                        minionsToDelete.push(minionId);
                                    }
                                });

                                minionsToDelete.forEach(minionId => {
                                    console.log(`💀 Deleting minion ${minionId} (owner died)`);
                                    this.gameState.minions.delete(minionId);

                                    // Broadcast minion death to all clients
                                    this.broadcast('minion:died', {
                                        minionId: minionId,
                                        isPermanent: true
                                    });
                                });

                                if (minionsToDelete.length > 0) {
                                    console.log(`💀 Deleted ${minionsToDelete.length} minions for ${damageTarget.username}`);
                                }
                            }

                            // Respawn at spawn point (center of world) in PIXEL coordinates
                            
                            const worldCenterGrid = Math.floor(this.WORLD_SIZE / 2);
                            damageTarget.position = {
                                x: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2,
                                y: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2
                            };

                            console.log(`♻️ ${damageTarget.username} reset: Level ${damageTarget.level}, Health ${damageTarget.health}/${damageTarget.maxHealth}`);

                            // Clear aggro from all enemies
                            this.gameState.enemies.forEach(e => {
                                if (e.aggro && e.aggro.has(damageTarget.id)) {
                                    e.aggro.delete(damageTarget.id);
                                }
                            });

                            console.log(`💀 ${damageTarget.username} (${damageTarget.class}) died to ${enemy.id}`);

                            this.broadcast('player:died', {
                                playerId: damageTarget.id,
                                playerName: damageTarget.username,
                                killedBy: enemy.id,
                                position: damageTarget.position
                            });

                            // After death animation, send respawn data
                            setTimeout(() => {
                                damageTarget.isAlive = true;
                                damageTarget.justRespawned = true; // DEBUG FLAG

                                console.log(`♻️ ${damageTarget.username} respawned at (${damageTarget.position.x}, ${damageTarget.position.y}), isAlive=${damageTarget.isAlive}`);

                                // Find the player's socket
                                const playerSocket = Array.from(io.sockets.sockets.values())
                                    .find(s => players.get(s.id)?.id === damageTarget.id);

                                if (playerSocket) {
                                    playerSocket.emit('player:respawned', {
                                        ...damageTarget.toJSON(),
                                        respawnPosition: damageTarget.position
                                    });
                                }

                                this.broadcast('player:respawned', {
                                    playerId: damageTarget.id,
                                    playerName: damageTarget.username,
                                    position: damageTarget.position,
                                    health: damageTarget.health,
                                    maxHealth: damageTarget.maxHealth,
                                    level: damageTarget.level
                                });

                                // Clear flag after 5 seconds
                                setTimeout(() => {
                                    damageTarget.justRespawned = false;
                                }, 5000);
                            }, 3000); // 3 second death delay
                        } else {
                            // Calculate defense-reduced damage for broadcast
                            const defense = damageTarget.stats?.defense || 0;
                            const damageMultiplier = 100 / (100 + defense);
                            const broadcastDamage = Math.max(1, Math.floor(enemy.damage * damageMultiplier));

                            this.broadcast('player:damaged', {
                                playerId: damageTarget.id,
                                health: damageTarget.health,
                                maxHealth: damageTarget.maxHealth,
                                damage: broadcastDamage,
                                attackerId: enemy.id,
                                enemyPosition: { x: enemy.position.x, y: enemy.position.y },
                                playerPosition: { x: target.position.x, y: target.position.y },
                                isPixelCoordinates: true
                            });
                        }
                    }
                }
            }
        });

        // PERFORMANCE: Send all enemy movements in a single batched broadcast
        if (enemyMovements.length > 0) {
            this.broadcast('enemies:moved:batch', {
                enemies: enemyMovements
            });
        }
    }

    // Biome detection (matching client BiomeChunkSystem)
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    smoothNoise(x, y, scale, seed) {
        const scaledX = x / scale;
        const scaledY = y / scale;

        const x0 = Math.floor(scaledX);
        const y0 = Math.floor(scaledY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = scaledX - x0;
        const fy = scaledY - y0;

        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);

        const v00 = this.seededRandom(seed + x0 * 7919 + y0 * 6563);
        const v10 = this.seededRandom(seed + x1 * 7919 + y0 * 6563);
        const v01 = this.seededRandom(seed + x0 * 7919 + y1 * 6563);
        const v11 = this.seededRandom(seed + x1 * 7919 + y1 * 6563);

        const top = v00 * (1 - sx) + v10 * sx;
        const bottom = v01 * (1 - sx) + v11 * sx;
        return top * (1 - sy) + bottom * sy;
    }

    getBiomeForChunk(chunkX, chunkY) {
        const seed1 = this.numericSeed + 12345;
        const seed2 = this.numericSeed + 54321;
        const seed3 = this.numericSeed + 98765;

        const noise1 = this.smoothNoise(chunkX, chunkY, 3.0, seed1);
        const noise2 = this.smoothNoise(chunkX, chunkY, 1.5, seed2);
        const noise3 = this.smoothNoise(chunkX, chunkY, 0.75, seed3);

        const combined = (noise1 * 0.6) + (noise2 * 0.25) + (noise3 * 0.15);

        if (combined < 0.55) return 'dark_forest';
        return 'ember_wilds';
    }

    getChunkVariant(chunkX, chunkY, biome) {
        const seed = this.numericSeed + (chunkX * 7919) + (chunkY * 6563);

        if (biome === 'dark_forest') {
            // Dark Forest weighted distribution:
            // chunk1: 33%, chunk2: 33%, chunk3: 25%, chunk4: 8%, chunk5: 1% (EXTREMELY RARE)
            const random = this.seededRandom(seed);
            if (random < 0.33) {
                return 1; // chunk1
            } else if (random < 0.66) {
                return 2; // chunk2
            } else if (random < 0.91) {
                return 3; // chunk3
            } else if (random < 0.99) {
                return 4; // chunk4
            } else {
                return 5; // chunk5 (1% chance - EXTREMELY RARE!)
            }
        } else if (biome === 'ember_wilds') {
            // Equal distribution for Ember Wilds (2 chunks)
            const variantIndex = Math.floor(this.seededRandom(seed) * 2);
            return variantIndex + 1;
        }

        return 1; // Fallback
    }

    isDarkForestChunk5(chunkX, chunkY) {
        const biome = this.getBiomeForChunk(chunkX, chunkY);
        if (biome !== 'dark_forest') return false;

        const variant = this.getChunkVariant(chunkX, chunkY, biome);
        return variant === 5;
    }

    toJSON() {
        return {
            id: this.id,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            status: this.status,
            difficulty: this.difficulty,
            floor: this.gameState.floor
        };
    }
}

// Rate limiting
function checkRateLimit(socketId, action) {
    const key = `${socketId}_${action}`;
    const now = Date.now();
    const lastAction = rateLimits.get(key) || 0;

    if (now - lastAction < RATE_LIMIT_INTERVAL) {
        return false; // Rate limited
    }

    rateLimits.set(key, now);
    return true;
}

// Matchmaking - Find active game or create new one
function findOrCreateLobby(difficulty = 'normal') {
    // Find active game with space and matching difficulty
    for (const [lobbyId, lobby] of lobbies.entries()) {
        // Count only real players (not bots) for capacity check
        const realPlayerCount = Array.from(lobby.players.values()).filter(p => !p.isBot).length;
        if (lobby.status === 'active' &&
            realPlayerCount < lobby.maxPlayers &&
            lobby.difficulty === difficulty) {
            return lobby;
        }
    }

    // Create new game (starts immediately with dungeon)
    const newLobby = new Lobby(difficulty);
    lobbies.set(newLobby.id, newLobby);
    console.log(`🆕 Created new game ${newLobby.id.slice(0, 8)} (${difficulty}) - Ready for players!`);
    return newLobby;
}

// Validation helpers
function isValidPosition(position, worldSize = 1000) {
    // Position is now in PIXELS, so validate against worldSize * TILE_SIZE
    
    const maxPixelCoord = worldSize * TILE_SIZE;
    return position &&
           typeof position.x === 'number' &&
           typeof position.y === 'number' &&
           position.x >= 0 && position.x < maxPixelCoord &&
           position.y >= 0 && position.y < maxPixelCoord;
}

function sanitizeMessage(message) {
    if (typeof message !== 'string') return '';
    return message.slice(0, MAX_MESSAGE_LENGTH).trim();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Send current free character to client
    socket.emit('freeCharacter:update', {
        character: currentFreeCharacter,
        rotationTime: freeCharacterRotationTime
    });

    // Handle player joining
    socket.on('player:join', async (data) => {
        try {
            const { username, characterClass, difficulty, token } = data || {};

            let finalUsername = username;
            let userId = null;

            // Check if player is logged in with token
            if (token) {
                const tokenResult = auth.verifyToken(token);
                if (tokenResult.success) {
                    finalUsername = tokenResult.username;
                    userId = tokenResult.userId;
                    console.log(`🔐 ${finalUsername} joined with account (ID: ${userId})`);
                } else {
                    console.log(`⚠️ Token verification failed for ${username}:`, tokenResult.error);
                }
            } else {
                console.log(`⚠️ No token provided for ${username} - joining as guest`);
            }

            // Sanitize username (generates guest name if needed)
            finalUsername = new Player(socket.id, '').sanitizeUsername(finalUsername);

            // Check if player is reconnecting
            const disconnectedPlayer = disconnectedPlayers.get(finalUsername);
            let player;

            if (disconnectedPlayer && Date.now() - disconnectedPlayer.disconnectedAt < RECONNECT_TIMEOUT) {
                // Reconnection - restore player with EXACT state (position, health, level, souls, etc.)
                player = disconnectedPlayer;
                player.id = socket.id;
                player.isReconnecting = false;
                player.disconnectedAt = null;
                player.userId = userId; // Update user ID in case token changed
                console.log(`🔐 Reconnected player ${finalUsername} - userId set to: ${userId}`);
                console.log(`📍 Restoring state: HP ${player.health}/${player.maxHealth}, Level ${player.level}, Position (${Math.floor(player.position.x)}, ${Math.floor(player.position.y)}), Souls ${player.souls}`);

                // IMPORTANT: Update character class if player selected a different one
                if (characterClass && typeof characterClass === 'string' && characterClass.toLowerCase() !== player.class.toLowerCase()) {
                    console.log(`🔄 ${finalUsername} changed character from ${player.class} to ${characterClass}`);
                    player.class = characterClass.toLowerCase(); // Normalize to lowercase
                    player.stats = player.getClassStats(player.class); // getClassStats sets maxHealth and health internally
                    player.level = 1; // Reset to level 1 with new character
                    player.experience = 0;
                }

                disconnectedPlayers.delete(finalUsername);
                console.log(`🔄 ${finalUsername} reconnected (exact state restored)`);
            } else {
                // New player
                player = new Player(socket.id, finalUsername);
                player.userId = userId; // Link to user account if logged in
                console.log(`🔐 New player ${finalUsername} - userId set to: ${userId}`);
                if (characterClass && typeof characterClass === 'string') {
                    player.class = characterClass.toLowerCase(); // Normalize to lowercase
                    player.stats = player.getClassStats(player.class); // getClassStats sets maxHealth and health internally
                    console.log(`🎮 New player ${finalUsername} joined as ${player.class} - HP: ${player.health}/${player.maxHealth}`);
                }
            }

            players.set(socket.id, player);

            // Track unique players and update metrics
            uniquePlayerUsernames.add(finalUsername);
            metrics.totalPlayers = uniquePlayerUsernames.size;

            // Update peak players (now correctly using players.size after adding)
            if (players.size > metrics.peakPlayers) {
                metrics.peakPlayers = players.size;
            }

            // Find or create lobby - if reconnecting, try to rejoin their old lobby
            let lobby;
            if (player.lobbyId && lobbies.has(player.lobbyId)) {
                // Reconnecting to same lobby
                lobby = lobbies.get(player.lobbyId);
                console.log(`🔄 ${finalUsername} reconnecting to same lobby ${lobby.id.slice(0, 8)}`);
            } else {
                // New player or old lobby gone - find/create lobby
                lobby = findOrCreateLobby(difficulty || 'normal');
                player.lobbyId = lobby.id; // Update lobby reference
            }

            // CLEANUP: Remove all old minions for this player before they join
            // This prevents duplicate minions when rejoining or changing characters
            if (lobby.gameState.minions) {
                const oldMinions = [];
                lobby.gameState.minions.forEach((minion, minionId) => {
                    if (minion.ownerId === player.id || minion.ownerId === socket.id) {
                        oldMinions.push(minionId);
                    }
                });

                // Remove old minions
                oldMinions.forEach(minionId => {
                    lobby.gameState.minions.delete(minionId);
                });

                if (oldMinions.length > 0) {
                    console.log(`🧹 Cleaned up ${oldMinions.length} old minions for ${finalUsername}`);

                    // Broadcast minion deaths to all players
                    oldMinions.forEach(minionId => {
                        lobby.broadcast('minion:died', { minionId });
                    });
                }
            }

            const result = lobby.addPlayer(player);

            if (!result.success) {
                socket.emit('error', { message: result.error });
                return;
            }

            // Cancel any pending shutdown timer if player joins
            if (lobby.shutdownTimer) {
                clearTimeout(lobby.shutdownTimer);
                lobby.shutdownTimer = null;
                console.log(`✅ Lobby ${lobby.id.slice(0, 8)} shutdown cancelled - ${finalUsername} joined`);
            }

            socket.join(lobby.id);

            // Adjust bot count BEFORE sending game state (so bots are included)
            lobby.spawnBotsToFillSlots();

            // Send game start immediately (no lobby waiting!)
            // Filter out disconnected/reconnecting players (ghost players)
            const activePlayers = Array.from(lobby.players.values())
                .filter(p => !p.isReconnecting)
                .map(p => p.toJSON());

            // Send world data
            const worldData = lobby.getWorldData();

            // Spawn initial enemies around spawn point (center of world)
            const REGION_SIZE = 50;
            const spawnRegionX = Math.floor(lobby.WORLD_SIZE / 2 / REGION_SIZE);
            const spawnRegionY = Math.floor(lobby.WORLD_SIZE / 2 / REGION_SIZE);

            // Spawn enemies in 3x3 regions around spawn
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    lobby.spawnEnemiesInRegion(spawnRegionX + dx, spawnRegionY + dy);
                }
            }

            // Convert minions Map to array for transmission
            const minionsArray = lobby.gameState.minions
                ? Array.from(lobby.gameState.minions.values())
                : [];

            // Filter game state to only include alive enemies (positions already in pixels)
            const filteredGameState = {
                ...lobby.gameState,
                enemies: lobby.gameState.enemies.filter(e => e.isAlive !== false)
            };

            // Log player state being sent to client
            const playerData = player.toJSON();
            console.log(`📤 Sending player data to client:`, {
                username: playerData.username,
                position: playerData.position,
                health: playerData.health,
                maxHealth: playerData.maxHealth,
                level: playerData.level,
                souls: playerData.souls
            });

            socket.emit('game:start', {
                lobbyId: lobby.id,
                player: playerData,
                players: activePlayers,
                gameState: filteredGameState,
                world: worldData,
                difficulty: lobby.difficulty,
                playerCount: lobby.players.size,
                maxPlayers: lobby.maxPlayers,
                minions: minionsArray  // Send existing minions to new player
            });

            // Notify others that a new player joined the active game
            socket.to(lobby.id).emit('player:joined', {
                player: player.toJSON(),
                playerCount: lobby.players.size
            });

            // CRITICAL FIX: Immediately broadcast new player's position
            // This ensures other clients know where to render the new player sprite
            socket.to(lobby.id).emit('player:moved', {
                playerId: player.id,
                position: player.position
            });

            // Update last session time for logged-in users
            if (userId) {
                try {
                    await auth.pool.query(
                        'UPDATE users SET last_session = NOW() WHERE id = $1',
                        [userId]
                    );
                } catch (error) {
                    console.error('Error updating last_session:', error);
                }
            }

        } catch (error) {
            console.error('Error in player:join:', error);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    // Handle batched updates
    socket.on('batch:update', (updates) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            // DEBUG: Log batch updates after respawn
            if (player.justRespawned && updates.some(u => u.type === 'move')) {
                console.log(`📦 BATCH: Received ${updates.length} updates from ${player.username}, processing...`);
            }

            // Process each update in the batch
            updates.forEach(update => {
                if (update.type === 'move') {
                    // Handle delta or absolute position
                    if (update.data.delta) {
                        player.position.x += update.data.delta.x;
                        player.position.y += update.data.delta.y;
                    } else if (update.data.position) {
                        player.position = update.data.position;
                    }

                    // DEBUG: Log position updates after respawn
                    if (player.justRespawned) {
                        console.log(`📍 POST-RESPAWN (BATCH): ${player.username} moved to (${player.position.x}, ${player.position.y}), isAlive=${player.isAlive}, delta=${!!update.data.delta}`);
                        player.justRespawned = false; // Only log first move
                    }

                    // Validate position
                    if (!isValidPosition(player.position)) {
                        return;
                    }

                    player.updateActivity();

                    // Check if player entered new region - spawn enemies dynamically
                    // Convert pixel position to grid position for region calculation
                    
                    const REGION_SIZE = 50;
                    const gridX = Math.floor(player.position.x / TILE_SIZE);
                    const gridY = Math.floor(player.position.y / TILE_SIZE);
                    const regionX = Math.floor(gridX / REGION_SIZE);
                    const regionY = Math.floor(gridY / REGION_SIZE);

                    // Check surrounding regions (player can see beyond current region)
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const newEnemies = lobby.spawnEnemiesInRegion(regionX + dx, regionY + dy);
                            if (newEnemies.length > 0) {
                                // Broadcast new enemies to nearby players (positions already in pixels)
                                newEnemies.forEach(enemy => {
                                    lobby.broadcast('enemy:spawned', { enemy });
                                });
                            }
                        }
                    }

                    // Interest management: only send to nearby players
                    lobby.broadcast('player:moved', {
                        playerId: player.id,
                        position: player.position
                    }, (p, data) => {
                        if (p.id === player.id) return false; // Don't send to self
                        // PERFORMANCE: Use squared distance for broadcast filter
                        const dx = p.position.x - data.position.x;
                        const dy = p.position.y - data.position.y;
                        const distSquared = dx * dx + dy * dy;
                        return distSquared < 640000; // 800 * 800 = 640000 (approx 25 tiles)
                    });
                }
            });
        } catch (error) {
            console.error('Error in batch:update:', error);
        }
    });

    // Handle player movement (legacy support)
    socket.on('player:move', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'move')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            if (!isValidPosition(data.position)) return;

            // Debug: Log first position update for each player
            if (!player.hasLoggedPosition) {
                console.log(`📍 Received initial position for ${player.username}: (${data.position.x}, ${data.position.y})`);
                player.hasLoggedPosition = true;
            }

            // DEBUG: Log position updates occasionally to check for coordinate issues
            if (Math.random() < 0.01) {
                console.log(`📍 MOVE UPDATE: ${player.username} at (${Math.round(data.position.x)}, ${Math.round(data.position.y)})`);
            }

            // DEBUG: Log position updates after respawn
            if (player.justRespawned) {
                console.log(`📍 POST-RESPAWN: ${player.username} moved to (${data.position.x}, ${data.position.y}), isAlive=${player.isAlive}`);
                player.justRespawned = false; // Only log first move
            }

            // Track distance traveled
            if (player.lastPosition.x !== 0 || player.lastPosition.y !== 0) {
                const dx = data.position.x - player.lastPosition.x;
                const dy = data.position.y - player.lastPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                player.distanceTraveled += distance;
            }
            player.lastPosition = { x: data.position.x, y: data.position.y };

            player.position = data.position;
            player.updateActivity();

            socket.to(lobby.id).emit('player:moved', {
                playerId: player.id,
                position: player.position
            });
        } catch (error) {
            console.error('Error in player:move:', error);
        }
    });

    // Handle map change (interior/exterior)
    socket.on('player:changeMap', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { mapName } = data;
            if (mapName !== 'interior' && mapName !== 'exterior') return;

            player.currentMap = mapName;
            console.log(`🚪 ${player.username} moved to ${mapName}`);

            // Broadcast map change to other players
            socket.to(lobby.id).emit('player:changedMap', {
                playerId: player.id,
                mapName: mapName
            });
        } catch (error) {
            console.error('Error in player:changeMap:', error);
        }
    });

    // Handle pet equip
    socket.on('player:equipPet', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { petType } = data;
            if (!petType || typeof petType !== 'string') return;

            // Add pet to owned pets if not already owned
            if (!player.ownedPets.includes(petType)) {
                player.ownedPets.push(petType);
            }

            // Equip the pet
            player.activePet = petType;
            console.log(`🐾 ${player.username} equipped pet: ${petType}`);

            // Broadcast pet equip to other players in lobby
            socket.to(lobby.id).emit('player:petEquipped', {
                playerId: player.id,
                petType: petType
            });
        } catch (error) {
            console.error('Error in player:equipPet:', error);
        }
    });

    // Handle pet unequip
    socket.on('player:unequipPet', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            player.activePet = null;
            console.log(`🐾 ${player.username} unequipped pet`);

            // Broadcast pet unequip to other players in lobby
            socket.to(lobby.id).emit('player:petUnequipped', {
                playerId: player.id
            });
        } catch (error) {
            console.error('Error in player:unequipPet:', error);
        }
    });

    // Handle pet position/state updates
    socket.on('pet:update', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId || !player.activePet) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            // Validate data
            if (typeof data.x !== 'number' || typeof data.y !== 'number') return;

            // Broadcast pet update to other players in lobby
            socket.to(lobby.id).emit('pet:updated', {
                playerId: player.id,
                x: data.x,
                y: data.y,
                state: data.state || 'idle',
                flipX: data.flipX || false
            });
        } catch (error) {
            console.error('Error in pet:update:', error);
        }
    });

    // Handle player attack
    socket.on('player:attack', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'attack')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId || !player.isAlive) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            player.updateActivity();

            lobby.broadcast('player:attacked', {
                playerId: player.id,
                target: data.target,
                damage: data.damage || player.stats.strength,
                position: player.position
            });
        } catch (error) {
            console.error('Error in player:attack:', error);
        }
    });

    // Handle enemy hit
    socket.on('enemy:hit', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const enemy = lobby.gameState.enemies.find(e => e.id === data.enemyId);
            if (!enemy || !enemy.isAlive) {
                // Enemy doesn't exist on server, tell all clients to remove it (fixes desync)
                lobby.broadcast('enemy:despawned', { enemyId: data.enemyId });
                return;
            }

            let baseDamage = data.damage || player.stats.strength;

            // Apply enemy defense reduction using diminishing returns formula
            // Formula: damage * (100 / (100 + defense))
            const defense = enemy.defense || 0;
            const damageMultiplier = 100 / (100 + defense);
            const finalDamage = Math.max(1, Math.floor(baseDamage * damageMultiplier));

            // Debug: Log minion attacks to troubleshoot damage issues
            if (data.attackerId && data.attackerId.includes('minion_')) {
                console.log(`🔮 Minion attack: ${data.attackerId} dealt ${baseDamage} damage (defense: ${defense}, reduced to: ${finalDamage}) to ${data.enemyId} (health: ${enemy.health} -> ${enemy.health - finalDamage})`);
            }

            enemy.health -= finalDamage;
            player.updateActivity();

            // Track damage dealt for stats
            if (player.damageDealt !== undefined) {
                player.damageDealt += finalDamage;
            }

            // Apply effects (bleed, knockback, etc.)
            if (data.effects) {
                if (data.effects.bleed && !data.effects.isBleedDamage) {
                    // Initialize bleed tracking
                    if (!enemy.bleedStacks) {
                        enemy.bleedStacks = 0;
                        enemy.bleedTimers = [];
                    }

                    // Add bleed stack (max 10 stacks)
                    enemy.bleedStacks = Math.min(enemy.bleedStacks + 1, 10);

                    const bleedConfig = data.effects.bleed;

                    // Start bleed damage timer for this stack
                    const bleedInterval = setInterval(() => {
                        if (enemy.isAlive && enemy.bleedStacks > 0) {
                            const bleedDamage = bleedConfig.damagePerStack * enemy.bleedStacks;
                            // Bleed damage bypasses defense (true damage) - makes it effective vs tanks
                            enemy.health -= bleedDamage;

                            // Broadcast bleed damage
                            lobby.broadcast('enemy:damaged', {
                                enemyId: enemy.id,
                                damage: bleedDamage,
                                health: enemy.health,
                                maxHealth: enemy.maxHealth,
                                isBleed: true
                            });

                            // Check if enemy died from bleed
                            if (enemy.health <= 0) {
                                enemy.isAlive = false;
                                lobby.broadcast('enemy:died', {
                                    enemyId: enemy.id,
                                    killerId: player.id,
                                    position: enemy.position
                                });
                                clearInterval(bleedInterval);
                            }
                        } else {
                            clearInterval(bleedInterval);
                        }
                    }, bleedConfig.tickRate);

                    enemy.bleedTimers.push(bleedInterval);

                    // Remove this bleed stack after duration
                    setTimeout(() => {
                        if (enemy.bleedStacks > 0) {
                            enemy.bleedStacks--;
                        }
                        clearInterval(bleedInterval);
                        const index = enemy.bleedTimers.indexOf(bleedInterval);
                        if (index > -1) enemy.bleedTimers.splice(index, 1);
                    }, bleedConfig.duration);
                }
                if (data.effects.knockback && enemy.position) {
                    // Convert pixel positions to tile positions
                    const sourceX = data.effects.knockback.sourceX / 32;
                    const sourceY = data.effects.knockback.sourceY / 32;

                    const dx = enemy.position.x - sourceX;
                    const dy = enemy.position.y - sourceY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    console.log('🌊 Server knockback:', {
                        enemyId: enemy.id,
                        enemyPosBefore: { x: enemy.position.x, y: enemy.position.y },
                        sourcePos: { x: sourceX, y: sourceY },
                        vector: { dx, dy, distance },
                        knockbackTiles: data.effects.knockback.distance / 32
                    });

                    if (distance > 0) {
                        const knockbackTiles = data.effects.knockback.distance / 32;
                        const oldX = enemy.position.x;
                        const oldY = enemy.position.y;

                        enemy.position.x += (dx / distance) * knockbackTiles;
                        enemy.position.y += (dy / distance) * knockbackTiles;

                        console.log('🌊 Enemy knocked back from', { x: oldX, y: oldY }, 'to', { x: enemy.position.x, y: enemy.position.y });

                        // Stun enemy briefly to prevent immediate return movement (same as Bot Aldric)
                        enemy.stunned = true;
                        enemy.stunnedUntil = Date.now() + 500; // 0.5 second stun

                        // Broadcast the knockback position immediately (in tiles, not pixels)
                        lobby.broadcast('enemy:moved', {
                            enemyId: enemy.id,
                            position: {
                                x: enemy.position.x,
                                y: enemy.position.y
                            },
                            bleedStacks: enemy.bleedStacks || 0
                        });
                    }
                }
            }

            // Add aggro for the attacker (could be player or minion)
            const attackerId = data.attackerId || player.id;
            if (!enemy.aggro) enemy.aggro = new Map();
            const currentAggro = enemy.aggro.get(attackerId) || 0;
            enemy.aggro.set(attackerId, currentAggro + finalDamage * 2); // Damage generates 2x aggro

            // If it's a minion attack, track the minion's position
            if (data.attackerId && data.attackerId.includes('minion_') && data.attackerPosition) {
                if (!lobby.gameState.minions) lobby.gameState.minions = new Map();
                lobby.gameState.minions.set(data.attackerId, {
                    id: data.attackerId,
                    position: data.attackerPosition,
                    ownerId: player.id,
                    lastUpdate: Date.now()
                });
            }

            if (enemy.health <= 0) {
                enemy.isAlive = false;
                player.kills++;

                // Track specific enemy types
                if (enemy.type === 'mushroom') {
                    player.mushroomsKilled++;
                }
                if (enemy.isBoss) {
                    player.bossKills++;
                }
                if (enemy.isElite) {
                    player.eliteKills++;
                }

                // Calculate drops based on enemy type
                const drops = calculateEnemyDrops(enemy);

                // XP is now awarded via experience orbs only, not direct kills
                // Spawn XP orb at enemy death location with explosion effect
                const orbId = `orb_${Date.now()}_${Math.random()}`;

                // Random angle and distance for explosion effect (small radius)
                const orbAngle = Math.random() * Math.PI * 2;
                const orbDistance = Math.random() * 30 + 10; // 10-40 pixels
                const orbOffsetX = Math.cos(orbAngle) * orbDistance;
                const orbOffsetY = Math.sin(orbAngle) * orbDistance;

                lobby.gameState.experienceOrbs.set(orbId, {
                    x: enemy.position.x + orbOffsetX,
                    y: enemy.position.y + orbOffsetY,
                    expValue: drops.xp
                });

                lobby.broadcast('enemy:killed', {
                    enemyId: data.enemyId,
                    killedBy: player.id,
                    killerName: player.username,
                    experience: player.experience,
                    level: player.level,
                    position: enemy.position,
                    orbId: orbId,
                    orbValue: drops.xp
                });

                // Drop souls (currency) - amount varies by enemy type
                for (let i = 0; i < drops.souls; i++) {
                    const soulId = uuidv4();
                    // enemy.position is in PIXELS, convert to tiles
                    // Explode souls outward in random directions
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 1.5 + 0.5; // 0.5-2 tiles
                    const scatterX = Math.cos(angle) * distance;
                    const scatterY = Math.sin(angle) * distance;
                    const soulTileX = (enemy.position.x / TILE_SIZE) + scatterX;
                    const soulTileY = (enemy.position.y / TILE_SIZE) + scatterY;

                    lobby.gameState.items.set(soulId, {
                        id: soulId,
                        type: 'soul',
                        color: drops.hasBonus && i >= drops.souls - 3 ? 0xFFD700 : 0x9d00ff, // Gold for bonus souls
                        position: {
                            x: soulTileX,
                            y: soulTileY
                        },
                        spawnedAt: Date.now()
                    });

                    lobby.broadcast('item:spawned', {
                        itemId: soulId,
                        type: 'soul',
                        color: drops.hasBonus && i >= drops.souls - 3 ? 0xFFD700 : 0x9d00ff, // Gold for bonus
                        x: soulTileX,
                        y: soulTileY
                    });
                }

                console.log(`💀 ${enemy.type || 'enemy'} killed → ${drops.xp} XP, ${drops.souls} souls${drops.hasBonus ? ' (BONUS!)' : ''}`);
            } else {
                lobby.broadcast('enemy:damaged', {
                    enemyId: data.enemyId,
                    health: enemy.health,
                    maxHealth: enemy.maxHealth,
                    damage: finalDamage,
                    effects: data.effects
                });
            }
        } catch (error) {
            console.error('Error in enemy:hit:', error);
        }
    });

    // Player hit by enemy projectile (client-side collision detection)
    console.log(`🎮 Registering player:hit handler for socket ${socket.id}`);
    socket.on('player:hit', (data) => {
        console.log(`🎯 SERVER RECEIVED player:hit event:`, data);
        try {
            const targetPlayer = players.get(socket.id);
            if (!targetPlayer || !targetPlayer.lobbyId) {
                console.log(`⚠️ player:hit rejected: no player or lobby (socketId: ${socket.id})`);
                return;
            }

            const lobby = lobbies.get(targetPlayer.lobbyId);
            if (!lobby || lobby.status !== 'active') {
                console.log(`⚠️ player:hit rejected: invalid lobby status`);
                return;
            }

            // Find the player that was hit
            const hitPlayer = Array.from(lobby.players.values()).find(p => p.id === data.playerId);
            if (!hitPlayer || !hitPlayer.isAlive) {
                console.log(`⚠️ player:hit rejected: player not found or dead (playerId: ${data.playerId})`);
                return;
            }

            let baseDamage = data.damage || 10;

            // Check if player is invincible (Bot Aldric has unlimited life)
            if (hitPlayer.isInvincible) {
                console.log(`🛡️ ${hitPlayer.username} is invincible - damage ignored!`);
                return; // No damage, no death, just pure patrol duty
            }

            // Apply defense reduction using diminishing returns formula
            // Formula: damage * (100 / (100 + defense))
            // Examples:
            //   10 def = 9% reduction, 20 def = 17% reduction
            //   50 def = 33% reduction, 100 def = 50% reduction
            const defense = hitPlayer.stats?.defense || 0;
            const damageMultiplier = 100 / (100 + defense);
            const finalDamage = Math.max(1, Math.floor(baseDamage * damageMultiplier));

            console.log(`🔥 Player ${hitPlayer.username} hit by ${data.attackerId} for ${baseDamage} damage (defense: ${defense}, reduced to: ${finalDamage}) (${hitPlayer.health} -> ${hitPlayer.health - finalDamage})`);

            // Apply damage
            hitPlayer.health -= finalDamage;

            // Track damage taken
            if (hitPlayer.damageTaken !== undefined) {
                hitPlayer.damageTaken += finalDamage;
            }

            // Check if player died
            if (hitPlayer.health <= 0) {
                hitPlayer.health = 0;
                hitPlayer.isAlive = false;

                // Respawn after delay
                setTimeout(() => {
                    hitPlayer.isAlive = true;
                    hitPlayer.health = hitPlayer.maxHealth;

                    const worldCenterGrid = lobby.WORLD_SIZE / 2;
                    
                    hitPlayer.position = {
                        x: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2,
                        y: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2
                    };

                    lobby.broadcast('player:died', {
                        playerId: hitPlayer.id,
                        playerName: hitPlayer.username,
                        killedBy: data.attackerId,
                        position: hitPlayer.position
                    });

                    lobby.broadcast('player:respawned', {
                        playerId: hitPlayer.id,
                        playerName: hitPlayer.username,
                        position: hitPlayer.position,
                        health: hitPlayer.health,
                        maxHealth: hitPlayer.maxHealth,
                        level: hitPlayer.level
                    });
                }, 3000);
            } else {
                // Player still alive, broadcast damage
                lobby.broadcast('player:damaged', {
                    playerId: hitPlayer.id,
                    health: hitPlayer.health,
                    maxHealth: hitPlayer.maxHealth,
                    damage: finalDamage,
                    attackerId: data.attackerId
                });
            }
        } catch (error) {
            console.error('❌ Error handling player:hit:', error);
        }
    });

    socket.on('item:pickup', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            // Check if item exists
            const item = lobby.gameState.items.get(data.itemId);
            if (!item) {
                console.log(`⚠️ Item ${data.itemId} not found`);
                return;
            }

            // Remove item from world
            lobby.gameState.items.delete(data.itemId);

            // Handle soul (currency) pickups
            if (item.type === 'soul') {
                const goldValue = 1; // Each soul is worth 1 gold
                player.gold += goldValue;
                player.totalGold += goldValue;
                console.log(`👻 ${player.username} picked up soul (+${goldValue} gold, total: ${player.gold})`);
            } else {
                console.log(`📦 ${player.username} picked up ${item.type}`);
            }

            // Broadcast to all players that item was picked up
            lobby.broadcast('item:picked', {
                itemId: data.itemId,
                playerId: player.id,
                playerName: player.username,
                itemType: item.type,
                itemColor: item.color,
                gold: player.gold // Send updated gold amount
            });
        } catch (error) {
            console.error('Error in item:pickup:', error);
        }
    });

    // Player drops item from inventory (disabled - no inventory system)
    // socket.on('item:drop', (data) => {});

    // Handle minion position updates
    socket.on('minion:position', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            // Update minion position in game state so enemies can target it
            if (!lobby.gameState.minions) lobby.gameState.minions = new Map();

            const existingMinion = lobby.gameState.minions.get(data.minionId);
            const isNew = !existingMinion;
            const now = Date.now();

            // Minimal throttling - broadcast every 16ms (60fps) OR any movement
            // Ultra-smooth multiplayer movement
            let shouldBroadcast = isNew;
            if (!isNew && existingMinion) {
                const timeSinceLastBroadcast = now - (existingMinion.lastBroadcast || 0);
                const dx = Math.abs(data.position.x - existingMinion.position.x);
                const dy = Math.abs(data.position.y - existingMinion.position.y);
                const anyMovement = dx > 0 || dy > 0;

                shouldBroadcast = timeSinceLastBroadcast >= 16 || anyMovement;
            }

            // Convert grid coordinates to pixel coordinates (client sends grid, server uses pixels)
            // Center on the tile by adding TILE_SIZE/2
            const pixelPosition = {
                x: data.position.x * TILE_SIZE + TILE_SIZE / 2,
                y: data.position.y * TILE_SIZE + TILE_SIZE / 2
            };

            lobby.gameState.minions.set(data.minionId, {
                id: data.minionId,
                position: pixelPosition,
                ownerId: player.id,
                isPermanent: data.isPermanent || false,
                animationState: data.animationState || 'minion_idle',
                flipX: data.flipX || false,
                lastUpdate: now,
                lastBroadcast: shouldBroadcast ? now : (existingMinion?.lastBroadcast || now)
            });

            // If this is a new minion, broadcast spawn event to other players
            if (isNew) {
                socket.to(lobby.id).emit('minion:spawned', {
                    minionId: data.minionId,
                    position: pixelPosition,
                    ownerId: player.id,
                    isPermanent: data.isPermanent || false,
                    animationState: data.animationState || 'minion_idle',
                    flipX: data.flipX || false
                });
                console.log(`🔮 Broadcasted minion spawn: ${data.minionId} for ${player.username}`);
            } else if (shouldBroadcast) {
                // For existing minions, broadcast position update to other players (throttled)
                socket.to(lobby.id).emit('minion:moved', {
                    minionId: data.minionId,
                    position: pixelPosition,
                    ownerId: player.id,
                    animationState: data.animationState || 'minion_idle',
                    flipX: data.flipX || false
                });
                console.log(`🚶 Broadcasted minion move: ${data.minionId} to (${pixelPosition.x}, ${pixelPosition.y})`);
            }
        } catch (error) {
            console.error('Error in minion:position:', error);
        }
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
        try {
            if (!checkRateLimit(socket.id, 'chat')) return;

            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const message = sanitizeMessage(data.message);
            if (!message) return;

            player.updateActivity();

            lobby.broadcast('chat:message', {
                playerId: player.id,
                username: player.username,
                message: message,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error in chat:message:', error);
        }
    });

    // Handle player death
    socket.on('player:death', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            player.isAlive = false;
            player.deaths++;

            console.log(`💀 ${player.username} died - resetting to level 1`);

            // FULL RESET - Roguelike death penalty
            player.level = 1;
            player.experience = 0;
            player.selectedSkills = [];
            // Keep permanent minions so they can be restored on respawn
            // player.permanentMinions = [];

            // Reset stats to class defaults
            player.stats = player.getClassStats(player.class);
            player.health = player.maxHealth;

            // Reset all multipliers
            player.initializeMultipliers();

            // Delete all minions owned by this player from the game state
            if (lobby.gameState && lobby.gameState.minions) {
                const minionsToDelete = [];
                lobby.gameState.minions.forEach((minion, minionId) => {
                    if (minion.ownerId === player.id) {
                        minionsToDelete.push(minionId);
                    }
                });

                minionsToDelete.forEach(minionId => {
                    console.log(`💀 Deleting minion ${minionId} (owner died)`);
                    lobby.gameState.minions.delete(minionId);

                    // Broadcast minion death to all clients
                    lobby.broadcast('minion:died', {
                        minionId: minionId,
                        ownerId: player.id
                    });
                });
            }

            // Respawn at spawn point (center of world) in PIXEL coordinates

            const worldCenterGrid = Math.floor(lobby.WORLD_SIZE / 2);
            player.position = {
                x: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2,
                y: worldCenterGrid * TILE_SIZE + TILE_SIZE / 2
            };

            console.log(`♻️ ${player.username} reset: Level ${player.level}, Health ${player.health}/${player.maxHealth}`);

            lobby.broadcast('player:died', {
                playerId: player.id,
                playerName: player.username,
                killedBy: data.killedBy,
                position: player.position
            });

            // After death animation, send respawn data
            setTimeout(() => {
                player.isAlive = true;
                socket.emit('player:respawned', {
                    ...player.toJSON(),
                    respawnPosition: player.position
                });

                lobby.broadcast('player:respawned', {
                    playerId: player.id,
                    playerName: player.username,
                    position: player.position,
                    health: player.health,
                    maxHealth: player.maxHealth,
                    level: player.level
                });
            }, 3000); // 3 second death delay
        } catch (error) {
            console.error('Error in player:death:', error);
        }
    });

    // Handle player healing (health potions, Malachar healing, etc.)
    socket.on('player:healed', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            // Update player's health on server
            player.health = Math.min(data.health, player.maxHealth);

            console.log(`💚 ${player.username} healed: ${player.health}/${player.maxHealth}`);

            // Broadcast healing to all players in lobby
            lobby.broadcast('player:healed', {
                playerId: player.id,
                health: player.health
            });
        } catch (error) {
            console.error('Error in player:healed:', error);
        }
    });

    // Handle skill selection
    socket.on('skill:selected', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const { skill, multipliers } = data;

            // Validate skill data
            if (!skill || !skill.id) {
                console.error('Invalid skill data received');
                return;
            }

            // Add skill to player's skill list
            player.selectedSkills.push(skill);

            // Update multipliers from client
            if (multipliers) {
                Object.keys(multipliers).forEach(key => {
                    if (player.hasOwnProperty(key)) {
                        player[key] = multipliers[key];
                    }
                });
            }

            console.log(`✨ ${player.username} selected skill: ${skill.name}`);

            // Broadcast updated player data
            lobby.broadcast('player:skillUpdate', {
                playerId: player.id,
                skill: skill,
                multipliers: multipliers
            });
        } catch (error) {
            console.error('Error in skill:selected:', error);
        }
    });

    // Handle skill sound events
    socket.on('skill:sound', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const { soundKey, position } = data;

            // Broadcast to all other players in the lobby
            socket.to(lobby.id).emit('skill:sound', {
                playerId: player.id,
                soundKey: soundKey,
                position: position
            });
        } catch (error) {
            console.error('Error in skill:sound:', error);
        }
    });

    // Track permanent minions
    socket.on('minion:permanent', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const { minionId, action } = data;

            if (action === 'add') {
                if (!player.permanentMinions.includes(minionId)) {
                    player.permanentMinions.push(minionId);
                    console.log(`👹 ${player.username} gained permanent minion: ${minionId}`);
                }
            } else if (action === 'remove') {
                const index = player.permanentMinions.indexOf(minionId);
                if (index > -1) {
                    player.permanentMinions.splice(index, 1);
                    console.log(`💀 ${player.username} lost permanent minion: ${minionId}`);
                }
            }
        } catch (error) {
            console.error('Error in minion:permanent:', error);
        }
    });

    // Handle Malachar healing minions
    socket.on('minion:heal', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { minionId, healAmount, position } = data;

            // Broadcast heal effect to all players
            lobby.broadcast('minion:healed', {
                minionId: minionId,
                healAmount: healAmount,
                playerId: player.id,
                position: position
            });

            console.log(`💚 ${player.username} healed minion ${minionId} for ${healAmount} HP`);
        } catch (error) {
            console.error('Error in minion:heal:', error);
        }
    });

    // Handle minion spawn requests (server-authoritative)
    socket.on('minion:requestSpawn', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby || lobby.status !== 'active') return;

            const { position, isPermanent, minionId } = data;

            // Convert grid coordinates to pixel coordinates (client sends grid, server uses pixels)
            // Center on the tile by adding TILE_SIZE/2
            const pixelPosition = {
                x: position.x * TILE_SIZE + TILE_SIZE / 2,
                y: position.y * TILE_SIZE + TILE_SIZE / 2
            };

            // Check permanent minion cap for this specific player
            if (isPermanent) {
                const currentPermanentCount = player.permanentMinions.length;
                const minionCap = player.minionCap || 5; // Default cap is 5

                console.log(`🔮 Minion spawn check: ${player.username} has ${currentPermanentCount}/${minionCap} permanent minions, requesting: ${minionId}, already tracked: ${player.permanentMinions.includes(minionId)}`);

                if (currentPermanentCount >= minionCap && !player.permanentMinions.includes(minionId)) {
                    console.log(`⛔ ${player.username} hit permanent minion cap (${currentPermanentCount}/${minionCap}) - REJECTING spawn of ${minionId}`);
                    return; // Reject spawn
                }
            }

            // Add to permanent minions tracking
            if (isPermanent && !player.permanentMinions.includes(minionId)) {
                player.permanentMinions.push(minionId);
            }

            // Add to game state
            lobby.gameState.minions.set(minionId, {
                id: minionId,
                position: pixelPosition,
                ownerId: player.id,
                isPermanent: isPermanent || false,
                lastUpdate: Date.now(),
                spawnTime: Date.now() // Track spawn time for invulnerability
            });

            // Broadcast spawn to ALL players in lobby (including requester)
            const spawnData = {
                minionId: minionId,
                position: pixelPosition,
                ownerId: player.id,
                isPermanent: isPermanent || false
            };

            console.log(`📡 SERVER: Broadcasting minion:spawned to ${lobby.players.size} players:`, spawnData);
            lobby.broadcast('minion:spawned', spawnData);

            console.log(`🔮 ${player.username} spawned minion ${minionId} (permanent: ${isPermanent}) [${player.permanentMinions.length}/${player.minionCap || 5}]`);
        } catch (error) {
            console.error('Error in minion:requestSpawn:', error);
        }
    });

    // Handle minion death
    socket.on('minion:death', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player || !player.lobbyId) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const { minionId, isPermanent } = data;

            // Remove from server state
            if (lobby.gameState.minions) {
                lobby.gameState.minions.delete(minionId);
            }

            // DO NOT remove permanent minions from the list when they die
            // This prevents the infinite death/respawn loop
            // Permanent minions should only be removed when:
            // 1. Player dies (full reset)
            // 2. Player manually dismisses them
            // They should NOT auto-respawn after dying in combat

            // Broadcast death to all players
            lobby.broadcast('minion:died', {
                minionId: minionId,
                ownerId: player.id
            });

            console.log(`💀 ${player.username}'s minion ${minionId} died (permanent: ${isPermanent})`);
        } catch (error) {
            console.error('Error in minion:death:', error);
        }
    });

    // Request skill restoration (on reconnect/respawn)
    socket.on('skills:requestRestore', () => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            // Send all player data including skills and multipliers
            socket.emit('skills:restored', player.toJSON());
        } catch (error) {
            console.error('Error in skills:requestRestore:', error);
        }
    });

    // Handle passive skill purchases (Chad's Shield, etc.)
    socket.on('passiveSkill:purchased', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            const { skillId } = data;

            // Store passive skill in player data
            if (!player.passiveSkills) {
                player.passiveSkills = [];
            }
            if (!player.passiveSkills.includes(skillId)) {
                player.passiveSkills.push(skillId);
            }

            // Apply passive skill effects
            if (skillId === 'orbital_shield') {
                // Chad's Shield grants 50 shield points
                player.shield = (player.shield || 0) + 50;
                console.log(`🛡️ ${player.username} purchased Chad's Shield - Shield: ${player.shield}`);
            } else if (skillId === 'fireball_rain') {
                // Meteor Storm - passive effect (no immediate stat changes, handled client-side)
                console.log(`🔥 ${player.username} purchased Meteor Storm`);
            } else if (skillId === 'damage_aura') {
                // Burning Aura - passive effect (no immediate stat changes, handled client-side)
                console.log(`🔥 ${player.username} purchased Burning Aura`);
            } else if (skillId === 'piercing_fireball') {
                // Piercing Inferno - passive effect (no immediate stat changes, handled client-side)
                console.log(`🔥 ${player.username} purchased Piercing Inferno`);
            }

            console.log(`🛡️ ${player.username} purchased passive skill: ${skillId}`);
            console.log(`   Player passiveSkills array:`, player.passiveSkills);
            console.log(`   Broadcasting to ${lobby.players.size} players in lobby`);

            // Broadcast to all players in the lobby (includes updated shield value via player.toJSON())
            lobby.broadcast('passiveSkill:activated', {
                playerId: player.id,
                skillId: skillId,
                playerData: player.toJSON() // Include full player data so other clients can see shield
            });

            console.log(`   ✅ Broadcast complete for passiveSkill:activated`);
        } catch (error) {
            console.error('Error in passiveSkill:purchased:', error);
        }
    });

    // Handle Piercing Fireball cast (broadcast to other players for animation)
    socket.on('piercingFireball:cast', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            console.log(`🔥 ${player.username} cast Piercing Fireball, broadcasting to other players`);

            // Broadcast to all players in lobby (including sender, they'll filter it out)
            lobby.broadcast('piercingFireball:cast', {
                playerId: player.id,
                startX: data.startX,
                startY: data.startY,
                targetX: data.targetX,
                targetY: data.targetY
            });
        } catch (error) {
            console.error('Error in piercingFireball:cast:', error);
        }
    });

    // Handle Bastion attack (broadcast to other players for visual/audio sync)
    socket.on('bastion:attack', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            console.log(`🔫 ${player.username} fired Bastion ${data.stance} (${data.isManual ? 'manual' : 'auto'})`);

            // Broadcast to all players in lobby (including sender, they'll filter it out)
            lobby.broadcast('bastion:attack', {
                playerId: player.id,
                stance: data.stance,
                angle: data.angle,
                position: data.position,
                isManual: data.isManual
            });
        } catch (error) {
            console.error('Error in bastion:attack:', error);
        }
    });

    // Handle Malachar ability usage
    socket.on('ability:use', (data) => {
        try {
            const player = players.get(socket.id);
            if (!player) return;

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) return;

            // Track ability usage
            player.abilitiesUsed++;

            // Debug logging
            console.log(`📥 Received ability:use data:`, JSON.stringify(data, null, 2));

            // Handle Titan's Fury server-side damage calculation
            if (data.effects && data.effects.type === 'war_cry_slam') {
                console.log(`🔥 ${player.username} used Titan's Fury - Server calculating damage`);

                const slamCount = data.effects.slamCount || 3;
                const slamInterval = data.effects.slamInterval || 800;
                const slamRadius = data.effects.slamRadius || 250;
                const warCryDelay = 500;
                const playerPos = { x: data.effects.position.x, y: data.effects.position.y };

                // Schedule each slam's damage calculation
                for (let i = 0; i < slamCount; i++) {
                    setTimeout(() => {
                        const slamDamage = (data.effects.damagePerSlam || 80) + (player.level * 20);
                        console.log(`💥 Titan's Fury slam ${i + 1}/${slamCount} - Damage: ${slamDamage}`);

                        // Find and damage all enemies in range
                        let hitCount = 0;
                        console.log(`   🔍 Checking ${lobby.gameState.enemies.size} enemies in lobby`);
                        console.log(`   📍 Player position: (${playerPos.x}, ${playerPos.y}), Radius: ${slamRadius}`);

                        lobby.gameState.enemies.forEach(enemy => {
                            if (!enemy.isAlive) return;

                            const dx = (enemy.position.x - playerPos.x);
                            const dy = (enemy.position.y - playerPos.y);
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance <= slamRadius) {
                                enemy.health -= slamDamage;
                                hitCount++;

                                if (enemy.health <= 0) {
                                    enemy.health = 0;
                                    enemy.isAlive = false;
                                    player.kills++;

                                    // Spawn XP orb
                                    const orbId = `orb_${Date.now()}_${Math.random()}`;
                                    const orbValue = 1;
                                    lobby.gameState.experienceOrbs.set(orbId, {
                                        x: enemy.position.x,
                                        y: enemy.position.y,
                                        expValue: orbValue
                                    });

                                    // Broadcast enemy death
                                    lobby.broadcast('enemy:killed', {
                                        enemyId: enemy.id,
                                        killedBy: socket.id,
                                        killerName: player.username,
                                        position: enemy.position,
                                        orbId: orbId,
                                        orbValue: orbValue
                                    });
                                } else {
                                    // Broadcast damage
                                    lobby.broadcast('enemy:damaged', {
                                        enemyId: enemy.id,
                                        damage: slamDamage,
                                        attackerId: socket.id
                                    });
                                }
                            }
                        });

                        console.log(`   💥 Slam ${i + 1} hit ${hitCount} enemies`);
                    }, warCryDelay + (slamInterval * i));
                }
            }

            // Handle Lunare's Shadow Vortex server-side pull effect
            if (data.effects && data.effects.type === 'lunare_vortex') {
                console.log(`🌀 ${player.username} used Shadow Vortex - Server tracking pull effect`);

                const vortexId = `vortex_${Date.now()}_${Math.random()}`;
                const vortexX = data.effects.vortexPosition.x;
                const vortexY = data.effects.vortexPosition.y;
                const pullRadius = data.effects.pullRadius || 250;
                const pullStrength = data.effects.pullStrength || 300;
                const holdDuration = data.effects.holdDuration || 3000;
                const outwardTime = (data.effects.range / 250) * 1000; // Calculate travel time

                console.log(`   🌀 Vortex at (${vortexX.toFixed(0)}, ${vortexY.toFixed(0)}), radius: ${pullRadius}px, pull: ${pullStrength}px/s`);

                // Start pull effect after boomerang reaches vortex position
                setTimeout(() => {
                    const expiresAt = Date.now() + holdDuration;
                    lobby.gameState.vortexes.set(vortexId, {
                        x: vortexX,
                        y: vortexY,
                        pullRadius: pullRadius,
                        pullStrength: pullStrength / 60, // Convert to per-frame (60fps)
                        expiresAt: expiresAt
                    });
                    console.log(`   🌀 Vortex ${vortexId} now active for ${holdDuration}ms`);

                    // Explosion damage right before vortex expires
                    setTimeout(() => {
                        const explosionDamage = 30 + (player.level * 5); // 30 base + 5 per level
                        let hitCount = 0;
                        console.log(`💥 Vortex explosion at (${vortexX.toFixed(0)}, ${vortexY.toFixed(0)}) - Damage: ${explosionDamage}, Radius: ${pullRadius}px`);

                        lobby.gameState.enemies.forEach(enemy => {
                            if (!enemy.isAlive) return;

                            const dx = enemy.position.x - vortexX;
                            const dy = enemy.position.y - vortexY;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance <= pullRadius) {
                                enemy.health -= explosionDamage;
                                hitCount++;

                                if (enemy.health <= 0) {
                                    enemy.health = 0;
                                    enemy.isAlive = false;
                                    player.kills++;

                                    // Spawn XP orb
                                    const orbId = `orb_${Date.now()}_${Math.random()}`;
                                    const orbValue = 1;
                                    lobby.gameState.experienceOrbs.set(orbId, {
                                        x: enemy.position.x,
                                        y: enemy.position.y,
                                        expValue: orbValue
                                    });

                                    // Broadcast enemy death
                                    lobby.broadcast('enemy:killed', {
                                        enemyId: enemy.id,
                                        killedBy: socket.id,
                                        killerName: player.username,
                                        position: enemy.position,
                                        orbId: orbId,
                                        orbValue: orbValue
                                    });
                                } else {
                                    // Broadcast damage
                                    lobby.broadcast('enemy:damaged', {
                                        enemyId: enemy.id,
                                        damage: explosionDamage,
                                        attackerId: socket.id
                                    });
                                }
                            }
                        });

                        console.log(`   💥 Vortex explosion hit ${hitCount} enemies`);

                        // Broadcast explosion effect to all clients
                        lobby.broadcast('vortex:explode', {
                            vortexId: vortexId,
                            position: { x: vortexX, y: vortexY },
                            radius: pullRadius,
                            playerId: socket.id
                        });
                    }, holdDuration - 100); // Explode 100ms before removal

                    // Remove vortex after hold duration
                    setTimeout(() => {
                        lobby.gameState.vortexes.delete(vortexId);
                        console.log(`   🌀 Vortex ${vortexId} expired and removed`);
                    }, holdDuration);
                }, outwardTime);
            }

            if (data.targetMinionId) {
                console.log(`✨ ${player.username} used ${data.abilityName} on minion ${data.targetMinionId}`);
            } else {
                console.log(`✨ ${player.username} used ${data.abilityName} on player ${data.targetPlayerId}`);
            }
            console.log(`   Lobby has ${lobby.players.length} players`);

            // Broadcast to all players in lobby (including the caster for confirmation)
            let sentCount = 0;
            lobby.players.forEach(p => {
                // Skip bots - they don't have sockets
                if (p.isBot) return;

                const targetSocket = io.sockets.sockets.get(p.id);
                console.log(`   → Sending to ${p.username} (${p.id}): ${targetSocket ? 'SUCCESS' : 'FAILED - Socket not found'}`);
                if (targetSocket) {
                    targetSocket.emit('ability:used', {
                        playerId: socket.id,
                        playerName: player.username,
                        abilityKey: data.abilityKey,
                        abilityName: data.abilityName,
                        targetPlayerId: data.targetPlayerId,
                        targetMinionId: data.targetMinionId, // For auto-attacks targeting minions
                        effects: data.effects
                    });
                    sentCount++;
                }
            });
            const realPlayerCount = Array.from(lobby.players.values()).filter(p => !p.isBot).length;
            console.log(`   📤 Broadcast sent to ${sentCount}/${realPlayerCount} real players`);
        } catch (error) {
            console.error('Error in ability:use:', error);
        }
    });

    // Handle orb collection
    socket.on('orb:collect', (data) => {
        try {
            console.log(`🔔 SERVER RECEIVED orb:collect from ${socket.id}:`, data);

            const player = players.get(socket.id);
            if (!player) {
                console.warn(`   ❌ Player not found for socket ${socket.id}`);
                return;
            }

            const lobby = lobbies.get(player.lobbyId);
            if (!lobby) {
                console.warn(`   ❌ Lobby not found for player ${player.username}`);
                return;
            }

            console.log(`💎 ${player.username} collected orb ${data.orbId} (${data.expValue} XP)`);

            // Add currency to player (souls earned from killing enemies)
            if (player.currency === null || player.currency === undefined) {
                player.currency = 0;
            }
            player.currency += data.expValue;
            console.log(`   💰 ${player.username} currency: ${player.currency} (+${data.expValue})`);

            // Broadcast currency update to the player
            lobby.broadcast('player:update', {
                id: socket.id,
                currency: player.currency
            });

            // Broadcast to only nearby players (within ~400 pixels / about half a screen)
            const SOUND_RANGE = 400; // Reduced from full lobby to only nearby players
            let sentCount = 0;
            lobby.players.forEach(p => {
                // Calculate distance between collector and this player
                const dx = p.position.x - data.collectorX;
                const dy = p.position.y - data.collectorY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Only send to players within sound range
                if (distance <= SOUND_RANGE) {
                    const targetSocket = io.sockets.sockets.get(p.id);
                    if (targetSocket) {
                        console.log(`   📤 Sending orb:collected to ${p.username} (${distance.toFixed(0)}px away)`);
                        targetSocket.emit('orb:collected', {
                            orbId: data.orbId,
                            expValue: data.expValue,
                            collectorId: socket.id,
                            collectorName: player.username,
                            collectorX: data.collectorX,
                            collectorY: data.collectorY
                        });
                        sentCount++;
                    }
                }
            });
            console.log(`   ✅ Broadcast sent to ${sentCount} nearby players (within ${SOUND_RANGE}px)`);
        } catch (error) {
            console.error('Error in orb:collect:', error);
        }
    });

    // Bank system handlers
    socket.on('bank:getData', async (data) => {
        try {
            const { token } = data;
            let userId = null;

            // Try to get userId from player (in-game)
            const player = players.get(socket.id);
            if (player && player.userId) {
                userId = player.userId;
                console.log(`💰 bank:getData - Using player userId: ${userId} (${player.username})`);
            }
            // Fall back to token verification (character select)
            else if (token) {
                const authResult = auth.verifyToken(token);
                if (authResult.success) {
                    userId = authResult.userId;
                    console.log(`💰 bank:getData - Using token userId: ${userId} (${authResult.username})`);
                } else {
                    console.log(`⚠️ bank:getData - Invalid token`);
                    socket.emit('bank:error', { error: 'Invalid token' });
                    return;
                }
            }

            if (!userId) {
                socket.emit('bank:error', { error: 'Not logged in' });
                return;
            }

            // Get user's banked souls and unlocked characters from database
            const result = await auth.pool.query(
                'SELECT banked_souls, unlocked_characters FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                socket.emit('bank:error', { error: 'User not found' });
                return;
            }

            const bankedSouls = result.rows[0].banked_souls || 0;
            const unlockedCharacters = result.rows[0].unlocked_characters || [];
            socket.emit('bank:data', { bankedSouls, unlockedCharacters });
            console.log(`💰 Sent bank data to user ${userId}: ${bankedSouls} souls, ${unlockedCharacters.length} unlocked characters`);
        } catch (error) {
            console.error('Error in bank:getData:', error);
            socket.emit('bank:error', { error: 'Server error' });
        }
    });

    socket.on('bank:deposit', async (data) => {
        try {
            const { amount, token } = data;
            let userId = null;

            // Try to get userId from player (in-game)
            const player = players.get(socket.id);
            if (player && player.userId) {
                userId = player.userId;
            }
            // Fall back to token verification (character select)
            else if (token) {
                const authResult = auth.verifyToken(token);
                if (authResult.success) {
                    userId = authResult.userId;
                } else {
                    socket.emit('bank:error', { error: 'Invalid token' });
                    return;
                }
            }

            if (!userId) {
                socket.emit('bank:error', { error: 'Not logged in' });
                return;
            }

            if (amount <= 0) {
                socket.emit('bank:error', { error: 'Invalid amount' });
                return;
            }

            // Update banked souls in database
            const result = await auth.pool.query(
                'UPDATE users SET banked_souls = COALESCE(banked_souls, 0) + $1 WHERE id = $2 RETURNING banked_souls',
                [amount, userId]
            );

            if (result.rows.length === 0) {
                socket.emit('bank:error', { error: 'User not found' });
                return;
            }

            const bankedSouls = result.rows[0].banked_souls;
            socket.emit('bank:depositConfirm', { bankedSouls, amount });
            console.log(`💰 User ${userId} deposited ${amount} souls. New balance: ${bankedSouls}`);
        } catch (error) {
            console.error('Error in bank:deposit:', error);
            socket.emit('bank:error', { error: 'Server error' });
        }
    });

    socket.on('bank:withdraw', async (data) => {
        try {
            const { amount, token } = data;
            let userId = null;

            // Try to get userId from player (in-game)
            const player = players.get(socket.id);
            if (player && player.userId) {
                userId = player.userId;
            }
            // Fall back to token verification (character select)
            else if (token) {
                const authResult = auth.verifyToken(token);
                if (authResult.success) {
                    userId = authResult.userId;
                } else {
                    socket.emit('bank:error', { error: 'Invalid token' });
                    return;
                }
            }

            if (!userId) {
                socket.emit('bank:error', { error: 'Not logged in' });
                return;
            }

            if (amount <= 0) {
                socket.emit('bank:error', { error: 'Invalid amount' });
                return;
            }

            // Check if user has enough banked souls
            const checkResult = await auth.pool.query(
                'SELECT banked_souls FROM users WHERE id = $1',
                [userId]
            );

            if (checkResult.rows.length === 0) {
                socket.emit('bank:error', { error: 'User not found' });
                return;
            }

            const currentBanked = checkResult.rows[0].banked_souls || 0;
            if (currentBanked < amount) {
                socket.emit('bank:error', { error: 'Not enough banked souls' });
                return;
            }

            // Update banked souls in database
            const result = await auth.pool.query(
                'UPDATE users SET banked_souls = banked_souls - $1 WHERE id = $2 RETURNING banked_souls',
                [amount, userId]
            );

            const bankedSouls = result.rows[0].banked_souls;
            socket.emit('bank:withdrawConfirm', { bankedSouls, amount });
            console.log(`💰 User ${userId} withdrew ${amount} souls. New balance: ${bankedSouls}`);
        } catch (error) {
            console.error('Error in bank:withdraw:', error);
            socket.emit('bank:error', { error: 'Server error' });
        }
    });

    // Pet Storage system handlers
    socket.on('petStorage:getData', async (data) => {
        try {
            let userId = null;

            // Try to get userId from player (in-game)
            const player = players.get(socket.id);
            if (player && player.userId) {
                userId = player.userId;
                console.log(`🐾 petStorage:getData - Using player userId: ${userId} (${player.username})`);
            }

            if (!userId) {
                socket.emit('petStorage:error', { error: 'Not logged in' });
                return;
            }

            // Get user's stored pets from database
            const result = await auth.pool.query(
                'SELECT stored_pets, current_pet FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                socket.emit('petStorage:error', { error: 'User not found' });
                return;
            }

            const storedPets = result.rows[0].stored_pets || [];
            const currentPet = result.rows[0].current_pet || null;
            socket.emit('petStorage:data', { storedPets, currentPet });
            console.log(`🐾 Sent pet storage data to user ${userId}: ${storedPets.length} stored pets, current: ${currentPet}`);
        } catch (error) {
            console.error('Error in petStorage:getData:', error);
            socket.emit('petStorage:error', { error: 'Server error' });
        }
    });

    socket.on('petStorage:deposit', async (data) => {
        try {
            const { petId } = data;
            let userId = null;

            // Try to get userId from player (in-game)
            const player = players.get(socket.id);
            if (player && player.userId) {
                userId = player.userId;
            }

            if (!userId) {
                socket.emit('petStorage:error', { error: 'Not logged in' });
                return;
            }

            if (!petId) {
                socket.emit('petStorage:error', { error: 'Invalid pet ID' });
                return;
            }

            // Add pet to stored_pets array and clear current_pet
            const result = await auth.pool.query(
                `UPDATE users
                 SET stored_pets = array_append(COALESCE(stored_pets, ARRAY[]::text[]), $1),
                     current_pet = NULL
                 WHERE id = $2
                 RETURNING stored_pets, current_pet`,
                [petId, userId]
            );

            if (result.rows.length === 0) {
                socket.emit('petStorage:error', { error: 'User not found' });
                return;
            }

            const storedPets = result.rows[0].stored_pets;
            const currentPet = result.rows[0].current_pet;

            socket.emit('petStorage:depositConfirm', { storedPets, currentPet });
            console.log(`🐾 User ${userId} deposited pet ${petId}. Total stored: ${storedPets.length}`);
        } catch (error) {
            console.error('Error in petStorage:deposit:', error);
            socket.emit('petStorage:error', { error: 'Server error' });
        }
    });

    socket.on('petStorage:withdraw', async (data) => {
        try {
            const { petId } = data;
            let userId = null;

            // Try to get userId from player (in-game)
            const player = players.get(socket.id);
            if (player && player.userId) {
                userId = player.userId;
            }

            if (!userId) {
                socket.emit('petStorage:error', { error: 'Not logged in' });
                return;
            }

            if (!petId) {
                socket.emit('petStorage:error', { error: 'Invalid pet ID' });
                return;
            }

            // Remove ONLY FIRST occurrence of pet from stored_pets array and set as current_pet
            // array_remove removes ALL occurrences, so we need custom logic to remove just one
            const result = await auth.pool.query(
                `UPDATE users
                 SET stored_pets = (
                     CASE
                         WHEN COALESCE(stored_pets, ARRAY[]::text[]) = ARRAY[]::text[] THEN ARRAY[]::text[]
                         WHEN stored_pets @> ARRAY[$1]::text[] THEN
                             stored_pets[1:(array_position(stored_pets, $1) - 1)] ||
                             stored_pets[(array_position(stored_pets, $1) + 1):array_length(stored_pets, 1)]
                         ELSE stored_pets
                     END
                 ),
                 current_pet = $1
                 WHERE id = $2
                 RETURNING stored_pets, current_pet`,
                [petId, userId]
            );

            if (result.rows.length === 0) {
                socket.emit('petStorage:error', { error: 'User not found' });
                return;
            }

            const storedPets = result.rows[0].stored_pets;
            const currentPet = result.rows[0].current_pet;

            socket.emit('petStorage:withdrawConfirm', { storedPets, currentPet });
            console.log(`🐾 User ${userId} withdrew pet ${petId}. Remaining stored: ${storedPets.length}`);
        } catch (error) {
            console.error('Error in petStorage:withdraw:', error);
            socket.emit('petStorage:error', { error: 'Server error' });
        }
    });

    // Character unlock purchase
    socket.on('character:unlock', async (data) => {
        try {
            const { characterId, soulCost, token } = data;
            if (!token) {
                socket.emit('character:unlock:error', { message: 'Not logged in' });
                return;
            }

            // Verify token and get user
            const authResult = auth.verifyToken(token);
            if (!authResult.success) {
                socket.emit('character:unlock:error', { message: 'Invalid token' });
                return;
            }

            // Get user's current data
            const userResult = await auth.pool.query(
                'SELECT banked_souls, unlocked_characters FROM users WHERE id = $1',
                [authResult.userId]
            );

            if (userResult.rows.length === 0) {
                socket.emit('character:unlock:error', { message: 'User not found' });
                return;
            }

            const user = userResult.rows[0];
            const bankedSouls = user.banked_souls || 0;
            const unlockedCharacters = user.unlocked_characters || [];

            // Check if character is already unlocked
            if (unlockedCharacters.includes(characterId)) {
                socket.emit('character:unlock:error', { message: 'Character already unlocked' });
                return;
            }

            // Check if user has enough souls
            if (bankedSouls < soulCost) {
                socket.emit('character:unlock:error', {
                    message: `Not enough souls. Need ${soulCost}, have ${bankedSouls}`
                });
                return;
            }

            // Unlock the character and deduct souls
            const newUnlockedCharacters = [...unlockedCharacters, characterId];
            const newBankedSouls = bankedSouls - soulCost;

            await auth.pool.query(
                'UPDATE users SET unlocked_characters = $1, banked_souls = $2 WHERE id = $3',
                [JSON.stringify(newUnlockedCharacters), newBankedSouls, authResult.userId]
            );

            socket.emit('character:unlocked', {
                success: true,
                characterId,
                bankedSouls: newBankedSouls,
                unlockedCharacters: newUnlockedCharacters
            });

            console.log(`🎉 User ${authResult.userId} unlocked ${characterId} for ${soulCost} souls. Remaining: ${newBankedSouls}`);
        } catch (error) {
            console.error('Error in character:unlock:', error);
            socket.emit('character:unlock:error', { message: 'Server error' });
        }
    });

    // ===============================
    // BLACKJACK NETWORK EVENTS
    // ===============================

    // Player opens blackjack UI - becomes spectator
    socket.on('blackjack:join', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        // Add as spectator
        lobby.blackjackTable.addSpectator(socket.id);

        // Send current game state
        socket.emit('blackjack:state', lobby.blackjackTable.getGameState());

        console.log(`🃏 Player ${player.username} is spectating blackjack table`);
    });

    // Player wants to join next round
    socket.on('blackjack:join_next', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;

        // Try to join (max 6 players)
        const success = table.joinNextRound(socket.id);

        if (!success) {
            // Table is full
            socket.emit('blackjack:error', {
                message: 'Table is full! Maximum 6 players. You can spectate.'
            });
            console.log(`🃏 Player ${player.username} couldn't join - table full (spectating)`);
            return;
        }

        // Remove from spectators, add to players
        table.removeSpectator(socket.id);

        socket.emit('blackjack:joined_next_round', {
            message: 'You will join when the next round starts. Place your bet!'
        });

        // Broadcast updated state to all players/spectators
        table.broadcast('blackjack:state', table.getGameState());

        console.log(`🃏 Player ${player.username} will join next blackjack round`);
    });

    // Player places a bet
    socket.on('blackjack:bet', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;
        const betAmount = parseInt(data.amount);

        // Validate bet amount
        if (!betAmount || betAmount < 1) {
            socket.emit('blackjack:error', { message: 'Invalid bet amount' });
            return;
        }

        // Initialize currency to 0 if undefined
        if (player.currency === null || player.currency === undefined) {
            player.currency = 0;
        }

        // Check if player has enough currency (earned from killing enemies)
        if (player.currency < betAmount) {
            socket.emit('blackjack:error', {
                message: `Not enough souls! You have ${player.currency}, need ${betAmount}`
            });
            return;
        }

        // Place bet at the table
        const success = table.placeBet(socket.id, betAmount);

        if (success) {
            // Deduct currency from player
            player.currency -= betAmount;

            // Broadcast currency update
            lobby.broadcast('player:update', {
                id: socket.id,
                currency: player.currency
            });

            socket.emit('blackjack:bet_placed', {
                amount: betAmount,
                remainingSouls: player.currency
            });

            // Broadcast updated state to all players/spectators
            table.broadcast('blackjack:state', table.getGameState());

            console.log(`🃏 Player ${player.username} bet ${betAmount} souls on blackjack`);
        } else {
            socket.emit('blackjack:error', { message: 'Could not place bet (already bet or round in progress)' });
        }
    });

    // Player hits (requests another card)
    socket.on('blackjack:hit', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;
        table.playerHit(socket.id);
        console.log(`🃏 Player ${player.username} hit`);
    });

    // Player stands (ends their turn)
    socket.on('blackjack:stand', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;
        table.playerStand(socket.id);
        console.log(`🃏 Player ${player.username} stands`);
    });

    // Player doubles down
    socket.on('blackjack:double', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;
        const success = table.playerDoubleDown(socket.id);
        if (success) {
            console.log(`🃏 Player ${player.username} doubled down`);
        } else {
            socket.emit('blackjack:error', { message: 'Cannot double down' });
        }
    });

    // Player splits hand
    socket.on('blackjack:split', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;
        const success = table.playerSplit(socket.id);
        if (success) {
            console.log(`🃏 Player ${player.username} split their hand`);
        } else {
            socket.emit('blackjack:error', { message: 'Cannot split' });
        }
    });

    // Player buys insurance
    socket.on('blackjack:insurance', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;
        const success = table.playerInsurance(socket.id);
        if (success) {
            console.log(`🃏 Player ${player.username} bought insurance`);
        } else {
            socket.emit('blackjack:error', { message: 'Cannot buy insurance' });
        }
    });

    // Player leaves blackjack table
    socket.on('blackjack:leave', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.lobbyId) return;

        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || !lobby.blackjackTable) return;

        const table = lobby.blackjackTable;

        // If they're a player in the game, they forfeit
        if (table.players.has(socket.id)) {
            const tablePlayer = table.players.get(socket.id);
            console.log(`🃏 Player ${player.username} forfeited their blackjack bet of ${tablePlayer.bet} souls`);
        }

        table.removePlayer(socket.id);
        table.removeSpectator(socket.id);

        socket.emit('blackjack:left', { message: 'You left the blackjack table' });
    });

    // ===============================
    // END BLACKJACK NETWORK EVENTS
    // ===============================

    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);

        const player = players.get(socket.id);

        // Save player stats to database
        if (player && process.env.DATABASE_URL) {
            const sessionPlaytime = Date.now() - player.sessionStartTime;
            await db.updatePlayerStats(player.id, player.username, {
                kills: player.kills || 0,
                deaths: player.deaths || 0,
                damageDealt: player.damageDealt || 0,
                damageTaken: player.damageTaken || 0,
                playtime: sessionPlaytime,
                bossKills: player.bossKills || 0,
                eliteKills: player.eliteKills || 0,
                deepestFloor: player.deepestFloor || 0,
                totalFloors: player.totalFloors || 0,
                gamesCompleted: player.gamesCompleted || 0,
                totalGold: player.totalGold || 0,
                legendaryItems: player.legendaryItems || 0,
                rareItems: player.rareItems || 0,
                totalItems: player.totalItems || 0,
                distanceTraveled: Math.floor(player.distanceTraveled || 0),
                abilitiesUsed: player.abilitiesUsed || 0,
                potionsConsumed: player.potionsConsumed || 0,
                mushroomsKilled: player.mushroomsKilled || 0
            }, player.userId).catch(err => console.error('Failed to save player stats:', err));
        }

        if (player && player.lobbyId) {
            const lobby = lobbies.get(player.lobbyId);

            if (lobby) {
                // Save player for reconnection window (30 seconds)
                player.disconnectedAt = Date.now();
                disconnectedPlayers.set(player.username, player);
                console.log(`💾 Saved ${player.username} for reconnection (30s window)`);

                // Keep minions alive for reconnection - don't clean them up yet

                // Clean up blackjack table if player was at table
                if (lobby.blackjackTable) {
                    const table = lobby.blackjackTable;
                    if (table.players.has(socket.id)) {
                        const tablePlayer = table.players.get(socket.id);
                        console.log(`🃏 Player ${player.username} disconnected from blackjack, forfeited ${tablePlayer.bet} souls`);
                    }
                    table.removePlayer(socket.id);
                    table.removeSpectator(socket.id);
                }

                lobby.removePlayer(socket.id);

                socket.to(lobby.id).emit('player:left', {
                    playerId: player.id,
                    username: player.username,
                    playerCount: lobby.players.size
                });

                // Adjust bot count when player leaves
                lobby.spawnBotsToFillSlots();

                // Schedule lobby deletion if all real players have left (5 second grace period for reconnects)
                if (lobby.players.size === 0) {
                    console.log(`⏳ All players left lobby ${lobby.id.slice(0, 8)} - scheduling shutdown in 5 seconds...`);
                    lobby.shutdownTimer = setTimeout(() => {
                        // Double-check lobby is still empty before deleting
                        if (lobby.players.size === 0) {
                            lobbies.delete(lobby.id);
                            console.log(`🗑️  Deleted empty lobby ${lobby.id.slice(0, 8)} - new world will be created on next join`);
                        } else {
                            console.log(`♻️  Lobby ${lobby.id.slice(0, 8)} shutdown cancelled - players reconnected`);
                        }
                    }, 5000); // 5 second delay
                }
            }
        }

        players.delete(socket.id);
    });
});

// ================== AUTHENTICATION ENDPOINTS ==================

// Register new user
app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const result = await auth.registerUser(username, email, password);

        if (result.success) {
            res.json({
                success: true,
                user: result.user,
                message: 'Account created successfully! Check your email to verify your account.'
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /auth/register:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Login user
app.post('/auth/login', async (req, res) => {
    try {
        const { usernameOrEmail, password } = req.body;
        const result = await auth.loginUser(usernameOrEmail, password);

        if (result.success) {
            res.json({
                success: true,
                token: result.token,
                user: result.user
            });
        } else {
            res.status(401).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /auth/login:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Verify token (check if user is logged in)
app.post('/auth/verify', (req, res) => {
    try {
        const { token } = req.body;
        const result = auth.verifyToken(token);

        if (result.success) {
            res.json({ success: true, userId: result.userId, username: result.username });
        } else {
            res.status(401).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /auth/verify:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get user profile
app.get('/auth/profile/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await auth.getUserById(userId);

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        console.error('Error in /auth/profile:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Get all users
app.get('/admin/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const users = await auth.getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error in /admin/users:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Reset user password
app.post('/admin/reset-password/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);
        const { newPassword } = req.body;

        const result = await auth.adminResetPassword(targetUserId, newPassword);
        if (result.success) {
            res.json({ success: true, message: `Password reset for user ${result.username}` });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/reset-password:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Delete user account
app.delete('/admin/delete-user/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);

        // Prevent deleting yourself
        if (targetUserId === tokenResult.userId) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        const result = await auth.adminDeleteUser(targetUserId);
        if (result.success) {
            res.json({ success: true, message: `Deleted user ${result.username} (${result.email})` });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/delete-user:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Unlock all characters for a user
app.post('/admin/unlock-characters/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);
        const { characters } = req.body;

        if (!characters || !Array.isArray(characters) || characters.length === 0) {
            return res.status(400).json({ success: false, error: 'No characters specified' });
        }

        const result = await auth.adminUnlockCharacters(targetUserId, characters);
        if (result.success) {
            res.json({
                success: true,
                message: `Unlocked characters for ${result.username}`,
                characters: result.unlockedCharacters
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/unlock-characters:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Update user souls
app.post('/admin/update-souls/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);
        const { souls } = req.body;

        if (typeof souls !== 'number' || souls < 0) {
            return res.status(400).json({ success: false, error: 'Invalid souls value' });
        }

        const result = await auth.adminUpdateSouls(targetUserId, souls);
        if (result.success) {
            res.json({ success: true, message: `Updated souls for ${result.username}`, souls: result.bankedSouls });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/update-souls:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Toggle admin status
app.post('/admin/toggle-admin/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);
        const { isAdmin: makeAdmin } = req.body;

        // Prevent removing your own admin status
        if (targetUserId === tokenResult.userId && !makeAdmin) {
            return res.status(400).json({ success: false, error: 'Cannot remove your own admin status' });
        }

        const result = await auth.adminToggleAdmin(targetUserId, makeAdmin);
        if (result.success) {
            res.json({
                success: true,
                message: `${result.username} is now ${result.isAdmin ? 'an admin' : 'not an admin'}`,
                isAdmin: result.isAdmin
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/toggle-admin:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Ban/Unban user
app.post('/admin/ban-user/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);
        const { isBanned, reason } = req.body;

        // Prevent banning yourself
        if (targetUserId === tokenResult.userId) {
            return res.status(400).json({ success: false, error: 'Cannot ban yourself' });
        }

        const result = await auth.adminBanUser(targetUserId, isBanned, reason);
        if (result.success) {
            res.json({
                success: true,
                message: `${result.username} is now ${result.isBanned ? 'banned' : 'unbanned'}`,
                isBanned: result.isBanned
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/ban-user:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin: Resend verification email
app.post('/admin/resend-verification/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const tokenResult = auth.verifyToken(token);
        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const isAdmin = await auth.isUserAdmin(tokenResult.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const targetUserId = parseInt(req.params.userId);

        const result = await auth.adminResendVerification(targetUserId);
        if (result.success) {
            res.json({
                success: true,
                message: `Verification email sent to ${result.email}`
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /admin/resend-verification:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get user stats
app.get('/user-stats/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!process.env.DATABASE_URL) {
            return res.json({
                totalKills: 0, totalDeaths: 0, gamesPlayed: 0, totalDamage: 0,
                bossKills: 0, eliteKills: 0, mushroomsKilled: 0,
                deepestFloor: 0, totalFloors: 0, gamesCompleted: 0,
                totalGold: 0, legendaryItems: 0, rareItems: 0, totalItems: 0,
                damageTaken: 0, playtime: 0, distanceTraveled: 0,
                abilitiesUsed: 0, potionsConsumed: 0
            });
        }

        const result = await db.pool.query(`
            SELECT
                COALESCE(SUM(total_kills), 0) as total_kills,
                COALESCE(SUM(total_deaths), 0) as total_deaths,
                COALESCE(SUM(games_played), 0) as games_played,
                COALESCE(SUM(total_damage_dealt), 0) as total_damage_dealt,
                COALESCE(SUM(total_damage_taken), 0) as total_damage_taken,
                COALESCE(SUM(boss_kills), 0) as boss_kills,
                COALESCE(SUM(elite_kills), 0) as elite_kills,
                COALESCE(SUM(mushrooms_killed), 0) as mushrooms_killed,
                COALESCE(MAX(deepest_floor), 0) as deepest_floor,
                COALESCE(SUM(total_floors), 0) as total_floors,
                COALESCE(SUM(games_completed), 0) as games_completed,
                COALESCE(SUM(total_gold), 0) as total_gold,
                COALESCE(SUM(legendary_items), 0) as legendary_items,
                COALESCE(SUM(rare_items), 0) as rare_items,
                COALESCE(SUM(total_items), 0) as total_items,
                COALESCE(SUM(total_playtime_ms), 0) as total_playtime_ms,
                COALESCE(SUM(distance_traveled), 0) as distance_traveled,
                COALESCE(SUM(abilities_used), 0) as abilities_used,
                COALESCE(SUM(potions_consumed), 0) as potions_consumed
            FROM player_stats
            WHERE user_id = $1
        `, [userId]);

        const stats = result.rows[0];
        res.json({
            totalKills: parseInt(stats.total_kills),
            totalDeaths: parseInt(stats.total_deaths),
            gamesPlayed: parseInt(stats.games_played),
            totalDamage: parseInt(stats.total_damage_dealt),
            damageTaken: parseInt(stats.total_damage_taken),
            bossKills: parseInt(stats.boss_kills),
            eliteKills: parseInt(stats.elite_kills),
            mushroomsKilled: parseInt(stats.mushrooms_killed),
            deepestFloor: parseInt(stats.deepest_floor),
            totalFloors: parseInt(stats.total_floors),
            gamesCompleted: parseInt(stats.games_completed),
            totalGold: parseInt(stats.total_gold),
            legendaryItems: parseInt(stats.legendary_items),
            rareItems: parseInt(stats.rare_items),
            totalItems: parseInt(stats.total_items),
            playtime: parseInt(stats.total_playtime_ms),
            distanceTraveled: parseInt(stats.distance_traveled),
            abilitiesUsed: parseInt(stats.abilities_used),
            potionsConsumed: parseInt(stats.potions_consumed)
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// Get user leaderboard ranking
app.get('/user-rank/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!process.env.DATABASE_URL) {
            return res.json({ killsRank: null, damageRank: null, floorRank: null });
        }

        // Get kills rank
        const killsResult = await db.pool.query(`
            SELECT COUNT(*) + 1 as rank
            FROM (
                SELECT user_id, SUM(total_kills) as total
                FROM player_stats
                WHERE user_id IS NOT NULL
                GROUP BY user_id
            ) as rankings
            WHERE total > (
                SELECT COALESCE(SUM(total_kills), 0)
                FROM player_stats
                WHERE user_id = $1
            )
        `, [userId]);

        // Get damage rank
        const damageResult = await db.pool.query(`
            SELECT COUNT(*) + 1 as rank
            FROM (
                SELECT user_id, SUM(total_damage_dealt) as total
                FROM player_stats
                WHERE user_id IS NOT NULL
                GROUP BY user_id
            ) as rankings
            WHERE total > (
                SELECT COALESCE(SUM(total_damage_dealt), 0)
                FROM player_stats
                WHERE user_id = $1
            )
        `, [userId]);

        // Get floor rank
        const floorResult = await db.pool.query(`
            SELECT COUNT(*) + 1 as rank
            FROM (
                SELECT user_id, MAX(deepest_floor) as total
                FROM player_stats
                WHERE user_id IS NOT NULL
                GROUP BY user_id
            ) as rankings
            WHERE total > (
                SELECT COALESCE(MAX(deepest_floor), 0)
                FROM player_stats
                WHERE user_id = $1
            )
        `, [userId]);

        res.json({
            killsRank: parseInt(killsResult.rows[0].rank),
            damageRank: parseInt(damageResult.rows[0].rank),
            floorRank: parseInt(floorResult.rows[0].rank)
        });
    } catch (error) {
        console.error('Error fetching user rank:', error);
        res.status(500).json({ error: 'Failed to fetch user rank' });
    }
});

// Verify email
app.get('/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        const result = await auth.verifyEmail(token);

        if (result.success) {
            res.send(`
                <html>
                <head><title>Email Verified</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>✅ Email Verified!</h1>
                    <p>Your email has been verified successfully. You can now close this window and login.</p>
                    <a href="/">Return to KLYRA</a>
                </body>
                </html>
            `);
        } else {
            res.status(400).send(`
                <html>
                <head><title>Verification Failed</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>❌ Verification Failed</h1>
                    <p>${result.error}</p>
                    <a href="/">Return to KLYRA</a>
                </body>
                </html>
            `);
        }
    } catch (error) {
        console.error('Error in /auth/verify-email:', error);
        res.status(500).send('Server error');
    }
});

// Request password reset
app.post('/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await auth.requestPasswordReset(email);
        res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Error in /auth/forgot-password:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Reset password
app.post('/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const result = await auth.resetPassword(token, newPassword);

        if (result.success) {
            res.json({ success: true, message: 'Password reset successfully!' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /auth/reset-password:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Update user profile
app.put('/auth/profile', async (req, res) => {
    try {
        const { token, ...updates } = req.body;
        const tokenResult = auth.verifyToken(token);

        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const result = await auth.updateUserProfile(tokenResult.userId, updates);

        if (result.success) {
            res.json({ success: true, user: result.user });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /auth/profile:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Change password
app.post('/auth/change-password', async (req, res) => {
    try {
        const { token, currentPassword, newPassword } = req.body;
        const tokenResult = auth.verifyToken(token);

        if (!tokenResult.success) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const result = await auth.changePassword(tokenResult.userId, currentPassword, newPassword);

        if (result.success) {
            res.json({ success: true, message: 'Password changed successfully!' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error in /auth/change-password:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ================== GAME ENDPOINTS ==================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        lobbies: lobbies.size,
        activePlayers: players.size,
        disconnectedPlayers: disconnectedPlayers.size,
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
    });
});

// Stats endpoint
app.get('/stats', (req, res) => {
    const lobbyStats = Array.from(lobbies.values()).map(lobby => ({
        id: lobby.id.slice(0, 8),
        playerCount: lobby.players.size,
        status: lobby.status,
        difficulty: lobby.difficulty,
        floor: lobby.gameState.floor
    }));

    res.json({
        totalLobbies: lobbies.size,
        activePlayers: players.size,
        lobbies: lobbyStats,
        metrics: metrics,
        serverUptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Global stats endpoint (from database)
app.get('/global-stats', async (req, res) => {
    try {
        if (!process.env.DATABASE_URL) {
            return res.json({
                totalKills: 0,
                totalDeaths: 0,
                totalPlayers: 0,
                error: 'Database not configured'
            });
        }

        const result = await db.pool.query(`
            SELECT
                COALESCE(SUM(total_kills), 0) as total_kills,
                COALESCE(SUM(total_deaths), 0) as total_deaths,
                COALESCE(SUM(total_damage_dealt), 0) as total_damage_dealt,
                COUNT(*) as total_players
            FROM player_stats
        `);

        const stats = result.rows[0];
        res.json({
            totalKills: parseInt(stats.total_kills),
            totalDeaths: parseInt(stats.total_deaths),
            totalDamageDealt: parseInt(stats.total_damage_dealt),
            totalPlayers: parseInt(stats.total_players),
            activePlayers: players.size,
            activeLobbies: lobbies.size
        });
    } catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Live stats endpoint (all detailed stats)
app.get('/live-stats', async (req, res) => {
    try {
        if (!process.env.DATABASE_URL) {
            return res.json({
                error: 'Database not configured'
            });
        }

        const result = await db.pool.query(`
            SELECT
                COALESCE(SUM(total_damage_dealt), 0) as total_damage_dealt,
                COALESCE(SUM(total_damage_taken), 0) as total_damage_taken,
                COALESCE(SUM(boss_kills), 0) as boss_kills,
                COALESCE(SUM(elite_kills), 0) as elite_kills,
                COALESCE(MAX(deepest_floor), 0) as deepest_floor,
                COALESCE(SUM(total_floors), 0) as total_floors,
                COALESCE(SUM(games_completed), 0) as games_completed,
                COALESCE(SUM(total_playtime_ms), 0) as total_playtime_ms,
                COALESCE(SUM(total_gold), 0) as total_gold,
                COALESCE(SUM(legendary_items), 0) as legendary_items,
                COALESCE(SUM(rare_items), 0) as rare_items,
                COALESCE(SUM(total_items), 0) as total_items,
                COALESCE(SUM(distance_traveled), 0) as distance_traveled,
                COALESCE(SUM(abilities_used), 0) as abilities_used,
                COALESCE(SUM(potions_consumed), 0) as potions_consumed,
                COALESCE(SUM(mushrooms_killed), 0) as mushrooms_killed
            FROM player_stats
        `);

        const stats = result.rows[0];
        res.json({
            totalDamageDealt: parseInt(stats.total_damage_dealt),
            totalDamageTaken: parseInt(stats.total_damage_taken),
            bossKills: parseInt(stats.boss_kills),
            eliteKills: parseInt(stats.elite_kills),
            deepestFloor: parseInt(stats.deepest_floor),
            totalFloors: parseInt(stats.total_floors),
            gamesCompleted: parseInt(stats.games_completed),
            totalPlaytime: parseInt(stats.total_playtime_ms),
            totalGold: parseInt(stats.total_gold),
            legendaryItems: parseInt(stats.legendary_items),
            rareItems: parseInt(stats.rare_items),
            totalItems: parseInt(stats.total_items),
            distanceTraveled: parseInt(stats.distance_traveled),
            abilitiesUsed: parseInt(stats.abilities_used),
            potionsConsumed: parseInt(stats.potions_consumed),
            mushroomsKilled: parseInt(stats.mushrooms_killed)
        });
    } catch (error) {
        console.error('Error fetching live stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Leaderboard endpoints
app.get('/leaderboard/kills', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await db.getLeaderboard(limit);
        res.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching kills leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/leaderboard/damage', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await db.getLeaderboardByDamage(limit);
        res.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching damage leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/leaderboard/floor', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await db.getLeaderboardByFloor(limit);
        res.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching floor leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        ...metrics,
        currentPlayers: players.size,
        currentLobbies: lobbies.size,
        uptime: process.uptime()
    });
});

// Reset all stats endpoint (admin only - requires confirmation token)
app.post('/admin/reset-stats', async (req, res) => {
    try {
        const { confirmToken } = req.body;

        // Simple confirmation token check
        if (confirmToken !== 'RESET_ALL_STATS_CONFIRM') {
            return res.status(403).json({ error: 'Invalid confirmation token' });
        }

        if (!process.env.DATABASE_URL) {
            return res.status(400).json({ error: 'Database not configured' });
        }

        // Delete all player stats
        await db.pool.query('TRUNCATE TABLE player_stats RESTART IDENTITY');

        console.log('⚠️  ALL PLAYER STATS HAVE BEEN RESET!');
        res.json({
            success: true,
            message: 'All player stats have been reset to zero'
        });
    } catch (error) {
        console.error('Error resetting stats:', error);
        res.status(500).json({ error: 'Failed to reset stats' });
    }
});

// AFK check interval
setInterval(() => {
    players.forEach((player, socketId) => {
        if (player.isAFK() && player.lobbyId) {
            console.log(`⏰ Kicking AFK player: ${player.username}`);
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('kicked', { reason: 'AFK' });
                socket.disconnect(true);
            }
        }
    });
}, 60000); // Check every minute

// Game loop - update enemy AI
setInterval(() => {
    lobbies.forEach((lobby) => {
        if (lobby.status === 'active') {
            lobby.updateEnemies();
        }
    });
}, 100); // Update every 100ms for smooth movement (10 updates/second) - PERFORMANCE OPTIMIZED

// Cleanup old lobbies
setInterval(() => {
    const now = Date.now();
    for (const [lobbyId, lobby] of lobbies.entries()) {
        if (lobby.status === 'finished' && (now - lobby.createdAt) > 300000) {
            lobbies.delete(lobbyId);
            console.log(`🧹 Cleaned up lobby ${lobbyId.slice(0, 8)}`);
        }
    }
}, 300000); // Every 5 minutes

// Cleanup rate limits
setInterval(() => {
    rateLimits.clear();
}, 600000); // Every 10 minutes

// Periodic player stats save (every 60 seconds)
setInterval(async () => {
    if (!process.env.DATABASE_URL) return;

    let savedCount = 0;
    for (const [socketId, player] of players.entries()) {
        if (player && player.id) {
            try {
                const sessionPlaytime = Date.now() - player.sessionStartTime;
                await db.updatePlayerStats(player.id, player.username, {
                    kills: player.kills || 0,
                    deaths: player.deaths || 0,
                    damageDealt: player.damageDealt || 0,
                    damageTaken: player.damageTaken || 0,
                    playtime: sessionPlaytime,
                    bossKills: player.bossKills || 0,
                    eliteKills: player.eliteKills || 0,
                    deepestFloor: player.deepestFloor || 0,
                    totalFloors: player.totalFloors || 0,
                    gamesCompleted: player.gamesCompleted || 0,
                    totalGold: player.totalGold || 0,
                    legendaryItems: player.legendaryItems || 0,
                    rareItems: player.rareItems || 0,
                    totalItems: player.totalItems || 0,
                    distanceTraveled: Math.floor(player.distanceTraveled || 0),
                    abilitiesUsed: player.abilitiesUsed || 0,
                    potionsConsumed: player.potionsConsumed || 0,
                    mushroomsKilled: player.mushroomsKilled || 0
                }, player.userId);

                // Reset session stats after saving to prevent double-counting
                player.kills = 0;
                player.deaths = 0;
                player.damageDealt = 0;
                player.damageTaken = 0;
                player.bossKills = 0;
                player.eliteKills = 0;
                player.totalFloors = 0;
                player.gamesCompleted = 0;
                player.totalGold = 0;
                player.legendaryItems = 0;
                player.rareItems = 0;
                player.totalItems = 0;
                player.distanceTraveled = 0;
                player.abilitiesUsed = 0;
                player.potionsConsumed = 0;
                player.mushroomsKilled = 0;
                // Reset session start time for next interval
                player.sessionStartTime = Date.now();

                savedCount++;
            } catch (err) {
                console.error(`Failed to save stats for ${player.username}:`, err.message);
            }
        }
    }

    if (savedCount > 0) {
        console.log(`💾 Auto-saved stats for ${savedCount} active player(s)`);
    }
}, 60000); // Every 60 seconds

// Start server
server.listen(PORT, async () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     🎮 KLYRA MULTIPLAYER SERVER v2.0                 ║
║                                                       ║
║  Port: ${PORT.toString().padEnd(44)} ║
║  Status: ONLINE ✅                                    ║
║                                                       ║
║  Endpoints:                                           ║
║  - GET /health   - Server health                      ║
║  - GET /stats    - Game statistics                    ║
║  - GET /metrics  - Performance metrics                ║
╚═══════════════════════════════════════════════════════╝
    `);

    // Initialize database
    if (process.env.DATABASE_URL) {
        await db.initDatabase();
        await auth.initUsersTable();

        // Run Pet Storage migration
        try {
            await auth.pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS stored_pets TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS current_pet TEXT DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS last_session TIMESTAMP DEFAULT NULL;
            `);
            console.log('✅ Pet Storage & Session tracking migrations completed');
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
        }
    } else {
        console.warn('⚠️  DATABASE_URL not set - stats will not persist');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received: shutting down gracefully');

    // Notify all players
    io.emit('server:shutdown', {
        message: 'Server is restarting. Please reconnect in a moment.',
        timestamp: Date.now()
    });

    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
