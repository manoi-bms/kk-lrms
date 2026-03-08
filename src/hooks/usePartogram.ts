// T069: usePartogram SWR hook
'use client';

import useSWR from 'swr';
import type { PartogramResponse } from '@/types/api';

export function usePartogram(an: string | null) {
  const { data, isLoading, error, mutate } = useSWR<PartogramResponse>(
    an ? `/api/patients/${an}/partogram` : null,
    { refreshInterval: 30000 },
  );

  return {
    partogram: data?.partogram ?? null,
    isLoading,
    error,
    mutate,
  };
}
