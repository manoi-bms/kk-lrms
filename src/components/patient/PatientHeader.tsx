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

export function PatientHeader({
  hn,
  an,
  name,
  age,
  admitDate,
  laborStatus,
  hospital,
  cpdScore,
}: PatientHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">{name}</h1>
          <Badge variant={laborStatus === 'ACTIVE' ? 'default' : 'secondary'}>
            {laborStatus === 'ACTIVE' ? 'คลอดอยู่' : 'คลอดแล้ว'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>HN: <strong>{hn}</strong></span>
          <span>AN: <strong>{an}</strong></span>
          <span>อายุ: <strong>{age} ปี</strong></span>
          <span>Admit: <strong>{formatThaiDate(new Date(admitDate))}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{hospital.name}</Badge>
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
          <span className="text-xs text-muted-foreground">CPD Score</span>
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
