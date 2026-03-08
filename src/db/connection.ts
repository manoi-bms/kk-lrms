// T023: Connection factory — NODE_ENV-based routing

import type { DatabaseAdapter } from './adapter';

let instance: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (instance) return instance;

  const env = process.env.NODE_ENV ?? 'development';

  if (env === 'test') {
    const { SqliteAdapter } = await import('./sqlite-adapter');
    instance = new SqliteAdapter(':memory:');
  } else {
    const { PostgresAdapter } = await import('./postgres-adapter');
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    instance = new PostgresAdapter(url);
  }

  return instance;
}

export async function closeDatabase(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}

// For testing: reset the singleton
export function resetDatabaseInstance(): void {
  instance = null;
}
