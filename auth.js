// Authentication module for user accounts
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Use the same database pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
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

// Get user by ID
async function getUserById(userId) {
    try {
        const result = await pool.query(
            'SELECT id, username, email, avatar_url, is_verified, created_at, last_login FROM users WHERE id = $1',
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
            createdAt: user.created_at,
            lastLogin: user.last_login
        };
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
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
            'SELECT id, username FROM users WHERE email = $1',
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
                await sendPasswordResetEmail(email, user.username, resetToken);
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

    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    console.log(`📧 Sending email from: ${process.env.EMAIL_FROM || 'noreply@klyra.lol'} to: ${email}`);

    const info = await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your KLYRA account',
        html: `
            <h1>Welcome to KLYRA, ${username}!</h1>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
            <p>If you didn't create this account, please ignore this email.</p>
        `
    });

    console.log('📬 Email sent! Message ID:', info.messageId);
}

// Send password reset email
async function sendPasswordResetEmail(email, username, token) {
    if (!emailTransporter) return;

    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@klyra.lol',
        to: email,
        subject: 'Reset your KLYRA password',
        html: `
            <h1>Password Reset Request</h1>
            <p>Hi ${username},</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    });
}

module.exports = {
    initUsersTable,
    registerUser,
    loginUser,
    verifyToken,
    getUserById,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    updateUserProfile,
    changePassword,
    pool
};
