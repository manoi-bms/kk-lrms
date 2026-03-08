// T047: Sync service — polls HOSxP via BMS Session, caches in local DB
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { DatabaseAdapter } from '@/db/adapter';
import type { HosxpIptRow, HosxpPregnancyRow, HosxpPatientRow } from '@/types/hosxp';
import { encrypt } from '@/lib/encryption';
import { calculateAge } from '@/lib/utils';

export interface SyncPatientData {
  hn: string;
  an: string;
  name: string;
  cid: string | null;
  cidHash: string | null;
  age: number;
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  admitDate: string;
  heightCm?: number | null;
  weightKg?: number | null;
  weightDiffKg?: number | null;
  fundalHeightCm?: number | null;
  usWeightG?: number | null;
  hematocritPct?: number | null;
  laborStatus: string;
  syncedAt: string;
}

export function transformHosxpPatient(
  ipt: HosxpIptRow,
  pregnancy: HosxpPregnancyRow,
  patient: HosxpPatientRow,
  encryptionKey: string,
): SyncPatientData {
  const fullName = `${patient.pname} ${patient.fname} ${patient.lname}`.trim();
  const encryptedName = encrypt(fullName, encryptionKey);
  const encryptedCid = patient.cid ? encrypt(patient.cid, encryptionKey) : null;
  const cidHash = patient.cid
    ? createHash('sha256').update(patient.cid).digest('hex')
    : null;
  const age = calculateAge(patient.birthday);
  const admitDate = `${ipt.regdate}T${ipt.regtime || '00:00:00'}`;
  const laborStatus = ipt.dchdate ? 'DELIVERED' : 'ACTIVE';

  return {
    hn: ipt.hn,
    an: ipt.an,
    name: encryptedName,
    cid: encryptedCid,
    cidHash,
    age,
    gravida: pregnancy.preg_number,
    gaWeeks: pregnancy.ga,
    ancCount: null, // Filled from ANC data separately
    admitDate,
    laborStatus,
    syncedAt: new Date().toISOString(),
  };
}

