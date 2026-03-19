// POST /api/sync/trigger — on-demand data sync triggered by dashboard access
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { ensureInit } from '@/lib/ensure-init';
import { auth } from '@/lib/auth';
import { requestImmediateSync, requestSyncAll } from '@/services/sync';
import { SseManager } from '@/lib/sse';

export async function POST(request: NextRequest) {
  try {
    await ensureInit();

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const sseManager = SseManager.getInstance();

    const body = await request.json().catch(() => ({}));
    const hospitalId = body.hospitalId as string | undefined;

    if (hospitalId) {
      // Sync a specific hospital
      const result = await requestImmediateSync(db, hospitalId, sseManager);
      return NextResponse.json(result);
    }

    // Sync all hospitals (dashboard first load)
    const result = await requestSyncAll(db, sseManager);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
