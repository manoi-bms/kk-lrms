// CurrentVitalsPanel — latest vital signs with status badges and mini sparklines
'use client';

import { HeartPulse } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VitalRecord {
  measuredAt: string;
  maternalHr: number | null;
  fetalHr: string | null;
  sbp: number | null;
  dbp: number | null;
  pphAmountMl: number | null;
}

export interface CurrentVitalsPanelProps {
  vitals: VitalRecord[];
}

// ---------------------------------------------------------------------------
// Status evaluation
// ---------------------------------------------------------------------------

type VitalStatus = 'normal' | 'warning' | 'critical';

interface VitalThreshold {
  normalMin: number;
  normalMax: number;
  warningMin: number;
  warningMax: number;
}

const THRESHOLDS: Record<string, VitalThreshold> = {
  maternalHr: { normalMin: 60, normalMax: 100, warningMin: 50, warningMax: 120 },
  fetalHr:    { normalMin: 110, normalMax: 160, warningMin: 100, warningMax: 180 },
  sbp:        { normalMin: 90, normalMax: 140, warningMin: 80, warningMax: 160 },
  dbp:        { normalMin: 60, normalMax: 90, warningMin: 50, warningMax: 100 },
  pph:        { normalMin: 0, normalMax: 500, warningMin: 0, warningMax: 1000 },
};

function evaluateStatus(value: number, threshold: VitalThreshold): VitalStatus {
  if (value >= threshold.normalMin && value <= threshold.normalMax) return 'normal';
  if (value >= threshold.warningMin && value <= threshold.warningMax) return 'warning';
  return 'critical';
}

/** For BP we take the worst status of SBP and DBP. */
function evaluateBpStatus(sbp: number, dbp: number): VitalStatus {
  const sbpStatus = evaluateStatus(sbp, THRESHOLDS.sbp);
  const dbpStatus = evaluateStatus(dbp, THRESHOLDS.dbp);
  const priority: VitalStatus[] = ['critical', 'warning', 'normal'];
  for (const p of priority) {
    if (sbpStatus === p || dbpStatus === p) return p;
  }
  return 'normal';
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<VitalStatus, { text: string; stroke: string }> = {
  normal:   { text: 'text-green-500',  stroke: '#22c55e' },
  warning:  { text: 'text-amber-500',  stroke: '#f59e0b' },
  critical: { text: 'text-red-500',    stroke: '#ef4444' },
};

const STATUS_LABEL_TH: Record<VitalStatus, string> = {
  normal: 'ปกติ',
  warning: 'เฝ้าระวัง',
  critical: 'ผิดปกติ',
};

// ---------------------------------------------------------------------------
// Mini sparkline (raw SVG)
// ---------------------------------------------------------------------------

function MiniSparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) return null;

  const width = 80;
  const height = 24;
  const padding = 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid division by zero

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const d = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mt-1"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Single vital item
// ---------------------------------------------------------------------------

interface VitalItemProps {
  label: string;
  displayValue: string;
  unit: string;
  status: VitalStatus;
  normalRangeText: string;
  sparklineValues: number[];
  lastMeasuredAt: string | null;
}