export async function upsertCachedPatients(
  db: DatabaseAdapter,
  hospitalId: string,
  patients: SyncPatientData[],
): Promise<number> {
  let count = 0;
  const now = new Date().toISOString();

  for (const p of patients) {
    // Check if patient exists
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM cached_patients WHERE hospital_id = ? AND an = ?',
      [hospitalId, p.an],
    );

    if (existing.length > 0) {
      // Update existing patient
      await db.execute(
        `UPDATE cached_patients SET
          hn = ?, name = ?, cid = ?, cid_hash = ?, age = ?, gravida = ?, ga_weeks = ?,
          anc_count = ?, admit_date = ?, height_cm = ?, weight_kg = ?,
          weight_diff_kg = ?, fundal_height_cm = ?, us_weight_g = ?,
          hematocrit_pct = ?, labor_status = ?, synced_at = ?, updated_at = ?
        WHERE id = ?`,
        [
          p.hn, p.name, p.cid, p.cidHash ?? null, p.age, p.gravida, p.gaWeeks,
          p.ancCount, p.admitDate, p.heightCm ?? null, p.weightKg ?? null,
          p.weightDiffKg ?? null, p.fundalHeightCm ?? null, p.usWeightG ?? null,
          p.hematocritPct ?? null, p.laborStatus, p.syncedAt, now,
          existing[0].id,
        ],
      );
    } else {
      // Insert new patient
      await db.execute(
        `INSERT INTO cached_patients (
          id, hospital_id, hn, an, name, cid, cid_hash, age, gravida, ga_weeks,
          anc_count, admit_date, height_cm, weight_kg, weight_diff_kg,
          fundal_height_cm, us_weight_g, hematocrit_pct, labor_status,
          synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), hospitalId, p.hn, p.an, p.name, p.cid, p.cidHash ?? null, p.age,
          p.gravida, p.gaWeeks, p.ancCount, p.admitDate,
          p.heightCm ?? null, p.weightKg ?? null, p.weightDiffKg ?? null,
          p.fundalHeightCm ?? null, p.usWeightG ?? null, p.hematocritPct ?? null,
          p.laborStatus, p.syncedAt, now, now,
        ],
      );
    }
    count++;
  }

  return count;
}

export interface ChangeDetectionResult {
  newAdmissions: string[];
  discharges: string[];
}

export function detectChanges(
  newData: Pick<SyncPatientData, 'an' | 'laborStatus'>[],
  existingAns: string[],
): ChangeDetectionResult {
  const newAns = newData.map((d) => d.an);
  const newAdmissions = newAns.filter((an) => !existingAns.includes(an));
  const discharges = existingAns.filter((an) => !newAns.includes(an));

  return { newAdmissions, discharges };
}

// T104/T107: Transfer detection — cross-hospital CID matching via cid_hash
export interface TransferDetection {
  cidHash: string;
  fromHospitalId: string;
  fromAn: string;
  toHospitalId: string;
  toAn: string;
}

export async function detectTransfers(
  db: DatabaseAdapter,
  hospitalId: string,
  patients: SyncPatientData[],
): Promise<TransferDetection[]> {
  const transfers: TransferDetection[] = [];

  for (const p of patients) {
    // Skip patients without CID hash — cannot match cross-hospital
    if (!p.cidHash) continue;

    // Find ACTIVE patients at OTHER hospitals with the same cid_hash
    const matches = await db.query<{
      hospital_id: string;
      an: string;
    }>(
      `SELECT hospital_id, an FROM cached_patients
       WHERE cid_hash = ? AND hospital_id != ? AND labor_status = 'ACTIVE'`,
      [p.cidHash, hospitalId],
    );

    for (const match of matches) {
      transfers.push({
        cidHash: p.cidHash,
        fromHospitalId: match.hospital_id,
        fromAn: match.an,
        toHospitalId: hospitalId,
        toAn: p.an,
      });
    }
  }

  return transfers;
}

// T058: Polling scheduler
import { BmsSessionClient } from '@/lib/bms-session';
import { SseManager } from '@/lib/sse';
import { getQuery, ACTIVE_LABOR_PATIENTS } from '@/config/hosxp-queries';
import type { DatabaseDialect } from '@/config/hosxp-queries';
import { calculateCpdScore } from '@/services/cpd-score';
import { RiskLevel } from '@/types/domain';

const pollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

// T063: Calculate CPD scores for patients after sync
async function calculateAndStoreCpdScores(
  db: DatabaseAdapter,
  hospitalId: string,
  sseManager: SseManager,
): Promise<void> {
  const patients = await db.query<{
    id: string;
    an: string;
    gravida: number | null;
    anc_count: number | null;
    ga_weeks: number | null;
    height_cm: number | null;
    weight_diff_kg: number | null;
    fundal_height_cm: number | null;
    us_weight_g: number | null;
    hematocrit_pct: number | null;
  }>(
    "SELECT id, an, gravida, anc_count, ga_weeks, height_cm, weight_diff_kg, fundal_height_cm, us_weight_g, hematocrit_pct FROM cached_patients WHERE hospital_id = ? AND labor_status = 'ACTIVE'",
    [hospitalId],
  );

  const hospitalRows = await db.query<{ hcode: string }>(
    'SELECT hcode FROM hospitals WHERE id = ?',
    [hospitalId],
  );
  const hcode = hospitalRows[0]?.hcode ?? '';

  for (const p of patients) {
    const factors: Record<string, number> = {};
    if (p.gravida != null) factors.gravida = p.gravida;
    if (p.anc_count != null) factors.ancCount = p.anc_count;
    if (p.ga_weeks != null) factors.gaWeeks = p.ga_weeks;
    if (p.height_cm != null) factors.heightCm = p.height_cm;
    if (p.weight_diff_kg != null) factors.weightDiffKg = p.weight_diff_kg;
    if (p.fundal_height_cm != null) factors.fundalHeightCm = p.fundal_height_cm;
    if (p.us_weight_g != null) factors.usWeightG = p.us_weight_g;
    if (p.hematocrit_pct != null) factors.hematocritPct = p.hematocrit_pct;

    const result = calculateCpdScore(factors);
    const now = new Date().toISOString();

    // Get previous score for comparison
    const prevScores = await db.query<{ risk_level: string }>(
      'SELECT risk_level FROM cpd_scores WHERE patient_id = ? ORDER BY calculated_at DESC LIMIT 1',
      [p.id],
    );
    const prevRiskLevel = prevScores[0]?.risk_level ?? null;

    // Insert new CPD score
    await db.execute(
      `INSERT INTO cpd_scores (
        id, patient_id, score, risk_level, recommendation,
        factor_gravida, factor_anc_count, factor_ga_weeks, factor_height_cm,
        factor_weight_diff, factor_fundal_ht, factor_us_weight, factor_hematocrit,
        missing_factors, calculated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), p.id, result.score, result.riskLevel, result.recommendation,
        result.factorScores.gravida ?? null,
        result.factorScores.ancCount ?? null,
        result.factorScores.gaWeeks ?? null,
        result.factorScores.heightCm ?? null,
        result.factorScores.weightDiffKg ?? null,
        result.factorScores.fundalHeightCm ?? null,
        result.factorScores.usWeightG ?? null,
        result.factorScores.hematocritPct ?? null,
        JSON.stringify(result.missingFactors),
        now, now,
      ],
    );

    // Broadcast SSE if risk level changed
    if (prevRiskLevel && prevRiskLevel !== result.riskLevel) {
      sseManager.broadcast('patient-update', {
        type: 'risk_changed',
        hcode,
        an: p.an,
        riskLevel: result.riskLevel,
        previousRiskLevel: prevRiskLevel,
        score: result.score,
      });
    }

    // Alert on HIGH risk
    if (result.riskLevel === RiskLevel.HIGH && prevRiskLevel !== RiskLevel.HIGH) {
      sseManager.broadcast('patient-update', {
        type: 'high_risk_alert',
        hcode,
        an: p.an,
        score: result.score,
        recommendation: result.recommendation,
      });
    }
  }
}

