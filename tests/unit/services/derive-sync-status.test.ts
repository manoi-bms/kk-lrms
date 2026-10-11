import { describe, it, expect } from 'vitest';
import { deriveSyncStatus } from '@/services/dashboard';

const base = { has_bms_config: true, last_authenticity_status: null, data_purged_at: null, last_sync_at: '2026-10-11T05:00:00Z' };

describe('deriveSyncStatus', () => {
  it('purged -> BLOCKED with reason', () => {
    expect(deriveSyncStatus({ ...base, data_purged_at: '2026-10-10T00:00:00Z' })).toEqual({
      syncStatus: 'BLOCKED',
      syncBlockedReason: 'purged_pending_reonboard',
    });
  });
  it('authenticity failure -> BLOCKED', () => {
    expect(deriveSyncStatus({ ...base, last_authenticity_status: 'cid_unstable' })).toEqual({
      syncStatus: 'BLOCKED',
      syncBlockedReason: 'cid_unstable',
    });
  });
  it('no config or no sync -> NEVER_SYNCED', () => {
    expect(deriveSyncStatus({ ...base, has_bms_config: false }).syncStatus).toBe('NEVER_SYNCED');
    expect(deriveSyncStatus({ ...base, has_bms_config: 0 }).syncStatus).toBe('NEVER_SYNCED');
    expect(deriveSyncStatus({ ...base, last_sync_at: null }).syncStatus).toBe('NEVER_SYNCED');
  });
  it('otherwise OK', () => {
    expect(deriveSyncStatus({ ...base, has_bms_config: 1 })).toEqual({ syncStatus: 'OK', syncBlockedReason: null });
  });
});
