// POST /api/sync/trigger — on-demand data sync for the user's hospital
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { ensureInit } from '@/lib/ensure-init';
import { auth } from '@/lib/auth';
import { requestImmediateSync } from '@/services/sync';
import { SseManager } from '@/lib/sse';

export async function POST() {
  try {
    await ensureInit();

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const sseManager = SseManager.getInstance();

    // Get hospital info from the user's session (set during BMS login)
    const userProfile = session.user as unknown as {
      hospitalCode?: string;
      hospitalName?: string;
      tunnelUrl?: string;
      databaseType?: string;
    };
    const hospitalCode = userProfile.hospitalCode;
    if (!hospitalCode) {
      return NextResponse.json({ synced: false, reason: 'no_hospital_code', lastSyncAt: null });
    }

    // Resolve hcode → hospital UUID (auto-register if not found)
    let hospitals = await db.query<{ id: string }>(
      'SELECT id FROM hospitals WHERE hcode = ?',
      [hospitalCode],
    );

    if (hospitals.length === 0) {
      // Auto-register hospital from user's BMS profile
      const hospitalId = uuidv4();
      const now = new Date().toISOString();
      const hospitalName = userProfile.hospitalName || `รพ.${hospitalCode}`;

      await db.execute(
        `INSERT INTO hospitals (id, hcode, name, level, is_active, connection_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [hospitalId, hospitalCode, hospitalName, 'M2', 1, 'UNKNOWN', now, now],
      );

      // Also store BMS tunnel config if available
      if (userProfile.tunnelUrl) {
        await db.execute(
          `INSERT INTO hospital_bms_config (id, hospital_id, tunnel_url, database_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), hospitalId, userProfile.tunnelUrl, userProfile.databaseType || 'postgresql', now, now],
        );
      }

      console.log(`[SYNC] Auto-registered hospital: ${hospitalName} (${hospitalCode}) tunnel: ${userProfile.tunnelUrl || 'none'}`);
      hospitals = [{ id: hospitalId }];
    }

    const result = await requestImmediateSync(db, hospitals[0].id, sseManager);
    return NextResponse.json({ ...result, hcode: hospitalCode });
  } catch (error) {
    console.error('Sync trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
