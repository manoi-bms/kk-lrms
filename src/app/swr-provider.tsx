// SWR global provider with 30s deduping interval
'use client';

import { SWRConfig } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 30000,
        revalidateOnFocus: true,
        errorRetryCount: 3,
      }}
    >
      {children}
    </SWRConfig>
  );
}
