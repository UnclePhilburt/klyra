// Authentication module for user accounts
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Use the same database pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// JWT secret (should be in environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'klyra-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

// Email transporter (for sending verification emails)
let emailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    console.log('✅ Email transporter configured:', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        user: process.env.EMAIL_USER
    });
} else {
    console.log('⚠️ Email not configured. Missing:', {
        EMAIL_HOST: !!process.env.EMAIL_HOST,
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS
    });
}

// Initialize users table
async function initUsersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                avatar_url TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_verification_token ON users(verification_token);
            CREATE INDEX IF NOT EXISTS idx_reset_token ON users(reset_token);
        `);

        // Add user_id column to player_stats if it doesn't exist
        try {
            await pool.query(`
                ALTER TABLE player_stats
                ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_user_id ON player_stats(user_id)
            `);
        } catch (err) {
            if (err.code !== '42701') {
                console.log('Note: user_id column migration -', err.message);
            }
        }

        // Add soul banking columns if they don't exist
        try {
            await pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS banked_souls INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS unlocked_characters JSONB DEFAULT '[]'
            `);
        } catch (err) {
            if (err.code !== '42701') {
                console.log('Note: soul banking columns migration -', err.message);
            }
        }

        // Add admin role column if it doesn't exist
        try {
            await pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
            `);
        } catch (err) {
            if (err.code !== '42701') {
                console.log('Note: is_admin column migration -', err.message);
            }
        }

        // Add banned column if it doesn't exist
        try {
            await pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS banned_reason TEXT,
                ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP
            `);
        } catch (err) {
            if (err.code !== '42701') {
                console.log('Note: ban columns migration -', err.message);
            }
        }

        console.log('✅ Users table initialized');
    } catch (error) {
        console.error('❌ Failed to initialize users table:', error);
    }
}

// Register new user
async function registerUser(username, email, password) {
    try {
        // Validate input
        if (!username || username.length < 3 || username.length > 20) {
            return { success: false, error: 'Username must be 3-20 characters' };
        }
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Valid email required' };
        }
        if (!password || password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }

        // Check if username or email already exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        if (existing.rows.length > 0) {
            return { success: false, error: 'Username or email already exists' };
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Generate verification token
        const verificationToken = require('crypto').randomBytes(32).toString('hex');

        // Insert user
        const result = await pool.query(`
            INSERT INTO users (username, email, password_hash, verification_token)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, is_verified, created_at
        `, [username, email, passwordHash, verificationToken]);

        const user = result.rows[0];

        // Send verification email (if email is configured)
        if (emailTransporter) {
            try {
                console.log(`📧 Attempting to send verification email to ${email}`);
                await sendVerificationEmail(email, username, verificationToken);
                console.log(`✅ Verification email sent successfully to ${email}`);
            } catch (err) {
                console.error('❌ Failed to send verification email:', err);
            }
        } else {
            console.log('⚠️ Email transporter not configured - skipping verification email');
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isVerified: user.is_verified,
                createdAt: user.created_at
            },
            verificationToken // Include for testing/manual verification
        };
    } catch (error) {
        console.error('Error registering user:', error);
        return { success: false, error: 'Failed to register user' };
    }
}

// Login user
async function loginUser(usernameOrEmail, password) {
    try {
        // Find user by username or email
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [usernameOrEmail]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid credentials' };
        }

        const user = result.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return { success: false, error: 'Invalid credentials' };
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatar_url,
                isVerified: user.is_verified,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        };
    } catch (error) {
        console.error('Error logging in user:', error);
        return { success: false, error: 'Failed to login' };
    }
}

// Verify JWT token
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { success: true, userId: decoded.userId, username: decoded.username };
    } catch (error) {
        return { success: false, error: 'Invalid or expired token' };
    }
}

