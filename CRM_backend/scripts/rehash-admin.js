require('dotenv/config');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '0000',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'crm_db',
});

const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const hash = crypto.createHash('sha256').update(PASSWORD).digest('hex');

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE superusers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING superuser_id, username, role, status',
      [hash, USERNAME]
    );
    if (result.rows.length === 0) {
      console.log(`No superuser found with username "${USERNAME}".`);
    } else {
      console.log('Password updated successfully!');
      console.log('  ID       :', result.rows[0].superuser_id);
      console.log('  Username :', result.rows[0].username);
      console.log('  Role     :', result.rows[0].role);
      console.log('  Hash     :', hash);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
