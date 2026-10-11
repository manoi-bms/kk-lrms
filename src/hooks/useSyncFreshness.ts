// src/hooks/useSyncFreshness.ts
'use client';
// Polls a 15s server-cached endpoint every 30s. Deliberately no SSE here:
// useSSE opens one EventSource per call, and the strip is on every page.
import useSWR from 'swr';
import type { FreshnessSummary } from '@/types/sync-freshness';

const REFRESH_MS = 30_000;

async function fetchFreshness(url: string): Promise<FreshnessSummary> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as FreshnessSummary;
}

export function useSyncFreshness() {
  return useSWR<FreshnessSummary, Error>('/api/sync/freshness', fetchFreshness, {
    refreshInterval: REFRESH_MS,
    revalidateOnFocus: true,
  });
}
