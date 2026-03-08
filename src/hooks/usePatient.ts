// T075: usePatient composite SWR hook
'use client';

import useSWR from 'swr';
import type { PatientDetailResponse, VitalSignsResponse, ContractionsResponse } from '@/types/api';

export function usePatient(an: string | null) {
  const { data: detail, isLoading: loadingDetail, error: detailError, mutate } = useSWR<PatientDetailResponse>(
    an ? `/api/patients/${an}` : null,
    { refreshInterval: 30000 },
  );

  const { data: vitalsData, isLoading: loadingVitals } = useSWR<VitalSignsResponse>(
    an ? `/api/patients/${an}/vitals` : null,
    { refreshInterval: 30000 },
  );

  const { data: contractionsData, isLoading: loadingContractions } = useSWR<ContractionsResponse>(
    an ? `/api/patients/${an}/contractions` : null,
    { refreshInterval: 30000 },
  );

  return {
    patient: detail?.patient ?? null,
    cpdScore: detail?.cpdScore ?? null,
    vitals: vitalsData?.vitals ?? [],
    contractions: contractionsData?.contractions ?? [],
    isLoading: loadingDetail || loadingVitals || loadingContractions,
    error: detailError,
    mutate,
  };
}
