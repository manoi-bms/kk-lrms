// ContractionTable component tests
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractionTable } from '@/components/patient/ContractionTable';
import type { ContractionEntry } from '@/types/api';

const sampleContractions: ContractionEntry[] = [
  {
    measuredAt: '2026-01-15T10:00:00Z',
    intervalMin: 5,
    durationSec: 40,
    intensity: 'MILD',
  },
  {
    measuredAt: '2026-01-15T10:10:00Z',
    intervalMin: 3,
    durationSec: 50,
    intensity: 'MODERATE',
  },
  {
    measuredAt: '2026-01-15T10:20:00Z',
    intervalMin: 2,
    durationSec: 60,
    intensity: 'STRONG',
  },
];

describe('ContractionTable', () => {
  it('renders table headers', () => {
    render(<ContractionTable contractions={sampleContractions} />);
    expect(screen.getByText('เวลา')).toBeTruthy();
    expect(screen.getByText('ระยะห่าง (นาที)')).toBeTruthy();
    expect(screen.getByText('ระยะเวลา (วินาที)')).toBeTruthy();
    expect(screen.getByText('ความรุนแรง')).toBeTruthy();
  });

  it('renders contraction rows with correct data', () => {
    render(<ContractionTable contractions={sampleContractions} />);
    // Check interval values
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    // Check duration values
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
  });

  it('shows intensity badge MILD as เบา', () => {
    render(<ContractionTable contractions={[sampleContractions[0]]} />);
    expect(screen.getByText('เบา')).toBeTruthy();
  });

  it('shows intensity badge MODERATE as ปานกลาง', () => {
    render(<ContractionTable contractions={[sampleContractions[1]]} />);
    expect(screen.getByText('ปานกลาง')).toBeTruthy();
  });

  it('shows intensity badge STRONG as รุนแรง', () => {
    render(<ContractionTable contractions={[sampleContractions[2]]} />);
    expect(screen.getByText('รุนแรง')).toBeTruthy();
  });

  it('shows empty state when no contractions', () => {
    render(<ContractionTable contractions={[]} />);
    expect(screen.getByText('ยังไม่มีข้อมูลการหดรัดตัว')).toBeTruthy();
  });

  it('does not render table when no contractions', () => {
    const { container } = render(<ContractionTable contractions={[]} />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('renders section header', () => {
    render(<ContractionTable contractions={sampleContractions} />);
    expect(screen.getByText('การหดรัดตัวของมดลูก (UC)')).toBeTruthy();
  });

  it('shows dash for null intervalMin', () => {
    const nullInterval: ContractionEntry[] = [{
      measuredAt: '2026-01-15T10:00:00Z',
      intervalMin: null,
      durationSec: 40,
      intensity: 'MILD',
    }];
    render(<ContractionTable contractions={nullInterval} />);
    expect(screen.getByText('-')).toBeTruthy();
  });
});
