// tests/unit/config/ward-display.test.ts
import { describe, it, expect } from 'vitest';
import { BED_MOVE_ALERTS, LABOUR_STAGE_DISPLAY, WARD_FEED_STATUS, formatRoomSummary } from '@/config/ward-display';
import { LABOUR_PHASE_LABEL_TH } from '@/config/obstetric-display';

describe('ward-display', () => {
  it('feed status: Thai label + tone per health', () => {
    expect(WARD_FEED_STATUS).toEqual({
      ok: { labelTh: 'เชื่อมต่อ HOSxP สด', tone: 'ok', pulse: false },
      reconnecting: { labelTh: 'กำลังเชื่อมต่อ HOSxP ใหม่…', tone: 'warn', pulse: true },
      error: { labelTh: 'ขาดการเชื่อมต่อ HOSxP', tone: 'danger', pulse: true },
    });
  });
  it('bed-move alerts keep the page’s Thai copy, split into what happened / what to do', () => {
    expect(BED_MOVE_ALERTS.writeFailed.title).toBe('ย้ายเตียงไม่สำเร็จ — เตียงอาจถูกย้ายแล้วแต่บันทึกประวัติไม่ครบ');
    expect(BED_MOVE_ALERTS.writeFailed.remedy).toBe('ตรวจสอบสถานะเตียงใน HOSxP แล้วกด รีเฟรช ก่อนลองใหม่');
    expect(BED_MOVE_ALERTS.locked).toEqual({
      title: 'ย้ายเตียงไม่ได้ — เตียงปลายทางถูกล็อก',
      remedy: 'ปลดล็อกเตียงใน HOSxP ก่อน หรือเลือกเตียงว่างอื่น',
      tone: 'warn',
    });
    expect(BED_MOVE_ALERTS.occupied).toEqual({
      title: 'ย้ายเตียงไม่ได้ — เตียงปลายทางไม่ว่าง',
      remedy: 'เลือกเตียงที่ว่างและไม่ถูกล็อก แล้วลองอีกครั้ง',
      tone: 'warn',
    });
  });
});

describe('ward-display — stage pill + room summary', () => {
  it('stage labels reuse the shared Thai phase words; tones follow spec D4', () => {
    expect(LABOUR_PHASE_LABEL_TH).toEqual({ latent: 'ระยะแฝง', active: 'ระยะเร่ง', transition: 'ระยะเปลี่ยนผ่าน' });
    expect(LABOUR_STAGE_DISPLAY.prolongedLatent).toMatchObject({
      labelTh: 'ระยะแฝงนาน · ประเมินด่วน',
      className: 'bg-danger text-white',
      hint: 'รับเข้า ≥12 ชม. และปากมดลูก <4 ซม. หรือยังไม่มีบันทึก',
    });
    expect(LABOUR_STAGE_DISPLAY.transition).toMatchObject({
      labelTh: 'ระยะที่ 1 · ระยะเปลี่ยนผ่าน',
      className: 'bg-warn-tint text-warn-text',
    });
    expect(LABOUR_STAGE_DISPLAY.active).toMatchObject({ labelTh: 'ระยะที่ 1 · ระยะเร่ง', className: 'bg-ok-tint text-ok-text' });
    expect(LABOUR_STAGE_DISPLAY.latent).toMatchObject({
      labelTh: 'ระยะที่ 1 · ระยะแฝง',
      className: 'bg-brand-soft text-brand-strong',
    });
  });

  it('room summary: unpadded counts, locked only when present', () => {
    const base = { totalBeds: 5, occupied: 3, free: 2, lockedEmpty: 0, lockedOccupied: 0, prolongedLatent: 0, occupancyPct: 60 };
    expect(formatRoomSummary(base)).toBe('5 เตียง · มีผู้คลอด 3 · ว่าง 2');
    expect(formatRoomSummary({ ...base, lockedEmpty: 2 })).toBe('5 เตียง · มีผู้คลอด 3 · ว่าง 2 · ปิดใช้งาน 2');
  });
});

