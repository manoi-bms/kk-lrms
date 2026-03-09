'use client';

import type { DashboardSummary } from '@/types/api';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

const CARDS = [
  { key: 'total', title: 'ผู้คลอดทั้งหมด', subtitle: 'กำลังคลอด', borderColor: 'border-t-teal-500', textColor: 'text-slate-800', getValue: (s: DashboardSummary) => s.totalActive },
  { key: 'high', title: 'เสี่ยงสูง', subtitle: 'ต้องเฝ้าระวัง', borderColor: 'border-t-red-500', textColor: 'text-red-600', getValue: (s: DashboardSummary) => s.totalHigh },
  { key: 'medium', title: 'เสี่ยงปานกลาง', subtitle: 'ติดตามต่อเนื่อง', borderColor: 'border-t-amber-500', textColor: 'text-amber-600', getValue: (s: DashboardSummary) => s.totalMedium },
  { key: 'low', title: 'เสี่ยงต่ำ', subtitle: 'ปกติ', borderColor: 'border-t-green-500', textColor: 'text-green-600', getValue: (s: DashboardSummary) => s.totalLow },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {CARDS.map((card) => (
        <div key={card.key} className={`rounded-xl border-t-4 bg-white p-5 shadow-sm ${card.borderColor}`}>
          <div className="text-sm font-medium text-slate-500">{card.title}</div>
          <div className={`mt-2 font-mono text-3xl font-bold ${card.textColor}`}>{card.getValue(summary)}</div>
          <div className="mt-1 text-xs text-slate-400">{card.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
