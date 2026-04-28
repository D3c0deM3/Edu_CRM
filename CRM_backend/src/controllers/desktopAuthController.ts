const pool = require('../../config/dbcon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_jwt_secret_key_2024_change_in_production';
const JWT_EXPIRES_IN = '24h';
const SUBSCRIPTION_DAYS = 30;

let schemaReady = false;

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().email('Invalid email format').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

async function ensureDesktopAuthSchema() {
  if (schemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS desktop_app_users (
      desktop_user_id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      subscription_activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_desktop_app_users_username
    ON desktop_app_users(username)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_desktop_app_users_status
    ON desktop_app_users(status)
  `);

  schemaReady = true;
}

function buildDesktopToken(user: any) {
  return jwt.sign(
    {
      id: user.desktop_user_id,
      username: user.username,
      email: user.email,
      userType: 'desktop_app_user',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeDesktopUser(user: any) {
  return {
    desktop_user_id: user.desktop_user_id,
    username: user.username,
    email: user.email,
    status: user.status,
    subscription_activated_at: user.subscription_activated_at,
    subscription_expires_at: user.subscription_expires_at,
    last_login: user.last_login,
    created_at: user.created_at,
  };
}

function validationErrorResponse(error: any) {
  return {
    error: 'Validation failed',
    details: error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

exports.register = async (req: any, res: any) => {
  try {
    await ensureDesktopAuthSchema();

    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(validationErrorResponse(validationResult.error));
    }

    const { username, email, password } = validationResult.data;
    const normalizedEmail = email ? email.toLowerCase() : null;

    const existingUser = await pool.query(
      'SELECT desktop_user_id FROM desktop_app_users WHERE username = $1 OR ($2::text IS NOT NULL AND email = $2)',
      [username, normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO desktop_app_users (username, email, password_hash, status, subscription_activated_at)
       VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP)
       RETURNING desktop_user_id, username, email, status, subscription_activated_at,
         subscription_activated_at + INTERVAL '${SUBSCRIPTION_DAYS} days' AS subscription_expires_at,
         last_login, created_at`,
      [username, normalizedEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = buildDesktopToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: sanitizeDesktopUser(user),
    });
  } catch (error: any) {
    console.error('Desktop auth registration error:', error);
    res.status(500).json({ error: 'Failed to register desktop app user', details: error.message || error.toString() });
  }
};

exports.login = async (req: any, res: any) => {
  try {
    await ensureDesktopAuthSchema();

    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(validationErrorResponse(validationResult.error));
    }

    const { username, password } = validationResult.data;

    const result = await pool.query(
      `SELECT desktop_user_id, username, email, password_hash, status, subscription_activated_at,
        subscription_activated_at + INTERVAL '${SUBSCRIPTION_DAYS} days' AS subscription_expires_at,
        last_login, created_at
       FROM desktop_app_users
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Subscription is inactive',
        status: 'inactive',
      });
    }

    const expired = await pool.query(
      `UPDATE desktop_app_users
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE desktop_user_id = $1
         AND status = 'active'
         AND subscription_activated_at <= CURRENT_TIMESTAMP - INTERVAL '${SUBSCRIPTION_DAYS} days'
       RETURNING desktop_user_id, username, email, status, subscription_activated_at,
         subscription_activated_at + INTERVAL '${SUBSCRIPTION_DAYS} days' AS subscription_expires_at,
         last_login, created_at`,
      [user.desktop_user_id]
    );

    if (expired.rows.length > 0) {
      return res.status(403).json({
        error: 'Subscription expired',
        status: 'inactive',
        user: sanitizeDesktopUser(expired.rows[0]),
      });
    }

    const loginResult = await pool.query(
      `UPDATE desktop_app_users
       SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE desktop_user_id = $1
       RETURNING desktop_user_id, username, email, status, subscription_activated_at,
         subscription_activated_at + INTERVAL '${SUBSCRIPTION_DAYS} days' AS subscription_expires_at,
         last_login, created_at`,
      [user.desktop_user_id]
    );

    const loggedInUser = loginResult.rows[0];
    const token = buildDesktopToken(loggedInUser);

    res.json({
      message: 'Login successful',
      token,
      user: sanitizeDesktopUser(loggedInUser),
    });
  } catch (error: any) {
    console.error('Desktop auth login error:', error);
    res.status(500).json({ error: 'Failed to login desktop app user', details: error.message || error.toString() });
  }
};

export {};
