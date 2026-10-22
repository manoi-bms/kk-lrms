// HOSxP's IPD admit form sends KK-LRMS `action: 'delete'` on EVERY save
// (HOSxP defect A-F10, ux-ipd-admit-report.md). Applied verbatim, a nurse
// saving the admission makes the woman vanish from the provincial labour
// board until a browser poll re-inserts her — 2026-10-22 รพ.พล lost every
// October labour row overnight. A HOSxP-sent delete for a still-ACTIVE
// admission is therefore ignored; the browser push's activeAns
// reconciliation closes genuinely finished admissions instead. Deletes from
// non-HOSxP senders (admin-issued keys) keep their error-correction meaning.
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../../helpers/testDb';
import { SeedOrchestrator } from '@/db/seeds/index';
import type { DatabaseAdapter } from '@/db/adapter';
import {
  processWebhookPayload,
  summarizeWebhookDeletes,
  createApiKey,
  validateApiKey,
} from '@/services/webhook';
import { SseManager } from '@/lib/sse';
import { generateKey } from '@/lib/encryption';

process.env.ENCRYPTION_KEY = generateKey();

let db: DatabaseAdapter;
const HCODE = '99903';
const CID = '1100500090006';

async function hospitalId(): Promise<string> {
  const rows = await db.query<{ id: string }>('SELECT id FROM hospitals WHERE hcode = ?', [HCODE]);
  return rows[0].id;
}

async function admit(an: string): Promise<void> {
  await processWebhookPayload(
    db,
    await hospitalId(),
    {
      hospitalCode: HCODE,
      patients: [
        {
          an,
          hn: `HN-${an}`,
          cid: CID,
          name: 'นางทดสอบ ลบ',
          age: 28,
          admit_date: '2026-10-21T18:15:00Z',
          labor_status: 'ACTIVE',
        },
      ],
    } as never,
    SseManager.getInstance(),
  );
}

const deleteOf = (an: string) => ({
  hospitalCode: HCODE,
  patients: [{ an, hn: `HN-${an}`, cid: CID, name: 'นางทดสอบ ลบ', action: 'delete' }],
});

async function statusOf(an: string): Promise<string | null> {
  const rows = await db.query<{ labor_status: string }>(
    'SELECT labor_status FROM cached_patients WHERE hospital_id = ? AND an = ?',
    [await hospitalId(), an],
  );
  return rows[0]?.labor_status ?? null;
}

beforeEach(async () => {
  db = await createTestDb();
  await new SeedOrchestrator().run(db);
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO hospitals (id, hcode, name, level, is_active, connection_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), HCODE, 'รพ.ทดสอบ A-F10', 'M2', true, 'UNKNOWN', now, now],
  );
  SseManager.resetForTests();
});

describe('HOSxP labour delete guard (A-F10)', () => {
  it('a HOSxP-sent delete for an ACTIVE admission is ignored and reported', async () => {
    await admit('AN-1');
    const r = await processWebhookPayload(
      db,
      await hospitalId(),
      deleteOf('AN-1') as never,
      SseManager.getInstance(),
      { sender: 'hosxp' },
    );
    expect(await statusOf('AN-1')).toBe('ACTIVE');
    expect(r.deleted).toBe(0);
    expect(r.deleteIgnored).toBe(1);
  });

  it('a delete from a non-HOSxP sender still removes the admission (error correction)', async () => {
    await admit('AN-2');
    const r = await processWebhookPayload(
      db,
      await hospitalId(),
      deleteOf('AN-2') as never,
      SseManager.getInstance(),
      { sender: 'external' },
    );
    expect(await statusOf('AN-2')).toBeNull();
    expect(r.deleted).toBe(1);
    expect(r.deleteIgnored).toBeUndefined(); // absent when nothing ignored (GC7)
  });

  it('no sender given keeps the legacy behaviour (delete applies)', async () => {
    await admit('AN-3');
    await processWebhookPayload(
      db,
      await hospitalId(),
      deleteOf('AN-3') as never,
      SseManager.getInstance(),
    );
    expect(await statusOf('AN-3')).toBeNull();
  });

  it('a HOSxP delete for an AN that is not ACTIVE here still applies (nothing live to protect)', async () => {
    const r = await processWebhookPayload(
      db,
      await hospitalId(),
      deleteOf('AN-UNKNOWN') as never,
      SseManager.getInstance(),
      { sender: 'hosxp' },
    );
    expect(r.deleteIgnored).toBeUndefined(); // absent when nothing ignored (GC7)
  });
});

describe('validateApiKey reports who is sending', () => {
  it("a key confirmed as written into HOSxP's webhook_setting → sender 'hosxp'", async () => {
    const { id, rawKey } = await createApiKey(
      db,
      await hospitalId(),
      'HOSxP webhook_setting auto-provision',
    );
    await db.execute('UPDATE webhook_api_keys SET pushed_to_hosxp_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id,
    ]);
    expect((await validateApiKey(db, rawKey))?.sender).toBe('hosxp');
  });

  it("an admin-issued key (never pushed to HOSxP) → sender 'external'", async () => {
    const { rawKey } = await createApiKey(db, await hospitalId(), 'Non-HOSxP vendor');
    expect((await validateApiKey(db, rawKey))?.sender).toBe('external');
  });
});

describe('summarizeWebhookDeletes — every webhook delete is logged', () => {
  it('no deletes → null (nothing logged)', () => {
    expect(summarizeWebhookDeletes({ patients: [{ an: 'A1' }] })).toBeNull();
    expect(summarizeWebhookDeletes(null)).toBeNull();
  });

  it('labour: counts deletes and lists their ANs', () => {
    expect(
      summarizeWebhookDeletes({
        patients: [{ an: 'A1', action: 'delete' }, { an: 'A2' }, { an: 'A3', action: 'delete' }],
      }),
    ).toEqual({ payloadType: 'labor', count: 2, ans: ['A1', 'A3'] });
  });

  it('partograph: ANs + observation ids', () => {
    expect(
      summarizeWebhookDeletes({
        type: 'partograph',
        observations: [{ an: 'A1', externalObservationId: 'o-9', action: 'delete' }],
      }),
    ).toEqual({ payloadType: 'partograph', count: 1, ans: ['A1'], observationIds: ['o-9'] });
  });

  it('ANC: count only — ANC rows are keyed by CID/HN, which never reach logs', () => {
    const s = summarizeWebhookDeletes({
      type: 'anc_data',
      patients: [{ cid: CID, hn: 'HN-1', action: 'delete' }],
    });
    expect(s).toEqual({ payloadType: 'anc_data', count: 1 });
    expect(JSON.stringify(s)).not.toContain(CID);
  });

  it('referral / referral_update: the referral id', () => {
    expect(
      summarizeWebhookDeletes({ type: 'referral', referralId: 'R-1', action: 'delete' }),
    ).toEqual({
      payloadType: 'referral',
      count: 1,
      referralId: 'R-1',
    });
    expect(
      summarizeWebhookDeletes({ type: 'referral_update', referralId: 'R-2', action: 'delete' }),
    ).toEqual({ payloadType: 'referral_update', count: 1, referralId: 'R-2' });
  });
});
