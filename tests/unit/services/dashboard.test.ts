// T046: Dashboard service tests — write FIRST (TDD)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteAdapter } from '@/db/sqlite-adapter';
import { SchemaSync } from '@/db/schema-sync';
import { ALL_TABLES } from '@/db/tables/index';
import { SeedOrchestrator } from '@/db/seeds/index';
import { getProvinceDashboard, getSummaryTotals } from '@/services/dashboard';
import { v4 as uuidv4 } from 'uuid';

describe('Dashboard Service', () => {
  let db: SqliteAdapter;

  beforeEach(async () => {
    db = new SqliteAdapter(':memory:');
    await SchemaSync.sync(db, ALL_TABLES, 'sqlite');
    await new SeedOrchestrator().run(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it('should return all hospitals with zero counts when no patients', async () => {
    const result = await getProvinceDashboard(db);
    expect(result.hospitals).toHaveLength(26);
    for (const h of result.hospitals) {
      expect(h.counts.total).toBe(0);
      expect(h.counts.low).toBe(0);
      expect(h.counts.medium).toBe(0);
      expect(h.counts.high).toBe(0);
    }
  });

  it('should count patients by risk level per hospital', async () => {
    // Get a hospital ID
    const hospitals = await db.query<{ id: string }>(
      "SELECT id FROM hospitals WHERE hcode = '10670'",
    );
    const hospitalId = hospitals[0].id;
    const now = new Date().toISOString();

    // Insert test patients
    const patientId1 = uuidv4();
    const patientId2 = uuidv4();
    await db.execute(
      'INSERT INTO cached_patients (id, hospital_id, hn, an, name, age, admit_date, labor_status, synced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId1, hospitalId, 'HN001', 'AN001', 'enc-name-1', 28, now, 'ACTIVE', now, now, now],
    );
    await db.execute(
      'INSERT INTO cached_patients (id, hospital_id, hn, an, name, age, admit_date, labor_status, synced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId2, hospitalId, 'HN002', 'AN002', 'enc-name-2', 32, now, 'ACTIVE', now, now, now],
    );

    // Insert CPD scores
    await db.execute(
      'INSERT INTO cpd_scores (id, patient_id, score, risk_level, calculated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), patientId1, 3.5, 'LOW', now, now],
    );
    await db.execute(
      'INSERT INTO cpd_scores (id, patient_id, score, risk_level, calculated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), patientId2, 11, 'HIGH', now, now],
    );

    const result = await getProvinceDashboard(db);
    const hospital = result.hospitals.find((h) => h.hcode === '10670');
    expect(hospital).toBeDefined();
    expect(hospital!.counts.total).toBe(2);
    expect(hospital!.counts.low).toBe(1);
    expect(hospital!.counts.high).toBe(1);
  });

  it('should handle hospitals with OFFLINE status', async () => {
    // Update a hospital status
    await db.execute("UPDATE hospitals SET connection_status = 'OFFLINE' WHERE hcode = '10670'");

    const result = await getProvinceDashboard(db);
    const hospital = result.hospitals.find((h) => h.hcode === '10670');
    expect(hospital!.connectionStatus).toBe('OFFLINE');
  });

  describe('getSummaryTotals', () => {
    it('should aggregate counts across all hospitals', () => {
      const hospitals = [
        { hcode: '10670', counts: { low: 1, medium: 2, high: 0, total: 3 } },
        { hcode: '10671', counts: { low: 0, medium: 1, high: 1, total: 2 } },
      ];
      const summary = getSummaryTotals(hospitals as any);
      expect(summary.totalLow).toBe(1);
      expect(summary.totalMedium).toBe(3);
      expect(summary.totalHigh).toBe(1);
      expect(summary.totalActive).toBe(5);
    });
  });
});
