// T052: useDashboard SWR hook
'use client';

import useSWR from 'swr';
import type { DashboardResponse } from '@/types/api';

export function useDashboard() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardResponse>(
    '/api/dashboard',
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    },
  );

  return {
    hospitals: data?.hospitals ?? [],
    summary: data?.summary ?? { totalLow: 0, totalMedium: 0, totalHigh: 0, totalActive: 0 },
    updatedAt: data?.updatedAt ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
