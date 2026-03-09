'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { useSSE } from '@/hooks/useSSE';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ActiveHospitalCard } from '@/components/dashboard/ActiveHospitalCard';
import { InactiveHospitalList } from '@/components/dashboard/InactiveHospitalList';
import { LoadingState } from '@/components/shared/LoadingState';

export default function DashboardPage() {
  const { hospitals, summary, updatedAt, isLoading, mutate } = useDashboard();

  useSSE({
    onPatientUpdate: () => mutate(),
    onConnectionStatus: () => mutate(),
    onSyncComplete: () => mutate(),
  });

  if (isLoading) {
    return <LoadingState message="กำลังโหลด Dashboard..." />;
  }

  const activeHospitals = hospitals.filter((h) => h.counts.total > 0);
  const inactiveHospitals = hospitals.filter((h) => h.counts.total === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">แดชบอร์ดจังหวัดขอนแก่น</h1>
        {updatedAt && (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-live" aria-hidden="true" />
            อัปเดตล่าสุด: {new Date(updatedAt).toLocaleTimeString('th-TH')}
          </span>
        )}
      </div>

      <SummaryCards summary={summary} />

      {activeHospitals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            โรงพยาบาลที่มีผู้คลอด ({activeHospitals.length} แห่ง)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeHospitals.map((h) => (
              <ActiveHospitalCard key={h.hcode} hospital={h} />
            ))}
          </div>
        </div>
      )}

      <InactiveHospitalList hospitals={inactiveHospitals} />
    </div>
  );
}
