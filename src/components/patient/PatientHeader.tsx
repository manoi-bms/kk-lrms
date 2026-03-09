// T078: PatientHeader — demographics, hospital info, CPD badge
'use client';

import { Badge } from '@/components/ui/badge';
import { CpdBadge } from '@/components/shared/CpdBadge';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import { formatThaiDate } from '@/lib/utils';
import type { RiskLevel, ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';

interface PatientHeaderProps {
  hn: string;
  an: string;
  name: string;
  age: number;
  admitDate: string;
  laborStatus: string;
  weightKg?: number | null;
  weightDiffKg?: number | null;
  hospital: {
    name: string;
    level: string;
    connectionStatus?: ConnectionStatusEnum;
    lastSyncAt?: string | null;
  };
  cpdScore?: {
    score: number;
    riskLevel: RiskLevel;
  } | null;
}

function getWeightDiffColor(diff: number): string {
  if (diff > 20) return 'text-red-600';
  if (diff > 15) return 'text-amber-600';
  return 'text-emerald-600';
}

export function PatientHeader({
  hn,
  an,
  name,
  age,
  admitDate,
  laborStatus,
  weightKg,
  weightDiffKg,
  hospital,
  cpdScore,
}: PatientHeaderProps) {
  const showWeight = weightKg != null && weightDiffKg != null && weightKg > 0 && weightDiffKg > 0;
  const preWeight = showWeight ? weightKg - weightDiffKg : null;
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          {laborStatus === 'ACTIVE' ? (
            <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
              คลอดอยู่
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              คลอดแล้ว
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span>HN: <span className="font-mono font-semibold text-slate-700">{hn}</span></span>
          <span>AN: <span className="font-mono font-semibold text-slate-700">{an}</span></span>
          <span>อายุ: <span className="font-mono font-semibold text-slate-700">{age} ปี</span></span>
          <span>Admit: <span className="font-mono font-semibold text-slate-700">{formatThaiDate(new Date(admitDate))}</span></span>
          {showWeight && preWeight !== null && weightDiffKg !== null && (
            <span>น.น. <span className="font-mono font-semibold text-slate-700">{preWeight}</span> → <span className="font-mono font-semibold text-slate-700">{weightKg}</span> = <span className={`font-mono font-semibold ${getWeightDiffColor(weightDiffKg)}`}>{weightDiffKg} กก.</span></span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {hospital.name}
          </span>
          <Badge variant="outline">{hospital.level}</Badge>
          {hospital.connectionStatus && (
            <ConnectionStatus
              status={hospital.connectionStatus}
              lastSyncAt={hospital.lastSyncAt ?? null}
            />
          )}
        </div>
      </div>

      {cpdScore && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">CPD Score</span>
          <CpdBadge
            score={cpdScore.score}
            riskLevel={cpdScore.riskLevel}
            size="lg"
          />
        </div>
      )}
    </div>
  );
}
