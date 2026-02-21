require('dotenv/config');
const { Pool } = require('pg');

const dbConfig = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'crm_db',
});

dbConfig.on('error', (err: any) => {
  console.error('Unexpected error on idle client', err);
});
dbConfig.connect()
  .then(() => console.log('Connected to the database successfully'))
  .catch((err: any) => console.error('Database connection error', err));

module.exports = dbConfig;
