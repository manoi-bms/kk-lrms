// T053: useSSE hook — EventSource for real-time updates
'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { SsePatientUpdateEvent, SseConnectionStatusEvent } from '@/types/api';

interface UseSSEOptions {
  onPatientUpdate?: (event: SsePatientUpdateEvent) => void;
  onConnectionStatus?: (event: SseConnectionStatusEvent) => void;
  onSyncComplete?: (data: { hcode: string; patientsUpdated: number }) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/sse/dashboard');
    eventSourceRef.current = es;

    es.addEventListener('patient-update', (e) => {
      try {
        const data = JSON.parse(e.data) as SsePatientUpdateEvent;
        options.onPatientUpdate?.(data);
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('connection-status', (e) => {
      try {
        const data = JSON.parse(e.data) as SseConnectionStatusEvent;
        options.onConnectionStatus?.(data);
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('sync-complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        options.onSyncComplete?.(data);
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('connected', () => {
      reconnectAttemptRef.current = 0;
    });

    es.onerror = () => {
      es.close();
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      reconnectAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, [options]);

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
}
