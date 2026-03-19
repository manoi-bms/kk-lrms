// PatientHeader component tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { RiskLevel, ConnectionStatus } from '@/types/domain';

// Mock formatThaiDate to produce a predictable output
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatThaiDate: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return `${d.getDate()} ม.ค. ${d.getFullYear() + 543}`;
    },
  };
});

const baseProps = {
  hn: '12345',
  an: 'AN-001',
  name: 'นางสาวทดสอบ ใจดี',
  age: 28,
  admitDate: '2026-01-15T08:30:00Z',
  laborStatus: 'ACTIVE',
  hospital: {
    name: 'รพ.ขอนแก่น',
    level: 'A_S',
  },
  cpdScore: {
    score: 7,
    riskLevel: RiskLevel.MEDIUM,
  },
};

describe('PatientHeader', () => {
  it('renders patient HN, AN, and age', () => {
    render(<PatientHeader {...baseProps} />);
    expect(screen.getByText('12345')).toBeTruthy();
    expect(screen.getByText('AN-001')).toBeTruthy();
    expect(screen.getByText('28 ปี')).toBeTruthy();
  });

  it('shows admit date in Thai format', () => {
    render(<PatientHeader {...baseProps} />);
    // formatThaiDate mock returns "15 ม.ค. 2569" for Jan 15, 2026
    expect(screen.getByText('15 ม.ค. 2569')).toBeTruthy();
  });

  it('shows labor status badge as "คลอดอยู่" for ACTIVE status', () => {
    render(<PatientHeader {...baseProps} laborStatus="ACTIVE" />);
    expect(screen.getByText('คลอดอยู่')).toBeTruthy();
  });

  it('shows labor status badge as "คลอดแล้ว" for DELIVERED status', () => {
    render(<PatientHeader {...baseProps} laborStatus="DELIVERED" />);
    expect(screen.getByText('คลอดแล้ว')).toBeTruthy();
  });

  it('shows hospital name and level', () => {
    render(<PatientHeader {...baseProps} />);
    expect(screen.getByText('รพ.ขอนแก่น')).toBeTruthy();
    expect(screen.getByText('A_S')).toBeTruthy();
  });

  it('shows CpdBadge with score when cpdScore is provided', () => {
    render(<PatientHeader {...baseProps} />);
    expect(screen.getByText('CPD Score')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('does not render CpdBadge when cpdScore is null', () => {
    render(<PatientHeader {...baseProps} cpdScore={null} />);
    expect(screen.queryByText('CPD Score')).toBeNull();
  });

  it('renders patient AN as heading', () => {
    render(<PatientHeader {...baseProps} />);
    expect(screen.getAllByText(/AN-001/).length).toBeGreaterThan(0);
  });

  it('shows ConnectionStatus when hospital has connectionStatus', () => {
    const propsWithConnection = {
      ...baseProps,
      hospital: {
        name: 'รพ.ขอนแก่น',
        level: 'A_S',
        connectionStatus: ConnectionStatus.ONLINE,
        lastSyncAt: '2026-01-15T10:00:00Z',
      },
    };
    render(<PatientHeader {...propsWithConnection} />);
    expect(screen.getByText('ออนไลน์')).toBeTruthy();
  });

  it('shows weight change display when weightKg and weightDiffKg are provided', () => {
    render(<PatientHeader {...baseProps} weightKg={70} weightDiffKg={23} />);
    // preWeight = 70 - 23 = 47
    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('70')).toBeTruthy();
    expect(screen.getByText('23 กก.')).toBeTruthy();
  });

  it('does not show weight change when weightKg is null', () => {
    render(<PatientHeader {...baseProps} weightKg={null} weightDiffKg={10} />);
    expect(screen.queryByText('น.น.')).toBeNull();
  });

  it('does not show weight change when weightDiffKg is null', () => {
    render(<PatientHeader {...baseProps} weightKg={70} weightDiffKg={null} />);
    expect(screen.queryByText('น.น.')).toBeNull();
  });

  it('does not show weight change when weightDiffKg is 0', () => {
    render(<PatientHeader {...baseProps} weightKg={70} weightDiffKg={0} />);
    expect(screen.queryByText('น.น.')).toBeNull();
  });

  it('colors weight diff green when gain <= 15', () => {
    const { container } = render(<PatientHeader {...baseProps} weightKg={60} weightDiffKg={10} />);
    const diffSpan = container.querySelector('.text-emerald-600');
    expect(diffSpan).toBeTruthy();
    expect(diffSpan?.textContent).toBe('10 กก.');
  });

  it('colors weight diff amber when gain > 15 and <= 20', () => {
    const { container } = render(<PatientHeader {...baseProps} weightKg={65} weightDiffKg={18} />);
    const diffSpan = container.querySelector('.text-amber-600');
    expect(diffSpan).toBeTruthy();
    expect(diffSpan?.textContent).toBe('18 กก.');
  });

  it('colors weight diff red when gain > 20', () => {
    const { container } = render(<PatientHeader {...baseProps} weightKg={75} weightDiffKg={25} />);
    const diffSpan = container.querySelector('.text-red-600');
    expect(diffSpan).toBeTruthy();
    expect(diffSpan?.textContent).toBe('25 กก.');
  });
});
