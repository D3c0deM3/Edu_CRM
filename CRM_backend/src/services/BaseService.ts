import { Pool } from 'pg';

// Base service class for common database operations
export abstract class BaseService {
  protected pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Generic find by ID
  protected async findById(table: string, id: number, columns: string = '*'): Promise<any> {
    const query = `SELECT ${columns} FROM ${table} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Generic find all with optional filters
  protected async findAll(
    table: string, 
    filters: Record<string, any> = {}, 
    columns: string = '*',
    orderBy: string = 'id DESC'
  ): Promise<any[]> {
    let query = `SELECT ${columns} FROM ${table}`;
    const values: any[] = [];
    const conditions: string[] = [];

    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY ${orderBy}`;
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // Generic create
  protected async create(table: string, data: Record<string, any>): Promise<any> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // Generic update
  protected async update(
    table: string, 
    id: number, 
    data: Record<string, any>
  ): Promise<any> {
    const setClause = Object.keys(data)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    const values = [id, ...Object.values(data)];

    const query = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  // Generic delete
  protected async delete(table: string, id: number): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Generic count
  protected async count(table: string, filters: Record<string, any> = {}): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${table}`;
    const values: any[] = [];
    const conditions: string[] = [];

    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  // Transaction helper
  protected async withTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
