'use client';

import { useRouter } from 'next/navigation';
import type { DashboardHospital } from '@/types/api';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';

interface ActiveHospitalCardProps {
  hospital: DashboardHospital;
}

function getHighestRiskBorderColor(counts: DashboardHospital['counts']): string {
  if (counts.high > 0) return 'border-l-red-500';
  if (counts.medium > 0) return 'border-l-amber-500';
  return 'border-l-green-500';
}

interface RiskPill {
  key: string;
  count: number;
  label: string;
  bgClass: string;
  textClass: string;
}

function getRiskPills(counts: DashboardHospital['counts']): RiskPill[] {
  const pills: RiskPill[] = [];
  if (counts.high > 0) {
    pills.push({ key: 'high', count: counts.high, label: 'สูง', bgClass: 'bg-red-50', textClass: 'text-red-700' });
  }
  if (counts.medium > 0) {
    pills.push({ key: 'medium', count: counts.medium, label: 'ปานกลาง', bgClass: 'bg-amber-50', textClass: 'text-amber-700' });
  }
  if (counts.low > 0) {
    pills.push({ key: 'low', count: counts.low, label: 'ต่ำ', bgClass: 'bg-green-50', textClass: 'text-green-700' });
  }
  return pills;
}

export function ActiveHospitalCard({ hospital }: ActiveHospitalCardProps) {
  const router = useRouter();
  const borderColor = getHighestRiskBorderColor(hospital.counts);
  const pills = getRiskPills(hospital.counts);

  return (
    <button
      type="button"
      onClick={() => router.push(`/hospitals/${hospital.hcode}`)}
      className={`w-full cursor-pointer rounded-xl border-l-4 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md ${borderColor}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-800">{hospital.name}</div>
          <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {hospital.level}
          </span>
        </div>
        <div className="font-mono text-3xl font-bold text-slate-800">
          {hospital.counts.total}
        </div>
      </div>

      {pills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.bgClass} ${pill.textClass}`}
            >
              {pill.count} {pill.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-2">
        <ConnectionStatus
          status={hospital.connectionStatus}
          lastSyncAt={hospital.lastSyncAt}
          className="text-xs"
        />
      </div>
    </button>
  );
}
