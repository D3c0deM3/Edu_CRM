const pool = require('../../config/dbcon');

const DEFAULT_CRM_SUBSCRIPTION_DAYS = 30;

let schemaReady: Promise<void> | null = null;

const normalizePositiveInt = (value: any, fallback: number | null = null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const ensureCrmSubscriptionSchema = async (): Promise<void> => {
  if (!schemaReady) {
    schemaReady = pool.query(`
      ALTER TABLE edu_centers
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS subscription_activated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '${DEFAULT_CRM_SUBSCRIPTION_DAYS} days'),
      ADD COLUMN IF NOT EXISTS subscription_days INT NOT NULL DEFAULT ${DEFAULT_CRM_SUBSCRIPTION_DAYS},
      ADD COLUMN IF NOT EXISTS student_limit INT
    `)
      .then(() => pool.query(`
        UPDATE edu_centers
        SET
          subscription_status = COALESCE(subscription_status, 'active'),
          subscription_activated_at = COALESCE(subscription_activated_at, CURRENT_TIMESTAMP),
          subscription_expires_at = COALESCE(subscription_expires_at, CURRENT_TIMESTAMP + INTERVAL '${DEFAULT_CRM_SUBSCRIPTION_DAYS} days'),
          subscription_days = COALESCE(subscription_days, ${DEFAULT_CRM_SUBSCRIPTION_DAYS})
      `))
      .then(() => undefined)
      .catch((error: any) => {
        schemaReady = null;
        throw error;
      });
  }

  await schemaReady;
};

const crmOwnerSelect = `
  ec.center_id,
  ec.center_name,
  ec.center_code,
  ec.email AS center_email,
  ec.phone AS center_phone,
  ec.address,
  ec.city,
  ec.principal_name,
  ec.subscription_status,
  ec.subscription_activated_at,
  ec.subscription_expires_at,
  ec.subscription_days,
  ec.student_limit,
  COALESCE(student_counts.student_count, 0)::int AS student_count,
  CASE
    WHEN ec.subscription_expires_at IS NULL THEN 0
    ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (ec.subscription_expires_at - CURRENT_TIMESTAMP)) / 86400))::int
  END AS subscription_days_remaining,
  su.superuser_id AS owner_superuser_id,
  su.username AS owner_username,
  su.email AS owner_email,
  su.first_name AS owner_first_name,
  su.last_name AS owner_last_name,
  su.status AS owner_status
`;

const crmOwnerFrom = `
  FROM edu_centers ec
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS student_count
    FROM students s
    WHERE s.center_id = ec.center_id
      AND s.status <> 'Removed'
  ) student_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT su.*
    FROM superusers su
    WHERE su.center_id = ec.center_id
    ORDER BY
      CASE WHEN su.role = 'Owner' THEN 0 WHEN su.role = 'Admin' THEN 1 ELSE 2 END,
      su.superuser_id
    LIMIT 1
  ) su ON TRUE
`;

const sanitizeCrmOwner = (owner: any) => ({
  center_id: owner.center_id,
  center_name: owner.center_name,
  center_code: owner.center_code,
  center_email: owner.center_email,
  center_phone: owner.center_phone,
  address: owner.address,
  city: owner.city,
  principal_name: owner.principal_name,
  subscription_status: owner.subscription_status,
  subscription_activated_at: owner.subscription_activated_at,
  subscription_expires_at: owner.subscription_expires_at,
  subscription_days: owner.subscription_days,
  subscription_days_remaining: owner.subscription_days_remaining,
  student_limit: owner.student_limit,
  student_count: owner.student_count,
  owner_superuser_id: owner.owner_superuser_id,
  owner_username: owner.owner_username,
  owner_email: owner.owner_email,
  owner_first_name: owner.owner_first_name,
  owner_last_name: owner.owner_last_name,
  owner_status: owner.owner_status,
});

const getCrmOwnerByCenterId = async (centerId: number | string) => {
  await ensureCrmSubscriptionSchema();
  const result = await pool.query(
    `SELECT ${crmOwnerSelect} ${crmOwnerFrom} WHERE ec.center_id = $1`,
    [centerId]
  );

  return result.rows[0] ? sanitizeCrmOwner(result.rows[0]) : null;
};

const getCenterSubscription = async (centerId: number | string) => {
  await ensureCrmSubscriptionSchema();
  const result = await pool.query(
    `
      SELECT
        center_id,
        subscription_status,
        subscription_activated_at,
        subscription_expires_at,
        subscription_days,
        student_limit,
        CASE
          WHEN subscription_status = 'active'
           AND subscription_expires_at IS NOT NULL
           AND subscription_expires_at > CURRENT_TIMESTAMP
          THEN true
          ELSE false
        END AS is_active
      FROM edu_centers
      WHERE center_id = $1
    `,
    [centerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const subscription = result.rows[0];
  if (subscription.subscription_status === 'active' && !subscription.is_active) {
    await pool.query(
      `UPDATE edu_centers
       SET subscription_status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE center_id = $1 AND subscription_status = 'active'`,
      [centerId]
    );
    subscription.subscription_status = 'inactive';
  }

  return subscription;
};

const assertCenterHasActiveSubscription = async (centerId: number | string) => {
  const subscription = await getCenterSubscription(centerId);

  if (!subscription) {
    const error: any = new Error('Center not found');
    error.statusCode = 404;
    throw error;
  }

  if (!subscription.is_active) {
    const error: any = new Error('Center subscription is inactive or expired.');
    error.statusCode = 403;
    error.code = 'SUBSCRIPTION_INACTIVE';
    throw error;
  }

  return subscription;
};

const assertCenterCanAddStudent = async (centerId: number | string) => {
  await assertCenterHasActiveSubscription(centerId);

  const result = await pool.query(
    `
      SELECT
        ec.student_limit,
        COUNT(s.student_id)::int AS student_count
      FROM edu_centers ec
      LEFT JOIN students s
        ON s.center_id = ec.center_id
       AND s.status <> 'Removed'
      WHERE ec.center_id = $1
      GROUP BY ec.student_limit
    `,
    [centerId]
  );

  const row = result.rows[0];
  if (row?.student_limit !== null && row?.student_limit !== undefined && Number(row.student_count) >= Number(row.student_limit)) {
    const error: any = new Error(`Student limit reached for this center (${row.student_limit}).`);
    error.statusCode = 403;
    error.code = 'STUDENT_LIMIT_REACHED';
    throw error;
  }
};

const requireActiveCenterSubscription = async (req: any, res: any, next: any) => {
  try {
    const centerId = req.user?.center_id;
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    await assertCenterHasActiveSubscription(centerId);
    next();
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to verify subscription',
      code: error.code,
    });
  }
};

module.exports = {
  DEFAULT_CRM_SUBSCRIPTION_DAYS,
  normalizePositiveInt,
  ensureCrmSubscriptionSchema,
  getCrmOwnerByCenterId,
  getCenterSubscription,
  assertCenterHasActiveSubscription,
  assertCenterCanAddStudent,
  requireActiveCenterSubscription,
  crmOwnerSelect,
  crmOwnerFrom,
  sanitizeCrmOwner,
};

export {};
