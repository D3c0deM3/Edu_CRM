/**
 * Create Administrator Script
 * Usage: node scripts/create-admin.js
 *
 * Optionally override defaults via environment variables:
 *   ADMIN_USERNAME  (default: admin)
 *   ADMIN_PASSWORD  (default: admin123)
 *   ADMIN_EMAIL     (default: admin@crm.com)
 *   ADMIN_FIRST     (default: Super)
 *   ADMIN_LAST      (default: Admin)
 */

require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '0000',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'crm_db',
});

const USERNAME   = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD   = process.env.ADMIN_PASSWORD || 'admin123';
const EMAIL      = process.env.ADMIN_EMAIL    || 'admin@crm.com';
const FIRST_NAME = process.env.ADMIN_FIRST    || 'Super';
const LAST_NAME  = process.env.ADMIN_LAST     || 'Admin';

async function main() {
  const client = await pool.connect();
  try {
    // 1. Ensure at least one edu_center exists
    let centerResult = await client.query('SELECT center_id FROM edu_centers LIMIT 1');
    let centerId;

    if (centerResult.rows.length === 0) {
      console.log('No education center found — creating default center...');
      const newCenter = await client.query(
        `INSERT INTO edu_centers (center_name, center_code, email)
         VALUES ($1, $2, $3)
         RETURNING center_id`,
        ['Default Center', 'DEFAULT', EMAIL]
      );
      centerId = newCenter.rows[0].center_id;
      console.log(`Created edu_center with ID: ${centerId}`);
    } else {
      centerId = centerResult.rows[0].center_id;
      console.log(`Using existing edu_center ID: ${centerId}`);
    }

    // 2. Check if username already exists
    const existing = await client.query(
      'SELECT superuser_id FROM superusers WHERE username = $1',
      [USERNAME]
    );
    if (existing.rows.length > 0) {
      console.log(`\n⚠ Admin with username "${USERNAME}" already exists (id: ${existing.rows[0].superuser_id}). Nothing was created.`);
      return;
    }

    // 3. Insert the administrator
    const result = await client.query(
      `INSERT INTO superusers
         (center_id, username, email, password_hash, first_name, last_name, role, permissions, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Admin', '{}', 'Active')
       RETURNING superuser_id, username, email, first_name, last_name, role, status, created_at`,
      [centerId, USERNAME, EMAIL, PASSWORD, FIRST_NAME, LAST_NAME]
    );

    const admin = result.rows[0];
    console.log('\n✓ Administrator created successfully!');
    console.log('─────────────────────────────────────');
    console.log(`  ID        : ${admin.superuser_id}`);
    console.log(`  Username  : ${admin.username}`);
    console.log(`  Password  : ${PASSWORD}`);
    console.log(`  Email     : ${admin.email}`);
    console.log(`  Name      : ${admin.first_name} ${admin.last_name}`);
    console.log(`  Role      : ${admin.role}`);
    console.log(`  Status    : ${admin.status}`);
    console.log('─────────────────────────────────────');
    console.log('\nLogin at: POST /api/superusers/auth/login');
    console.log(`  { "username": "${admin.username}", "password": "${PASSWORD}" }`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error creating admin:', err.message);
  process.exit(1);
});
