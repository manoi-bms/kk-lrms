// T074: GET /api/patients/[an]/contractions — contraction data
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import type { ContractionsResponse } from '@/types/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ an: string }> },
) {
  try {
    const { an } = await params;
    const db = await getDatabase();

    // Get patient ID
    const patients = await db.query<{ id: string }>(
      'SELECT id FROM cached_patients WHERE an = ? LIMIT 1',
      [an],
    );

    if (patients.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Contractions derived from vital signs — measured_at intervals
    const vitals = await db.query<{
      measured_at: string;
      cervix_cm: number | null;
    }>(
      'SELECT measured_at, cervix_cm FROM cached_vital_signs WHERE patient_id = ? ORDER BY measured_at ASC',
      [patients[0].id],
    );

    // Calculate contractions from consecutive measurements
    const contractions: ContractionsResponse['contractions'] = [];
    for (let i = 1; i < vitals.length; i++) {
      const prev = new Date(vitals[i - 1].measured_at).getTime();
      const curr = new Date(vitals[i].measured_at).getTime();
      const intervalMin = Math.round((curr - prev) / 60000);

      // Estimate intensity from cervix progression
      const cervixDiff = (vitals[i].cervix_cm ?? 0) - (vitals[i - 1].cervix_cm ?? 0);
      let intensity: 'MILD' | 'MODERATE' | 'STRONG' = 'MILD';
      if (cervixDiff >= 2) intensity = 'STRONG';
      else if (cervixDiff >= 1) intensity = 'MODERATE';

      contractions.push({
        measuredAt: vitals[i].measured_at,
        intervalMin,
        durationSec: null, // Not available from HOSxP data
        intensity,
      });
    }

    const response: ContractionsResponse = { contractions };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Contractions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
