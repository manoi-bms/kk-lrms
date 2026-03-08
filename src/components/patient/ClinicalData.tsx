// T079: ClinicalData — 2-column grid of clinical measurements
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
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value !== null && value !== undefined ? (
        <span className="font-medium">
          {value}{unit ? ` ${unit}` : ''}
        </span>
      ) : (
        <span className="text-muted-foreground">ไม่มีข้อมูล</span>
      )}
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">ข้อมูลทางคลินิก</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
