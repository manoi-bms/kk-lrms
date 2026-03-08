// T056: Province dashboard page — main dashboard view
'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { useSSE } from '@/hooks/useSSE';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { HospitalTable } from '@/components/dashboard/HospitalTable';
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KK-LRMS — ระบบติดตามการคลอดจังหวัดขอนแก่น</h1>
        {updatedAt && (
          <span className="text-sm text-muted-foreground">
            อัปเดตล่าสุด: {new Date(updatedAt).toLocaleTimeString('th-TH')}
          </span>
        )}
      </div>

      <SummaryCards summary={summary} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">โรงพยาบาลในจังหวัดขอนแก่น</h2>
        <HospitalTable hospitals={hospitals} />
      </div>
    </div>
  );
}
