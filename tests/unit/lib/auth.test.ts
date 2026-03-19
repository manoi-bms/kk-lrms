// T083: BMS Session auth provider tests — TDD: write tests FIRST
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapPositionToRole, validateBmsSession } from '@/lib/auth-utils';
import { UserRole } from '@/types/domain';

// Mock fetch for BMS API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BMS Session Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapPositionToRole', () => {
    it('maps director to ADMIN', () => {
      expect(mapPositionToRole('director')).toBe(UserRole.ADMIN);
      expect(mapPositionToRole('Director')).toBe(UserRole.ADMIN);
      expect(mapPositionToRole('ผู้อำนวยการ')).toBe(UserRole.ADMIN);
    });

    it('maps doctor/obstetrician to OBSTETRICIAN', () => {
      expect(mapPositionToRole('doctor')).toBe(UserRole.OBSTETRICIAN);
      expect(mapPositionToRole('สูติแพทย์')).toBe(UserRole.OBSTETRICIAN);
      expect(mapPositionToRole('แพทย์')).toBe(UserRole.OBSTETRICIAN);
    });

    it('maps other positions to NURSE by default', () => {
      expect(mapPositionToRole('nurse')).toBe(UserRole.NURSE);
      expect(mapPositionToRole('พยาบาล')).toBe(UserRole.NURSE);
      expect(mapPositionToRole('unknown')).toBe(UserRole.NURSE);
      expect(mapPositionToRole('')).toBe(UserRole.NURSE);
    });
  });

  describe('validateBmsSession', () => {
    it('validates session ID and returns user identity', async () => {
      // validateBmsSession makes a single POST to the validate URL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jwt: 'jwt-token-123',
          bms_url: 'https://hospital.example.com',
          user: {
            name: 'Dr. Test',
            position: 'doctor',
            hospital_code: '10670',
          },
          expires_at: '2024-12-31T23:59:59Z',
        }),
      });

      const result = await validateBmsSession('test-session-123', 'https://tunnel.example.com');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Dr. Test');
      expect(result!.role).toBe(UserRole.OBSTETRICIAN);
      expect(result!.hospitalCode).toBe('10670');
    });

    it('returns null for invalid session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await validateBmsSession('invalid-session', 'https://tunnel.example.com');
      expect(result).toBeNull();
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateBmsSession('test-session', 'https://tunnel.example.com');
      expect(result).toBeNull();
    });
  });
});
