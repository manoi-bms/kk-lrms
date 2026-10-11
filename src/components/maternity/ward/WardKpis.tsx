// src/components/maternity/ward/WardKpis.tsx
// The ward KPI row. Every number comes from summarizeBeds (the complete HOSxP
// ward roster, spec D8), never from an inline count. Copy states exactly what
// is counted; the prolonged-latent thresholds come from PROLONGED_LATENT_RULE.
import { KpiGrid } from '@/components/shared/KpiGrid';
import { KpiTile } from '@/components/shared/KpiTile';
import { PROLONGED_LATENT_RULE, type BedSummary } from '@/services/ward-board';

/** "มีผู้คลอด" counts every patient on the ward (I2); the sub-line keeps bed
 *  use separate and names patients without a usable bed. */
function occupiedSub(s: BedSummary): string | undefined {
  const parts = [
    s.occupancyPct !== null ? `ใช้เตียง ${s.occupancyPct}%` : null,
    s.unplaced > 0 ? `ยังไม่ได้จัดเตียง ${s.unplaced}` : null,
    s.sharedBeds > 0 ? `เตียงซ้อน ${s.sharedBeds}` : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function WardKpis({ summary }: { summary: BedSummary }) {
  const { minHours, cervixBelowCm } = PROLONGED_LATENT_RULE;
  return (
    <section aria-label="สรุปเตียงในห้องคลอด">
      <KpiGrid count={5}>
        <KpiTile testId="ward-kpi-total" label="เตียงทั้งหมด" count={summary.totalBeds} />
        <KpiTile
          testId="ward-kpi-occupied"
          label="มีผู้คลอด"
          count={summary.patients}
          sub={occupiedSub(summary)}
        />
        <KpiTile testId="ward-kpi-free" label="เตียงว่าง" count={summary.free} />
        <KpiTile
          testId="ward-kpi-locked"
          label="ปิดใช้งาน"
          count={summary.lockedEmpty}
          sub={
            summary.lockedOccupied > 0
              ? `ล็อกใน HOSxP · มีผู้คลอดบนเตียงล็อก ${summary.lockedOccupied}`
              : 'ล็อกใน HOSxP'
          }
        />
        <KpiTile
          testId="ward-kpi-prolonged-latent"
          label="ระยะแฝงนาน"
          count={summary.prolongedLatent}
          tone={summary.prolongedLatent > 0 ? 'high' : 'default'}
          sub={`รับเข้า ≥${minHours} ชม. · ปากมดลูก <${cervixBelowCm} ซม.`}
          hint={{
            title: 'ระยะแฝงนาน',
            body: `นับผู้คลอดที่รับเข้ามาแล้วอย่างน้อย ${minHours} ชั่วโมง และปากมดลูกยังไม่ถึง ${cervixBelowCm} ซม. หรือยังไม่มีบันทึก — เกณฑ์เดียวกับป้ายบนการ์ดเตียง ควรประเมินตามเส้นปฏิบัติการของพาร์โทกราฟ`,
          }}
        />
      </KpiGrid>
    </section>
  );
}
