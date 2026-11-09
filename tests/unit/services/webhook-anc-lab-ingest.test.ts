// Labs reach clinicians through this path, so it must be idempotent, must keep
// HIV outcomes out of plaintext, and must never move a risk level.
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { createTestDb } from '../../helpers/testDb';
import type { DatabaseAdapter } from '@/db/adapter';
import { decrypt, generateKey, getEncryptionKey } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import {
  processAncWebhook,
  validateAncPayload,
  type WebhookAncPatient,
  type WebhookAncPayload,
} from '@/services/webhook';
import { ANC_LAB_MAX_ROWS_PER_PATIENT } from '@/services/anc-lab-ingest';
import type { AncLabPayloadRow } from '@/services/anc-lab-classifier';
import type { SseManager } from '@/lib/sse';

const HOSPITAL_ID = '00000000-0000-4000-8000-0000000000a1';
const sse = { broadcast(): void {} } as unknown as SseManager;
const CID = '1100500090006';
const VISIT_DAY = '2026-03-01';

const hct = (over: Partial<AncLabPayloadRow> = {}): AncLabPayloadRow => ({
  source: 'anc_lab',
  sourceId: '11',
  resultDate: VISIT_DAY,
  gaWeeks: 12,
  ancLabName: 'Hct',
  labItemsName: 'Hematocrit (HCT)',
  labItemsCode: '101',
  result: '36',
  unit: '%',
  ancResultNormalRaw: 'Y',
  ...over,
});

const hb = (over: Partial<AncLabPayloadRow> = {}): AncLabPayloadRow => ({
  source: 'lab_order',
  sourceId: 'S1:202',
  resultDate: VISIT_DAY,
  labItemsName: 'Hemoglobin',
  labItemsCode: '202',
  result: '11.2',
  unit: 'g/dL',
  normalReference: '12-16',
  abnormalFlag: 'N',
  ...over,
});

function patient(over: Partial<WebhookAncPatient> = {}): WebhookAncPatient {
  return {
    hn: 'HN-L1',
    name: 'นาง ทดสอบ ผลแล็บ',
    cid: CID,
    birthday: '1994-02-01',
    pregNo: 1,
    lmp: '2026-01-01T00:00:00Z',
    edc: '2026-10-08T00:00:00Z',
    ...over,
  } as WebhookAncPatient;
}

const payload = (p: WebhookAncPatient, extra: Partial<WebhookAncPayload> = {}): WebhookAncPayload =>
  ({ type: 'anc_data', hospitalCode: '99903', patients: [p], ...extra }) as WebhookAncPayload;

interface LabRow {
  source_key: string;
  canonical_test: string | null;
  classification_note: string | null;
  raw_result: string | null;
  numeric_value: number | string | null;
  normalized_value: string | null;
  interpretation: string | null;
  concealed: boolean;
  content_hash: string;
  synced_at: string | Date;
  ga_weeks: number | null;
  unit: string | null;
  normal_reference: string | null;
  abnormal_flag: string | null;
  anc_result_normal_raw: string | null;
  anc_lab_name: string | null;
  lab_items_name: string | null;
}

