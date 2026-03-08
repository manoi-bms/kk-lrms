// T048: Dashboard service — province dashboard data from local cache
import type { DatabaseAdapter } from '@/db/adapter';
import type { DashboardHospital, DashboardSummary } from '@/types/api';
import type { ConnectionStatus, HospitalLevel } from '@/types/domain';

interface DashboardRow {
  hcode: string;
  name: string;
  level: string;
  connection_status: string;
  last_sync_at: string | null;
  is_active: number;
}

interface PatientCountRow {
  hospital_id: string;
  hcode: string;
  risk_level: string | null;
  count: number;
}

export interface DashboardResult {
  hospitals: DashboardHospital[];
  summary: DashboardSummary;
  updatedAt: string;
}

export async function getProvinceDashboard(db: DatabaseAdapter): Promise<DashboardResult> {
  // Get all active hospitals
  const hospitals = await db.query<DashboardRow>(
    "SELECT hcode, name, level, connection_status, last_sync_at, is_active FROM hospitals WHERE is_active = 1 ORDER BY name",
  );

  // Get patient counts per hospital grouped by risk level
  // SQLite-compatible: no LATERAL join, use subquery
  const counts = await db.query<PatientCountRow>(`
    SELECT h.id as hospital_id, h.hcode,
      (SELECT cs.risk_level FROM cpd_scores cs
       WHERE cs.patient_id = cp.id
       ORDER BY cs.calculated_at DESC LIMIT 1) as risk_level,
      COUNT(cp.id) as count
    FROM hospitals h
    LEFT JOIN cached_patients cp ON cp.hospital_id = h.id AND cp.labor_status = 'ACTIVE'
    WHERE h.is_active = 1
    GROUP BY h.id, h.hcode, risk_level
  `);

  // Build result
  const hospitalMap = new Map<string, DashboardHospital>();

  for (const h of hospitals) {
    hospitalMap.set(h.hcode, {
      hcode: h.hcode,
      name: h.name,
      level: h.level as HospitalLevel,
      connectionStatus: h.connection_status as ConnectionStatus,
      lastSyncAt: h.last_sync_at,
      counts: { low: 0, medium: 0, high: 0, total: 0 },
    });
  }

  for (const row of counts) {
    const hospital = hospitalMap.get(row.hcode);
    if (!hospital || row.count === 0) continue;

    if (row.risk_level === 'LOW') hospital.counts.low += row.count;
    else if (row.risk_level === 'MEDIUM') hospital.counts.medium += row.count;
    else if (row.risk_level === 'HIGH') hospital.counts.high += row.count;

    // Patients without CPD scores count as total but not in any risk bucket
    hospital.counts.total += row.count;
  }

  const hospitalList = Array.from(hospitalMap.values());
  const summary = getSummaryTotals(hospitalList);

  return {
    hospitals: hospitalList,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

export function getSummaryTotals(hospitals: DashboardHospital[]): DashboardSummary {
  let totalLow = 0;
  let totalMedium = 0;
  let totalHigh = 0;
  let totalActive = 0;

  for (const h of hospitals) {
    totalLow += h.counts.low;
    totalMedium += h.counts.medium;
    totalHigh += h.counts.high;
    totalActive += h.counts.total;
  }

  return { totalLow, totalMedium, totalHigh, totalActive };
}

export async function getHospitalPatientList(
  db: DatabaseAdapter,
  hcode: string,
  filters: {
    status?: string;
    riskLevel?: string;
    page?: number;
    perPage?: number;
  } = {},
) {
  const { status = 'active', riskLevel, page = 1, perPage = 20 } = filters;
  const offset = (page - 1) * perPage;

  // Get hospital ID
  const hospitals = await db.query<{ id: string }>(
    'SELECT id FROM hospitals WHERE hcode = ?',
    [hcode],
  );
  if (hospitals.length === 0) return { patients: [], pagination: { total: 0, page, perPage, totalPages: 0 } };

  const hospitalId = hospitals[0].id;

  let whereClause = 'WHERE cp.hospital_id = ?';
  const params: unknown[] = [hospitalId];

  if (status !== 'all') {
    whereClause += ' AND cp.labor_status = ?';
    params.push(status.toUpperCase());
  }

  // Count total
  const countResult = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM cached_patients cp ${whereClause}`,
    params,
  );
  const total = countResult[0].count;

  // Get patients with latest CPD score
  const patients = await db.query(
    `SELECT cp.*,
      (SELECT cs.score FROM cpd_scores cs WHERE cs.patient_id = cp.id ORDER BY cs.calculated_at DESC LIMIT 1) as cpd_score,
      (SELECT cs.risk_level FROM cpd_scores cs WHERE cs.patient_id = cp.id ORDER BY cs.calculated_at DESC LIMIT 1) as cpd_risk_level,
      (SELECT cs.recommendation FROM cpd_scores cs WHERE cs.patient_id = cp.id ORDER BY cs.calculated_at DESC LIMIT 1) as cpd_recommendation
    FROM cached_patients cp
    ${whereClause}
    ORDER BY cp.admit_date DESC
    LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  );

  return {
    patients,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
