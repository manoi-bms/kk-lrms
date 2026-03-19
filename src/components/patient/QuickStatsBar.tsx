// QuickStatsBar — compact horizontal bar of key metrics for a labor patient
'use client';

import { useMemo } from 'react';
import { Baby, Calendar, Clock, Activity, Timer, HeartPulse } from 'lucide-react';
import type { ReactNode } from 'react';

interface QuickStatsBarProps {
  age: number;
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  admitDate: string;
  laborStatus: string; // 'ACTIVE' | 'DELIVERED' | 'TRANSFERRED'
  currentDilationCm: number | null; // latest cervix dilation from partogram
  latestVitalAt: string | null; // timestamp of most recent vital sign
}

/**
 * Calculate labor duration from admitDate to now, returning a Thai-formatted string.
 * e.g. "12 ชม. 30 นาที" or "2 วัน 3 ชม."
 */
function formatLaborDuration(admitDate: string): string {
  const now = new Date();
  const admit = new Date(admitDate);
  const diffMs = now.getTime() - admit.getTime();

  if (diffMs < 0) return '-';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} วัน ${hours} ชม.` : `${days} วัน`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
  }
  return `${minutes} นาที`;
}

/**
 * Calculate relative time from a timestamp and return { text, colorClass }.
 * Green if <15 min, amber if 15-60 min, red if >60 min or null.
 */
function getVitalRelativeInfo(latestVitalAt: string | null): {
  text: string;
  colorClass: string;
} {
  if (!latestVitalAt) {
    return { text: 'ไม่มีข้อมูล', colorClass: 'text-red-600' };
  }

  const now = new Date();
  const vitalTime = new Date(latestVitalAt);
  const diffMs = now.getTime() - vitalTime.getTime();

  if (diffMs < 0) {
    return { text: 'เมื่อสักครู่', colorClass: 'text-emerald-600' };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return { text: 'เมื่อสักครู่', colorClass: 'text-emerald-600' };
  }
  if (diffMinutes < 15) {
    return { text: `${diffMinutes} นาทีที่แล้ว`, colorClass: 'text-emerald-600' };
  }
  if (diffMinutes < 60) {
    return { text: `${diffMinutes} นาทีที่แล้ว`, colorClass: 'text-amber-600' };
  }
  if (diffHours < 24) {
    return { text: `${diffHours} ชม. ที่แล้ว`, colorClass: 'text-red-600' };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays} วันที่แล้ว`, colorClass: 'text-red-600' };
}

/**
 * Get color class for cervix dilation value.
 * Green <4 cm, amber 4-7 cm, teal 8-10 cm.
 */
function getDilationColorClass(cm: number | null): string {
  if (cm === null) return 'text-slate-800';
  if (cm < 4) return 'text-emerald-600';
  if (cm <= 7) return 'text-amber-600';
  return 'text-teal-600';
}

interface StatItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  valueColorClass?: string;
}

function StatItem({ icon, label, value, unit, valueColorClass = 'text-slate-800' }: StatItemProps) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
      <div className="flex justify-center mb-1 text-slate-400">
        {icon}
      </div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-lg font-mono font-bold ${valueColorClass}`}>
        {value}
      </div>
      {unit && (
        <div className="text-xs text-slate-400">
          {unit}
        </div>
      )}
    </div>
  );
}

export function QuickStatsBar({
  age,
  gravida,
  gaWeeks,
  admitDate,
  currentDilationCm,
  latestVitalAt,
}: QuickStatsBarProps) {
  const laborDuration = useMemo(() => formatLaborDuration(admitDate), [admitDate]);
  const vitalInfo = useMemo(() => getVitalRelativeInfo(latestVitalAt), [latestVitalAt]);
  const dilationColor = useMemo(() => getDilationColorClass(currentDilationCm), [currentDilationCm]);

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {/* 1. อายุ (Age) */}
      <StatItem
        icon={<Baby className="h-4 w-4" />}
        label="อายุ"
        value={String(age)}
        unit="ปี"
      />

      {/* 2. ครรภ์ที่ (Gravida) */}
      <StatItem
        icon={<Activity className="h-4 w-4" />}
        label="ครรภ์ที่"
        value={gravida !== null ? `G${gravida}` : '-'}
      />

      {/* 3. อายุครรภ์ (GA) */}
      <StatItem
        icon={<Calendar className="h-4 w-4" />}
        label="อายุครรภ์"
        value={gaWeeks !== null ? String(gaWeeks) : '-'}
        unit="สัปดาห์"
      />

      {/* 4. เข้ารับ (Admitted) — labor duration */}
      <StatItem
        icon={<Timer className="h-4 w-4" />}
        label="เข้ารับ"
        value={laborDuration}
      />

      {/* 5. ปากมดลูก (Cervix) */}
      <StatItem
        icon={<Clock className="h-4 w-4" />}
        label="ปากมดลูก"
        value={currentDilationCm !== null ? String(currentDilationCm) : '-'}
        unit="ซม."
        valueColorClass={dilationColor}
      />

      {/* 6. Vital ล่าสุด (Last Vital) */}
      <StatItem
        icon={<HeartPulse className="h-4 w-4" />}
        label="Vital ล่าสุด"
        value={vitalInfo.text}
        valueColorClass={vitalInfo.colorClass}
      />
    </div>
  );
}
