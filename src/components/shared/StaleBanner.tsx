// T101: StaleBanner — warning when hospitals are offline
'use client';

interface StaleBannerProps {
  allOffline: boolean;
  offlineHospitals?: string[];
}

export function StaleBanner({ allOffline, offlineHospitals = [] }: StaleBannerProps) {
  if (!allOffline && offlineHospitals.length === 0) return null;

  if (allOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 px-4 py-2 text-center text-sm text-white">
        ระบบไม่สามารถเชื่อมต่อ HOSxP ได้ — ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm text-white">
      โรงพยาบาลออฟไลน์: {offlineHospitals.join(', ')}
    </div>
  );
}
