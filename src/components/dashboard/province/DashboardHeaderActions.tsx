// PageHeader actions for `/`: live-update status, HOSxP sync status (opens
// the diagnostics dialog), manual sync with progress, kiosk.
'use client';

import { Info, Monitor, RefreshCw } from 'lucide-react';
import type { SseConnectionState } from '@/hooks/useSSE';
import { SSE_STATUS_META } from '@/config/sse-status';
import { StatusChip } from '@/components/shared/StatusChip';
import { HOSXP_SYNC_STATUS_TH, hosxpSyncTone, type HosxpSyncStatus, type HosxpSyncTone } from '@/lib/hosxp-sync-status';
import { STATUS_TONE } from '@/config/status-tone';
import { cn } from '@/lib/utils';

// Chip + dot come from STATUS_TONE; neutral keeps its card surface (not the
// muted tint) exactly as before the consolidation.
const HOSXP_CHIP: Record<HosxpSyncTone, { box: string; dot: string }> = {
  danger: { box: STATUS_TONE.danger.chip, dot: STATUS_TONE.danger.dot },
  ok: { box: STATUS_TONE.ok.chip, dot: STATUS_TONE.ok.dot },
  neutral: { box: `${STATUS_TONE.neutral.border} bg-surface-card ${STATUS_TONE.neutral.text}`, dot: STATUS_TONE.neutral.dot },
};

export interface DashboardHeaderActionsProps {
  sseState: SseConnectionState;
  hosxpStatus: HosxpSyncStatus;
  hosxpDetail: string;
  onOpenHosxp: () => void;
  syncing: boolean;
  onSync: () => void;
  onKiosk: () => void;
}

export function DashboardHeaderActions({
  sseState,
  hosxpStatus,
  hosxpDetail,
  onOpenHosxp,
  syncing,
  onSync,
  onKiosk,
}: DashboardHeaderActionsProps) {
  const sse = SSE_STATUS_META[sseState];
  const hosxpChip = HOSXP_CHIP[hosxpSyncTone(hosxpStatus)];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusChip tone={sse.tone} label={sse.labelTh} />
      <button
        type="button"
        onClick={onOpenHosxp}
        title={hosxpDetail}
        className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-label', hosxpChip.box)}
      >
        <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', hosxpChip.dot)} />
        HOSxP: {HOSXP_SYNC_STATUS_TH[hosxpStatus]}
        <Info aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 py-1.5 text-label text-ink transition-colors hover:bg-brand-soft disabled:opacity-60"
      >
        <RefreshCw aria-hidden="true" className={cn('h-4 w-4', syncing && 'animate-spin')} />
        {syncing ? 'กำลังดึงข้อมูล…' : 'ดึงข้อมูลทันที'}
      </button>
      <button
        type="button"
        onClick={onKiosk}
        title="เปิดโหมดจอภาพ (Kiosk Mode)"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-label text-white transition-colors hover:bg-brand-strong"
      >
        <Monitor aria-hidden="true" className="h-4 w-4" />
        โหมดจอภาพ
      </button>
    </div>
  );
}
