// ClinicalData — 4-column grid of clinical measurements in card
'use client';

interface ClinicalDataProps {
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  heightCm: number | null;
  weightDiffKg: number | null;
  fundalHeightCm: number | null;
  usWeightG: number | null;
  hematocritPct: number | null;
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
        <DataItem label="ส่วนต่างน้ำหนัก" value={weightDiffKg} unit="กก." />
        <DataItem label="ยอดมดลูก" value={fundalHeightCm} unit="ซม." />
        <DataItem label="น้ำหนักเด็ก U/S" value={usWeightG} unit="กรัม" />
        <DataItem label="Hematocrit" value={hematocritPct} unit="%" />
      </div>
    </div>
  );
}
