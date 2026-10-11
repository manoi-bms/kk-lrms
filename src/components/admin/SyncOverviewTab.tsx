// Province-wide sync status table — one row per active hospital. Reads
// /api/admin/sync-overview which aggregates the latest poll-cycle run
// for every hospital from Redis (progress-store.ts).
//
// Each row shows: outcome badge, trigger source, started/duration,
// authenticity status, and the latest error message (if any). Click a
// row to jump into the per-hospital edit dialog's Sync Log tab for the
// full step trail.
'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  HospitalEditDialog,
  type AdminHospital,
} from '@/components/admin/HospitalEditDialog';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/shared/SectionCard';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusPill } from '@/components/admin/admin-ui';
import {
  SYNC_OUTCOME_META,
  SYNC_OVERVIEW_POLL_MS,
  formatSyncDuration,
  syncTriggerLabel,
  type SyncOverviewOutcome,
  type SyncRunOutcome,
} from '@/config/sync-run-status';
import { cn, formatRelativeTime } from '@/lib/utils';

interface SyncStep {
  name: string;
  status: 'running' | 'success' | 'warning' | 'error' | 'info';
  message: string;
  detail?: string;
  counts?: Record<string, number>;
  at: string;
}

interface SyncRun {
  runId: string;
  hospitalId: string;
  hcode: string;
  trigger: 'scheduled' | 'immediate' | 'onboarding';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  outcome: SyncRunOutcome;
  finalMessage: string | null;
  errorMessage: string | null;
  steps: SyncStep[];
}

interface OverviewEntry {
  hcode: string;
  name: string;
  level: string;
  isActive: boolean;
  connectionStatus: string;
  lastSyncAt: string | null;
  authenticity: {
    status: string | null;
    reason: string | null;
    checkedAt: string | null;
    isFailure: boolean;
  };
  dataPurgedAt: string | null;
  hasBmsConfig: boolean;
  latestRun: SyncRun | null;
}

interface OverviewResponse {
  hospitals: OverviewEntry[];
  total: number;
  updatedAt: string;
}

type FilterKey = 'all' | 'failing' | 'never' | 'ok';

function effectiveOutcome(entry: OverviewEntry): SyncOverviewOutcome {
  if (!entry.hasBmsConfig) return 'never';
  if (entry.authenticity.isFailure) return 'failed';
  if (!entry.latestRun) return 'never';
  return entry.latestRun.outcome;
}

// Reuse the per-hospital edit dialog so clicking a row jumps to the same
// "Sync Log" tab admins already know — keeps the data model consistent
// and avoids two places that render step trails. The dialog re-fetches
// fuller data internally; we just pass enough for it to mount.
function entryToHospital(entry: OverviewEntry): AdminHospital {
  return {
    hcode: entry.hcode,
    name: entry.name,
    level: entry.level,
    serviceType: null,
    provinceCode: null,
    districtCode: null,
    lat: null,
    lon: null,
    isActive: entry.isActive,
    connectionStatus: entry.connectionStatus,
    lastSyncAt: entry.lastSyncAt,
    bmsConfig: null,
  };
}

