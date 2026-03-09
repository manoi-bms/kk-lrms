'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { ActiveHospitalCard } from '@/components/dashboard/ActiveHospitalCard';
import { InactiveHospitalList } from '@/components/dashboard/InactiveHospitalList';
import { LoadingState } from '@/components/shared/LoadingState';

export default function HospitalsPage() {
  const { hospitals, isLoading } = useDashboard();

  if (isLoading) {
    return <LoadingState message="กำลังโหลดรายชื่อโรงพยาบาล..." />;
  }

  const activeHospitals = hospitals.filter((h) => h.counts.total > 0);
  const inactiveHospitals = hospitals.filter((h) => h.counts.total === 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">
        โรงพยาบาลทั้งหมด ({hospitals.length} แห่ง)
      </h1>

      {activeHospitals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-slate-700">
            มีผู้คลอด ({activeHospitals.length} แห่ง)
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
