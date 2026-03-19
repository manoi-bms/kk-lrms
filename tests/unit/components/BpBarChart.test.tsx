// BpBarChart component tests
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BpBarChart } from '@/components/charts/BpBarChart';
import type { VitalSignEntry } from '@/types/api';

// Mock ResizeObserver for Recharts ResponsiveContainer
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock Recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('BpBarChart', () => {
  it('renders chart container when data is present', () => {
    const vitals: VitalSignEntry[] = [
      {
        measuredAt: '2026-03-09T10:00:00Z',
        maternalHr: 80,
        fetalHr: '140',
        sbp: 120,
        dbp: 80,
        pphAmountMl: null,
      },
    ];
    render(<BpBarChart vitals={vitals} />);
    // Should render the chart heading
    expect(screen.getByText('ความดันโลหิต (BP)')).toBeTruthy();
    // Should render the recharts container
    expect(screen.getByTestId('responsive-container')).toBeTruthy();
  });

  it('shows empty state message when no data', () => {
    render(<BpBarChart vitals={[]} />);
    expect(screen.getByText('ยังไม่มีข้อมูลความดันโลหิต')).toBeTruthy();
  });

  it('shows empty state when vitals have no BP values', () => {
    const vitals: VitalSignEntry[] = [
      {
        measuredAt: '2026-03-09T10:00:00Z',
        maternalHr: 80,
        fetalHr: '140',
        sbp: null,
        dbp: null,
        pphAmountMl: null,
      },
    ];
    render(<BpBarChart vitals={vitals} />);
    expect(screen.getByText('ยังไม่มีข้อมูลความดันโลหิต')).toBeTruthy();
  });

  it('renders with vital sign data points', () => {
    const vitals: VitalSignEntry[] = [
      {
        measuredAt: '2026-03-09T08:00:00Z',
        maternalHr: 78,
        fetalHr: '138',
        sbp: 110,
        dbp: 70,
        pphAmountMl: null,
      },
      {
        measuredAt: '2026-03-09T12:00:00Z',
        maternalHr: 82,
        fetalHr: '142',
        sbp: 130,
        dbp: 85,
        pphAmountMl: null,
      },
    ];
    render(<BpBarChart vitals={vitals} />);
    expect(screen.getByText('ความดันโลหิต (BP)')).toBeTruthy();
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });
});
