// T049: GET /api/dashboard — province dashboard summary
import { NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { getProvinceDashboard } from '@/services/dashboard';

export async function GET() {
  try {
    const db = await getDatabase();
    const result = await getProvinceDashboard(db);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่', details: null } },
      { status: 500 },
    );
  }
}
