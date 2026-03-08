// T059: Startup sequence — DB init, schema sync, seed, start polling
import { getDatabase, closeDatabase } from '@/db/connection';
import { SchemaSync } from '@/db/schema-sync';
import { ALL_TABLES } from '@/db/tables/index';
import { SeedOrchestrator } from '@/db/seeds/index';
import { SseManager } from '@/lib/sse';
import { startPolling, stopPolling } from '@/services/sync';

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) return;

  try {
    console.log('[KK-LRMS] Starting initialization...');

    // 1. Connect to database
    const db = await getDatabase();
    console.log('[KK-LRMS] Database connected');

    // 2. Sync schema
    const driver = process.env.NODE_ENV === 'test' ? 'sqlite' : 'postgresql';
    await SchemaSync.sync(db, ALL_TABLES, driver as 'sqlite' | 'postgresql');
    console.log('[KK-LRMS] Schema synced');

    // 3. Run seeders
    const seedOrchestrator = new SeedOrchestrator();
    await seedOrchestrator.run(db);
    console.log('[KK-LRMS] Seeders complete');

    // 4. Start polling (if not in test mode)
    if (process.env.NODE_ENV !== 'test') {
      const sseManager = SseManager.getInstance();
      await startPolling(db, sseManager);
      console.log('[KK-LRMS] Polling started');
    }

    initialized = true;
    console.log('[KK-LRMS] Initialization complete');
  } catch (error) {
    console.error('[KK-LRMS] Initialization failed:', error);
    throw error;
  }
}

export async function shutdownApp(): Promise<void> {
  console.log('[KK-LRMS] Shutting down...');
  stopPolling();
  await closeDatabase();
  SseManager.getInstance().destroy();
  initialized = false;
  console.log('[KK-LRMS] Shutdown complete');
}