// Check if user is admin
async function isUserAdmin(userId) {
    try {
        const result = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [userId]
        );
        return result.rows.length > 0 && result.rows[0].is_admin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Get user by ID
async function getUserById(userId) {
    try {
        const result = await pool.query(
            'SELECT id, username, email, avatar_url, is_verified, is_admin, created_at, last_login FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatar_url,
            isVerified: user.is_verified,
            isAdmin: user.is_admin,
            createdAt: user.created_at,
            lastLogin: user.last_login
        };
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Get all users (admin only)
async function getAllUsers() {
    try {
        const result = await pool.query(`
            SELECT
                u.id, u.username, u.email, u.is_verified, u.is_admin,
                u.created_at, u.last_login, u.last_session, u.banked_souls, u.unlocked_characters,
                u.is_banned, u.banned_reason, u.banned_at,
                COALESCE(SUM(ps.games_played), 0) as games_played,
                COALESCE(MAX(ps.deepest_floor), 0) as deepest_floor,
                COALESCE(SUM(ps.total_kills), 0) as total_kills
            FROM users u
            LEFT JOIN player_stats ps ON u.id = ps.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        return result.rows.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            isVerified: user.is_verified,
            isAdmin: user.is_admin,
            createdAt: user.created_at,
            lastLogin: user.last_login,
            lastSession: user.last_session,
            bankedSouls: user.banked_souls,
            unlockedCharacters: user.unlocked_characters || [],
            isBanned: user.is_banned,
            bannedReason: user.banned_reason,
            bannedAt: user.banned_at,
            gamesPlayed: parseInt(user.games_played),
            deepestFloor: parseInt(user.deepest_floor),
            totalKills: parseInt(user.total_kills)
        }));
    } catch (error) {
        console.error('Error getting all users:', error);
        return [];
    }
}

// Admin reset password (doesn't require current password)
async function adminResetPassword(userId, newPassword) {
    try {
        if (!newPassword || newPassword.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING username',
            [passwordHash, userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        return { success: true, username: result.rows[0].username };
    } catch (error) {
        console.error('Error admin resetting password:', error);
        return { success: false, error: 'Failed to reset password' };
    }
}

// Admin delete user account
async function adminDeleteUser(userId) {
    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING username, email',
            [userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        return { success: true, username: result.rows[0].username, email: result.rows[0].email };
    } catch (error) {
        console.error('Error admin deleting user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}

// Admin unlock specific characters for a user
async function adminUnlockCharacters(userId, charactersToUnlock) {
    try {
        const validCharacters = ['KELISE', 'MALACHAR', 'ALDRIC', 'ZENRYU', 'ORION', 'LUNARE', 'BASTION'];

        // Validate that all requested characters are valid
        const invalidCharacters = charactersToUnlock.filter(char => !validCharacters.includes(char));
        if (invalidCharacters.length > 0) {
            return { success: false, error: `Invalid characters: ${invalidCharacters.join(', ')}` };
        }

        // Get current unlocked characters
        const userResult = await pool.query(
            'SELECT unlocked_characters FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const currentUnlocked = userResult.rows[0].unlocked_characters || [];

        // Merge with new characters (remove duplicates)
        const mergedCharacters = [...new Set([...currentUnlocked, ...charactersToUnlock])];

        // Update database
        const result = await pool.query(
            'UPDATE users SET unlocked_characters = $1 WHERE id = $2 RETURNING username, unlocked_characters',
            [JSON.stringify(mergedCharacters), userId]
        );

        return {
            success: true,
            username: result.rows[0].username,
            unlockedCharacters: result.rows[0].unlocked_characters
        };
    } catch (error) {
        console.error('Error admin unlocking characters:', error);
        return { success: false, error: 'Failed to unlock characters' };
    }
}

// Admin update user souls
async function adminUpdateSouls(userId, souls) {
    try {
        const result = await pool.query(
            'UPDATE users SET banked_souls = $1 WHERE id = $2 RETURNING username, banked_souls',
            [souls, userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        return {
            success: true,
            username: result.rows[0].username,
            bankedSouls: result.rows[0].banked_souls
        };
    } catch (error) {
        console.error('Error admin updating souls:', error);
        return { success: false, error: 'Failed to update souls' };
    }
}

// Admin toggle user admin status
async function adminToggleAdmin(userId, isAdmin) {
    try {
        const result = await pool.query(
            'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING username, is_admin',
            [isAdmin, userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        return {
            success: true,
            username: result.rows[0].username,
            isAdmin: result.rows[0].is_admin
        };
    } catch (error) {
        console.error('Error admin toggling admin status:', error);
        return { success: false, error: 'Failed to toggle admin status' };
    }
}

// Admin ban/unban user
async function adminBanUser(userId, isBanned, reason = null) {
    try {
        const result = await pool.query(
            `UPDATE users
             SET is_banned = $1, banned_reason = $2, banned_at = $3
             WHERE id = $4
             RETURNING username, is_banned`,
            [isBanned, reason, isBanned ? new Date() : null, userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        return {
            success: true,
            username: result.rows[0].username,
            isBanned: result.rows[0].is_banned
        };
    } catch (error) {
        console.error('Error admin banning user:', error);
        return { success: false, error: 'Failed to ban/unban user' };
    }
}

// Admin resend verification email
async function adminResendVerification(userId) {
    try {
        const result = await pool.query(
            'SELECT username, email, verification_token, is_verified FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = result.rows[0];

        // Always generate a new verification token for security
        const verificationToken = require('crypto').randomBytes(32).toString('hex');
        await pool.query(
            'UPDATE users SET verification_token = $1 WHERE id = $2',
            [verificationToken, userId]
        );

        // Send verification email
        if (emailTransporter) {
            try {
                await sendVerificationEmail(user.email, user.username, verificationToken);
                return { success: true, username: user.username, email: user.email };
            } catch (err) {
                console.error('Failed to send verification email:', err);
                return { success: false, error: 'Failed to send email: ' + err.message };
            }
        } else {
            return { success: false, error: 'Email transporter not configured' };
        }
    } catch (error) {
        console.error('Error resending verification:', error);
        return { success: false, error: 'Failed to resend verification' };
    }
}

// Verify email
async function verifyEmail(token) {
    try {
        const result = await pool.query(
            'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id, username, email',
            [token]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid verification token' };
        }

        return { success: true, user: result.rows[0] };
    } catch (error) {
        console.error('Error verifying email:', error);
        return { success: false, error: 'Failed to verify email' };
    }
}

// Request password reset
async function requestPasswordReset(email) {
    try {
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (result.rows.length === 0) {
            // Don't reveal if email exists
            return { success: true };
        }

        const user = result.rows[0];
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [resetToken, expiresAt, user.id]
        );

        // Send reset email
        if (emailTransporter) {
            try {
                await sendPasswordResetEmail(user.email, user.username, resetToken);
            } catch (err) {
                console.error('Failed to send password reset email:', err);
            }
        }

        return { success: true, resetToken }; // Include for testing
    } catch (error) {
        console.error('Error requesting password reset:', error);
        return { success: false, error: 'Failed to request password reset' };
    }
}

// Reset password
async function resetPassword(token, newPassword) {
    try {
        if (!newPassword || newPassword.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }

        const result = await pool.query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP',
            [token]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid or expired reset token' };
        }

        const userId = result.rows[0].id;
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [passwordHash, userId]
        );

        return { success: true };
    } catch (error) {
        console.error('Error resetting password:', error);
        return { success: false, error: 'Failed to reset password' };
    }
}

// Update user profile
async function updateUserProfile(userId, updates) {
    try {
        const allowedFields = ['username', 'email', 'avatar_url'];
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            return { success: false, error: 'No valid fields to update' };
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        const result = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, avatar_url, is_verified`,
            values
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        return { success: true, user: result.rows[0] };
    } catch (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error: 'Failed to update profile' };
    }
}

// Change password
async function changePassword(userId, currentPassword, newPassword) {
    try {
        if (!newPassword || newPassword.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }

        const result = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const passwordMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!passwordMatch) {
            return { success: false, error: 'Current password is incorrect' };
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, userId]
        );

        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: 'Failed to change password' };
    }
}

