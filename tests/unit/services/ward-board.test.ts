// tests/unit/services/ward-board.test.ts
import { describe, it, expect } from 'vitest';
import {
  LABOUR_STAGE_CM,
  PROLONGED_LATENT_RULE,
  classifyLabourStage,
  groupBedsByRoom,
  hoursSinceAdmit,
  summarizeBeds,
} from '@/services/ward-board';
import { HOUR, localParts, makeBed, makeOccupant, wardScenario } from '../../helpers/ward-fixtures';

const NOW = new Date('2026-04-19T14:00:00').getTime();
const occAt = (hoursAgo: number, cx: number | null, bedno = '01') => {
  const p = localParts(NOW, hoursAgo * HOUR);
  return makeOccupant({ an: `AN-${bedno}`, bedno, roomno: 'LR1', regdate: p.date, regtime: p.time, last_cervix_cm: cx });
};

describe('ward-board rules keep their historical values', () => {
  it('prolonged latent = ≥12 h since admit and Cx unknown or < 4 cm; active from 4, transition from 7', () => {
    expect(PROLONGED_LATENT_RULE).toEqual({ minHours: 12, cervixBelowCm: 4 });
    expect(LABOUR_STAGE_CM).toEqual({ activeFrom: 4, transitionFrom: 7 });
  });

  it('hoursSinceAdmit parses regdate + regtime as local time; a missing regtime means midnight', () => {
    expect(hoursSinceAdmit(occAt(5, null), NOW)).toBeCloseTo(5, 5);
    expect(hoursSinceAdmit({ regdate: '2026-04-19', regtime: null }, NOW)).toBeCloseTo(14, 5);
    expect(hoursSinceAdmit({ regdate: 'garbage', regtime: null }, NOW)).toBe(0);
  });

  it.each([
    [12, null, 'prolongedLatent'],
    [12, 3.9, 'prolongedLatent'],
    [12 - 1 / 60, null, 'latent'],
    [12, 4, 'active'],
    [4, 3.9, 'latent'],
    [4, 4, 'active'],
    [4, 6.5, 'active'],
    [4, 7, 'transition'],
    [20, 9, 'transition'],
  ] as const)('%s h, Cx %s → %s', (h, cx, kind) => {
    expect(classifyLabourStage(occAt(h, cx), NOW)).toBe(kind);
  });
});

describe('groupBedsByRoom', () => {
  it('orders rooms by display number then roomno, beds by bed_order (nulls last) then bedno', () => {
    const s = wardScenario(NOW);
    const rooms = groupBedsByRoom([...s.beds]);
    expect(rooms.map((r) => r.roomno)).toEqual(['LR1', 'LR2']);
    expect(rooms.flatMap((r) => r.beds.map((b) => b.bedno))).toEqual(s.expected.order);
  });
});

describe('summarizeBeds', () => {
  it('summarizes the scenario ward exactly as the old masthead did', () => {
    const s = wardScenario(NOW);
    expect(summarizeBeds([...s.beds], [...s.occupancy], NOW)).toEqual({
      totalBeds: 9,
      occupied: 4,
      free: 3,
      lockedEmpty: 2,
      lockedOccupied: 0,
      prolongedLatent: 1,
      occupancyPct: 44,
    });
  });

  it('ignores occupants whose bed is not in this bed list (loose joins / another room)', () => {
    const beds = [makeBed('01', 'LR1', 1)];
    const occ = [occAt(1, 5, '01'), occAt(1, 5, '99')];
    expect(summarizeBeds(beds, occ, NOW)).toMatchObject({ totalBeds: 1, occupied: 1, free: 0 });
  });

  it('B1: a patient on a bed HOSxP has since locked is occupied, never locked or free', () => {
    const beds = [makeBed('01', 'LR1', 1, { bed_lock: 'Y' }), makeBed('02', 'LR1', 2, { bed_lock: 'Y' }), makeBed('03', 'LR1', 3)];
    const occ = [occAt(2, 5, '01')];
    expect(summarizeBeds(beds, occ, NOW)).toEqual({
      totalBeds: 3,
      occupied: 1,
      free: 1,
      lockedEmpty: 1,
      lockedOccupied: 1,
      prolongedLatent: 0,
      occupancyPct: 33,
    });
  });

  it('an empty ward has no occupancy percentage', () => {
    expect(summarizeBeds([], [], NOW)).toEqual({
      totalBeds: 0,
      occupied: 0,
      free: 0,
      lockedEmpty: 0,
      lockedOccupied: 0,
      prolongedLatent: 0,
      occupancyPct: null,
    });
  });
});
