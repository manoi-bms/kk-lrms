// Tooltip copy for the labour vitals. VITALS_HINTS / admissionsHint are shared
// copy for the kiosk ProvinceVitalsStrip (they describe its "+N" deltas and
// colour bar); LABOR_TILE_HINTS / laborAdmissionsHint describe exactly what the
// normal-mode LaborVitalsSection tiles show. Both mirror the SQL in
// services/dashboard.ts (getDashboardSummary / getDashboardTrends) so the
// explanation cannot drift from the metric without a code change.
import type { ReactNode } from 'react';

export interface MetricHint {
  title: string;
  body: ReactNode;
}

export const VITALS_HINTS = {
  active: {
    title: 'ผู้ป่วยในห้องคลอดทั้งจังหวัด',
    body: (
      <>
        จำนวนผู้ป่วยที่ยังอยู่ในห้องคลอด (<strong>labor_status = ACTIVE</strong>) รวมทุก รพ.
        ใน จ.ขอนแก่นที่เปิดใช้งานในระบบ KK-LRMS. ตัวเลข <strong>+N ราย/24h</strong> =
        จำนวนรับใหม่ในรอบ 24 ชม.ที่ผ่านมา. แถบสีด้านล่างเป็นสัดส่วนตามระดับความเสี่ยง CPD ของ
        score ล่าสุด — LOW (เขียว) / MED (ส้ม) / HIGH (แดง). คะแนน CPD คำนวณจาก
        src/services/cpd-score.ts.
      </>
    ),
  },
  high: {
    title: 'ผู้ป่วยเสี่ยงสูง (CPD HIGH)',
    body: (
      <>
        ผู้ป่วย <strong>labor_status = ACTIVE</strong> ที่ <strong>CPD score ล่าสุด</strong>{' '}
        อยู่ในเกณฑ์ HIGH ตาม src/config/risk-levels.ts. ▲ <strong>+N</strong> = รับใหม่ใน 24
        ชม.ล่าสุดที่ปัจจุบันอยู่ในระดับนี้. ปฏิบัติ: เฝ้าระวังใกล้ชิด พร้อมส่งต่อ รพ.ที่มี
        ศักยภาพสูงกว่าถ้าจำเป็น.
      </>
    ),
  },
  medium: {
    title: 'ผู้ป่วยเสี่ยงปานกลาง (CPD MEDIUM)',
    body: (
      <>
        ผู้ป่วย <strong>labor_status = ACTIVE</strong> ที่ CPD score ล่าสุดอยู่ในเกณฑ์ MEDIUM.
        ▲ <strong>+N</strong> = รับใหม่ใน 24 ชม.ล่าสุดที่ปัจจุบันอยู่ในระดับนี้. ปฏิบัติ:
        ติดตามดูแลตามแนวทาง, ทบทวนคะแนน CPD ถ้าอาการเปลี่ยน.
      </>
    ),
  },
  low: {
    title: 'ผู้ป่วยเสี่ยงต่ำ (CPD LOW)',
    body: (
      <>
        ผู้ป่วย <strong>labor_status = ACTIVE</strong> ที่ CPD score ล่าสุดอยู่ในเกณฑ์ LOW
        (ปกติ). ▲ <strong>+N</strong> = รับใหม่ใน 24 ชม.ล่าสุดที่ปัจจุบันอยู่ในระดับนี้.
      </>
    ),
  },
} satisfies Record<string, MetricHint>;

export function admissionsHint(today: number, avg7d: number): MetricHint {
  return {
    title: 'รับเข้าห้องคลอดในรอบ 24 ชั่วโมง',
    body: (
      <>
        กราฟแท่งแสดงจำนวนผู้ป่วยรับเข้าใหม่ <strong>ทุกชั่วโมงตลอด 24 ชม.ล่าสุด</strong>{' '}
        (เวลาประเทศไทย, Asia/Bangkok). <strong>{today} today</strong> =
        รับเข้าตั้งแต่ 00:00 ของวันนี้.{' '}
        <strong>avg {avg7d.toFixed(1)}</strong> = ค่าเฉลี่ยรับเข้าต่อวันใน 7
        วันที่ผ่านมา. ถ้า today สูงกว่า avg อย่างเห็นได้ชัด แสดงว่ามีการรับเข้าผิดปกติ
        ควรตรวจสอบสาเหตุ.
      </>
    ),
  };
}