export async function pollHospital(
  db: DatabaseAdapter,
  hospitalId: string,
  tunnelUrl: string,
  bmsUrl: string,
  jwt: string,
  databaseType: DatabaseDialect,
  encryptionKey: string,
  sseManager: SseManager,
): Promise<void> {
  try {
    const client = new BmsSessionClient(tunnelUrl);

    // Query active labor patients
    const sql = getQuery(ACTIVE_LABOR_PATIENTS, databaseType);
    const result = await client.executeQuery(sql, bmsUrl, jwt);

    if (result.data.length === 0) {
      await db.execute(
        "UPDATE hospitals SET connection_status = 'ONLINE', last_sync_at = ? WHERE id = ?",
        [new Date().toISOString(), hospitalId],
      );
      return;
    }

    // Get existing patient ANs for change detection
    const existing = await db.query<{ an: string }>(
      "SELECT an FROM cached_patients WHERE hospital_id = ? AND labor_status = 'ACTIVE'",
      [hospitalId],
    );
    const existingAns = existing.map((r) => r.an);

    // Transform and upsert
    const patients: SyncPatientData[] = result.data.map((row) => {
      const rawCid = row.cid ? String(row.cid) : null;
      return {
        hn: String(row.hn ?? ''),
        an: String(row.an ?? ''),
        name: encrypt(String(row.pname ?? '') + ' ' + String(row.fname ?? '') + ' ' + String(row.lname ?? ''), encryptionKey),
        cid: rawCid ? encrypt(rawCid, encryptionKey) : null,
        cidHash: rawCid ? createHash('sha256').update(rawCid).digest('hex') : null,
        age: 0,
        gravida: row.preg_number != null ? Number(row.preg_number) : null,
        gaWeeks: row.ga != null ? Number(row.ga) : null,
        ancCount: null,
        admitDate: `${row.regdate}T${row.regtime || '00:00:00'}`,
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };
    });

    const count = await upsertCachedPatients(db, hospitalId, patients);

    // T107: Detect patient transfers before upserting marks old records
    const transfers = await detectTransfers(db, hospitalId, patients);

    // Get hospital hcode for SSE events (needed for transfers and later)
    const hospitalRows = await db.query<{ hcode: string }>(
      'SELECT hcode FROM hospitals WHERE id = ?',
      [hospitalId],
    );
    const hcode = hospitalRows[0]?.hcode ?? '';

    // Process detected transfers
    for (const transfer of transfers) {
      // Mark old hospital's patient record as TRANSFERRED
      await db.execute(
        `UPDATE cached_patients SET labor_status = 'TRANSFERRED', updated_at = ?
         WHERE hospital_id = ? AND an = ?`,
        [new Date().toISOString(), transfer.fromHospitalId, transfer.fromAn],
      );

      // Get the source hospital hcode for the SSE event
      const fromHospitalRows = await db.query<{ hcode: string }>(
        'SELECT hcode FROM hospitals WHERE id = ?',
        [transfer.fromHospitalId],
      );
      const fromHcode = fromHospitalRows[0]?.hcode ?? '';

      sseManager.broadcast('patient-update', {
        type: 'patient_transfer',
        fromHcode,
        toHcode: hcode,
        an: transfer.toAn,
      });
    }

    // T063: Calculate CPD scores for each patient after upsert
    await calculateAndStoreCpdScores(db, hospitalId, sseManager);

    // Detect changes and broadcast SSE
    const changes = detectChanges(patients, existingAns);

    for (const an of changes.newAdmissions) {
      sseManager.broadcast('patient-update', {
        type: 'new_admission',
        hcode,
        an,
      });
    }

    if (count > 0) {
      sseManager.broadcast('sync-complete', {
        hcode,
        patientsUpdated: count,
        timestamp: new Date().toISOString(),
      });
    }

    // Update hospital status
    await db.execute(
      "UPDATE hospitals SET connection_status = 'ONLINE', last_sync_at = ? WHERE id = ?",
      [new Date().toISOString(), hospitalId],
    );
  } catch (error) {
    console.error(`Polling failed for hospital ${hospitalId}:`, error);
    await db.execute(
      "UPDATE hospitals SET connection_status = 'OFFLINE' WHERE id = ?",
      [hospitalId],
    );

    // Get hcode for SSE event
    const hospitalRows = await db.query<{ hcode: string }>(
      'SELECT hcode FROM hospitals WHERE id = ?',
      [hospitalId],
    );
    const hcode = hospitalRows[0]?.hcode ?? '';
    sseManager.broadcast('connection-status', {
      hcode,
      status: 'OFFLINE',
      lastSyncAt: new Date().toISOString(),
    });
  }
}

