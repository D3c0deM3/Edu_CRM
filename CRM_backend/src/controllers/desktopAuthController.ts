const pool = require('../../config/dbcon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  DEFAULT_CRM_SUBSCRIPTION_DAYS,
  ensureCrmSubscriptionSchema,
  normalizePositiveInt,
  crmOwnerSelect,
  crmOwnerFrom,
  sanitizeCrmOwner,
  getCrmOwnerByCenterId,
} = require('../services/crmSubscriptionService');
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_jwt_secret_key_2024_change_in_production';
const JWT_EXPIRES_IN = '24h';
const DESKTOP_ADMIN_JWT_EXPIRES_IN = '8h';
const DESKTOP_ADMIN_USERNAME = process.env.DESKTOP_ADMIN_USERNAME || 'Decode';
const DESKTOP_ADMIN_PASSWORD = process.env.DESKTOP_ADMIN_PASSWORD || 'Shoxrux2006@';
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

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const optionalLimitSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

const optionalDaysSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const createCrmOwnerSchema = z.object({
  center_name: z.string().trim().min(1, 'Center name is required'),
  center_code: z.string().trim().min(1, 'Center code is required'),
  center_email: z.string().trim().email('Invalid center email').optional().or(z.literal('')),
  center_phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  principal_name: z.string().trim().optional(),
  owner_username: z.string().trim().min(3, 'Owner username must be at least 3 characters'),
  owner_email: z.string().trim().email('Invalid owner email').optional().or(z.literal('')),
  owner_password: z.string().min(6, 'Owner password must be at least 6 characters'),
  owner_first_name: z.string().trim().optional(),
  owner_last_name: z.string().trim().optional(),
  subscription_days: optionalDaysSchema,
  student_limit: optionalLimitSchema,
  activate_now: z.boolean().optional(),
});

const crmOwnerSettingsSchema = z.object({
  subscription_days: optionalDaysSchema,
  student_limit: optionalLimitSchema.nullable().optional(),
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
      status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
      subscription_activated_at TIMESTAMPTZ,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE desktop_app_users
    ALTER COLUMN status SET DEFAULT 'inactive'
  `);

  await pool.query(`
    ALTER TABLE desktop_app_users
    ALTER COLUMN subscription_activated_at DROP NOT NULL
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

const desktopUserSelect = `
  desktop_user_id, username, email, status, subscription_activated_at,
  subscription_activated_at + INTERVAL '${SUBSCRIPTION_DAYS} days' AS subscription_expires_at,
  CASE
    WHEN subscription_activated_at IS NULL THEN 0
    ELSE FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - subscription_activated_at)) / 86400)::int
  END AS subscription_days_used,
  CASE
    WHEN subscription_activated_at IS NULL THEN 0
    ELSE GREATEST(0, ${SUBSCRIPTION_DAYS} - FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - subscription_activated_at)) / 86400)::int)
  END AS subscription_days_remaining,
  last_login, created_at, updated_at
`;

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

function buildDesktopAdminToken() {
  return jwt.sign(
    {
      username: DESKTOP_ADMIN_USERNAME,
      userType: 'desktop_app_admin',
    },
    JWT_SECRET,
    { expiresIn: DESKTOP_ADMIN_JWT_EXPIRES_IN }
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
    subscription_days_used: user.subscription_days_used,
    subscription_days_remaining: user.subscription_days_remaining,
    last_login: user.last_login,
    created_at: user.created_at,
    updated_at: user.updated_at,
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

const hashCrmPassword = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex');

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
       VALUES ($1, $2, $3, 'inactive', NULL)
       RETURNING ${desktopUserSelect}`,
      [username, normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'Registration successful. Account is inactive until an admin activates the subscription.',
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
      `SELECT ${desktopUserSelect}, password_hash
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

    if (user.status !== 'active' || !user.subscription_activated_at) {
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
       RETURNING ${desktopUserSelect}`,
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
       RETURNING ${desktopUserSelect}`,
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

exports.adminLogin = async (req: any, res: any) => {
  try {
    const validationResult = adminLoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(validationErrorResponse(validationResult.error));
    }

    const { username, password } = validationResult.data;

    if (username !== DESKTOP_ADMIN_USERNAME || password !== DESKTOP_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin username or password' });
    }

    res.json({
      message: 'Desktop admin login successful',
      token: buildDesktopAdminToken(),
      admin: {
        username: DESKTOP_ADMIN_USERNAME,
        userType: 'desktop_app_admin',
      },
    });
  } catch (error: any) {
    console.error('Desktop admin login error:', error);
    res.status(500).json({ error: 'Failed to login desktop admin', details: error.message || error.toString() });
  }
};

exports.requireDesktopAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Desktop admin authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.userType !== 'desktop_app_admin') {
      return res.status(403).json({ error: 'Desktop admin access required' });
    }

    req.desktopAdmin = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Desktop admin token expired' });
    }

    return res.status(401).json({ error: 'Invalid desktop admin token' });
  }
};

