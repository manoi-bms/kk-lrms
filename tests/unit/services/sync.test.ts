// T045: Sync service tests — write FIRST (TDD)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'crypto';
import { SqliteAdapter } from '@/db/sqlite-adapter';
import { SchemaSync } from '@/db/schema-sync';
import { ALL_TABLES } from '@/db/tables/index';
import { SeedOrchestrator } from '@/db/seeds/index';
import {
  transformHosxpPatient,
  upsertCachedPatients,
  detectChanges,
  detectTransfers,
} from '@/services/sync';
import type { SyncPatientData, TransferDetection } from '@/services/sync';
import type { HosxpIptRow, HosxpPregnancyRow, HosxpPatientRow } from '@/types/hosxp';
import type { DatabaseAdapter } from '@/db/adapter';
import { LaborStatus } from '@/types/domain';

describe('Sync Service', () => {
  let db: SqliteAdapter;

  beforeEach(async () => {
    db = new SqliteAdapter(':memory:');
    await SchemaSync.sync(db, ALL_TABLES, 'sqlite');
    await new SeedOrchestrator().run(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('transformHosxpPatient', () => {
    it('should map HOSxP rows to CachedPatient fields', () => {
      const ipt: HosxpIptRow = {
        an: '6700012345',
        hn: '000105188',
        regdate: '2026-03-08',
        regtime: '02:30:00',
        dchdate: null,
        dchtime: null,
        ward: 'OB',
        admdoctor: 'DR001',
      };
      const pregnancy: HosxpPregnancyRow = {
        an: '6700012345',
        preg_number: 2,
        ga: 39,
        labor_date: null,
        anc_complete: null,
        child_count: null,
        deliver_type: null,
      };
      const patient: HosxpPatientRow = {
        hn: '000105188',
        pname: 'นาง',
        fname: 'สมหญิง',
        lname: 'ทดสอบ',
        cid: '1400512345678',
        birthday: '1998-05-15',
        sex: '2',
      };

      const result = transformHosxpPatient(ipt, pregnancy, patient, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
      expect(result.hn).toBe('000105188');
      expect(result.an).toBe('6700012345');
      expect(result.gravida).toBe(2);
      expect(result.gaWeeks).toBe(39);
      expect(result.age).toBeGreaterThan(0);
      expect(result.laborStatus).toBe('ACTIVE');
      // Name should be encrypted (not plain text)
      expect(result.name).not.toBe('นาง สมหญิง ทดสอบ');
    });
  });

  describe('upsertCachedPatients', () => {
    it('should insert new patients', async () => {
      const hospitals = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospitalId = hospitals[0].id;

      const patients: SyncPatientData[] = [
        {
          hn: '000105188',
          an: '6700012345',
          name: 'encrypted-name',
          cid: 'encrypted-cid',
          cidHash: null,
          age: 28,
          gravida: 2,
          gaWeeks: 39,
          ancCount: 8,
          admitDate: '2026-03-08T02:30:00',
          laborStatus: 'ACTIVE',
          syncedAt: new Date().toISOString(),
        },
      ];

      const count = await upsertCachedPatients(db, hospitalId, patients);
      expect(count).toBe(1);

      const rows = await db.query<{ an: string }>('SELECT an FROM cached_patients');
      expect(rows).toHaveLength(1);
      expect(rows[0].an).toBe('6700012345');
    });

    it('should update existing patients on conflict', async () => {
      const hospitals = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospitalId = hospitals[0].id;

      const patient: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name',
        cid: null,
        cidHash: null,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };

      await upsertCachedPatients(db, hospitalId, [patient]);
      // Update with new GA
      await upsertCachedPatients(db, hospitalId, [{ ...patient, gaWeeks: 40 }]);

      const rows = await db.query<{ ga_weeks: number }>('SELECT ga_weeks FROM cached_patients');
      expect(rows).toHaveLength(1);
      expect(rows[0].ga_weeks).toBe(40);
    });
  });

  describe('detectChanges', () => {
    it('should return list of changed ANs', async () => {
      const hospitals = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospitalId = hospitals[0].id;

      // Insert a patient
      const patient: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name',
        cid: null,
        cidHash: null,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };

      await upsertCachedPatients(db, hospitalId, [patient]);

      // New data includes the same patient with different GA
      const newData = [{ ...patient, gaWeeks: 40 }];
      const existingAns = ['6700012345'];
      const changes = detectChanges(newData, existingAns);
      // Since 6700012345 exists, no new admissions
      expect(changes.newAdmissions).toHaveLength(0);
    });

    it('should detect new admissions', () => {
      const newData = [
        { an: '6700099999', hn: '000199999', laborStatus: 'ACTIVE' },
      ];
      const existingAns: string[] = [];
      const changes = detectChanges(newData as any, existingAns);
      expect(changes.newAdmissions).toHaveLength(1);
      expect(changes.newAdmissions[0]).toBe('6700099999');
    });
  });

  describe('T104: CID hash and cross-hospital linking', () => {
    const encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    it('should compute cidHash in transformHosxpPatient when CID is available', () => {
      const ipt: HosxpIptRow = {
        an: '6700012345',
        hn: '000105188',
        regdate: '2026-03-08',
        regtime: '02:30:00',
        dchdate: null,
        dchtime: null,
        ward: 'OB',
        admdoctor: 'DR001',
      };
      const pregnancy: HosxpPregnancyRow = {
        an: '6700012345',
        preg_number: 2,
        ga: 39,
        labor_date: null,
        anc_complete: null,
        child_count: null,
        deliver_type: null,
      };
      const patient: HosxpPatientRow = {
        hn: '000105188',
        pname: 'นาง',
        fname: 'สมหญิง',
        lname: 'ทดสอบ',
        cid: '1400512345678',
        birthday: '1998-05-15',
        sex: '2',
      };

      const result = transformHosxpPatient(ipt, pregnancy, patient, encryptionKey);
      // cidHash should be a SHA-256 hex string of the raw CID
      const expectedHash = createHash('sha256').update('1400512345678').digest('hex');
      expect(result.cidHash).toBe(expectedHash);
    });

    it('should set cidHash to null when CID is empty', () => {
      const ipt: HosxpIptRow = {
        an: '6700012345',
        hn: '000105188',
        regdate: '2026-03-08',
        regtime: '02:30:00',
        dchdate: null,
        dchtime: null,
        ward: 'OB',
        admdoctor: 'DR001',
      };
      const pregnancy: HosxpPregnancyRow = {
        an: '6700012345',
        preg_number: 2,
        ga: 39,
        labor_date: null,
        anc_complete: null,
        child_count: null,
        deliver_type: null,
      };
      const patient: HosxpPatientRow = {
        hn: '000105188',
        pname: 'นาง',
        fname: 'สมหญิง',
        lname: 'ทดสอบ',
        cid: '',
        birthday: '1998-05-15',
        sex: '2',
      };

      const result = transformHosxpPatient(ipt, pregnancy, patient, encryptionKey);
      expect(result.cidHash).toBeNull();
    });

    it('should store cid_hash in database via upsertCachedPatients', async () => {
      const hospitals = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospitalId = hospitals[0].id;
      const cidHash = createHash('sha256').update('1400512345678').digest('hex');

      const patients: SyncPatientData[] = [
        {
          hn: '000105188',
          an: '6700012345',
          name: 'encrypted-name',
          cid: 'encrypted-cid',
          cidHash,
          age: 28,
          gravida: 2,
          gaWeeks: 39,
          ancCount: 8,
          admitDate: '2026-03-08T02:30:00',
          laborStatus: 'ACTIVE',
          syncedAt: new Date().toISOString(),
        },
      ];

      await upsertCachedPatients(db, hospitalId, patients);

      const rows = await db.query<{ cid_hash: string | null }>(
        'SELECT cid_hash FROM cached_patients WHERE an = ?',
        ['6700012345'],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].cid_hash).toBe(cidHash);
    });

    it('should find same patient across hospitals by cid_hash', async () => {
      const hospital10670 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospital10671 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10671'",
      );
      const hospitalIdA = hospital10670[0].id;
      const hospitalIdB = hospital10671[0].id;
      const cidHash = createHash('sha256').update('1400512345678').digest('hex');

      // Insert same patient at two hospitals with same cid_hash but different HN/AN
      const patientA: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name-a',
        cid: 'encrypted-cid-a',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };
      const patientB: SyncPatientData = {
        hn: '000299999',
        an: '6700099999',
        name: 'encrypted-name-b',
        cid: 'encrypted-cid-b',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T06:00:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };

      await upsertCachedPatients(db, hospitalIdA, [patientA]);
      await upsertCachedPatients(db, hospitalIdB, [patientB]);

      // Query by cid_hash should find both records
      const rows = await db.query<{ hospital_id: string; an: string }>(
        'SELECT hospital_id, an FROM cached_patients WHERE cid_hash = ?',
        [cidHash],
      );
      expect(rows).toHaveLength(2);
      const hospitalIds = rows.map((r) => r.hospital_id);
      expect(hospitalIds).toContain(hospitalIdA);
      expect(hospitalIds).toContain(hospitalIdB);
    });
  });

  describe('T107: Patient transfer detection', () => {
    it('should detect transfer when same CID hash appears at new hospital', async () => {
      const hospital10670 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospital10671 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10671'",
      );
      const hospitalIdA = hospital10670[0].id;
      const hospitalIdB = hospital10671[0].id;
      const cidHash = createHash('sha256').update('1400512345678').digest('hex');

      // Patient exists at hospital A (ACTIVE)
      const patientA: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name-a',
        cid: 'encrypted-cid-a',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };
      await upsertCachedPatients(db, hospitalIdA, [patientA]);

      // Same patient now appears at hospital B
      const patientB: SyncPatientData = {
        hn: '000299999',
        an: '6700099999',
        name: 'encrypted-name-b',
        cid: 'encrypted-cid-b',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T06:00:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };

      // detectTransfers should identify this as a transfer from A to B
      const transfers = await detectTransfers(db, hospitalIdB, [patientB]);
      expect(transfers).toHaveLength(1);
      expect(transfers[0].cidHash).toBe(cidHash);
      expect(transfers[0].fromHospitalId).toBe(hospitalIdA);
      expect(transfers[0].fromAn).toBe('6700012345');
      expect(transfers[0].toHospitalId).toBe(hospitalIdB);
      expect(transfers[0].toAn).toBe('6700099999');
    });

    it('should NOT detect transfer for patient already at same hospital', async () => {
      const hospital10670 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospitalIdA = hospital10670[0].id;
      const cidHash = createHash('sha256').update('1400512345678').digest('hex');

      // Patient exists at hospital A (ACTIVE)
      const patient: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name',
        cid: 'encrypted-cid',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };
      await upsertCachedPatients(db, hospitalIdA, [patient]);

      // Same patient synced again at same hospital — NOT a transfer
      const transfers = await detectTransfers(db, hospitalIdA, [patient]);
      expect(transfers).toHaveLength(0);
    });

    it('should NOT detect transfer for patients without CID hash', async () => {
      const hospital10670 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospitalIdA = hospital10670[0].id;

      // Patient without CID hash
      const patient: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name',
        cid: null,
        cidHash: null,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };
      await upsertCachedPatients(db, hospitalIdA, [patient]);

      const transfers = await detectTransfers(db, hospitalIdA, [patient]);
      expect(transfers).toHaveLength(0);
    });

    it('should NOT detect transfer when existing patient is already DELIVERED', async () => {
      const hospital10670 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospital10671 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10671'",
      );
      const hospitalIdA = hospital10670[0].id;
      const hospitalIdB = hospital10671[0].id;
      const cidHash = createHash('sha256').update('1400512345678').digest('hex');

      // Patient at hospital A is already DELIVERED
      const patientA: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name-a',
        cid: 'encrypted-cid-a',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'DELIVERED',
        syncedAt: new Date().toISOString(),
      };
      await upsertCachedPatients(db, hospitalIdA, [patientA]);

      // Same patient appears at hospital B — should NOT be flagged as transfer
      // because the original was already delivered
      const patientB: SyncPatientData = {
        hn: '000299999',
        an: '6700099999',
        name: 'encrypted-name-b',
        cid: 'encrypted-cid-b',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T06:00:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };

      const transfers = await detectTransfers(db, hospitalIdB, [patientB]);
      expect(transfers).toHaveLength(0);
    });

    it('should NOT detect transfer when existing patient is already TRANSFERRED', async () => {
      const hospital10670 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10670'",
      );
      const hospital10671 = await db.query<{ id: string }>(
        "SELECT id FROM hospitals WHERE hcode = '10671'",
      );
      const hospitalIdA = hospital10670[0].id;
      const hospitalIdB = hospital10671[0].id;
      const cidHash = createHash('sha256').update('1400512345678').digest('hex');

      // Patient at hospital A already marked as TRANSFERRED
      const patientA: SyncPatientData = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name-a',
        cid: 'encrypted-cid-a',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T02:30:00',
        laborStatus: 'TRANSFERRED',
        syncedAt: new Date().toISOString(),
      };
      await upsertCachedPatients(db, hospitalIdA, [patientA]);

      const patientB: SyncPatientData = {
        hn: '000299999',
        an: '6700099999',
        name: 'encrypted-name-b',
        cid: 'encrypted-cid-b',
        cidHash,
        age: 28,
        gravida: 2,
        gaWeeks: 39,
        ancCount: 8,
        admitDate: '2026-03-08T06:00:00',
        laborStatus: 'ACTIVE',
        syncedAt: new Date().toISOString(),
      };

      const transfers = await detectTransfers(db, hospitalIdB, [patientB]);
      expect(transfers).toHaveLength(0);
    });

    it('TRANSFERRED should be a valid LaborStatus enum value', () => {
      expect(LaborStatus.TRANSFERRED).toBe('TRANSFERRED');
    });
  });
});
