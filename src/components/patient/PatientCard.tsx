// T008: PatientCard — card component for hospital patient list
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CpdBadge } from '@/components/shared/CpdBadge';
import { formatThaiDate } from '@/lib/utils';
import { RiskLevel } from '@/types/domain';

interface PatientCardProps {
  an: string;
  hn: string;
  name: string;
  age: number;
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  admitDate: string;
  laborStatus: string;
  cpdScore: number | null;
  cpdRiskLevel: string | null;
  latestVitals?: {
    maternalHr: number | null;
    fetalHr: string | null;
    sbp: number | null;
    dbp: number | null;
  } | null;
  latestCervixCm?: number | null;
}

const BORDER_COLOR_MAP: Record<string, string> = {
  HIGH: 'border-l-red-500',
  MEDIUM: 'border-l-amber-500',
  LOW: 'border-l-green-500',
};

const LABOR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'คลอดอยู่',
  DELIVERED: 'คลอดแล้ว',
  TRANSFERRED: 'ส่งต่อแล้ว',
};

/**
 * Formats a relative time string in Thai, e.g. "8 ชม. ที่แล้ว"
 */
function formatRelativeTimeThai(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'เมื่อสักครู่';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'เมื่อสักครู่';
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;
  if (diffDays === 1) return 'เมื่อวาน';
  return `${diffDays} วันที่แล้ว`;
}

interface VitalPillProps {
  label: string;
  value: string;
  unit: string;
}

function VitalPill({ label, value, unit }: VitalPillProps) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-slate-50 px-3 py-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
      <span className="text-xs text-slate-400">{unit}</span>
    </div>
  );
}

export function PatientCard({
  an,
  hn,
  name,
  age,
  gravida,
  gaWeeks,
  ancCount,
  admitDate,
  laborStatus,
  cpdScore,
  cpdRiskLevel,
  latestVitals,
  latestCervixCm,
}: PatientCardProps) {
  const borderClass = cpdRiskLevel
    ? (BORDER_COLOR_MAP[cpdRiskLevel] ?? 'border-l-slate-300')
    : 'border-l-slate-300';

  const laborLabel = LABOR_STATUS_LABELS[laborStatus] ?? laborStatus;

  const hasVitals =
    latestVitals?.maternalHr != null ||
    latestVitals?.fetalHr != null ||
    latestVitals?.sbp != null ||
    latestCervixCm != null;

  return (
    <Link href={`/patients/${an}`} className="block">
      <div
        className={`rounded-xl border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${borderClass}`}
      >
        {/* Row 1: Name + CpdBadge + Labor status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{name}</span>
          {cpdScore != null && cpdRiskLevel && (
            <CpdBadge
              score={cpdScore}
              riskLevel={cpdRiskLevel as RiskLevel}
              size="sm"
            />
          )}
          <Badge variant={laborStatus === 'ACTIVE' ? 'default' : 'secondary'}>
            {laborLabel}
          </Badge>
        </div>

        {/* Row 2: Demographics */}
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
          <span>AN: {an}</span>
          <span>HN: {hn}</span>
          <span>อายุ {age} ปี</span>
          {gravida != null && <span>G{gravida}</span>}
        </div>

        {/* Row 3: GA + ANC count */}
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
          {gaWeeks != null && <span>GA {gaWeeks} สัปดาห์</span>}
          {ancCount != null && <span>ANC {ancCount} ครั้ง</span>}
        </div>

        {/* Row 4: Latest vitals preview */}
        {hasVitals && (
          <div className="mt-2 flex flex-wrap gap-2">
            {latestVitals?.maternalHr != null && (
              <VitalPill
                label="MHR"
                value={String(latestVitals.maternalHr)}
                unit="bpm"
              />
            )}
            {latestVitals?.fetalHr != null && (
              <VitalPill
                label="FHR"
                value={latestVitals.fetalHr}
                unit="bpm"
              />
            )}
            {latestVitals?.sbp != null && latestVitals?.dbp != null && (
              <VitalPill
                label="BP"
                value={`${latestVitals.sbp}/${latestVitals.dbp}`}
                unit="mmHg"
              />
            )}
            {latestCervixCm != null && (
              <VitalPill
                label="Cervix"
                value={String(latestCervixCm)}
                unit="cm"
              />
            )}
          </div>
        )}

        {/* Row 5: Admit date + relative time */}
        <div className="mt-2 text-xs text-slate-400">
          Admit: {formatThaiDate(new Date(admitDate))}{' '}
          <span className="text-slate-300">|</span>{' '}
          {formatRelativeTimeThai(admitDate)}
        </div>
      </div>
    </Link>
  );
}