// Send verification email
async function sendVerificationEmail(email, username, token) {
    if (!emailTransporter) {
        console.log('⚠️ Cannot send email - transporter not initialized');
        return;
    }

    const verificationUrl = `${process.env.VERIFICATION_BASE_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`;

    console.log(`📧 Sending email from: ${process.env.EMAIL_FROM || 'noreply@klyra.lol'} to: ${email}`);

    const info = await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '🎮 Verify your KLYRA account',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            🎮 KLYRA
                                        </h1>
                                        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
                                            Multiplayer Roguelike Arena
                                        </p>
                                    </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                            Welcome, ${username}! ⚔️
                                        </h2>
                                        <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6;">
                                            Your adventure awaits! To begin your journey through the endless floors of KLYRA, please verify your email address.
                                        </p>

                                        <!-- CTA Button -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 20px 0;">
                                                    <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4); transition: all 0.3s;">
                                                        ✨ Verify Email Address
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin: 24px 0 0 0; color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
                                            Or copy and paste this link into your browser:<br>
                                            <a href="${verificationUrl}" style="color: #8b5cf6; word-break: break-all;">${verificationUrl}</a>
                                        </p>

                                        <!-- Divider -->
                                        <div style="margin: 32px 0; height: 1px; background: rgba(255,255,255,0.1);"></div>

                                        <!-- Game Features -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 12px; text-align: center; width: 33.33%;">
                                                    <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                                                    <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Multiplayer</div>
                                                </td>
                                                <td style="padding: 12px; text-align: center; width: 33.33%;">
                                                    <div style="font-size: 24px; margin-bottom: 8px;">⚔️</div>
                                                    <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Epic Battles</div>
                                                </td>
                                                <td style="padding: 12px; text-align: center; width: 33.33%;">
                                                    <div style="font-size: 24px; margin-bottom: 8px;">🏆</div>
                                                    <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Leaderboards</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: rgba(0,0,0,0.3); padding: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
                                        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.5); font-size: 12px;">
                                            If you didn't create this account, you can safely ignore this email.
                                        </p>
                                        <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 11px;">
                                            © ${new Date().getFullYear()} KLYRA. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    });

    console.log('📬 Email sent! Message ID:', info.messageId);
}

