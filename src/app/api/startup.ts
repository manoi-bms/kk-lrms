// T059: Startup sequence — DB init, schema sync, seed, start polling
import { getDatabase, closeDatabase, useSqlite } from '@/db/connection';
import { SchemaSync } from '@/db/schema-sync';
import { ALL_TABLES } from '@/db/tables/index';
import { SeedOrchestrator } from '@/db/seeds/index';
import { SseManager } from '@/lib/sse';
import { startPolling, stopPolling } from '@/services/sync';

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) return;

  try {
    const startTime = Date.now();
    console.log('[KK-LRMS] Starting initialization...');

    // 1. Connect to database
    const db = await getDatabase();
    const driver = useSqlite() ? 'sqlite' : 'postgresql';
    console.log(`[KK-LRMS] Database connected (driver: ${driver})`);

    // 2. Sync schema
    await SchemaSync.sync(db, ALL_TABLES, driver as 'sqlite' | 'postgresql');
    console.log(`[KK-LRMS] Schema synced — ${ALL_TABLES.length} tables`);

    // 3. Run seeders
    const seedOrchestrator = new SeedOrchestrator();
    await seedOrchestrator.run(db);
    console.log('[KK-LRMS] Seeders complete');

    // 4. Seed demo data in dev mode with SQLite
    if (useSqlite() && process.env.NODE_ENV !== 'test') {
      const { seedDemoData } = await import('@/db/seeds/demo-seeder');
      await seedDemoData(db);
    }

    // 5. Start polling (if not in test mode and not using SQLite)
    if (process.env.NODE_ENV !== 'test' && !useSqlite()) {
      const sseManager = SseManager.getInstance();
      await startPolling(db, sseManager);
      console.log('[KK-LRMS] HOSxP polling started');
    } else if (useSqlite() && process.env.NODE_ENV !== 'test') {
      console.log('[KK-LRMS] SQLite dev mode — HOSxP polling SKIPPED (using demo data)');
    }

    initialized = true;
    const elapsed = Date.now() - startTime;
    console.log(`[KK-LRMS] ✓ Initialization complete in ${elapsed}ms`);
  } catch (error) {
    console.error('[KK-LRMS] ✗ Initialization failed:', error);
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
