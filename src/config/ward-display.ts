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

export function formatRoomSummary(s: BedSummary): string {
  const base = `${s.totalBeds} เตียง · มีผู้คลอด ${s.occupied} · ว่าง ${s.free}`;
  return s.lockedEmpty > 0 ? `${base} · ปิดใช้งาน ${s.lockedEmpty}` : base;
}
