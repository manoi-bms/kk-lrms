// src/services/ward-board.ts
// Ward-board rules. This module is the one source for the KPI masthead, the
// room headers and the bed tiles (constitution IV), so they cannot disagree.
// Pure: `now` is always passed in, keeping the board render-pure.
//
// The values are the ones the board has always used. Any clinical change
// needs the clinical owner's sign-off, not a UI edit.
import type { BedOccupancyFull, BedSlot } from '@/types/maternity-ward';

/** Prolonged latent phase on the board: admitted at least `minHours` ago
 *  with the cervix still below `cervixBelowCm` cm, or never recorded. */
export const PROLONGED_LATENT_RULE = { minHours: 12, cervixBelowCm: 4 } as const;

/** Cervix (cm) at which the tile reads active, then transition. */
export const LABOUR_STAGE_CM = { activeFrom: 4, transitionFrom: 7 } as const;

export type LabourStageKind = 'prolongedLatent' | 'transition' | 'active' | 'latent';

type AdmitTime = Pick<BedOccupancyFull, 'regdate' | 'regtime'>;

/** Hours since admission. HOSxP's local date + time are parsed as local
 *  time; an unparseable date counts as 0 h, which never triggers an alarm. */
export function hoursSinceAdmit(o: AdmitTime, now: number): number {
  const ts = Date.parse(`${o.regdate}T${o.regtime ?? '00:00:00'}`);
  return Number.isFinite(ts) ? (now - ts) / 3_600_000 : 0;
}

export function classifyLabourStage(
  o: AdmitTime & Pick<BedOccupancyFull, 'last_cervix_cm'>,
  now: number,
): LabourStageKind {
  const cx = o.last_cervix_cm;
  if (
    hoursSinceAdmit(o, now) >= PROLONGED_LATENT_RULE.minHours &&
    (cx === null || cx < PROLONGED_LATENT_RULE.cervixBelowCm)
  ) {
    return 'prolongedLatent';
  }
  if (cx !== null && cx >= LABOUR_STAGE_CM.transitionFrom) return 'transition';
  if (cx !== null && cx >= LABOUR_STAGE_CM.activeFrom) return 'active';
  return 'latent';
}

export interface RoomGroup {
  roomno: string;
  room_name: string | null;
  room_display_number: number | null;
  beds: BedSlot[];
}

/** Rooms by display number then roomno; beds by bed_order (nulls last) then bedno. */
export function groupBedsByRoom(beds: BedSlot[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>();
  for (const b of beds) {
    let g = map.get(b.roomno);
    if (!g) {
      g = { roomno: b.roomno, room_name: b.room_name, room_display_number: b.room_display_number, beds: [] };
      map.set(b.roomno, g);
    }
    g.beds.push(b);
  }
  for (const g of map.values()) {
    g.beds.sort((a, b) => {
      const ao = a.bed_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.bed_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.bedno.localeCompare(b.bedno);
    });
  }
  return [...map.values()].sort((a, b) => {
    const ad = a.room_display_number ?? Number.MAX_SAFE_INTEGER;
    const bd = b.room_display_number ?? Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;
    return a.roomno.localeCompare(b.roomno);
  });
}

export interface BedSummary {
  totalBeds: number;
  /** Occupant rows on these beds, including patients on a locked bed (B1). */
  occupied: number;
  free: number;
  /** Locked beds with nobody in them. */
  lockedEmpty: number;
  /** Locked beds that still hold a patient (B1). They are shown and counted as occupied. */
  lockedOccupied: number;
  prolongedLatent: number;
  /** Rounded % of beds occupied; null for a ward with no beds. */
  occupancyPct: number | null;
}

/**
 * The one counting rule for a ward or a room (B1). An occupant always counts
 * as occupied, even on a bed HOSxP has since locked. `lockedEmpty` counts only
 * empty locked beds, and free = total − occupied − lockedEmpty (never below 0).
 * Occupants whose bed is not in `beds` are ignored.
 */
export function summarizeBeds(beds: BedSlot[], occupancy: BedOccupancyFull[], now: number): BedSummary {
  const bednos = new Set(beds.map((b) => b.bedno));
  const occ = occupancy.filter((o) => bednos.has(o.bedno));
  const occupiedBednos = new Set(occ.map((o) => o.bedno));
  const locked = beds.filter((b) => b.bed_lock === 'Y');
  const lockedEmpty = locked.filter((b) => !occupiedBednos.has(b.bedno)).length;
  const totalBeds = beds.length;
  const occupied = occ.length;
  return {
    totalBeds,
    occupied,
    free: Math.max(0, totalBeds - occupied - lockedEmpty),
    lockedEmpty,
    lockedOccupied: locked.length - lockedEmpty,
    prolongedLatent: occ.filter((o) => classifyLabourStage(o, now) === 'prolongedLatent').length,
    occupancyPct: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : null,
  };
}
