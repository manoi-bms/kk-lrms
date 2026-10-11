// src/components/maternity/ward/WardHeaderActions.tsx
// PageHeader actions for the ward board: ward picker (only with more than one
// maternity ward), live HOSxP feed status, and a manual refresh.
'use client';

import { RefreshCw } from 'lucide-react';
import type { MaternityWard } from '@/types/maternity-ward';
import type { WardFeedHealth } from '@/hooks/useMaternityWardStateFull';
import { WARD_FEED_STATUS } from '@/config/ward-display';
import { StatusChip } from '@/components/shared/StatusChip';

export interface WardHeaderActionsProps {
  wards: MaternityWard[];
  selectedWard: string | null;
  onSelectWard: (ward: string) => void;
  health: WardFeedHealth;
  /** Raw feed error; shown as the chip tooltip while the feed is unhealthy. */
  errorMessage?: string;
  onRefresh: () => void;
}

export function WardHeaderActions({
  wards,
  selectedWard,
  onSelectWard,
  health,
  errorMessage,
  onRefresh,
}: WardHeaderActionsProps) {
  const feed = WARD_FEED_STATUS[health];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {wards.length > 1 && (
        <label className="inline-flex items-center gap-2 text-label text-ink-muted">
          วอร์ด
          <select
            value={selectedWard ?? ''}
            onChange={(e) => onSelectWard(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface-card px-3 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {wards.map((w) => (
              <option key={w.ward} value={w.ward}>
                {w.name} ({w.ward})
              </option>
            ))}
          </select>
        </label>
      )}
      <StatusChip
        tone={feed.tone}
        label={feed.labelTh}
        pulse={feed.pulse}
        title={health === 'ok' ? undefined : errorMessage}
      />
      <button
        type="button"
        onClick={onRefresh}
        aria-label="รีเฟรชข้อมูลเตียง"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-label text-white hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        รีเฟรช
      </button>
    </div>
  );
}
