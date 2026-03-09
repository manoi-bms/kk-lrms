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
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-slate-700">
        {value !== null && value !== undefined ? (
          <>{value}{unit ? <span className="font-normal text-slate-400"> {unit}</span> : ''}</>
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
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-medium text-slate-700">ข้อมูลทางคลินิก</h3>
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
