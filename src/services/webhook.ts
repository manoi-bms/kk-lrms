// Webhook service — processes inbound patient data from non-HOSxP hospitals
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import type { DatabaseAdapter } from '@/db/adapter';
import { encrypt, getEncryptionKey } from '@/lib/encryption';
import { upsertCachedPatients, detectChanges, detectTransfers, markPatientsDelivered, calculateAndStoreCpdScores } from '@/services/sync';
import type { SyncPatientData } from '@/services/sync';
import { SseManager } from '@/lib/sse';

// ─── Webhook payload types ───

export interface WebhookPatientPayload {
  hn: string;
  an: string;
  name: string;
  cid?: string | null;
  age: number;
  gravida?: number | null;
  ga_weeks?: number | null;
  anc_count?: number | null;
  admit_date: string; // ISO 8601
  height_cm?: number | null;
  weight_kg?: number | null;
  weight_diff_kg?: number | null;
  fundal_height_cm?: number | null;
  us_weight_g?: number | null;
  hematocrit_pct?: number | null;
  labor_status?: string; // ACTIVE (default), DELIVERED
}

export type WebhookMode = 'incremental' | 'full_snapshot';

export interface WebhookPayload {
  patients: WebhookPatientPayload[];
  mode?: WebhookMode; // default: 'incremental'
}

export interface WebhookResult {
  patientsProcessed: number;
  newAdmissions: number;
  discharges: number;
  transfers: number;
}

// ─── API Key management ───