export function SyncOverviewTab() {
  const { data, isLoading, error, mutate } = useSWR<OverviewResponse>(
    '/api/admin/sync-overview',
    { refreshInterval: SYNC_OVERVIEW_POLL_MS },
  );
  const [filter, setFilter] = useState<FilterKey>('all');
  const [openHcode, setOpenHcode] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: 0, failing: 0, never: 0, ok: 0 };
    for (const h of data?.hospitals ?? []) {
      c.all += 1;
      const o = effectiveOutcome(h);
      if (o === 'failed') c.failing += 1;
      else if (o === 'never') c.never += 1;
      else c.ok += 1;
    }
    return c;
  }, [data]);

  const visible = useMemo(() => {
    const all = data?.hospitals ?? [];
    if (filter === 'all') return all;
    return all.filter((h) => {
      const o = effectiveOutcome(h);
      if (filter === 'failing') return o === 'failed';
      if (filter === 'never') return o === 'never';
      if (filter === 'ok') return o === 'success' || o === 'partial' || o === 'running';
      return true;
    });
  }, [data, filter]);

  const openEntry = data?.hospitals.find((h) => h.hcode === openHcode);

  return (
    <section className="space-y-4">
      <SectionCard
        title="สถานะการซิงค์รายโรงพยาบาล"
        description={`ผลการซิงค์รอบล่าสุดของทุกโรงพยาบาล · กดแถวเพื่อเปิดบันทึกการซิงค์`}
        actions={
          <>
            <span className="text-caption text-ink-muted">รีเฟรชอัตโนมัติทุก {SYNC_OVERVIEW_POLL_MS / 1000} วินาที</span>
            <Button variant="outline" size="sm" onClick={() => mutate()} className="h-9 gap-1 text-label text-brand">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> รีเฟรช
            </Button>
          </>
        }
      >
        <div role="group" aria-label="กรองตามผลการซิงค์" className="mb-3 flex flex-wrap gap-2">
          {([
            { k: 'all' as const, label: 'ทั้งหมด', n: counts.all },
            { k: 'failing' as const, label: 'มีปัญหา', n: counts.failing },
            { k: 'never' as const, label: 'ยังไม่ซิงค์', n: counts.never },
            { k: 'ok' as const, label: 'ปกติ', n: counts.ok },
          ]).map((f) => (
            <button
              key={f.k}
              type="button"
              aria-pressed={filter === f.k}
              onClick={() => setFilter(f.k)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-label',
                filter === f.k ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-border bg-surface-card text-ink-muted hover:bg-surface-muted',
              )}
            >
              {f.label} <span className="tabular-nums">{f.n}</span>
            </button>
          ))}
        </div>
        {error && (
          <ErrorState
            variant="banner"
            className="mb-3 rounded-xl border"
            message="โหลดสถานะการซิงค์ไม่สำเร็จ"
            remedy="ระบบจะลองใหม่อัตโนมัติ หรือกด ลองใหม่ หากยังไม่ได้ ตรวจสอบ Redis ของเซิร์ฟเวอร์"
            onRetry={() => void mutate()}
          />
        )}
        <DataTable
          caption="สถานะการซิงค์รายโรงพยาบาล"
          loading={isLoading && !data}
          rows={visible}
          rowKey={(h) => h.hcode}
          onRowClick={(h) => setOpenHcode(h.hcode)}
          rowLabel={(h) => `เปิดบันทึกการซิงค์ของ ${h.name}`}
          empty={<EmptyState illustration="generic" title="ไม่มีโรงพยาบาลในตัวกรองนี้" description="เลือกตัวกรองอื่น หรือกด ทั้งหมด" className="shadow-none" />}
          columns={[
            { key: 'outcome', header: 'ผล', cell: (h) => { const m = SYNC_OUTCOME_META[effectiveOutcome(h)]; return <StatusPill tone={m.tone}>{m.labelTh}</StatusPill>; } },
            {
              key: 'hospital',
              header: 'โรงพยาบาล',
              cell: (h) => (
                <div>
                  <div className="text-body font-medium text-ink">{h.name}</div>
                  <div className="font-mono text-caption text-ink-muted">{h.hcode} · {h.level}</div>
                </div>
              ),
            },
            { key: 'trigger', header: 'เริ่มโดย', cell: (h) => <span className="text-label text-ink-muted">{syncTriggerLabel(h.latestRun?.trigger)}</span> },
            {
              key: 'started',
              header: 'เริ่มเมื่อ',
              cell: (h) => (
                <span className="text-label text-ink-muted" title={h.latestRun?.startedAt ? new Date(h.latestRun.startedAt).toLocaleString('th-TH') : ''}>
                  {formatRelativeTime(h.latestRun?.startedAt ?? null)}
                </span>
              ),
            },
            { key: 'duration', header: 'ใช้เวลา', numeric: true, cell: (h) => formatSyncDuration(h.latestRun?.durationMs ?? null) },
            {
              key: 'summary',
              header: 'สรุป · ข้อผิดพลาด',
              cell: (h) => {
                const run = h.latestRun;
                const outcome = effectiveOutcome(h);
                const text = h.authenticity.isFailure
                  ? `${h.authenticity.status}${h.authenticity.reason ? ` — ${h.authenticity.reason}` : ''}`
                  : run?.errorMessage ?? run?.finalMessage ?? (run?.steps[run.steps.length - 1]?.message ?? '—');
                return (
                  <span
                    title={text}
                    className={cn('line-clamp-2 text-label', outcome === 'failed' ? 'text-danger-text' : outcome === 'partial' ? 'text-warn-text' : 'text-ink-muted')}
                  >
                    {outcome === 'failed' && <AlertTriangle aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />}
                    {text}
                  </span>
                );
              },
            },
          ]}
        />
      </SectionCard>

      {/* Reuse the standard hospital edit dialog so the click → drill-down
          path lands operators on the same Sync Log tab they already know.
          The dialog re-fetches /api/admin/hospitals internally for full
          data; the lite shape here is just enough for it to mount. */}
      <HospitalEditDialog
        hospital={openEntry ? entryToHospital(openEntry) : null}
        onClose={() => setOpenHcode(null)}
        onSaved={async () => {
          await mutate();
        }}
        initialSection="sync-log"
      />
    </section>
  );
}
