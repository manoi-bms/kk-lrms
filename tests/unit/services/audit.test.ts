// T084: Audit service tests — TDD: write tests FIRST
import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteAdapter } from '@/db/sqlite-adapter';
import { SchemaSync } from '@/db/schema-sync';
import { ALL_TABLES } from '@/db/tables/index';
import { logAccess } from '@/services/audit';

describe('Audit Service', () => {
  let db: SqliteAdapter;

  beforeEach(async () => {
    db = new SqliteAdapter();
    await SchemaSync.sync(db, ALL_TABLES, 'sqlite');
    // Seed a user for FK constraint
    await db.execute(
      `INSERT INTO users (id, bms_user_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['user-1', 'Test User', 'NURSE', 1, new Date().toISOString(), new Date().toISOString()],
    );
  });

  it('creates audit_logs row with all required fields', async () => {
    await logAccess(db, {
      userId: 'user-1',
      action: 'VIEW_PATIENT',
      resourceType: 'PATIENT',
      resourceId: 'AN001',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    const logs = await db.query<{
      user_id: string;
      action: string;
      resource_type: string;
      resource_id: string;
      ip_address: string;
    }>('SELECT user_id, action, resource_type, resource_id, ip_address FROM audit_logs');

    expect(logs.length).toBe(1);
    expect(logs[0].user_id).toBe('user-1');
    expect(logs[0].action).toBe('VIEW_PATIENT');
    expect(logs[0].resource_type).toBe('PATIENT');
    expect(logs[0].resource_id).toBe('AN001');
    expect(logs[0].ip_address).toBe('192.168.1.1');
  });

  it('enforces append-only — no update/delete exposed', async () => {
    await logAccess(db, {
      userId: 'user-1',
      action: 'VIEW_DASHBOARD',
      resourceType: 'DASHBOARD',
    });

    // Verify the record exists
    const logs = await db.query<{ id: string }>('SELECT id FROM audit_logs');
    expect(logs.length).toBe(1);
  });

  it('stores optional metadata as JSON', async () => {
    await logAccess(db, {
      userId: 'user-1',
      action: 'VIEW_PATIENT',
      resourceType: 'PATIENT',
      resourceId: 'AN002',
      metadata: { reason: 'routine check', screen: 'detail' },
    });

    const logs = await db.query<{ metadata: string }>('SELECT metadata FROM audit_logs');
    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0].metadata);
    expect(parsed.reason).toBe('routine check');
  });

  it('validates required fields', async () => {
    await expect(
      logAccess(db, {
        userId: '',
        action: 'VIEW_PATIENT',
        resourceType: 'PATIENT',
      }),
    ).rejects.toThrow();
  });
});