export function generateApiKey(): string {
  // Format: kklrms_<40 hex chars> (total 47 chars)
  return `kklrms_${randomBytes(20).toString('hex')}`;
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function validateApiKey(
  db: DatabaseAdapter,
  rawKey: string,
): Promise<{ hospitalId: string; keyId: string } | null> {
  const keyHash = hashApiKey(rawKey);

  const rows = await db.query<{
    id: string;
    hospital_id: string;
  }>(
    "SELECT id, hospital_id FROM webhook_api_keys WHERE key_hash = ? AND is_active = true AND revoked_at IS NULL",
    [keyHash],
  );

  if (rows.length === 0) return null;

  // Update last_used_at
  await db.execute(
    'UPDATE webhook_api_keys SET last_used_at = ? WHERE id = ?',
    [new Date().toISOString(), rows[0].id],
  );

  return { hospitalId: rows[0].hospital_id, keyId: rows[0].id };
}

export async function createApiKey(
  db: DatabaseAdapter,
  hospitalId: string,
  label: string,
): Promise<{ id: string; rawKey: string; keyPrefix: string }> {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO webhook_api_keys (id, hospital_id, key_hash, key_prefix, label, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, true, ?)`,
    [id, hospitalId, keyHash, keyPrefix, label, now],
  );

  return { id, rawKey, keyPrefix };
}

export async function revokeApiKey(
  db: DatabaseAdapter,
  keyId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  await db.execute(
    'UPDATE webhook_api_keys SET is_active = false, revoked_at = ? WHERE id = ?',
    [now, keyId],
  );
  return true;
}

export async function listApiKeys(
  db: DatabaseAdapter,
  hospitalId?: string,
): Promise<Array<{
  id: string;
  hospitalId: string;
  hcode: string;
  hospitalName: string;
  keyPrefix: string;
  label: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}>> {
  const whereClause = hospitalId
    ? 'WHERE wak.hospital_id = ?'
    : '';
  const params = hospitalId ? [hospitalId] : [];

  const rows = await db.query<{
    id: string; hospital_id: string; hcode: string; hospital_name: string;
    key_prefix: string; label: string; is_active: number; last_used_at: string | null;
    created_at: string; revoked_at: string | null;
  }>(
    `SELECT wak.id, wak.hospital_id, h.hcode, h.name as hospital_name,
            wak.key_prefix, wak.label, wak.is_active, wak.last_used_at,
            wak.created_at, wak.revoked_at
     FROM webhook_api_keys wak
     JOIN hospitals h ON h.id = wak.hospital_id
     ${whereClause}
     ORDER BY wak.created_at DESC`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    hospitalId: r.hospital_id,
    hcode: r.hcode,
    hospitalName: r.hospital_name,
    keyPrefix: r.key_prefix,
    label: r.label,
    isActive: !!r.is_active,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
    revokedAt: r.revoked_at,
  }));
}

// ─── Webhook payload validation ───

export function validatePayload(body: unknown): {
  valid: boolean;
  error?: string;
  payload?: WebhookPayload;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.patients)) {
    return { valid: false, error: '"patients" must be an array' };
  }

  if (obj.patients.length === 0) {
    return { valid: false, error: '"patients" array must not be empty' };
  }

  if (obj.patients.length > 100) {
    return { valid: false, error: '"patients" array must not exceed 100 items per request' };
  }

  const errors: string[] = [];

  for (let i = 0; i < obj.patients.length; i++) {
    const p = obj.patients[i] as Record<string, unknown>;
    if (!p.hn || typeof p.hn !== 'string') errors.push(`patients[${i}].hn is required (string)`);
    if (!p.an || typeof p.an !== 'string') errors.push(`patients[${i}].an is required (string)`);
    if (!p.name || typeof p.name !== 'string') errors.push(`patients[${i}].name is required (string)`);
    if (p.age == null || typeof p.age !== 'number') errors.push(`patients[${i}].age is required (number)`);
    if (!p.admit_date || typeof p.admit_date !== 'string') errors.push(`patients[${i}].admit_date is required (ISO 8601 string)`);
  }

  if (errors.length > 0) {
    return { valid: false, error: `Validation errors: ${errors.join('; ')}` };
  }

  // Validate mode field if provided
  if (obj.mode !== undefined && obj.mode !== 'incremental' && obj.mode !== 'full_snapshot') {
    return { valid: false, error: '"mode" must be "incremental" or "full_snapshot"' };
  }

  return { valid: true, payload: obj as unknown as WebhookPayload };
}

// ─── Main webhook processing ───

export async function processWebhookPayload(
  db: DatabaseAdapter,
  hospitalId: string,
  payload: WebhookPayload,
  sseManager: SseManager,
): Promise<WebhookResult> {
  const encryptionKey = getEncryptionKey();

  // Get hospital hcode for SSE events
  const hospitalRows = await db.query<{ hcode: string }>(
    'SELECT hcode FROM hospitals WHERE id = ?',
    [hospitalId],
  );
  const hcode = hospitalRows[0]?.hcode ?? '';

  // Get existing patient ANs for change detection
  const existing = await db.query<{ an: string }>(
    "SELECT an FROM cached_patients WHERE hospital_id = ? AND labor_status = 'ACTIVE'",
    [hospitalId],
  );
  const existingAns = existing.map((r) => r.an);

  // Transform webhook patients to SyncPatientData
  const patients: SyncPatientData[] = payload.patients.map((p) => {
    const encryptedName = encrypt(p.name, encryptionKey);
    const encryptedCid = p.cid ? encrypt(p.cid, encryptionKey) : null;
    const cidHash = p.cid
      ? createHash('sha256').update(p.cid).digest('hex')
      : null;

    return {
      hn: p.hn,
      an: p.an,
      name: encryptedName,
      cid: encryptedCid,
      cidHash,
      age: p.age,
      gravida: p.gravida ?? null,
      gaWeeks: p.ga_weeks ?? null,
      ancCount: p.anc_count ?? null,
      admitDate: p.admit_date,
      heightCm: p.height_cm ?? null,
      weightKg: p.weight_kg ?? null,
      weightDiffKg: p.weight_diff_kg ?? null,
      fundalHeightCm: p.fundal_height_cm ?? null,
      usWeightG: p.us_weight_g ?? null,
      hematocritPct: p.hematocrit_pct ?? null,
      laborStatus: p.labor_status ?? 'ACTIVE',
      syncedAt: new Date().toISOString(),
    };
  });

  // Upsert patients (reuse existing sync pipeline)
  await upsertCachedPatients(db, hospitalId, patients);

  // Detect transfers
  const transfers = await detectTransfers(db, hospitalId, patients);
  for (const transfer of transfers) {
    await db.execute(
      `UPDATE cached_patients SET labor_status = 'TRANSFERRED', updated_at = ?
       WHERE hospital_id = ? AND an = ?`,
      [new Date().toISOString(), transfer.fromHospitalId, transfer.fromAn],
    );

    const fromRows = await db.query<{ hcode: string }>(
      'SELECT hcode FROM hospitals WHERE id = ?',
      [transfer.fromHospitalId],
    );
    sseManager.broadcast('patient-update', {
      type: 'patient_transfer',
      fromHcode: fromRows[0]?.hcode ?? '',
      toHcode: hcode,
      an: transfer.toAn,
    });
  }

  // Calculate CPD scores (shared with polling pipeline — Constitution IV)
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

  // full_snapshot mode: patients NOT in the payload are discharged
  const mode = payload.mode ?? 'incremental';
  let dischargeCount = 0;
  if (mode === 'full_snapshot' && changes.discharges.length > 0) {
    await markPatientsDelivered(db, hospitalId, changes.discharges);
    dischargeCount = changes.discharges.length;
    for (const an of changes.discharges) {
      sseManager.broadcast('patient-update', {
        type: 'patient_discharged',
        hcode,
        an,
      });
    }
  }

  // Broadcast sync-complete
  sseManager.broadcast('sync-complete', {
    hcode,
    patientsUpdated: patients.length,
    source: 'webhook',
    timestamp: new Date().toISOString(),
  });

  // Update hospital status
  await db.execute(
    "UPDATE hospitals SET connection_status = 'ONLINE', last_sync_at = ? WHERE id = ?",
    [new Date().toISOString(), hospitalId],
  );

  return {
    patientsProcessed: patients.length,
    newAdmissions: changes.newAdmissions.length,
    discharges: dischargeCount,
    transfers: transfers.length,
  };
}

