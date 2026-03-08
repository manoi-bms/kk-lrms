// T045: Sync service tests — write FIRST (TDD)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SqliteAdapter } from '@/db/sqlite-adapter';
import { SchemaSync } from '@/db/schema-sync';
import { ALL_TABLES } from '@/db/tables/index';
import { SeedOrchestrator } from '@/db/seeds/index';
import {
  transformHosxpPatient,
  upsertCachedPatients,
  detectChanges,
} from '@/services/sync';
import type { HosxpIptRow, HosxpPregnancyRow, HosxpPatientRow } from '@/types/hosxp';
import type { DatabaseAdapter } from '@/db/adapter';

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

      const patients = [
        {
          hn: '000105188',
          an: '6700012345',
          name: 'encrypted-name',
          cid: 'encrypted-cid',
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

      const patient = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name',
        cid: null,
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
      const patient = {
        hn: '000105188',
        an: '6700012345',
        name: 'encrypted-name',
        cid: null,
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
});