exports.getUsers = async (req: any, res: any) => {
  try {
    await ensureDesktopAuthSchema();

    const result = await pool.query(`
      SELECT ${desktopUserSelect}
      FROM desktop_app_users
      ORDER BY created_at DESC
    `);

    res.json(result.rows.map(sanitizeDesktopUser));
  } catch (error: any) {
    console.error('Desktop admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch desktop app users', details: error.message || error.toString() });
  }
};

exports.activateUser = async (req: any, res: any) => {
  try {
    await ensureDesktopAuthSchema();

    const { id } = req.params;
    const result = await pool.query(
      `UPDATE desktop_app_users
       SET status = 'active',
         subscription_activated_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE desktop_user_id = $1
       RETURNING ${desktopUserSelect}`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desktop app user not found' });
    }

    res.json({
      message: 'Subscription activated',
      user: sanitizeDesktopUser(result.rows[0]),
    });
  } catch (error: any) {
    console.error('Desktop admin activate error:', error);
    res.status(500).json({ error: 'Failed to activate subscription', details: error.message || error.toString() });
  }
};

exports.deactivateUser = async (req: any, res: any) => {
  try {
    await ensureDesktopAuthSchema();

    const { id } = req.params;
    const result = await pool.query(
      `UPDATE desktop_app_users
       SET status = 'inactive',
         updated_at = CURRENT_TIMESTAMP
       WHERE desktop_user_id = $1
       RETURNING ${desktopUserSelect}`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desktop app user not found' });
    }

    res.json({
      message: 'Subscription deactivated',
      user: sanitizeDesktopUser(result.rows[0]),
    });
  } catch (error: any) {
    console.error('Desktop admin deactivate error:', error);
    res.status(500).json({ error: 'Failed to deactivate subscription', details: error.message || error.toString() });
  }
};

