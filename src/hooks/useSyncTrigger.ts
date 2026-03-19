// Hook to trigger immediate data sync for the user's hospital on dashboard load
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface SyncResult {
  synced: boolean;
  reason: string;
  hcode?: string;
  lastSyncAt: string | null;
  patientsCount?: number;
}

export function useSyncTrigger(onSyncComplete?: () => void) {
  const triggered = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/trigger', {
        method: 'POST',
      });

      if (response.ok) {
        const result: SyncResult = await response.json();
        setLastResult(result);
        if (result.synced) {
          onSyncComplete?.();
        }
      }
    } catch {
      // Best-effort — dashboard still shows cached data
    } finally {
      setSyncing(false);
    }
  }, [onSyncComplete]);

  // Auto-trigger once on mount
  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      triggerSync();
    }
  }, [triggerSync]);

  return { syncing, lastResult, triggerSync };
}
