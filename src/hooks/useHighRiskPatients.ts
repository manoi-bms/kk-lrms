// SWR hook for high-risk patients across all hospitals
'use client';

import useSWR from 'swr';
import type { HighRiskPatientsResponse } from '@/types/api';

export function useHighRiskPatients() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<HighRiskPatientsResponse>(
    '/api/dashboard/high-risk',
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    },
  );

  return {
    patients: data?.patients ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
