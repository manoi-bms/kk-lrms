// tests/unit/config/ward-display.test.ts
import { describe, it, expect } from 'vitest';
import { BED_MOVE_ALERTS, WARD_FEED_STATUS } from '@/config/ward-display';

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