function VitalItem({
  label,
  displayValue,
  unit,
  status,
  normalRangeText,
  sparklineValues,
  lastMeasuredAt,
}: VitalItemProps) {
  const colors = STATUS_COLORS[status];

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      {/* Label */}
      <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
        {label}
      </div>

      {/* Current value */}
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`font-mono text-2xl font-bold ${colors.text}`}>
          {displayValue}
        </span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>

      {/* Status text */}
      <div className={`text-xs font-semibold mt-0.5 ${colors.text}`}>
        {STATUS_LABEL_TH[status]}
      </div>

      {/* Normal range */}
      <div className="text-xs text-slate-400 mt-1">{normalRangeText}</div>

      {/* Mini sparkline */}
      <MiniSparkline values={sparklineValues} color={colors.stroke} />

      {/* Last measured */}
      <div className="text-xs text-slate-400 mt-1">
        {lastMeasuredAt ? formatRelativeTime(lastMeasuredAt) : '-'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Null-state item (when there is no data at all)
// ---------------------------------------------------------------------------

function VitalItemEmpty({ label, unit }: { label: string; unit: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold text-slate-300">-</span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-400 mt-1">ไม่มีข้อมูล</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data extraction helpers
// ---------------------------------------------------------------------------

/** Extract the last N non-null numeric values from the vitals array for a given field. */
function extractHistory(
  vitals: VitalRecord[],
  extractor: (v: VitalRecord) => number | null,
  count: number = 8,
): number[] {
  const result: number[] = [];
  for (const v of vitals) {
    const val = extractor(v);
    if (val !== null && val !== undefined) {
      result.push(val);
    }
  }
  return result.slice(-count);
}

/** Find the latest record where the given field is non-null. */
function findLatest(
  vitals: VitalRecord[],
  extractor: (v: VitalRecord) => number | string | null,
): VitalRecord | null {
  for (let i = vitals.length - 1; i >= 0; i--) {
    const val = extractor(vitals[i]);
    if (val !== null && val !== undefined) return vitals[i];
  }
  return null;
}

function parseFetalHr(raw: string | null): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CurrentVitalsPanel({ vitals }: CurrentVitalsPanelProps) {
  // -- Maternal HR --------------------------------------------------------
  const latestMhr = findLatest(vitals, (v) => v.maternalHr);
  const mhrValue = latestMhr?.maternalHr ?? null;
  const mhrHistory = extractHistory(vitals, (v) => v.maternalHr);

  // -- Fetal HR -----------------------------------------------------------
  const latestFhr = findLatest(vitals, (v) => v.fetalHr);
  const fhrValue = latestFhr ? parseFetalHr(latestFhr.fetalHr) : null;
  const fhrHistory = extractHistory(vitals, (v) => parseFetalHr(v.fetalHr));

  // -- Blood Pressure -----------------------------------------------------
  const latestBp = findLatest(vitals, (v) => (v.sbp !== null && v.dbp !== null ? v.sbp : null));
  const sbpValue = latestBp?.sbp ?? null;
  const dbpValue = latestBp?.dbp ?? null;
  const sbpHistory = extractHistory(vitals, (v) => v.sbp);

  // -- PPH ----------------------------------------------------------------
  const latestPph = findLatest(vitals, (v) => v.pphAmountMl);
  const pphValue = latestPph?.pphAmountMl ?? null;
  const pphHistory = extractHistory(vitals, (v) => v.pphAmountMl);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse className="h-4 w-4 text-rose-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          สัญญาณชีพปัจจุบัน
        </h3>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Maternal HR */}
        {mhrValue !== null ? (
          <VitalItem
            label="ชีพจรมารดา"
            displayValue={String(mhrValue)}
            unit="bpm"
            status={evaluateStatus(mhrValue, THRESHOLDS.maternalHr)}
            normalRangeText="ปกติ: 60-100 bpm"
            sparklineValues={mhrHistory}
            lastMeasuredAt={latestMhr?.measuredAt ?? null}
          />
        ) : (
          <VitalItemEmpty label="ชีพจรมารดา" unit="bpm" />
        )}

        {/* 2. Fetal HR */}
        {fhrValue !== null ? (
          <VitalItem
            label="ชีพจรทารก"
            displayValue={String(fhrValue)}
            unit="bpm"
            status={evaluateStatus(fhrValue, THRESHOLDS.fetalHr)}
            normalRangeText="ปกติ: 110-160 bpm"
            sparklineValues={fhrHistory}
            lastMeasuredAt={latestFhr?.measuredAt ?? null}
          />
        ) : (
          <VitalItemEmpty label="ชีพจรทารก" unit="bpm" />
        )}

        {/* 3. Blood Pressure */}
        {sbpValue !== null && dbpValue !== null ? (
          <VitalItem
            label="ความดันโลหิต"
            displayValue={`${sbpValue}/${dbpValue}`}
            unit="mmHg"
            status={evaluateBpStatus(sbpValue, dbpValue)}
            normalRangeText="ปกติ: 90-140/60-90 mmHg"
            sparklineValues={sbpHistory}
            lastMeasuredAt={latestBp?.measuredAt ?? null}
          />
        ) : (
          <VitalItemEmpty label="ความดันโลหิต" unit="mmHg" />
        )}

        {/* 4. PPH */}
        {pphValue !== null ? (
          <VitalItem
            label="เลือดออกหลังคลอด"
            displayValue={String(pphValue)}
            unit="ml"
            status={evaluateStatus(pphValue, THRESHOLDS.pph)}
            normalRangeText="ปกติ: < 500 ml"
            sparklineValues={pphHistory}
            lastMeasuredAt={latestPph?.measuredAt ?? null}
          />
        ) : (
          <VitalItemEmpty label="เลือดออกหลังคลอด" unit="ml" />
        )}
      </div>
    </div>
  );
}
