// GET /api/dashboard/high-risk — high-risk patients across all hospitals
import { NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { getHighRiskPatients } from '@/services/dashboard';
import { auth } from '@/lib/auth';
import { logAccess } from '@/services/audit';
import { ensureInit } from '@/lib/ensure-init';

export async function GET() {
  try {
    await ensureInit();
    const db = await getDatabase();

    // Audit logging
    const session = await auth();
    if (session?.user) {
      const userId = (session.user as unknown as { id?: string }).id ?? 'unknown';
      await logAccess(db, {
        userId,
        action: 'VIEW_HIGH_RISK_PATIENTS',
        resourceType: 'DASHBOARD',
      }).catch(() => {}); // Don't fail request on audit error
    }

    const patients = await getHighRiskPatients(db);
    return NextResponse.json({ patients });
  } catch (error) {
    console.error('High-risk patients API error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่', details: null } },
      { status: 500 },
    );
  }
}
