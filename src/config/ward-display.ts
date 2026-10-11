// src/config/ward-display.ts
// Ward-board copy and tones: Thai labels for the live-feed chip and the
// bed-move alerts (this task), the labour-stage pill and the room summary
// (Task 5). Rules live in src/services/ward-board.ts; this file is display only.
import type { WardFeedHealth } from '@/hooks/useMaternityWardStateFull';
import type { StatusTone } from '@/config/status-tone';
import {
  LABOUR_STAGE_CM,
  PROLONGED_LATENT_RULE,
  type BedSummary,
  type LabourStageKind,
  type UnplacedReason,
} from '@/services/ward-board';
import { LABOUR_PHASE_LABEL_TH } from '@/config/obstetric-display';

export const WARD_FEED_STATUS: Record<WardFeedHealth, { labelTh: string; tone: StatusTone; pulse: boolean }> = {
  ok: { labelTh: 'เชื่อมต่อ HOSxP สด', tone: 'ok', pulse: false },
  reconnecting: { labelTh: 'กำลังเชื่อมต่อ HOSxP ใหม่…', tone: 'warn', pulse: true },
  error: { labelTh: 'ขาดการเชื่อมต่อ HOSxP', tone: 'danger', pulse: true },
};

/** Bed-move outcomes: today's page copy, split into what happened / what to do. */
export const BED_MOVE_ALERTS = {
  writeFailed: {
    title: 'ย้ายเตียงไม่สำเร็จ — เตียงอาจถูกย้ายแล้วแต่บันทึกประวัติไม่ครบ',
    remedy: 'ตรวจสอบสถานะเตียงใน HOSxP แล้วกด รีเฟรช ก่อนลองใหม่',
    tone: 'danger',
  },
  locked: {
    title: 'ย้ายเตียงไม่ได้ — เตียงปลายทางถูกล็อก',
    remedy: 'ปลดล็อกเตียงใน HOSxP ก่อน หรือเลือกเตียงว่างอื่น',
    tone: 'warn',
  },
  occupied: {
    title: 'ย้ายเตียงไม่ได้ — เตียงปลายทางไม่ว่าง',
    remedy: 'เลือกเตียงที่ว่างและไม่ถูกล็อก แล้วลองอีกครั้ง',
    tone: 'warn',
  },
} as const satisfies Record<string, { title: string; remedy: string; tone: 'danger' | 'warn' }>;

const { minHours, cervixBelowCm } = PROLONGED_LATENT_RULE;
const { activeFrom, transitionFrom } = LABOUR_STAGE_CM;

/** Stage pill on each bed tile (spec D4: today's colour mapping, as tokens). */
export const LABOUR_STAGE_DISPLAY: Record<LabourStageKind, { labelTh: string; className: string; hint: string }> = {
  prolongedLatent: {
    labelTh: 'ระยะแฝงนาน · ประเมินด่วน',
    className: 'bg-danger text-white',
    hint: `รับเข้า ≥${minHours} ชม. และปากมดลูก <${cervixBelowCm} ซม. หรือยังไม่มีบันทึก`,
  },
  transition: {
    labelTh: `ระยะที่ 1 · ${LABOUR_PHASE_LABEL_TH.transition}`,
    className: 'bg-warn-tint text-warn-text',
    hint: `ปากมดลูก ≥${transitionFrom} ซม.`,
  },
  active: {
    labelTh: `ระยะที่ 1 · ${LABOUR_PHASE_LABEL_TH.active}`,
    className: 'bg-ok-tint text-ok-text',
    hint: `ปากมดลูก ≥${activeFrom} และ <${transitionFrom} ซม.`,
  },
  latent: {
    labelTh: `ระยะที่ 1 · ${LABOUR_PHASE_LABEL_TH.latent}`,
    className: 'bg-brand-soft text-brand-strong',
    hint: `ปากมดลูก <${activeFrom} ซม. หรือยังไม่มีบันทึก`,
  },
};

/** Same rule and alarm as prolongedLatent, but the cervix was never recorded:
 *  the tile says what is missing rather than implying a slow labour. */
const PROLONGED_LATENT_NO_CERVIX = {
  ...LABOUR_STAGE_DISPLAY.prolongedLatent,
  labelTh: `ยังไม่มีบันทึกปากมดลูก ≥${minHours} ชม.`,
  hint: `รับเข้า ≥${minHours} ชม. และยังไม่มีบันทึกปากมดลูก — ตรวจและบันทึกในพาร์โทกราฟ`,
};

/** Stage pill for a tile. The stage rule is classifyLabourStage; only the
 *  wording changes when a prolonged-latent patient has no cervix record. */
export function labourStageDisplay(
  stage: LabourStageKind,
  cervixCm: number | null,
): (typeof LABOUR_STAGE_DISPLAY)[LabourStageKind] {
  return stage === 'prolongedLatent' && cervixCm === null ? PROLONGED_LATENT_NO_CERVIX : LABOUR_STAGE_DISPLAY[stage];
}

/** Allergy pill. A missing count is "unknown" — never "no allergy history". */
export function allergyStatus(count: number | null | undefined): {
  kind: 'allergy' | 'none' | 'unknown';
  labelTh: string;
  titleTh: string;
} {
  if (count === null || count === undefined) {
    return {
      kind: 'unknown',
      labelTh: 'ไม่ทราบประวัติแพ้ยา',
      titleTh: 'HOSxP ไม่ส่งข้อมูลการแพ้ยา — ซักประวัติและตรวจใน HOSxP ก่อนให้ยา',
    };
  }
  if (count > 0) return { kind: 'allergy', labelTh: 'แพ้ยา', titleTh: `มีประวัติแพ้ยา ${count} รายการ` };
  return { kind: 'none', labelTh: 'ไม่มีประวัติแพ้ยา', titleTh: 'ไม่มีประวัติแพ้ยาในระบบ' };
}

/** Room header line. "มีผู้คลอด" is patients (a shared bed holds two), so the
 *  room lines plus the unplaced section add up to the ward KPI. */
export function formatRoomSummary(s: BedSummary): string {
  const parts = [`${s.totalBeds} เตียง`, `มีผู้คลอด ${s.patients}`, `ว่าง ${s.free}`];
  if (s.lockedEmpty > 0) parts.push(`ปิดใช้งาน ${s.lockedEmpty}`);
  if (s.sharedBeds > 0) parts.push(`เตียงซ้อน ${s.sharedBeds}`);
  return parts.join(' · ');
}

/** I2: admitted patients with a blank bed or a bed outside this ward's layout. */
export const UNPLACED_SECTION = {
  title: 'ยังไม่ได้จัดเตียง / ไม่ตรงผังเตียง',
  summary: (n: number) =>
    `ผู้คลอด ${n} รายรับไว้ในวอร์ดนี้แต่ไม่มีเตียงในผัง — จัดหรือแก้เตียงใน HOSxP แล้วกด รีเฟรช`,
} as const;

/** Tile head for an unplaced patient (replaces "เตียง {bedno}"). */
export function unplacedBedLabel(u: { reason: UnplacedReason; bedno: string | null }): string {
  return u.reason === 'noBed' ? 'ยังไม่ได้จัดเตียง' : `เตียง ${u.bedno} · ไม่อยู่ในผังวอร์ดนี้`;
}

/** Conflict notice above a bed HOSxP has given to more than one admission. */
export function sharedBedNotice(bedno: string, count: number): string {
  return `เตียงซ้อน: ${count} รายบนเตียง ${bedno} ใน HOSxP — ตรวจและแก้เตียงใน HOSxP`;
}