// Send password reset email
async function sendPasswordResetEmail(email, username, token) {
    if (!emailTransporter) return;

    const resetUrl = `${process.env.VERIFICATION_BASE_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@klyra.lol',
        to: email,
        subject: '🔒 Reset your KLYRA password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            🎮 KLYRA
                                        </h1>
                                        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
                                            Password Reset Request
                                        </p>
                                    </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                            Hi ${username}, 👋
                                        </h2>
                                        <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6;">
                                            We received a request to reset your password. Click the button below to create a new password for your KLYRA account.
                                        </p>

                                        <!-- CTA Button -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 20px 0;">
                                                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4); transition: all 0.3s;">
                                                        🔒 Reset Password
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin: 24px 0 0 0; color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
                                            Or copy and paste this link into your browser:<br>
                                            <a href="${resetUrl}" style="color: #ef4444; word-break: break-all;">${resetUrl}</a>
                                        </p>

                                        <!-- Divider -->
                                        <div style="margin: 32px 0; height: 1px; background: rgba(255,255,255,0.1);"></div>

                                        <!-- Warning Box -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px;">
                                                    <p style="margin: 0 0 8px 0; color: #ef4444; font-size: 14px; font-weight: 600;">
                                                        ⚠️ Security Notice
                                                    </p>
                                                    <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.5;">
                                                        This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: rgba(0,0,0,0.3); padding: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
                                        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.5); font-size: 12px;">
                                            Need help? Contact us at <a href="mailto:support@klyra.lol" style="color: #8b5cf6; text-decoration: none;">support@klyra.lol</a>
                                        </p>
                                        <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 11px;">
                                            © ${new Date().getFullYear()} KLYRA. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    });
}

// ==========================================
// ATLAS SECURITY - Separate Admin System
// ==========================================

const ATLAS_JWT_SECRET = process.env.ATLAS_JWT_SECRET || 'atlas-security-secret-change-in-production';
const ATLAS_JWT_EXPIRES_IN = '24h'; // Admin sessions expire in 24 hours

// Initialize Atlas Security admin table
async function initAtlasTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS atlas_admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'admin',
                permissions JSONB DEFAULT '["view"]',
                last_login TIMESTAMP,
                login_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                is_active BOOLEAN DEFAULT TRUE
            );

            CREATE INDEX IF NOT EXISTS idx_atlas_username ON atlas_admins(username);
        `);

        // Create activity log table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS atlas_activity_log (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES atlas_admins(id),
                action VARCHAR(255) NOT NULL,
                target_type VARCHAR(100),
                target_id VARCHAR(255),
                details JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_atlas_log_admin ON atlas_activity_log(admin_id);
            CREATE INDEX IF NOT EXISTS idx_atlas_log_created ON atlas_activity_log(created_at DESC);
        `);

        console.log('✅ Atlas Security tables initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Atlas Security tables:', error);
    }
}

// Register Atlas admin (can only be done by existing admin or first setup)
async function atlasRegisterAdmin(username, password, displayName, role = 'admin', createdBy = null) {
    try {
        if (!username || username.length < 3) {
            return { success: false, error: 'Username must be at least 3 characters' };
        }
        if (!password || password.length < 12) {
            return { success: false, error: 'Password must be at least 12 characters' };
        }

        // Check if username exists
        const existing = await pool.query(
            'SELECT id FROM atlas_admins WHERE username = $1',
            [username]
        );
        if (existing.rows.length > 0) {
            return { success: false, error: 'Username already exists' };
        }

        const passwordHash = await bcrypt.hash(password, 12); // Higher rounds for admin

        const result = await pool.query(`
            INSERT INTO atlas_admins (username, password_hash, display_name, role, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, display_name, role, created_at
        `, [username, passwordHash, displayName || username, role, createdBy]);

        return { success: true, admin: result.rows[0] };
    } catch (error) {
        console.error('Error registering Atlas admin:', error);
        return { success: false, error: 'Failed to register admin' };
    }
}

// Atlas admin login
async function atlasLogin(username, password) {
    try {
        const result = await pool.query(
            'SELECT * FROM atlas_admins WHERE username = $1 AND is_active = TRUE',
            [username]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid credentials' };
        }

        const admin = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);

        if (!passwordMatch) {
            return { success: false, error: 'Invalid credentials' };
        }

        // Update last login
        await pool.query(
            'UPDATE atlas_admins SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = $1',
            [admin.id]
        );

        // Generate Atlas JWT token
        const token = jwt.sign(
            {
                atlasId: admin.id,
                username: admin.username,
                role: admin.role,
                isAtlas: true // Flag to distinguish from player tokens
            },
            ATLAS_JWT_SECRET,
            { expiresIn: ATLAS_JWT_EXPIRES_IN }
        );

        return {
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                displayName: admin.display_name,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.last_login
            }
        };
    } catch (error) {
        console.error('Error Atlas login:', error);
        return { success: false, error: 'Login failed' };
    }
}

// Verify Atlas token
function atlasVerifyToken(token) {
    try {
        const decoded = jwt.verify(token, ATLAS_JWT_SECRET);
        if (!decoded.isAtlas) {
            return { success: false, error: 'Not an Atlas token' };
        }
        return {
            success: true,
            atlasId: decoded.atlasId,
            username: decoded.username,
            role: decoded.role
        };
    } catch (error) {
        return { success: false, error: 'Invalid or expired token' };
    }
}

// Get Atlas admin by ID
async function atlasGetAdmin(adminId) {
    try {
        const result = await pool.query(
            'SELECT id, username, display_name, role, permissions, last_login, login_count, created_at, is_active FROM atlas_admins WHERE id = $1',
            [adminId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting Atlas admin:', error);
        return null;
    }
}

// Get all Atlas admins
async function atlasGetAllAdmins() {
    try {
        const result = await pool.query(
            'SELECT id, username, display_name, role, permissions, last_login, login_count, created_at, is_active FROM atlas_admins ORDER BY created_at DESC'
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting Atlas admins:', error);
        return [];
    }
}

// Log Atlas activity
async function atlasLogActivity(adminId, action, targetType = null, targetId = null, details = null, ipAddress = null) {
    try {
        await pool.query(`
            INSERT INTO atlas_activity_log (admin_id, action, target_type, target_id, details, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [adminId, action, targetType, targetId, details ? JSON.stringify(details) : null, ipAddress]);
    } catch (error) {
        console.error('Error logging Atlas activity:', error);
    }
}