exports.deleteUser = async (req: any, res: any) => {
  try {
    await ensureDesktopAuthSchema();

    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM desktop_app_users
       WHERE desktop_user_id = $1
       RETURNING ${desktopUserSelect}`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desktop app user not found' });
    }

    res.json({
      message: 'Desktop app user deleted',
      user: sanitizeDesktopUser(result.rows[0]),
    });
  } catch (error: any) {
    console.error('Desktop admin delete error:', error);
    res.status(500).json({ error: 'Failed to delete desktop app user', details: error.message || error.toString() });
  }
};

exports.getCrmOwners = async (req: any, res: any) => {
  try {
    await ensureCrmSubscriptionSchema();
    const result = await pool.query(`
      SELECT ${crmOwnerSelect}
      ${crmOwnerFrom}
      ORDER BY ec.created_at DESC, ec.center_id DESC
    `);

    res.json(result.rows.map(sanitizeCrmOwner));
  } catch (error: any) {
    console.error('CRM owners list error:', error);
    res.status(500).json({ error: 'Failed to fetch CRM owners', details: error.message || error.toString() });
  }
};

exports.createCrmOwner = async (req: any, res: any) => {
  const client = await pool.connect();

  try {
    await ensureCrmSubscriptionSchema();

    const validationResult = createCrmOwnerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(validationErrorResponse(validationResult.error));
    }

    const data = validationResult.data;
    const subscriptionDays = normalizePositiveInt(data.subscription_days, DEFAULT_CRM_SUBSCRIPTION_DAYS);
    const activateNow = data.activate_now !== false;
    const studentLimit = data.student_limit ?? null;

    await client.query('BEGIN');

    const existingOwner = await client.query(
      'SELECT superuser_id FROM superusers WHERE username = $1 OR ($2::text IS NOT NULL AND email = $2)',
      [data.owner_username, data.owner_email || null]
    );

    if (existingOwner.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Owner username or email already exists' });
    }

    const centerResult = await client.query(
      `
        INSERT INTO edu_centers (
          center_name,
          center_code,
          email,
          phone,
          address,
          city,
          principal_name,
          subscription_status,
          subscription_activated_at,
          subscription_expires_at,
          subscription_days,
          student_limit
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8,
          CASE WHEN $8 = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END,
          CASE WHEN $8 = 'active' THEN CURRENT_TIMESTAMP + ($9::int * INTERVAL '1 day') ELSE NULL END,
          $9,
          $10
        )
        RETURNING center_id
      `,
      [
        data.center_name,
        data.center_code,
        data.center_email || null,
        data.center_phone || null,
        data.address || null,
        data.city || null,
        data.principal_name || null,
        activateNow ? 'active' : 'inactive',
        subscriptionDays,
        studentLimit,
      ]
    );

    const centerId = centerResult.rows[0].center_id;

    await client.query(
      `
        INSERT INTO superusers (
          center_id,
          username,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          permissions,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'Owner', '{}'::jsonb, 'Active')
      `,
      [
        centerId,
        data.owner_username,
        data.owner_email || null,
        hashCrmPassword(data.owner_password),
        data.owner_first_name || null,
        data.owner_last_name || null,
      ]
    );

    await client.query('COMMIT');

    const owner = await getCrmOwnerByCenterId(centerId);
    res.status(201).json({
      message: 'CRM owner created',
      owner,
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('CRM owner create error:', error);
    res.status(error.code === '23505' ? 409 : 500).json({
      error: error.code === '23505' ? 'Center code, owner username, or email already exists' : 'Failed to create CRM owner',
      details: error.message || error.toString(),
    });
  } finally {
    client.release();
  }
};

exports.activateCrmOwner = async (req: any, res: any) => {
  try {
    await ensureCrmSubscriptionSchema();

    const validationResult = crmOwnerSettingsSchema.safeParse(req.body || {});
    if (!validationResult.success) {
      return res.status(400).json(validationErrorResponse(validationResult.error));
    }

    const { centerId } = req.params;
    const subscriptionDays = normalizePositiveInt(
      validationResult.data.subscription_days,
      DEFAULT_CRM_SUBSCRIPTION_DAYS
    );
    const hasStudentLimit = Object.prototype.hasOwnProperty.call(validationResult.data, 'student_limit');

    const result = await pool.query(
      `
        UPDATE edu_centers
        SET
          subscription_status = 'active',
          subscription_activated_at = CURRENT_TIMESTAMP,
          subscription_expires_at = CURRENT_TIMESTAMP + ($2::int * INTERVAL '1 day'),
          subscription_days = $2,
          student_limit = CASE WHEN $3::boolean THEN $4::int ELSE student_limit END,
          updated_at = CURRENT_TIMESTAMP
        WHERE center_id = $1
        RETURNING center_id
      `,
      [
        centerId,
        subscriptionDays,
        hasStudentLimit,
        validationResult.data.student_limit ?? null,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CRM owner center not found' });
    }

    const owner = await getCrmOwnerByCenterId(centerId);
    res.json({
      message: 'CRM subscription activated',
      owner,
    });
  } catch (error: any) {
    console.error('CRM owner activate error:', error);
    res.status(500).json({ error: 'Failed to activate CRM subscription', details: error.message || error.toString() });
  }
};

exports.deactivateCrmOwner = async (req: any, res: any) => {
  try {
    await ensureCrmSubscriptionSchema();
    const { centerId } = req.params;
    const result = await pool.query(
      `
        UPDATE edu_centers
        SET subscription_status = 'inactive',
            updated_at = CURRENT_TIMESTAMP
        WHERE center_id = $1
        RETURNING center_id
      `,
      [centerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CRM owner center not found' });
    }

    const owner = await getCrmOwnerByCenterId(centerId);
    res.json({
      message: 'CRM subscription deactivated',
      owner,
    });
  } catch (error: any) {
    console.error('CRM owner deactivate error:', error);
    res.status(500).json({ error: 'Failed to deactivate CRM subscription', details: error.message || error.toString() });
  }
};

exports.updateCrmOwner = async (req: any, res: any) => {
  try {
    await ensureCrmSubscriptionSchema();

    const validationResult = crmOwnerSettingsSchema.safeParse(req.body || {});
    if (!validationResult.success) {
      return res.status(400).json(validationErrorResponse(validationResult.error));
    }

    const { centerId } = req.params;
    const hasStudentLimit = Object.prototype.hasOwnProperty.call(validationResult.data, 'student_limit');
    const hasSubscriptionDays = Object.prototype.hasOwnProperty.call(validationResult.data, 'subscription_days');

    const result = await pool.query(
      `
        UPDATE edu_centers
        SET
          student_limit = CASE WHEN $2::boolean THEN $3::int ELSE student_limit END,
          subscription_days = CASE WHEN $4::boolean THEN $5::int ELSE subscription_days END,
          updated_at = CURRENT_TIMESTAMP
        WHERE center_id = $1
        RETURNING center_id
      `,
      [
        centerId,
        hasStudentLimit,
        validationResult.data.student_limit ?? null,
        hasSubscriptionDays,
        validationResult.data.subscription_days ?? DEFAULT_CRM_SUBSCRIPTION_DAYS,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CRM owner center not found' });
    }

    const owner = await getCrmOwnerByCenterId(centerId);
    res.json({
      message: 'CRM owner settings updated',
      owner,
    });
  } catch (error: any) {
    console.error('CRM owner update error:', error);
    res.status(500).json({ error: 'Failed to update CRM owner settings', details: error.message || error.toString() });
  }
};

export {};
