// All data wiring for the provincial dashboard `/` (UI sub-project 2). Moved
// out of page.tsx unchanged: same SWR keys/intervals, same SSE debounce, same
// browser poll. Derived counts are recomputed every render (classifySyncHealth
// reads the clock), exactly as the page did.
'use client';

import { useCallback, useMemo } from 'react';
import { debounceLeadingTrailing, SSE_REFRESH_DEBOUNCE_MS } from '@/lib/debounce';
import { useDashboard } from '@/hooks/useDashboard';
import { useHighRiskPatients } from '@/hooks/useHighRiskPatients';
import { useSSE } from '@/hooks/useSSE';
import { useBrowserPoll } from '@/hooks/useBrowserPoll';
import { useOnboardHosxpWebhook } from '@/hooks/useOnboardHosxpWebhook';
import { useOnboardHosxpSync } from '@/hooks/useOnboardHosxpSync';
import { ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';
import { classifySyncHealth, isNonReportingHcode } from '@/config/hospital-network';

export function useProvinceDashboard() {
  // Auto-provisions HOSxP's webhook_setting row on first onboarding; no-op
  // without a BMS session / marketplace_token.
  const { state: onboardingState } = useOnboardHosxpWebhook();
  const { state: hosxpSyncState } = useOnboardHosxpSync();
  // Server-side polling is disabled in production: this browser poll keeps
  // this user's hospital fresh, and its SSE fan-out refreshes everyone.
  const { state: browserPollState, runNow } = useBrowserPoll();
  const dash = useDashboard();
  const hr = useHighRiskPatients();
  const { mutate } = dash;
  const hrMutate = hr.mutate;

  const refreshAll = useCallback(() => {
    mutate();
    hrMutate();
  }, [mutate, hrMutate]);

  // Manual refresh: run a poll cycle, then revalidate (the SSE fan-out stays
  // silent when no rows changed, but "ดึงข้อมูลทันที" must still feel live).
  const triggerSync = useCallback(async () => {
    await runNow();
    refreshAll();
  }, [runNow, refreshAll]);

  // Leading+trailing debounce — the 2026-07-17 79-req/s incident. Built over
  // the stable SWR mutates so the timer survives re-renders.
  const debouncedSseRefresh = useMemo(
    () =>
      debounceLeadingTrailing(() => {
        mutate();
        hrMutate();
      }, SSE_REFRESH_DEBOUNCE_MS),
    [mutate, hrMutate],
  );
  const { connectionState: sseState } = useSSE({
    onPatientUpdate: debouncedSseRefresh,
    onConnectionStatus: () => mutate(),
    onSyncComplete: debouncedSseRefresh,
  });

  const { hospitals, continuum } = dash;
  // Pseudo-hospitals (00000/99999) never sync: excluded from the freshness
  // numerator and denominator so this agrees with the status strip.
  const reporting = hospitals.filter((h) => !isNonReportingHcode(h.hcode));

  return {
    hospitals,
    summary: dash.summary,
    stageKPIs: dash.stageKPIs,
    alerts: dash.alerts,
    trends: dash.trends,
    continuum,
    updatedAt: dash.updatedAt,
    isLoading: dash.isLoading,
    error: dash.error,
    highRiskPatients: hr.patients,
    hrLoading: hr.isLoading,
    sseState,
    hosxpSyncState,
    onboardingError: onboardingState?.error ?? null,
    syncing: browserPollState.isRunning,
    refreshAll,
    triggerSync,
    // Fetch failed but SWR still holds the last good payload (Constitution VI).
    dataStale: Boolean(dash.error && dash.updatedAt),
    onlineCount: hospitals.filter((h) => h.connectionStatus === ConnectionStatusEnum.ONLINE).length,
    reportingCount: reporting.length,
    freshCount: reporting.filter((h) => classifySyncHealth(h.syncStatus, h.lastSyncAt) === 'ok').length,
    ancFallback: continuum ? { hr3: continuum.anc.hr3, dueSoon: continuum.anc.dueSoon } : null,
  };
}

export type ProvinceDashboard = ReturnType<typeof useProvinceDashboard>;
