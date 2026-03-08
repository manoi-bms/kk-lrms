// ClinicalData component tests
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClinicalData } from '@/components/patient/ClinicalData';

const completeData = {
  gravida: 2,
  gaWeeks: 38,
  ancCount: 6,
  heightCm: 155,
  weightDiffKg: 12,
  fundalHeightCm: 34,
  usWeightG: 3200,
  hematocritPct: 36,
};

describe('ClinicalData', () => {
  it('renders all 8 clinical measurements when data is complete', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('38 สัปดาห์')).toBeTruthy();
    expect(screen.getByText('6 ครั้ง')).toBeTruthy();
    expect(screen.getByText('155 ซม.')).toBeTruthy();
    expect(screen.getByText('12 กก.')).toBeTruthy();
    expect(screen.getByText('34 ซม.', { exact: false })).toBeTruthy();
    expect(screen.getByText('3200 กรัม')).toBeTruthy();
    expect(screen.getByText('36 %')).toBeTruthy();
  });

  it('shows "ไม่มีข้อมูล" for missing/null values', () => {
    const nullData = {
      gravida: null,
      gaWeeks: null,
      ancCount: null,
      heightCm: null,
      weightDiffKg: null,
      fundalHeightCm: null,
      usWeightG: null,
      hematocritPct: null,
    };
    render(<ClinicalData {...nullData} />);
    const missingTexts = screen.getAllByText('ไม่มีข้อมูล');
    expect(missingTexts.length).toBe(8);
  });

  it('renders label ครรภ์ที่', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('ครรภ์ที่ (Gravida)')).toBeTruthy();
  });

  it('renders label อายุครรภ์', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('อายุครรภ์ (GA)')).toBeTruthy();
  });

  it('renders label ฝากครรภ์', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('ฝากครรภ์ (ANC)')).toBeTruthy();
  });

  it('renders label ส่วนสูง', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('ส่วนสูง')).toBeTruthy();
  });

  it('renders label ส่วนต่างน้ำหนัก', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('ส่วนต่างน้ำหนัก')).toBeTruthy();
  });

  it('renders label ยอดมดลูก', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('ยอดมดลูก')).toBeTruthy();
  });

  it('renders label น้ำหนักเด็ก U/S', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('น้ำหนักเด็ก U/S')).toBeTruthy();
  });

  it('renders label Hematocrit', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('Hematocrit')).toBeTruthy();
  });

  it('renders section header ข้อมูลทางคลินิก', () => {
    render(<ClinicalData {...completeData} />);
    expect(screen.getByText('ข้อมูลทางคลินิก')).toBeTruthy();
  });

  it('shows ไม่มีข้อมูล only for null fields, not for present ones', () => {
    const partialData = {
      gravida: 1,
      gaWeeks: null,
      ancCount: 4,
      heightCm: null,
      weightDiffKg: 10,
      fundalHeightCm: null,
      usWeightG: 2800,
      hematocritPct: null,
    };
    render(<ClinicalData {...partialData} />);
    const missingTexts = screen.getAllByText('ไม่มีข้อมูล');
    expect(missingTexts.length).toBe(4);
  });
});