/** Normal-mode tiles: the sub-line under each number is "รับใหม่ … ราย (24 ชม.)",
 *  and the proportion bar sits below the whole tile row. */
export const LABOR_TILE_HINTS = {
  active: {
    title: 'ผู้คลอดในห้องคลอดทั้งจังหวัด',
    body: (
      <>
        จำนวนผู้ป่วยที่ยังอยู่ในห้องคลอด (<strong>labor_status = ACTIVE</strong>) รวมทุก รพ.
        ที่เปิดใช้งานในระบบ KK-LRMS. บรรทัดล่างตัวเลข &quot;รับใหม่ N ราย&quot; =
        จำนวนที่รับเข้าใหม่ในรอบ 24 ชม.ที่ผ่านมา. แถบสีใต้การ์ดแสดงสัดส่วนตามระดับความเสี่ยง
        CPD ของคะแนนล่าสุด (เขียว = ต่ำ, ส้ม = ปานกลาง, แดง = สูง).
      </>
    ),
  },
  high: {
    title: 'ผู้คลอดเสี่ยงสูง (CPD HIGH)',
    body: (
      <>
        ผู้ป่วย <strong>labor_status = ACTIVE</strong> ที่ <strong>CPD score ล่าสุด</strong>{' '}
        อยู่ในเกณฑ์ HIGH ตาม src/config/risk-levels.ts. บรรทัดล่าง = จำนวนที่รับเข้าใหม่ใน 24
        ชม.ล่าสุดและขณะนี้อยู่ในระดับนี้. ปฏิบัติ: เฝ้าระวังใกล้ชิด
        พร้อมส่งต่อ รพ.ที่มีศักยภาพสูงกว่าถ้าจำเป็น.
      </>
    ),
  },
  medium: {
    title: 'ผู้คลอดเสี่ยงปานกลาง (CPD MEDIUM)',
    body: (
      <>
        ผู้ป่วย <strong>labor_status = ACTIVE</strong> ที่ CPD score ล่าสุดอยู่ในเกณฑ์ MEDIUM.
        บรรทัดล่าง = จำนวนที่รับเข้าใหม่ใน 24 ชม.ล่าสุดและขณะนี้อยู่ในระดับนี้. ปฏิบัติ:
        ติดตามดูแลตามแนวทาง, ทบทวนคะแนน CPD ถ้าอาการเปลี่ยน.
      </>
    ),
  },
  low: {
    title: 'ผู้คลอดเสี่ยงต่ำ (CPD LOW)',
    body: (
      <>
        ผู้ป่วย <strong>labor_status = ACTIVE</strong> ที่ CPD score ล่าสุดอยู่ในเกณฑ์ LOW
        (ปกติ). บรรทัดล่าง = จำนวนที่รับเข้าใหม่ใน 24 ชม.ล่าสุดและขณะนี้อยู่ในระดับนี้.
      </>
    ),
  },
} satisfies Record<string, MetricHint>;

export function laborAdmissionsHint(today: number, avg7d: number): MetricHint {
  return {
    title: 'รับเข้าห้องคลอดในรอบ 24 ชั่วโมง',
    body: (
      <>
        กราฟแท่งแสดงจำนวนผู้ป่วยรับเข้าใหม่ <strong>ทุกชั่วโมงตลอด 24 ชม.ล่าสุด</strong>{' '}
        (เวลาประเทศไทย, Asia/Bangkok) แท่งขวาสุดคือชั่วโมงปัจจุบัน.{' '}
        <strong>วันนี้ {today} ราย</strong> = รับเข้าตั้งแต่ 00:00 ของวันนี้.{' '}
        <strong>เฉลี่ย 7 วัน {avg7d.toFixed(1)} ราย/วัน</strong> = ค่าเฉลี่ยรับเข้าต่อวันใน 7
        วันที่ผ่านมา. ถ้าวันนี้สูงกว่าค่าเฉลี่ยอย่างเห็นได้ชัด แสดงว่ามีการรับเข้าผิดปกติ
        ควรตรวจสอบสาเหตุ.
      </>
    ),
  };
}
