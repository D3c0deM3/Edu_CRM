require('dotenv/config');
const { Pool } = require('pg');

const hasHerokuDatabaseUrl = Boolean(process.env.DATABASE_URL);

const dbConfig = new Pool(
  hasHerokuDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '12345678',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'crm_db',
      }
);

dbConfig.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

dbConfig
  .connect()
  .then(() => console.log('Connected to the database successfully'))
  .catch((err) => console.error('Database connection error', err));

module.exports = dbConfig;
