/**
 * E2E API Test: HOSxP PostgreSQL → Webhook API → KK-LRMS Dashboard
 *
 * This test reads real patient data from the HOSxP PostgreSQL database,
 * transforms it into webhook payload format, sends it to the production
 * KK-LRMS webhook API, and verifies the data appears correctly.
 *
 * Prerequisites:
 *   - HOSxP PostgreSQL accessible (configured via MCP or DATABASE_URL)
 *   - KK-LRMS running at KKLRMS_BASE_URL (default: http://localhost:3003)
 *   - A valid webhook API key (created by this test if not provided)
 *
 * Run: npx vitest run tests/e2e/webhook-api.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const BASE_URL = process.env.KKLRMS_BASE_URL ?? 'http://localhost:3003';
const HOSXP_DB_URL = process.env.HOSXP_DATABASE_URL ?? 'postgresql://hosxp:hosxp@localhost:5432/hosxp';
const HOSPITAL_CODE = '99999';

// These will be set during test setup
let apiKey: string;
let pgClient: pg.Client;

// ─── Helper functions ───

async function parseResponse(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
}

async function kklrmsPost(path: string, body: unknown, authHeader?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  return { status: res.status, data: await parseResponse(res) };
}

async function kklrmsGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, data: await parseResponse(res) };
}

async function kklrmsDelete(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  return { status: res.status, data: await parseResponse(res) };
}

// ─── Test Suite ───

describe('E2E: HOSxP → Webhook API → Dashboard', () => {
  beforeAll(async () => {
    // Connect to HOSxP PostgreSQL
    pgClient = new pg.Client(HOSXP_DB_URL);
    await pgClient.connect();

    // Verify KK-LRMS is running
    const health = await kklrmsGet('/api/health');
    expect(health.status).toBe(200);
    expect(health.data.status).toBe('healthy');
    console.log(`[E2E] KK-LRMS at ${BASE_URL} — ${health.data.status}, uptime: ${health.data.uptime}s`);

    // Verify HOSxP DB connection
    const dbResult = await pgClient.query('SELECT hospitalcode, hospitalname FROM opdconfig LIMIT 1');
    console.log(`[E2E] HOSxP DB — hospital: ${dbResult.rows[0]?.hospitalname} (${dbResult.rows[0]?.hospitalcode})`);
  });

  afterAll(async () => {
    await pgClient.end();
  });

  // ─── Step 1: Create webhook API key ───
  // Admin endpoints require session auth (not accessible via API alone)
  // Use KKLRMS_API_KEY env var if provided, or create key via direct DB access
  describe('Step 1: API Key Setup', () => {
    it('should have or create an API key for testing', async () => {
      // Option 1: Use pre-configured API key from env
      if (process.env.KKLRMS_API_KEY) {
        apiKey = process.env.KKLRMS_API_KEY;
        console.log(`[E2E] Using API key from env: ${apiKey.slice(0, 15)}...`);
        expect(apiKey).toMatch(/^kklrms_/);
        return;
      }

      // Option 2: Create via admin API (works if DEV_AUTH_BYPASS allows unauthenticated admin access)
      const createResult = await kklrmsPost('/api/admin/webhooks', {
        hcode: HOSPITAL_CODE,
        label: 'E2E Test Key',
      });

      if (createResult.status === 201) {
        apiKey = createResult.data.apiKey;
        console.log(`[E2E] API key created: ${apiKey.slice(0, 15)}...`);
        expect(apiKey).toMatch(/^kklrms_/);
      } else {
        // Admin endpoints require session auth — need to create key manually first
        // Run: curl -X POST http://localhost:3003/api/admin/webhooks -H "Content-Type: application/json" -d '{"hcode":"99999","label":"E2E Test"}'
        // Then set KKLRMS_API_KEY=kklrms_... when running this test
        console.log(`[E2E] Admin API returned ${createResult.status} — set KKLRMS_API_KEY env var`);
        console.log('[E2E] Continuing with error-path tests only');
        apiKey = 'kklrms_not_configured';
      }
    });
  });

  // ─── Step 2: Query HOSxP for active patients ───
  describe('Step 2: Read from HOSxP Database', () => {
    let hosxpPatients: Array<{
      an: string; hn: string; name: string; cid: string;
      age: number; regdate: string; ward: string;
      gravida: number | null; ga_weeks: number | null; anc_count: number | null;
    }>;

    it('should query active admissions from HOSxP', async () => {
      const result = await pgClient.query(`
        SELECT i.an, i.hn, i.regdate, i.ward,
               CONCAT(p.pname, p.fname, ' ', p.lname) AS name,
               p.cid,
               EXTRACT(YEAR FROM AGE(p.birthday))::int AS age,
               COALESCE(il.g, ip.preg_number) AS gravida,
               COALESCE(il.ga, ip.ga) AS ga_weeks,
               COALESCE(il.anc_count, ip.anc_complete::int) AS anc_count
        FROM ipt i
        JOIN patient p ON p.hn = i.hn
        LEFT JOIN ipt_pregnancy ip ON i.an = ip.an
        LEFT JOIN ipt_labour il ON i.an = il.an
        WHERE i.dchdate IS NULL
        ORDER BY i.regdate DESC
        LIMIT 10
      `);

      hosxpPatients = result.rows.map((r) => ({
        an: r.an,
        hn: r.hn,
        name: r.name,
        cid: r.cid,
        age: r.age,
        regdate: r.regdate,
        ward: r.ward,
        gravida: r.gravida ? Number(r.gravida) : null,
        ga_weeks: r.ga_weeks ? Number(r.ga_weeks) : null,
        anc_count: r.anc_count ? Number(r.anc_count) : null,
      }));

      console.log(`[E2E] HOSxP active patients: ${hosxpPatients.length}`);
      hosxpPatients.forEach((p) => {
        console.log(`  ${p.an} | ${p.name} | age:${p.age} | ward:${p.ward} | G:${p.gravida ?? '-'} GA:${p.ga_weeks ?? '-'}`);
      });

      expect(hosxpPatients.length).toBeGreaterThan(0);
    });

    it('should send patients to webhook API via full_snapshot', async () => {
      if (!apiKey || apiKey.includes('invalid')) {
        console.log('[E2E] Skipping — no valid API key');
        return;
      }

      // Transform HOSxP data to webhook format
      const payload = {
        mode: 'full_snapshot' as const,
        patients: hosxpPatients.map((p) => ({
          hn: p.hn,
          an: p.an,
          name: p.name,
          cid: p.cid,
          age: p.age,
          admit_date: new Date(p.regdate).toISOString(),
          ...(p.gravida != null && { gravida: p.gravida }),
          ...(p.ga_weeks != null && { ga_weeks: p.ga_weeks }),
          ...(p.anc_count != null && { anc_count: p.anc_count }),
        })),
      };

      console.log(`[E2E] Sending ${payload.patients.length} patients to webhook (full_snapshot)...`);

      const result = await kklrmsPost(
        '/api/webhooks/patient-data',
        payload,
        `Bearer ${apiKey}`,
      );

      console.log(`[E2E] Webhook response: ${result.status}`, JSON.stringify(result.data));

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.patientsProcessed).toBe(hosxpPatients.length);
      console.log(`[E2E] ✓ Processed: ${result.data.patientsProcessed}, New: ${result.data.newAdmissions}, Discharged: ${result.data.discharges}, Transfers: ${result.data.transfers}`);
    });
  });

  // ─── Step 3: Verify data on dashboard ───
  describe('Step 3: Verify Dashboard Data', () => {
    it('should show hospital as online on dashboard', async () => {
      if (!apiKey || apiKey.includes('invalid')) {
        console.log('[E2E] Skipping — no valid API key');
        return;
      }

      const dashboard = await kklrmsGet('/api/dashboard');
      expect(dashboard.status).toBe(200);

      const hospital = dashboard.data.hospitals?.find(
        (h: { hcode: string }) => h.hcode === HOSPITAL_CODE,
      );

      if (hospital) {
        console.log(`[E2E] Dashboard — ${hospital.name}: ${hospital.counts.total} patients, status: ${hospital.connectionStatus}`);
        expect(hospital.connectionStatus).toBe('ONLINE');
        expect(hospital.counts.total).toBeGreaterThan(0);
      } else {
        console.log(`[E2E] Hospital ${HOSPITAL_CODE} not found in dashboard (may not be registered)`);
      }
    });
  });

  // ─── Step 4: Test error cases ───
  describe('Step 4: API Error Handling', () => {
    it('should reject request without auth header', async () => {
      const result = await kklrmsPost('/api/webhooks/patient-data', {
        patients: [{ hn: 'X', an: 'X', name: 'X', age: 1, admit_date: '2026-01-01' }],
      });
      expect(result.status).toBe(401);
      expect(result.data.error).toContain('Authorization');
    });

    it('should reject invalid API key', async () => {
      const result = await kklrmsPost(
        '/api/webhooks/patient-data',
        { patients: [{ hn: 'X', an: 'X', name: 'X', age: 1, admit_date: '2026-01-01' }] },
        'Bearer kklrms_this_is_a_fake_key_1234567890abcdef',
      );
      expect(result.status).toBe(401);
      expect(result.data.error).toContain('Invalid');
    });

    it('should reject empty patients array', async () => {
      if (!apiKey || apiKey.includes('invalid')) return;
      const result = await kklrmsPost(
        '/api/webhooks/patient-data',
        { patients: [] },
        `Bearer ${apiKey}`,
      );
      expect(result.status).toBe(400);
    });

    it('should reject invalid mode', async () => {
      if (!apiKey || apiKey.includes('invalid')) return;
      const result = await kklrmsPost(
        '/api/webhooks/patient-data',
        { mode: 'invalid', patients: [{ hn: 'X', an: 'X', name: 'X', age: 1, admit_date: '2026-01-01' }] },
        `Bearer ${apiKey}`,
      );
      expect(result.status).toBe(400);
      expect(result.data.error).toContain('mode');
    });

    it('should reject payload missing required fields', async () => {
      if (!apiKey || apiKey.includes('invalid')) return;
      const result = await kklrmsPost(
        '/api/webhooks/patient-data',
        { patients: [{ hn: 'X' }] },
        `Bearer ${apiKey}`,
      );
      expect(result.status).toBe(400);
      expect(result.data.error).toContain('Validation');
    });
  });

  // ─── Step 5: Test incremental update ───
  describe('Step 5: Incremental Update', () => {
    it('should update a patient via incremental mode', async () => {
      if (!apiKey || apiKey.includes('invalid')) return;

      // Get first active patient from HOSxP
      const result = await pgClient.query(`
        SELECT i.an, i.hn, CONCAT(p.pname, p.fname, ' ', p.lname) AS name,
               EXTRACT(YEAR FROM AGE(p.birthday))::int AS age, i.regdate
        FROM ipt i JOIN patient p ON p.hn = i.hn
        WHERE i.dchdate IS NULL
        ORDER BY i.regdate DESC LIMIT 1
      `);

      if (result.rows.length === 0) return;
      const patient = result.rows[0];

      const updateResult = await kklrmsPost(
        '/api/webhooks/patient-data',
        {
          mode: 'incremental',
          patients: [{
            hn: patient.hn,
            an: patient.an,
            name: patient.name,
            age: patient.age,
            admit_date: new Date(patient.regdate).toISOString(),
            gravida: 2,
            ga_weeks: 39,
          }],
        },
        `Bearer ${apiKey}`,
      );

      console.log(`[E2E] Incremental update: ${updateResult.status}`, JSON.stringify(updateResult.data));
      expect(updateResult.status).toBe(200);
      expect(updateResult.data.patientsProcessed).toBe(1);
      expect(updateResult.data.newAdmissions).toBe(0); // Update, not new
    });
  });

  // ─── Step 6: Cleanup — revoke API key ───
  describe('Step 6: Cleanup', () => {
    it('should revoke the test API key', async () => {
      if (!apiKey || apiKey.includes('invalid')) return;

      // List keys to find our key ID
      const listResult = await kklrmsGet('/api/admin/webhooks');
      if (listResult.status !== 200) return;

      const testKey = listResult.data.keys?.find(
        (k: { label: string; isActive: boolean }) => k.label === 'E2E Test Key' && k.isActive,
      );

      if (testKey) {
        const revokeResult = await kklrmsDelete(`/api/admin/webhooks/${testKey.id}`);
        console.log(`[E2E] Revoked API key: ${testKey.id}`);
        expect(revokeResult.status).toBe(200);

        // Verify revoked key is rejected
        const rejectedResult = await kklrmsPost(
          '/api/webhooks/patient-data',
          { patients: [{ hn: 'X', an: 'X', name: 'X', age: 1, admit_date: '2026-01-01' }] },
          `Bearer ${apiKey}`,
        );
        expect(rejectedResult.status).toBe(401);
        console.log('[E2E] ✓ Revoked key correctly rejected');
      }
    });
  });
});
