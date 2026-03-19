// POST /api/sync/trigger — on-demand data sync for the user's hospital
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

    // Get the hospital code from the user's session (set during BMS login)
    const hospitalCode = (session.user as unknown as { hospitalCode?: string }).hospitalCode;
    if (!hospitalCode) {
      return NextResponse.json({ synced: false, reason: 'no_hospital_code', lastSyncAt: null });
    }

    // Resolve hcode → hospital UUID
    const hospitals = await db.query<{ id: string }>(
      'SELECT id FROM hospitals WHERE hcode = ?',
      [hospitalCode],
    );

    if (hospitals.length === 0) {
      return NextResponse.json({ synced: false, reason: 'hospital_not_found', lastSyncAt: null });
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
