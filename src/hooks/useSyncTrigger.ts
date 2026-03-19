// Hook to trigger immediate data sync on dashboard first load
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface SyncResult {
  total?: number;
  synced?: number;
  skipped?: number;
  synced_flag?: boolean;
  reason?: string;
}

export function useSyncTrigger(onSyncComplete?: () => void) {
  const triggered = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const triggerSync = useCallback(async (hospitalId?: string) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hospitalId ? { hospitalId } : {}),
      });

      if (response.ok) {
        const result = await response.json();
        setLastResult(result);
        onSyncComplete?.();
      }
    } catch {
      // Sync trigger is best-effort — dashboard still shows cached data
    } finally {
      setSyncing(false);
    }
  }, [onSyncComplete]);

  // Auto-trigger on mount (first dashboard load)
  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      triggerSync();
    }
  }, [triggerSync]);

  return { syncing, lastResult, triggerSync };
}
