// ClinicalData — 4-column grid of clinical measurements in card
'use client';

interface ClinicalDataProps {
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  heightCm: number | null;
  weightKg?: number | null;
  weightDiffKg: number | null;
  fundalHeightCm: number | null;
  usWeightG: number | null;
  hematocritPct: number | null;
}

function getWeightDiffColor(diff: number): string {
  if (diff > 20) return 'text-red-600';
  if (diff > 15) return 'text-amber-600';
  return 'text-emerald-600';
}

function WeightDiffItem({ weightKg, weightDiffKg }: { weightKg?: number | null; weightDiffKg: number | null }) {
  const hasFullContext = weightKg != null && weightDiffKg != null && weightKg > 0 && weightDiffKg > 0;
  const preWeight = hasFullContext ? weightKg - weightDiffKg : null;

  return (
    <div className="bg-slate-50/80 rounded-xl px-4 py-3 border border-slate-100">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">ส่วนต่างน้ำหนัก</div>
      <div className="mt-1 font-mono text-lg font-bold text-slate-800">
        {hasFullContext && preWeight !== null ? (
          <>
            <span className="text-base text-slate-600">{preWeight}</span>
            <span className="text-xs text-slate-400 font-normal mx-1">→</span>
            <span className="text-base text-slate-600">{weightKg}</span>
            <span className="text-xs text-slate-400 font-normal mx-1">=</span>
            <span className={getWeightDiffColor(weightDiffKg)}>+{weightDiffKg}</span>
            <span className="text-xs text-slate-400 font-normal ml-1">กก.</span>
          </>
        ) : weightDiffKg !== null && weightDiffKg !== undefined ? (
          <>{weightDiffKg}<span className="text-xs text-slate-400 font-normal ml-1">กก.</span></>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </div>
    </div>
  );
}

function DataItem({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="bg-slate-50/80 rounded-xl px-4 py-3 border border-slate-100">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-slate-800">
        {value !== null && value !== undefined ? (
          <>{value}{unit ? <span className="text-xs text-slate-400 font-normal ml-1">{unit}</span> : ''}</>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </div>
    </div>
  );
}

export function ClinicalData({
  gravida,
  gaWeeks,
  ancCount,
  heightCm,
  weightKg,
  weightDiffKg,
  fundalHeightCm,
  usWeightG,
  hematocritPct,
}: ClinicalDataProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">ข้อมูลทางคลินิก</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DataItem label="ครรภ์ที่ (Gravida)" value={gravida} />
        <DataItem label="อายุครรภ์ (GA)" value={gaWeeks} unit="สัปดาห์" />
        <DataItem label="ฝากครรภ์ (ANC)" value={ancCount} unit="ครั้ง" />
        <DataItem label="ส่วนสูง" value={heightCm} unit="ซม." />
        <WeightDiffItem weightKg={weightKg} weightDiffKg={weightDiffKg} />
        <DataItem label="ยอดมดลูก" value={fundalHeightCm} unit="ซม." />
        <DataItem label="น้ำหนักเด็ก U/S" value={usWeightG} unit="กรัม" />
        <DataItem label="Hematocrit" value={hematocritPct} unit="%" />
      </div>
    </div>
  );
}
