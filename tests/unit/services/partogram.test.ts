// T065: Partogram service tests — TDD: write tests FIRST
import { describe, it, expect } from 'vitest';
import {
  calculateAlertLine,
  calculateActionLine,
  generatePartogramEntries,
} from '@/services/partogram';

describe('Partogram Service', () => {
  describe('calculateAlertLine', () => {
    it('starts at 4cm dilation and progresses 1cm/hr', () => {
      const startTime = new Date('2024-01-01T08:00:00Z');
      const alertLine = calculateAlertLine(startTime, 4);

      // Should generate points from 4cm to 10cm at 1cm/hr
      expect(alertLine.length).toBe(7); // 4, 5, 6, 7, 8, 9, 10
      expect(alertLine[0].dilationCm).toBe(4);
      expect(alertLine[0].measuredAt).toBe('2024-01-01T08:00:00.000Z');

      expect(alertLine[1].dilationCm).toBe(5);
      expect(alertLine[1].measuredAt).toBe('2024-01-01T09:00:00.000Z');

      expect(alertLine[6].dilationCm).toBe(10);
      expect(alertLine[6].measuredAt).toBe('2024-01-01T14:00:00.000Z');
    });

    it('handles custom start dilation', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const alertLine = calculateAlertLine(startTime, 6);

      expect(alertLine[0].dilationCm).toBe(6);
      expect(alertLine.length).toBe(5); // 6, 7, 8, 9, 10
    });
  });

  describe('calculateActionLine', () => {
    it('offsets alert line 4 hours to the right', () => {
      const startTime = new Date('2024-01-01T08:00:00Z');
      const alertLine = calculateAlertLine(startTime, 4);
      const actionLine = calculateActionLine(alertLine);

      // Action line same dilation values but +4 hours
      expect(actionLine.length).toBe(alertLine.length);
      expect(actionLine[0].dilationCm).toBe(4);
      expect(actionLine[0].measuredAt).toBe('2024-01-01T12:00:00.000Z'); // +4 hours

      expect(actionLine[1].dilationCm).toBe(5);
      expect(actionLine[1].measuredAt).toBe('2024-01-01T13:00:00.000Z');
    });
  });

  describe('generatePartogramEntries', () => {
    it('maps vital signs to partogram entries with alert/action lines', () => {
      const vitalSigns = [
        { measuredAt: '2024-01-01T08:00:00Z', cervixCm: 4 },
        { measuredAt: '2024-01-01T09:30:00Z', cervixCm: 5 },
        { measuredAt: '2024-01-01T11:00:00Z', cervixCm: 6 },
      ];

      const entries = generatePartogramEntries(vitalSigns);

      expect(entries.length).toBe(3);
      // Each entry has dilation from vital signs
      expect(entries[0].dilationCm).toBe(4);
      expect(entries[1].dilationCm).toBe(5);
      expect(entries[2].dilationCm).toBe(6);
      // Each entry has measuredAt from vital signs
      expect(entries[0].measuredAt).toBe('2024-01-01T08:00:00Z');
      // Alert/action line values are computed
      expect(entries[0].alertLineCm).toBeTypeOf('number');
      expect(entries[0].actionLineCm).toBeTypeOf('number');
    });

    it('returns empty entries for empty vital signs', () => {
      const entries = generatePartogramEntries([]);
      expect(entries).toEqual([]);
    });

    it('handles single vital sign entry', () => {
      const vitalSigns = [
        { measuredAt: '2024-01-01T08:00:00Z', cervixCm: 3 },
      ];

      const entries = generatePartogramEntries(vitalSigns);
      expect(entries.length).toBe(1);
      expect(entries[0].dilationCm).toBe(3);
      // Before active phase (4cm), alert/action lines are null
      expect(entries[0].alertLineCm).toBeNull();
      expect(entries[0].actionLineCm).toBeNull();
    });

    it('computes alert line only after reaching 4cm', () => {
      const vitalSigns = [
        { measuredAt: '2024-01-01T06:00:00Z', cervixCm: 2 },
        { measuredAt: '2024-01-01T07:00:00Z', cervixCm: 3 },
        { measuredAt: '2024-01-01T08:00:00Z', cervixCm: 4 },
        { measuredAt: '2024-01-01T09:30:00Z', cervixCm: 5 },
      ];

      const entries = generatePartogramEntries(vitalSigns);
      // First two entries (before 4cm) — no alert/action line
      expect(entries[0].alertLineCm).toBeNull();
      expect(entries[1].alertLineCm).toBeNull();
      // At 4cm and after — alert/action lines computed
      expect(entries[2].alertLineCm).toBe(4);
      expect(entries[3].alertLineCm).toBeTypeOf('number');
    });
  });
});
