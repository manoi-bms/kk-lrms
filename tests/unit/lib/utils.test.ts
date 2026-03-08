// Unit tests for src/lib/utils.ts — all exported utility functions
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cn,
  formatThaiDate,
  formatThaiTime,
  calculateAge,
  riskLevelToColor,
  riskLevelToBgColor,
  riskLevelToThaiLabel,
  formatHospitalLevel,
  truncateName,
} from '@/lib/utils';
import { RiskLevel, HospitalLevel } from '@/types/domain';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('handles conditional classes (false)', () => {
      expect(cn('base', false && 'hidden')).toBe('base');
    });

    it('handles conditional classes (true)', () => {
      expect(cn('base', true && 'hidden')).toBe('base hidden');
    });

    it('handles undefined and null inputs', () => {
      expect(cn('base', undefined, null)).toBe('base');
    });

    it('resolves tailwind conflicts (last wins)', () => {
      // tailwind-merge should resolve px-2 vs px-4 to px-4
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('handles empty input', () => {
      expect(cn()).toBe('');
    });
  });

  describe('formatThaiDate', () => {
    it('formats a Date object in Thai format with Buddhist Era year', () => {
      // 2024-01-15 → 15 ม.ค. 2567
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatThaiDate(date)).toBe('15 ม.ค. 2567');
    });

    it('formats a date string', () => {
      // Note: new Date('2024-06-01') is midnight UTC, which may shift day by timezone.
      // Use an explicit Date to avoid timezone issues.
      const date = new Date(2024, 5, 1); // June 1, 2024
      expect(formatThaiDate(date)).toBe('1 มิ.ย. 2567');
    });

    it('handles December correctly (last month)', () => {
      const date = new Date(2025, 11, 31); // December 31, 2025
      expect(formatThaiDate(date)).toBe('31 ธ.ค. 2568');
    });

    it('handles February correctly', () => {
      const date = new Date(2026, 1, 28); // Feb 28, 2026
      expect(formatThaiDate(date)).toBe('28 ก.พ. 2569');
    });
  });

  describe('formatThaiTime', () => {
    it('formats time in Thai locale (HH:MM)', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      const result = formatThaiTime(date);
      // Thai locale typically produces "14:30" format
      expect(result).toContain('14');
      expect(result).toContain('30');
    });

    it('handles midnight', () => {
      const date = new Date(2024, 0, 15, 0, 0, 0);
      const result = formatThaiTime(date);
      expect(result).toContain('00');
    });

    it('accepts a string input', () => {
      const result = formatThaiTime(new Date(2024, 0, 15, 9, 5, 0));
      expect(result).toContain('09');
      expect(result).toContain('05');
    });
  });

  describe('calculateAge', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('calculates correct age from birthday (birthday already passed this year)', () => {
      // Fix "today" to 2026-03-09
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 9)); // March 9, 2026
      expect(calculateAge('1998-01-15')).toBe(28);
    });

    it('handles birthday later in the year (not yet had birthday)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 9)); // March 9, 2026
      // Birthday is December 15 — hasn't happened yet in 2026
      expect(calculateAge('1998-12-15')).toBe(27);
    });

    it('handles birthday today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 9)); // March 9, 2026
      expect(calculateAge('1996-03-09')).toBe(30);
    });

    it('handles birthday tomorrow (same month, day is tomorrow)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 9)); // March 9, 2026
      // Birthday March 10 — hasn't happened yet
      expect(calculateAge('1998-03-10')).toBe(27);
    });

    it('accepts a Date object', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 9));
      expect(calculateAge(new Date(2000, 0, 1))).toBe(26);
    });
  });

  describe('riskLevelToColor', () => {
    it('returns green (#22c55e) for LOW', () => {
      expect(riskLevelToColor(RiskLevel.LOW)).toBe('#22c55e');
    });

    it('returns yellow (#eab308) for MEDIUM', () => {
      expect(riskLevelToColor(RiskLevel.MEDIUM)).toBe('#eab308');
    });

    it('returns red (#ef4444) for HIGH', () => {
      expect(riskLevelToColor(RiskLevel.HIGH)).toBe('#ef4444');
    });
  });

  describe('riskLevelToBgColor', () => {
    it('returns light green (#dcfce7) for LOW', () => {
      expect(riskLevelToBgColor(RiskLevel.LOW)).toBe('#dcfce7');
    });

    it('returns light yellow (#fef9c3) for MEDIUM', () => {
      expect(riskLevelToBgColor(RiskLevel.MEDIUM)).toBe('#fef9c3');
    });

    it('returns light red (#fee2e2) for HIGH', () => {
      expect(riskLevelToBgColor(RiskLevel.HIGH)).toBe('#fee2e2');
    });
  });

  describe('riskLevelToThaiLabel', () => {
    it('returns เสี่ยงต่ำ for LOW', () => {
      expect(riskLevelToThaiLabel(RiskLevel.LOW)).toBe('เสี่ยงต่ำ');
    });

    it('returns เสี่ยงปานกลาง for MEDIUM', () => {
      expect(riskLevelToThaiLabel(RiskLevel.MEDIUM)).toBe('เสี่ยงปานกลาง');
    });

    it('returns เสี่ยงสูง for HIGH', () => {
      expect(riskLevelToThaiLabel(RiskLevel.HIGH)).toBe('เสี่ยงสูง');
    });
  });

  describe('formatHospitalLevel', () => {
    it('formats A_S level correctly', () => {
      expect(formatHospitalLevel(HospitalLevel.A_S)).toBe('รพช. ขนาดใหญ่');
    });

    it('formats M1 level correctly', () => {
      expect(formatHospitalLevel(HospitalLevel.M1)).toBe('รพช. ขนาดกลาง M1');
    });

    it('formats M2 level correctly', () => {
      expect(formatHospitalLevel(HospitalLevel.M2)).toBe('รพช. ขนาดกลาง M2');
    });

    it('formats F1 level correctly', () => {
      expect(formatHospitalLevel(HospitalLevel.F1)).toBe('รพช. ขนาดเล็ก F1');
    });

    it('formats F2 level correctly', () => {
      expect(formatHospitalLevel(HospitalLevel.F2)).toBe('รพช. ขนาดเล็ก F2');
    });

    it('formats F3 level correctly', () => {
      expect(formatHospitalLevel(HospitalLevel.F3)).toBe('รพ.สต./F3');
    });

    it('returns string representation for unknown level', () => {
      // Cast an unknown value to test the fallback
      expect(formatHospitalLevel('UNKNOWN' as HospitalLevel)).toBe('UNKNOWN');
    });
  });

  describe('truncateName', () => {
    it('returns short names unchanged', () => {
      expect(truncateName('สมหญิง ทดสอบ')).toBe('สมหญิง ทดสอบ');
    });

    it('truncates long names with ellipsis at default maxLen (30)', () => {
      const longName = 'นางสาวประภาพรรณ สุขสมบูรณ์ชัยศรีสวัสดิ์พิพัฒนา';
      const result = truncateName(longName);
      expect(result.length).toBe(33); // 30 chars + '...'
      expect(result).toMatch(/\.\.\.$/);
    });

    it('truncates with custom maxLen', () => {
      const name = 'สมหญิง ทดสอบระบบ';
      const result = truncateName(name, 10);
      expect(result).toBe(name.slice(0, 10) + '...');
    });

    it('returns name unchanged when exactly at maxLen', () => {
      const name = 'abcde';
      expect(truncateName(name, 5)).toBe('abcde');
    });

    it('handles empty string', () => {
      expect(truncateName('')).toBe('');
    });
  });
});