// Get Atlas activity log
async function atlasGetActivityLog(limit = 100, adminId = null) {
    try {
        let query = `
            SELECT l.*, a.username as admin_username, a.display_name as admin_display_name
            FROM atlas_activity_log l
            LEFT JOIN atlas_admins a ON l.admin_id = a.id
        `;
        const params = [];

        if (adminId) {
            query += ' WHERE l.admin_id = $1';
            params.push(adminId);
        }

        query += ' ORDER BY l.created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error getting Atlas activity log:', error);
        return [];
    }
}

// Change Atlas admin password
async function atlasChangePassword(adminId, currentPassword, newPassword) {
    try {
        if (!newPassword || newPassword.length < 12) {
            return { success: false, error: 'Password must be at least 12 characters' };
        }

        const result = await pool.query(
            'SELECT password_hash FROM atlas_admins WHERE id = $1',
            [adminId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Admin not found' };
        }

        const passwordMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!passwordMatch) {
            return { success: false, error: 'Current password is incorrect' };
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE atlas_admins SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, adminId]
        );

        return { success: true };
    } catch (error) {
        console.error('Error changing Atlas password:', error);
        return { success: false, error: 'Failed to change password' };
    }
}

// Deactivate Atlas admin
async function atlasDeactivateAdmin(adminId) {
    try {
        const result = await pool.query(
            'UPDATE atlas_admins SET is_active = FALSE WHERE id = $1 RETURNING username',
            [adminId]
        );
        if (result.rows.length === 0) {
            return { success: false, error: 'Admin not found' };
        }
        return { success: true, username: result.rows[0].username };
    } catch (error) {
        console.error('Error deactivating Atlas admin:', error);
        return { success: false, error: 'Failed to deactivate admin' };
    }
}

module.exports = {
    initUsersTable,
    registerUser,
    loginUser,
    verifyToken,
    getUserById,
    getAllUsers,
    isUserAdmin,
    adminResetPassword,
    adminDeleteUser,
    adminUnlockCharacters,
    adminUpdateSouls,
    adminToggleAdmin,
    adminBanUser,
    adminResendVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    updateUserProfile,
    changePassword,
    pool,
    // Atlas Security exports
    initAtlasTable,
    atlasRegisterAdmin,
    atlasLogin,
    atlasVerifyToken,
    atlasGetAdmin,
    atlasGetAllAdmins,
    atlasLogActivity,
    atlasGetActivityLog,
    atlasChangePassword,
    atlasDeactivateAdmin
};