export async function startPolling(db: DatabaseAdapter, sseManager: SseManager): Promise<void> {
  const encryptionKey = process.env.ENCRYPTION_KEY ?? '';
  const validateUrl = process.env.BMS_VALIDATE_URL ?? 'https://hosxp.net/phapi/PasteJSON';

  // Get all hospitals with BMS config
  const configs = await db.query<{
    hospital_id: string;
    tunnel_url: string;
    session_jwt: string | null;
    database_type: string | null;
  }>(
    'SELECT hbc.hospital_id, hbc.tunnel_url, hbc.session_jwt, hbc.database_type FROM hospital_bms_config hbc',
  );

  const numHospitals = configs.length;
  if (numHospitals === 0) {
    console.log('No hospitals with BMS config found. Polling not started.');
    return;
  }

  const POLLING_INTERVAL = 30000; // 30 seconds
  const staggerMs = Math.floor(POLLING_INTERVAL / numHospitals);

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const delay = i * staggerMs;

    setTimeout(() => {
      const interval = setInterval(async () => {
        try {
          // Refresh session if needed
          let jwt = config.session_jwt;
          let bmsUrl = config.tunnel_url;
          let dbType = (config.database_type ?? 'postgresql') as DatabaseDialect;

          if (!jwt) {
            const client = new BmsSessionClient(config.tunnel_url);
            const sessionId = await client.getSessionId();
            const sessionConfig = await client.validateSession(sessionId, validateUrl);
            jwt = sessionConfig.jwt;
            bmsUrl = sessionConfig.bmsUrl;
            dbType = (await client.getDatabaseType(bmsUrl, jwt)) as DatabaseDialect;

            // Cache session
            await db.execute(
              'UPDATE hospital_bms_config SET session_jwt = ?, database_type = ?, session_expires_at = ? WHERE hospital_id = ?',
              [jwt, dbType, sessionConfig.expiresAt.toISOString(), config.hospital_id],
            );
          }

          await pollHospital(db, config.hospital_id, config.tunnel_url, bmsUrl, jwt, dbType, encryptionKey, sseManager);
        } catch (error) {
          console.error(`Poll cycle failed for hospital ${config.hospital_id}:`, error);
        }
      }, POLLING_INTERVAL);

      pollingIntervals.set(config.hospital_id, interval);
    }, delay);
  }

  console.log(`Polling started for ${numHospitals} hospitals (stagger: ${staggerMs}ms)`);
}

export function stopPolling(): void {
  for (const [, interval] of pollingIntervals) {
    clearInterval(interval);
  }
  pollingIntervals.clear();
  console.log('Polling stopped');
}
