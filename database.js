// Database module for player stats persistence
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render PostgreSQL
    }
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database error:', err);
});

// Initialize database tables
async function initDatabase() {
    try {
        // Create table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_stats (
                id SERIAL PRIMARY KEY,
                player_id VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) NOT NULL,
                total_kills INTEGER DEFAULT 0,
                total_deaths INTEGER DEFAULT 0,
                total_damage_dealt BIGINT DEFAULT 0,
                total_damage_taken BIGINT DEFAULT 0,
                total_playtime_ms BIGINT DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add new columns if they don't exist (migration)
        const newColumns = [
            'boss_kills INTEGER DEFAULT 0',
            'elite_kills INTEGER DEFAULT 0',
            'deepest_floor INTEGER DEFAULT 0',
            'total_floors INTEGER DEFAULT 0',
            'games_completed INTEGER DEFAULT 0',
            'total_gold BIGINT DEFAULT 0',
            'legendary_items INTEGER DEFAULT 0',
            'rare_items INTEGER DEFAULT 0',
            'total_items INTEGER DEFAULT 0',
            'distance_traveled BIGINT DEFAULT 0',
            'abilities_used INTEGER DEFAULT 0',
            'potions_consumed INTEGER DEFAULT 0',
            'mushrooms_killed INTEGER DEFAULT 0'
        ];

        for (const columnDef of newColumns) {
            const columnName = columnDef.split(' ')[0];
            try {
                await pool.query(`
                    ALTER TABLE player_stats
                    ADD COLUMN IF NOT EXISTS ${columnDef}
                `);
            } catch (err) {
                // Column might already exist, ignore error
                if (err.code !== '42701') { // duplicate_column error code
                    console.log(`Note: Column ${columnName} - ${err.message}`);
                }
            }
        }

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_player_id ON player_stats(player_id);
            CREATE INDEX IF NOT EXISTS idx_total_kills ON player_stats(total_kills DESC);
            CREATE INDEX IF NOT EXISTS idx_total_damage_dealt ON player_stats(total_damage_dealt DESC);
            CREATE INDEX IF NOT EXISTS idx_deepest_floor ON player_stats(deepest_floor DESC);
        `);

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
    }
}

// Get player stats
async function getPlayerStats(playerId) {
    try {
        const result = await pool.query(
            'SELECT * FROM player_stats WHERE player_id = $1',
            [playerId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting player stats:', error);
        return null;
    }
}

// Update player stats
async function updatePlayerStats(playerId, username, stats, userId = null) {
    try {
        const result = await pool.query(`
            INSERT INTO player_stats (
                player_id, username, user_id, total_kills, total_deaths,
                total_damage_dealt, total_damage_taken, total_playtime_ms, games_played,
                boss_kills, elite_kills, deepest_floor, total_floors, games_completed,
                total_gold, legendary_items, rare_items, total_items,
                distance_traveled, abilities_used, potions_consumed, mushrooms_killed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            ON CONFLICT (player_id)
            DO UPDATE SET
                username = EXCLUDED.username,
                user_id = COALESCE(EXCLUDED.user_id, player_stats.user_id),
                total_kills = player_stats.total_kills + EXCLUDED.total_kills,
                total_deaths = player_stats.total_deaths + EXCLUDED.total_deaths,
                total_damage_dealt = player_stats.total_damage_dealt + EXCLUDED.total_damage_dealt,
                total_damage_taken = player_stats.total_damage_taken + EXCLUDED.total_damage_taken,
                total_playtime_ms = player_stats.total_playtime_ms + EXCLUDED.total_playtime_ms,
                games_played = player_stats.games_played + EXCLUDED.games_played,
                boss_kills = player_stats.boss_kills + EXCLUDED.boss_kills,
                elite_kills = player_stats.elite_kills + EXCLUDED.elite_kills,
                deepest_floor = GREATEST(player_stats.deepest_floor, EXCLUDED.deepest_floor),
                total_floors = player_stats.total_floors + EXCLUDED.total_floors,
                games_completed = player_stats.games_completed + EXCLUDED.games_completed,
                total_gold = player_stats.total_gold + EXCLUDED.total_gold,
                legendary_items = player_stats.legendary_items + EXCLUDED.legendary_items,
                rare_items = player_stats.rare_items + EXCLUDED.rare_items,
                total_items = player_stats.total_items + EXCLUDED.total_items,
                distance_traveled = player_stats.distance_traveled + EXCLUDED.distance_traveled,
                abilities_used = player_stats.abilities_used + EXCLUDED.abilities_used,
                potions_consumed = player_stats.potions_consumed + EXCLUDED.potions_consumed,
                mushrooms_killed = player_stats.mushrooms_killed + EXCLUDED.mushrooms_killed,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `, [
            playerId,
            username,
            userId,
            stats.kills || 0,
            stats.deaths || 0,
            stats.damageDealt || 0,
            stats.damageTaken || 0,
            stats.playtime || 0,
            1, // games_played increment
            stats.bossKills || 0,
            stats.eliteKills || 0,
            stats.deepestFloor || 0,
            stats.totalFloors || 0,
            stats.gamesCompleted || 0,
            stats.totalGold || 0,
            stats.legendaryItems || 0,
            stats.rareItems || 0,
            stats.totalItems || 0,
            stats.distanceTraveled || 0,
            stats.abilitiesUsed || 0,
            stats.potionsConsumed || 0,
            stats.mushroomsKilled || 0
        ]);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating player stats:', error);
        return null;
    }
}

// Get leaderboard (top players by kills)
async function getLeaderboard(limit = 10) {
    try {
        const result = await pool.query(
            'SELECT username, total_kills, total_deaths, games_played FROM player_stats ORDER BY total_kills DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return [];
    }
}

// Get leaderboard by damage
async function getLeaderboardByDamage(limit = 10) {
    try {
        const result = await pool.query(
            'SELECT username, total_damage_dealt, games_played FROM player_stats ORDER BY total_damage_dealt DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting damage leaderboard:', error);
        return [];
    }
}

// Get leaderboard by deepest floor
async function getLeaderboardByFloor(limit = 10) {
    try {
        const result = await pool.query(
            'SELECT username, deepest_floor, games_played FROM player_stats ORDER BY deepest_floor DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting floor leaderboard:', error);
        return [];
    }
}

module.exports = {
    initDatabase,
    getPlayerStats,
    updatePlayerStats,
    getLeaderboard,
    getLeaderboardByDamage,
    getLeaderboardByFloor,
    pool
};
