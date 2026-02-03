import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { Types } from 'mysql2';

dotenv.config();

let pool: any;

async function initializePool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'crm_user',
      password: process.env.DB_PASSWORD || 'crm_password',
      database: process.env.DB_NAME || 'crm_db',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
      queueLimit: 0,
      typeCast: (field: any, next: any) => {
        if (field.type === Types.JSON) {
          const value = field.string();
          return value === null ? null : JSON.parse(value);
        }
        return next();
      }
    });

    try {
      const connection = await pool.getConnection();
      console.log('Connected to the database successfully');
      connection.release();
    } catch (err: any) {
      console.error('Database connection error', err);
    }
  }
  return pool;
}

const db = {
  async query(sql: string, params: any[] = []) {
    const pool = await initializePool();
    const hasParams = Array.isArray(params) && params.length > 0;
    const [rows] = hasParams ? await pool.execute(sql, params) : await pool.query(sql);

    if (Array.isArray(rows)) {
      return { rows };
    }

    return { rows: [], ...rows };
  },
  async end() {
    const pool = await initializePool();
    return pool.end();
  },
  async getPool() {
    return initializePool();
  }
};

export default db;
