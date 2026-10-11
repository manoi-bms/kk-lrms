// ภาพรวมโรงพยาบาล — the province map + hospital list. Rendered ONCE (the old
// page mounted two Leaflet maps: a desktop aside and a hidden mobile copy).
// When the page container is ≥ 1160px it is the sticky right column, offset
// by the shell header height (--app-header-h, published by AppHeader); below
// that it stacks after the sections with a 360px map.
'use client';

import { Expand } from 'lucide-react';
import type { DashboardHospital } from '@/types/api';
import { ProvinceMap } from '@/components/dashboard/ProvinceMap';
import { HospitalTable } from '@/components/dashboard/HospitalTable';
import { cn } from '@/lib/utils';
import { OverviewModeToggle, type OverviewMode } from './OverviewModeToggle';

export interface ProvinceOverviewPanelProps {
  hospitals: DashboardHospital[];
  onlineCount: number;
  selected: string | null;
  onSelect: (hcode: string | null) => void;
  mode: OverviewMode;
  onModeChange: (mode: OverviewMode) => void;
  onExpand: () => void;
}

const STICKY =
  '@min-[1160px]:sticky @min-[1160px]:top-[calc(var(--app-header-h,0px)_+_16px)] @min-[1160px]:h-[calc(100dvh_-_var(--app-header-h,0px)_-_32px)]';

export function ProvinceOverviewPanel({
  hospitals,
  onlineCount,
  selected,
  onSelect,
  mode,
  onModeChange,
  onExpand,
}: ProvinceOverviewPanelProps) {
  return (
    <section
      aria-label="ภาพรวมโรงพยาบาล"
      data-testid="province-overview"
      className={cn('flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-card shadow-soft', STICKY)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-title text-brand">ภาพรวมโรงพยาบาล</h2>
          <p className="text-caption text-ink-muted">
            เชื่อมต่ออยู่{' '}
            <span className="tabular-nums">
              {onlineCount}/{hospitals.length}
            </span>{' '}
            แห่ง
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <OverviewModeToggle mode={mode} onChange={onModeChange} />
          <button
            type="button"
            onClick={onExpand}
            aria-label="ขยายแผนที่เต็มจอ"
            title="ขยายเต็มจอ"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-label text-brand hover:bg-brand-soft"
          >
            <Expand aria-hidden="true" className="h-4 w-4" />
            ขยาย
          </button>
        </div>
      </header>
      {mode === 'map' ? (
        <>
          <div className="h-[360px] min-h-0 @min-[1160px]:h-auto @min-[1160px]:flex-1">
            <ProvinceMap hospitals={hospitals} selected={selected} onSelect={onSelect} size="full" />
          </div>
          {/* Row click → /hospitals/<hcode>; onSelect still fires so the map
              marker highlights during the route transition. */}
          <div className="min-h-0 border-t border-border @min-[1160px]:max-h-[36%] @min-[1160px]:shrink-0 @min-[1160px]:overflow-auto">
            <HospitalTable hospitals={hospitals} selected={selected} onSelect={onSelect} navigateOnClick />
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <HospitalTable hospitals={hospitals} selected={selected} onSelect={onSelect} navigateOnClick />
        </div>
      )}
    </section>
  );
}
