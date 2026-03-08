// T020: PostgresAdapter — pg.Pool connection pooling for production

import { Pool, type PoolConfig } from 'pg';
import { DatabaseAdapter, type ColumnInfo } from './adapter';

export class PostgresAdapter extends DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString: string, poolConfig?: Partial<PoolConfig>) {
    super();
    this.pool = new Pool({
      connectionString,
      max: poolConfig?.max ?? 10,
      idleTimeoutMillis: poolConfig?.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: poolConfig?.connectionTimeoutMillis ?? 5000,
      ...poolConfig,
    });
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.pool.query(sql, params);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async getTableNames(): Promise<string[]> {
    const result = await this.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    return result.rows.map((r: { table_name: string }) => r.table_name);
  }

  async getColumnInfo(table: string): Promise<ColumnInfo[]> {
    const result = await this.pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );
    return result.rows.map(
      (r: {
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }) => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
        defaultValue: r.column_default,
      }),
    );
  }

  async transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Create a transactional adapter that uses this specific client
      const txAdapter = new PostgresTransactionAdapter(client as unknown as PgClient);
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Internal adapter for transactions — uses a single client instead of pool
interface PgClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

class PostgresTransactionAdapter extends DatabaseAdapter {
  private client: PgClient;

  constructor(client: PgClient) {
    super();
    this.client = client;
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.client.query(sql, params);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(sql, params);
    return result.rows as T[];
  }

  async getTableNames(): Promise<string[]> {
    throw new Error('getTableNames not available in transaction context');
  }

  async getColumnInfo(): Promise<ColumnInfo[]> {
    throw new Error('getColumnInfo not available in transaction context');
  }

  async transaction<T>(): Promise<T> {
    throw new Error('Nested transactions not supported');
  }

  async close(): Promise<void> {
    // No-op: client released by parent
  }
}
