// HighRiskPatientList component tests — TDD: write tests FIRST
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HighRiskPatientList } from '@/components/dashboard/HighRiskPatientList';
import type { HighRiskPatient } from '@/components/dashboard/HighRiskPatientList';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const now = new Date();

function minutesAgo(mins: number): string {
  return new Date(now.getTime() - mins * 60000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60000).toISOString();
}

const samplePatients: HighRiskPatient[] = [
  {
    an: 'AN001',
    hn: 'HN001',
    name: 'สมศรี ใจดี',
    age: 28,
    gaWeeks: 38,
    cpdScore: 12,
    riskLevel: 'HIGH',
    hospital: 'รพ.ขอนแก่น',
    hcode: 'H001',
    admitDate: minutesAgo(30),
    lastVitalAt: minutesAgo(5),
  },
  {
    an: 'AN002',
    hn: 'HN002',
    name: 'สมหญิง รักดี',
    age: 32,
    gaWeeks: 40,
    cpdScore: 8,
    riskLevel: 'MEDIUM',
    hospital: 'รพ.ชุมแพ',
    hcode: 'H002',
    admitDate: hoursAgo(2),
    lastVitalAt: minutesAgo(45),
  },
  {
    an: 'AN003',
    hn: 'HN003',
    name: 'วิภา สุขใจ',
    age: 25,
    gaWeeks: 36,
    cpdScore: 15,
    riskLevel: 'HIGH',
    hospital: 'รพ.ขอนแก่น',
    hcode: 'H001',
    admitDate: null,
    lastVitalAt: null,
  },
];

// Note: Both desktop (table) and mobile (card list) render in the DOM simultaneously
// (CSS media queries don't apply in jsdom). Each patient appears twice —
// once in the table and once in the mobile card list.

describe('HighRiskPatientList', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the title and patient count badge', () => {
    render(<HighRiskPatientList patients={samplePatients} />);
    expect(screen.getByText('ผู้ป่วยเสี่ยงสูง')).toBeTruthy();
    // Count badge shows total number
    expect(screen.getByText(String(samplePatients.length))).toBeTruthy();
  });

  it('renders all patient AN numbers (both desktop and mobile)', () => {
    render(<HighRiskPatientList patients={samplePatients} />);
    // Each AN appears twice (desktop table + mobile cards)
    expect(screen.getAllByText(/AN001/).length).toBe(2);
    expect(screen.getAllByText(/AN002/).length).toBe(2);
    expect(screen.getAllByText(/AN003/).length).toBe(2);
  });

  it('sorts patients by CPD score descending (highest first)', () => {
    const { container } = render(<HighRiskPatientList patients={samplePatients} />);
    // Both desktop and mobile render patient-row elements; 6 total (3 desktop + 3 mobile)
    const rows = container.querySelectorAll('[data-testid="patient-row"]');
    expect(rows.length).toBe(6);
    // Desktop rows are first 3; check order: score 15, 12, 8
    expect(rows[0].textContent).toContain('15');
    expect(rows[1].textContent).toContain('12');
    expect(rows[2].textContent).toContain('8');
  });

  it('navigates to patient detail on row click', () => {
    const { container } = render(<HighRiskPatientList patients={samplePatients} />);
    const rows = container.querySelectorAll('[data-testid="patient-row"]');
    // First row is AN003 (score 15, sorted first)
    fireEvent.click(rows[0]);
    expect(mockPush).toHaveBeenCalledWith('/patients/H001-AN003');
  });

  it('displays CPD score with font-mono styling', () => {
    const { container } = render(<HighRiskPatientList patients={samplePatients} />);
    const monoElements = container.querySelectorAll('.font-mono');
    expect(monoElements.length).toBeGreaterThan(0);
  });

  it('shows hospital name for each patient', () => {
    render(<HighRiskPatientList patients={samplePatients} />);
    // รพ.ขอนแก่น appears for AN001 and AN003, each twice (desktop + mobile) = 4
    expect(screen.getAllByText('รพ.ขอนแก่น').length).toBe(4);
    // รพ.ชุมแพ appears for AN002 twice (desktop + mobile) = 2
    expect(screen.getAllByText('รพ.ชุมแพ').length).toBe(2);
  });

  it('shows dash for null admitDate and lastVitalAt', () => {
    // AN003 has null dates
    render(<HighRiskPatientList patients={[samplePatients[2]]} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when no patients', () => {
    render(<HighRiskPatientList patients={[]} />);
    expect(screen.getByText('ไม่มีผู้ป่วยเสี่ยงสูง')).toBeTruthy();
  });

  it('shows loading skeletons when isLoading is true', () => {
    const { container } = render(<HighRiskPatientList patients={[]} isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not show empty state when loading', () => {
    render(<HighRiskPatientList patients={[]} isLoading={true} />);
    expect(screen.queryByText('ไม่มีผู้ป่วยเสี่ยงสูง')).toBeNull();
  });

  it('renders age and GA weeks', () => {
    render(<HighRiskPatientList patients={samplePatients} />);
    // Age 28 appears in both desktop table and mobile card = 2
    expect(screen.getAllByText('28').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('38').length).toBeGreaterThanOrEqual(1);
  });

  it('shows risk indicator dots with correct colors', () => {
    const { container } = render(<HighRiskPatientList patients={samplePatients} />);
    // HIGH risk rows: 2 patients x 2 layouts (desktop + mobile) = 4 dots
    const redDots = container.querySelectorAll('[data-risk="HIGH"]');
    expect(redDots.length).toBe(4);
    // MEDIUM risk rows: 1 patient x 2 layouts = 2 dots
    const amberDots = container.querySelectorAll('[data-risk="MEDIUM"]');
    expect(amberDots.length).toBe(2);
  });
});
