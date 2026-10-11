import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ConnectionStatus } from '@/types/domain';
import { useProvinceDashboard } from '@/hooks/useProvinceDashboard';
import { makeContinuum, makeHospital, makeSummary } from '../../helpers/dashboard-fixtures';

type SseOpts = { onPatientUpdate?: () => void; onConnectionStatus?: () => void; onSyncComplete?: () => void };
const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  hrMutate: vi.fn(),
  runNow: vi.fn(async () => null),
  sse: {} as { onPatientUpdate?: () => void; onConnectionStatus?: () => void; onSyncComplete?: () => void },
  dash: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/useDashboard', () => ({ useDashboard: () => h.dash }));
vi.mock('@/hooks/useHighRiskPatients', () => ({
  useHighRiskPatients: () => ({ patients: [], isLoading: false, mutate: h.hrMutate }),
}));
vi.mock('@/hooks/useSSE', () => ({
  useSSE: (o: SseOpts) => {
    h.sse = o;
    return { connectionState: 'reconnecting' };
  },
}));
vi.mock('@/hooks/useBrowserPoll', () => ({ useBrowserPoll: () => ({ state: { isRunning: true }, runNow: h.runNow }) }));
vi.mock('@/hooks/useOnboardHosxpWebhook', () => ({ useOnboardHosxpWebhook: () => ({ state: { ran: true, error: 'boom' } }) }));
vi.mock('@/hooks/useOnboardHosxpSync', () => ({ useOnboardHosxpSync: () => ({ state: { ran: false } }) }));

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  h.dash = {
    hospitals: [
      makeHospital({ hcode: '10670', connectionStatus: ConnectionStatus.ONLINE, lastSyncAt: hoursAgo(0.1) }),
      makeHospital({ hcode: '10671', connectionStatus: ConnectionStatus.OFFLINE, lastSyncAt: hoursAgo(3) }),
      makeHospital({ hcode: '99999', connectionStatus: ConnectionStatus.ONLINE, lastSyncAt: hoursAgo(0) }),
    ],
    summary: makeSummary(),
    stageKPIs: {},
    alerts: { referralAlerts: 0, overdueAnc: 0, dueSoon: 0 },
    trends: {},
    continuum: makeContinuum({ anc: { total: 5, hr3: 2, dueSoon: 3 } }),
    updatedAt: '2026-10-11T03:00:00Z',
    isLoading: false,
    error: undefined,
    mutate: h.mutate,
  };
});
afterEach(() => vi.useRealTimers());

describe('useProvinceDashboard', () => {
  it('derives counts like the page did — pseudo-hospitals excluded from freshness only', () => {
    const { result } = renderHook(() => useProvinceDashboard());
    expect(result.current.onlineCount).toBe(2); // includes 99999, as before
    expect(result.current.reportingCount).toBe(2); // 99999 excluded
    expect(result.current.freshCount).toBe(1); // 10671 is 3h stale
    expect(result.current.ancFallback).toEqual({ hr3: 2, dueSoon: 3 });
  });

  it('ancFallback is null without continuum', () => {
    h.dash.continuum = null;
    const { result } = renderHook(() => useProvinceDashboard());
    expect(result.current.ancFallback).toBeNull();
  });

  it('dataStale only when a fetch failed but a payload is cached', () => {
    h.dash.error = new Error('x');
    expect(renderHook(() => useProvinceDashboard()).result.current.dataStale).toBe(true);
    h.dash.updatedAt = null;
    expect(renderHook(() => useProvinceDashboard()).result.current.dataStale).toBe(false);
  });

  it('refreshAll revalidates both SWR keys; triggerSync polls first', async () => {
    const { result } = renderHook(() => useProvinceDashboard());
    act(() => result.current.refreshAll());
    expect(h.mutate).toHaveBeenCalledTimes(1);
    expect(h.hrMutate).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.triggerSync();
    });
    expect(h.runNow).toHaveBeenCalledTimes(1);
    expect(h.mutate).toHaveBeenCalledTimes(2);
  });

  it('SSE: connection events refetch the dashboard; patient events go through the debounce', () => {
    renderHook(() => useProvinceDashboard());
    h.sse.onConnectionStatus?.();
    expect(h.mutate).toHaveBeenCalledTimes(1);
    expect(h.hrMutate).not.toHaveBeenCalled();
    h.sse.onPatientUpdate?.(); // leading edge fires immediately
    h.sse.onPatientUpdate?.(); // coalesced into the trailing call
    expect(h.hrMutate).toHaveBeenCalledTimes(1);
  });

  it('passes through live state', () => {
    const { result } = renderHook(() => useProvinceDashboard());
    expect(result.current.sseState).toBe('reconnecting');
    expect(result.current.syncing).toBe(true);
    expect(result.current.onboardingError).toBe('boom');
    expect(result.current.hosxpSyncState).toEqual({ ran: false });
  });
});
