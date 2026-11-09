// The labs route hands out decrypted HIV and syphilis results, so who may read
// them, and that each read leaves an audit row, is the point of these tests.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestDb } from '../../helpers/testDb';
import { testSessionUser } from '../../helpers/session';
import type { DatabaseAdapter } from '@/db/adapter';
import { generateKey } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { processAncWebhook, type WebhookAncPayload } from '@/services/webhook';
import type { SseManager } from '@/lib/sse';

let db: DatabaseAdapter;
let mockSessionUser: Record<string, unknown> | null = null;

vi.mock('@/db/connection', () => ({ getDatabase: async () => db }));
vi.mock('@/lib/auth', () => ({
  auth: async () => (mockSessionUser ? { user: mockSessionUser } : null),
}));
vi.mock('@/lib/ensure-init', () => ({ ensureInit: async () => {} }));

import { GET } from '@/app/api/journeys/[journeyId]/labs/route';

const REGISTERING = { id: '00000000-0000-4000-8000-0000000000c1', hcode: '99911' };
const UNRELATED = { id: '00000000-0000-4000-8000-0000000000c2', hcode: '99912' };
const REFERRED_TO = { id: '00000000-0000-4000-8000-0000000000c3', hcode: '99913' };
const VISITED = { id: '00000000-0000-4000-8000-0000000000c4', hcode: '99914' };
const UNKNOWN_JOURNEY = '00000000-0000-4000-8000-00000000dead';
const SECRET = 'Positive';

const sse = { broadcast(): void {} } as unknown as SseManager;

function call(journeyId: string) {
  return GET(new NextRequest(`http://localhost/api/journeys/${journeyId}/labs`), {
    params: Promise.resolve({ journeyId }),
  });
}

function signInAt(hcode: string, extra: Record<string, unknown> = {}) {
  mockSessionUser = { ...testSessionUser({ hospitalCode: hcode }), ...extra };
}

async function auditRows() {
  return db.query<{ action: string; resource_type: string; resource_id: string }>(
    'SELECT action, resource_type, resource_id FROM audit_logs',
  );
}

describe('GET /api/journeys/[journeyId]/labs', () => {
  let journeyId: string;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = generateKey();
  });

  beforeEach(async () => {
    db = await createTestDb();
    const now = new Date().toISOString();
    for (const h of [REGISTERING, UNRELATED, REFERRED_TO, VISITED]) {
      await db.execute(
        `INSERT INTO hospitals (id, hcode, name, level, is_active, connection_status, created_at, updated_at)
         VALUES (?, ?, ?, 'F1', true, 'ONLINE', ?, ?)`,
        [h.id, h.hcode, `รพ.${h.hcode}`, now, now],
      );
    }
    const payload = {
      type: 'anc_data',
      hospitalCode: REGISTERING.hcode,
      patients: [
        {
          hn: 'HN-L1',
          name: 'นาง ทดสอบ ผลแลบ',
          cid: '1100500090006',
          birthday: '1994-02-01',
          pregNo: 1,
          lmp: '2026-01-01T00:00:00Z',
          labResults: [
            {
              source: 'anc_lab',
              sourceId: '1',
              resultDate: '2026-03-01',
              labItemsName: 'Anti HIV (ANC)',
              result: SECRET,
            },
          ],
        },
      ],
    } as WebhookAncPayload;
    await processAncWebhook(db, REGISTERING.id, payload, sse);
    journeyId = (await db.query<{ id: string }>('SELECT id FROM maternal_journeys'))[0].id;
    mockSessionUser = null;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.close();
  });

  it('rejects a request with no session and writes no audit row', async () => {
    const res = await call(journeyId);
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    expect(await auditRows()).toHaveLength(0);
  });

  it('denies a hospital with no link to the journey, with an actionable Thai message', async () => {
    signInAt(UNRELATED.hcode);
    const res = await call(journeyId);
    expect(res.status).toBe(403);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain(SECRET);
    expect(text).toContain('ไม่มีสิทธิ์');
    expect(await auditRows()).toHaveLength(0);
  });

  it.each([
    ['ADMIN', { role: 'ADMIN' }],
    ['a read-only unit', { accessMode: 'readonly' }],
  ])('gives %s from an unrelated hospital no bypass', async (_label, extra) => {
    signInAt(UNRELATED.hcode, extra);
    expect((await call(journeyId)).status).toBe(403);
  });

  it('denies the exempt system hcodes too', async () => {
    signInAt('99999');
    expect((await call(journeyId)).status).toBe(403);
  });

  it('denies a session with no hospital code', async () => {
    signInAt(UNRELATED.hcode, { hospitalCode: undefined });
    expect((await call(journeyId)).status).toBe(403);
  });

  it('returns 404 for an unknown or malformed journey id', async () => {
    signInAt(REGISTERING.hcode);
    expect((await call(UNKNOWN_JOURNEY)).status).toBe(404);
    expect((await call('not-a-uuid')).status).toBe(404);
  });

  it('returns the labs to the registering hospital, uncached', async () => {
    signInAt(REGISTERING.hcode);
    const res = await call(journeyId);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = (await res.json()) as { results: Array<Record<string, unknown>> };
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({ canonicalTest: 'HIV', interpretation: 'positive' });
  });

  it('allows a hospital the woman was referred to or from', async () => {
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO cached_referrals
         (id, journey_id, from_hospital_id, to_hospital_id, status, urgency_level, reason, initiated_at, created_at, updated_at)
       VALUES ('00000000-0000-4000-8000-0000000000e1', ?, ?, ?, 'INITIATED', 'ROUTINE', 'x', ?, ?, ?)`,
      [journeyId, REGISTERING.id, REFERRED_TO.id, now, now, now],
    );
    signInAt(REFERRED_TO.hcode);
    expect((await call(journeyId)).status).toBe(200);
  });

  it('allows a hospital that holds an ANC visit on the journey', async () => {
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO cached_anc_visits (id, journey_id, hospital_id, visit_date, visit_number, synced_at, created_at)
       VALUES ('00000000-0000-4000-8000-0000000000e2', ?, ?, ?, 2, ?, ?)`,
      [journeyId, VISITED.id, now, now, now],
    );
    signInAt(VISITED.hcode);
    expect((await call(journeyId)).status).toBe(200);
  });

  it('writes one audit row for a successful read', async () => {
    signInAt(REGISTERING.hcode);
    await call(journeyId);
    expect(await auditRows()).toEqual([
      { action: 'VIEW_JOURNEY_LABS', resource_type: 'JOURNEY', resource_id: journeyId },
    ]);
  });

  it('keeps results out of the log when a read is denied or fails', async () => {
    const spies = [vi.spyOn(logger, 'warn'), vi.spyOn(logger, 'error'), vi.spyOn(logger, 'info')];
    signInAt(UNRELATED.hcode);
    await call(journeyId);
    signInAt(REGISTERING.hcode);
    vi.spyOn(db, 'query').mockRejectedValueOnce(new Error(`boom ${SECRET}`));
    const res = await call(journeyId);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    const logged = JSON.stringify(
      spies.flatMap((s) => s.mock.calls),
      (_k, v: unknown) => (v instanceof Error ? v.message : v),
    );
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain('ทดสอบ');
    expect(logged).not.toContain('1100500090006');
  });
});