describe('processAncWebhook — ANC lab ingest', () => {
  let db: DatabaseAdapter;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = generateKey();
  });

  beforeEach(async () => {
    db = await createTestDb();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO hospitals (id, hcode, name, level, is_active, connection_status, created_at, updated_at)
       VALUES (?, '99903', 'รพ.ทดสอบ Lab', 'F1', true, 'ONLINE', ?, ?)`,
      [HOSPITAL_ID, now, now],
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.close();
  });

  const push = (p: WebhookAncPatient, extra?: Partial<WebhookAncPayload>) =>
    processAncWebhook(db, HOSPITAL_ID, payload(p, extra), sse);
  const labs = () =>
    db.query<LabRow>('SELECT * FROM cached_anc_lab_results ORDER BY source_key');
  const visit = async () =>
    (
      await db.query<{ hb_g_dl: string | null; hct_pct: string | null }>(
        'SELECT hb_g_dl, hct_pct FROM cached_anc_visits',
      )
    )[0];
  const journey = async () =>
    (await db.query<Record<string, unknown>>('SELECT * FROM maternal_journeys'))[0];

  describe('storage', () => {
    it('stores a classified result with its context', async () => {
      await push(patient({ labResults: [hct()] }));
      const [row] = await labs();
      expect(row).toMatchObject({
        source_key: 'anc_lab:11',
        canonical_test: 'HCT',
        ga_weeks: 12,
        unit: '%',
        anc_result_normal_raw: 'Y',
        anc_lab_name: 'Hct',
        lab_items_name: 'Hematocrit (HCT)',
      });
      expect(Number(row.numeric_value)).toBe(36);
    });

    it('stores a lab-order result with its reference and flag', async () => {
      await push(patient({ labResults: [hb()] }));
      expect((await labs())[0]).toMatchObject({
        canonical_test: 'HB',
        normal_reference: '12-16',
        abnormal_flag: 'N',
      });
    });

    it('encrypts every raw result at rest', async () => {
      await push(patient({ labResults: [hct()] }));
      const [row] = await labs();
      expect(row.raw_result).not.toBe('36');
      expect(decrypt(row.raw_result as string, getEncryptionKey())).toBe('36');
    });

    it('keeps an unclassified result visible by its original name', async () => {
      await push(
        patient({ labResults: [hct({ labItemsName: 'Ferritin', ancLabName: 'Ferritin' })] }),
      );
      const [row] = await labs();
      expect(row.canonical_test).toBeNull();
      expect(row.lab_items_name).toBe('Ferritin');
      expect(row.classification_note).toBe('no_rule');
    });

    it('stores no value for a concealed result', async () => {
      await push(patient({ labResults: [hct({ result: 'ปกปิด' })] }));
      const [row] = await labs();
      expect(row.concealed).toBe(true);
      expect(row.raw_result).toBeNull();
      expect(row.numeric_value).toBeNull();
    });

    it('keeps sensitive outcomes out of every plaintext column', async () => {
      await push(
        patient({
          labResults: [
            hct({ sourceId: '21', labItemsName: 'Anti HIV (ANC)', result: 'Positive' }),
            hct({ sourceId: '22', labItemsName: 'CD4 Absolute', result: '320' }),
            hct({ sourceId: '23', labItemsName: 'VDRL ( RPR )', result: 'Positive' }),
          ],
        }),
      );
      for (const row of await labs()) {
        expect(row.interpretation).toBeNull();
        expect(row.numeric_value).toBeNull();
        expect(row.normalized_value).toBeNull();
      }
    });

    it('does not derive the change hash from the result alone', async () => {
      await push(patient({ labResults: [hct({ labItemsName: 'Anti HIV', result: 'Positive' })] }));
      const [row] = await labs();
      const { createHash } = await import('node:crypto');
      for (const guess of ['Positive', 'positive', 'anc_lab:11|Positive']) {
        expect(row.content_hash).not.toBe(createHash('sha256').update(guess).digest('hex'));
      }
      expect(row.content_hash).toHaveLength(64);
    });

    it('keeps a hospital-supplied date it cannot parse out of the date column', async () => {
      await push(patient({ labResults: [hct({ resultDate: 'not-a-date' })] }));
      const rows = await db.query<{ result_date: unknown }>(
        'SELECT result_date FROM cached_anc_lab_results',
      );
      expect(rows[0].result_date).toBeNull();
    });
  });

  describe('idempotence', () => {
    it('keeps one row when the same lab is pushed twice', async () => {
      await push(patient({ labResults: [hct()] }));
      await push(patient({ labResults: [hct()] }));
      expect(await labs()).toHaveLength(1);
    });

    it('writes nothing when a lab has not changed', async () => {
      await push(patient({ labResults: [hct()] }));
      const before = (await labs())[0].synced_at;
      const result = await push(patient({ labResults: [hct()] }));
      expect(result.labs).toMatchObject({ upserted: 0, unchanged: 1 });
      expect((await labs())[0].synced_at).toEqual(before);
    });

    it('updates the row when HOSxP corrects a result', async () => {
      await push(patient({ labResults: [hct()] }));
      const result = await push(patient({ labResults: [hct({ result: '33' })] }));
      expect(result.labs?.upserted).toBe(1);
      const [row] = await labs();
      expect(Number(row.numeric_value)).toBe(33);
    });

    it('never deletes a stored lab that a later pull omits', async () => {
      await push(patient({ labResults: [hct(), hb()] }));
      await push(patient({ labResults: [hct()] }));
      expect(await labs()).toHaveLength(2);
    });

    it('never deletes labs when an older tab omits the field', async () => {
      await push(patient({ labResults: [hct()] }));
      const result = await push(patient());
      expect(await labs()).toHaveLength(1);
      expect(result.labs).toMatchObject({ received: 0, upserted: 0 });
    });

    it('stores what it can and reports a push the sender says was truncated', async () => {
      const warn = vi.spyOn(logger, 'warn');
      await push(patient({ labResults: [hct()] }), { labsTruncated: true });
      expect(await labs()).toHaveLength(1);
      expect(warn).toHaveBeenCalledWith(
        'anc_lab_pull_truncated',
        expect.objectContaining({ hospitalId: HOSPITAL_ID }),
      );
    });
  });

  describe('boundary validation', () => {
    it('lets lab rows through the payload validator', () => {
      const check = validateAncPayload(payload(patient({ labResults: [hct()] })));
      expect(check.valid).toBe(true);
      expect(check.payload?.patients[0].labResults).toHaveLength(1);
    });

    it('skips and counts malformed rows without failing the patient', async () => {
      const bad = [
        hct(),
        { source: 'bogus', sourceId: '1' },
        { source: 'anc_lab' },
        { source: 'anc_lab', sourceId: 'x'.repeat(500) },
        { source: 'anc_lab', sourceId: '2', result: 42 },
        null,
      ] as unknown as AncLabPayloadRow[];
      const result = await push(patient({ labResults: bad }));
      expect(await labs()).toHaveLength(1);
      expect(result.labs?.skipped).toBe(5);
      expect(await db.query('SELECT id FROM maternal_journeys')).toHaveLength(1);
    });

    it('ignores a labResults value that is not an array', async () => {
      const result = await push(
        patient({ labResults: 'nope' as unknown as AncLabPayloadRow[] }),
      );
      expect(await labs()).toHaveLength(0);
      expect(result.labs?.skipped).toBe(1);
    });

    it('caps the rows accepted per patient and counts the rest', async () => {
      const rows = Array.from({ length: ANC_LAB_MAX_ROWS_PER_PATIENT + 3 }, (_, i) =>
        hct({ sourceId: String(i) }),
      );
      const result = await push(patient({ labResults: rows }));
      expect(await labs()).toHaveLength(ANC_LAB_MAX_ROWS_PER_PATIENT);
      expect(result.labs?.skipped).toBe(3);
    });

    it('logs counts only, never a result, name or identifier of the patient', async () => {
      const info = vi.spyOn(logger, 'info');
      const warn = vi.spyOn(logger, 'warn');
      await push(
        patient({
          labResults: [
            hct({ labItemsName: 'Anti HIV (ANC)', result: 'Positive' }),
            { source: 'bogus', sourceId: 'S-SECRET' } as unknown as AncLabPayloadRow,
          ],
        }),
      );
      const logged = JSON.stringify([...info.mock.calls, ...warn.mock.calls]);
      expect(logged).toContain('anc_lab_ingest_summary');
      for (const secret of ['Positive', 'Anti HIV', 'S-SECRET', CID, 'ทดสอบ']) {
        expect(logged).not.toContain(secret);
      }
    });
  });

  describe('visit values', () => {
    const v1 = { date: VISIT_DAY, visitNumber: 1 };

    it('fills visit hematocrit and hemoglobin from classified results', async () => {
      await push(patient({ visits: [v1], labResults: [hct(), hb()] }));
      const row = await visit();
      expect(Number(row.hct_pct)).toBe(36);
      expect(Number(row.hb_g_dl)).toBe(11.2);
    });

    it('keeps the values on later cycles that pull no labs', async () => {
      await push(patient({ visits: [v1], labResults: [hct(), hb()] }));
      await push(patient({ visits: [v1] }));
      const row = await visit();
      expect(Number(row.hct_pct)).toBe(36);
      expect(Number(row.hb_g_dl)).toBe(11.2);
    });

    it('does not attach a lab from another day to a visit', async () => {
      await push(patient({ visits: [v1], labResults: [hct({ resultDate: '2026-03-09' })] }));
      expect((await visit()).hct_pct).toBeNull();
    });

    it('prefers the ANC record over a lab order for the same day', async () => {
      await push(
        patient({
          visits: [v1],
          labResults: [
            hct({ result: '36' }),
            hct({ source: 'lab_order', sourceId: 'S2:101', labItemsName: 'Hct', result: '30' }),
          ],
        }),
      );
      expect(Number((await visit()).hct_pct)).toBe(36);
    });

    it('does not fill a visit from a value that failed classification', async () => {
      await push(patient({ visits: [v1], labResults: [hct({ result: 'Positive' })] }));
      expect((await visit()).hct_pct).toBeNull();
    });

    it('still accepts values from an older tab, through the plausibility guard', async () => {
      await push(patient({ visits: [{ ...v1, hctPct: 150 }] }));
      expect((await visit()).hct_pct).toBeNull();
      await push(patient({ visits: [{ ...v1, hctPct: 35 }] }));
      expect(Number((await visit()).hct_pct)).toBe(35);
    });
  });

  describe('journey columns', () => {
    const named = (sourceId: string, labItemsName: string, result: string) =>
      hct({ sourceId, labItemsName, result });

    it('fills journey screening columns from classified results', async () => {
      await push(
        patient({
          labResults: [
            named('1', 'HBs Ag', 'Negative'),
            named('2', 'ABO Grouping', 'O'),
            named('3', 'Rh Typing', 'Positive'),
            named('4', 'DCIP', 'Positive'),
            named('5', 'CBC:MCV', '78.2'),
          ],
        }),
      );
      const j = await journey();
      expect(j.hbsag_result).toBe('NEG');
      expect(j.blood_group).toBe('O');
      expect(j.rh_factor).toBe('POS');
      expect(j.dcip_result).toBe('POS');
      expect(Number(j.mcv_fl)).toBe(78.2);
    });

    it('uses the most recent result when a test was repeated', async () => {
      await push(
        patient({
          labResults: [
            hct({ sourceId: '1', labItemsName: 'HBs Ag', result: 'Negative', resultDate: '2026-02-01' }),
            hct({ sourceId: '2', labItemsName: 'HBs Ag', result: 'Positive', resultDate: '2026-04-01' }),
          ],
        }),
      );
      expect((await journey()).hbsag_result).toBe('POS');
    });

    it('does not turn an unknown or abnormal reading into a journey value', async () => {
      await push(
        patient({
          labResults: [
            named('1', 'HBs Ag', 'ผิดปกติ'),
            named('2', 'DCIP', '-'),
          ],
        }),
      );
      const j = await journey();
      expect(j.hbsag_result).toBeNull();
      expect(j.dcip_result).toBeNull();
    });

    it('keeps a known value when a later lab cannot be read', async () => {
      await push(patient({ labResults: [named('1', 'HBs Ag', 'Negative')] }));
      await push(patient({ labResults: [named('2', 'HBs Ag', 'ปกปิด')] }));
      expect((await journey()).hbsag_result).toBe('NEG');
    });

    // The journey page paints any OGTT text other than ABNORMAL as normal, and
    // grading a glucose value needs thresholds nobody has signed off.
    it('leaves ogtt_result empty rather than implying a normal result', async () => {
      await push(patient({ labResults: [named('1', 'OGTT 1 hr.', '220')] }));
      expect((await journey()).ogtt_result).toBeNull();
    });

    it('leaves HIV and VDRL columns to their existing source', async () => {
      await push(
        patient({
          labResults: [named('1', 'Anti HIV (ANC)', 'Positive'), named('2', 'VDRL ( RPR )', 'Positive')],
        }),
      );
      const j = await journey();
      expect(j.hiv_result).toBeNull();
      expect(j.vdrl_result).toBeNull();
    });
  });

  describe('guardrails', () => {
    it('does not move risk, screening rows or alert queues for positive results', async () => {
      await push(patient({ riskLevel: 'LOW', riskItemIds: [] }));
      const before = await journey();
      const broadcast = vi.fn();
      await processAncWebhook(
        db,
        HOSPITAL_ID,
        payload(
          patient({
            riskLevel: 'LOW',
            riskItemIds: [],
            labResults: [
              hct({ sourceId: '1', labItemsName: 'Anti HIV (ANC)', result: 'Positive' }),
              hct({ sourceId: '2', labItemsName: 'HBs Ag', result: 'Positive' }),
              hct({ sourceId: '3', labItemsName: 'DCIP', result: 'Positive' }),
            ],
          }),
        ),
        { broadcast } as unknown as SseManager,
      );
      const after = await journey();
      expect(after.anc_risk_level).toBe(before.anc_risk_level);
      expect(await db.query('SELECT id FROM moph_alert_event_queue')).toHaveLength(0);
      expect(await db.query('SELECT id FROM moph_alert_log')).toHaveLength(0);
      const events = broadcast.mock.calls.map((c) => (c[1] as { type: string }).type);
      expect(events.every((t) => t === 'journey_update')).toBe(true);
    });

    it('reports nothing about labs for a checksum-invalid patient', async () => {
      await push(patient({ cid: '1234567890123', labResults: [hct()] }));
      expect(await labs()).toHaveLength(0);
    });
  });
});
