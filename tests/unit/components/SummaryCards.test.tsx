// SummaryCards component tests
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import type { DashboardSummary } from '@/types/api';

const summary: DashboardSummary = {
  totalActive: 25,
  totalHigh: 5,
  totalMedium: 8,
  totalLow: 12,
};

describe('SummaryCards', () => {
  it('renders 4 summary cards', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    // Cards are plain divs with border-t-4 inside the grid
    const cards = container.querySelectorAll('.border-t-4');
    expect(cards.length).toBe(4);
  });

  it('shows total active patients count', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText('ผู้คลอดทั้งหมด')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
  });

  it('shows high-risk count with red border', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    expect(screen.getByText('เสี่ยงสูง')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    const redCard = Array.from(container.querySelectorAll('.border-t-4')).find(
      (card) => card.textContent?.includes('เสี่ยงสูง'),
    );
    expect(redCard).toBeTruthy();
    expect(redCard!.className).toContain('border-t-red-500');
  });

  it('shows medium-risk count with amber border', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    expect(screen.getByText('เสี่ยงปานกลาง')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    const amberCard = Array.from(container.querySelectorAll('.border-t-4')).find(
      (card) => card.textContent?.includes('เสี่ยงปานกลาง'),
    );
    expect(amberCard).toBeTruthy();
    expect(amberCard!.className).toContain('border-t-amber-500');
  });

  it('shows low-risk count with green border', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    expect(screen.getByText('เสี่ยงต่ำ')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    const greenCard = Array.from(container.querySelectorAll('.border-t-4')).find(
      (card) => card.textContent?.includes('เสี่ยงต่ำ'),
    );
    expect(greenCard).toBeTruthy();
    expect(greenCard!.className).toContain('border-t-green-500');
  });

  it('displays all card titles', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText('ผู้คลอดทั้งหมด')).toBeTruthy();
    expect(screen.getByText('เสี่ยงสูง')).toBeTruthy();
    expect(screen.getByText('เสี่ยงปานกลาง')).toBeTruthy();
    expect(screen.getByText('เสี่ยงต่ำ')).toBeTruthy();
  });

  it('displays subtitles for each card', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText('กำลังคลอด')).toBeTruthy();
    expect(screen.getByText('ต้องเฝ้าระวัง')).toBeTruthy();
    expect(screen.getByText('ติดตามต่อเนื่อง')).toBeTruthy();
    expect(screen.getByText('ปกติ')).toBeTruthy();
  });

  it('renders with zero counts', () => {
    const zeroSummary: DashboardSummary = {
      totalActive: 0,
      totalHigh: 0,
      totalMedium: 0,
      totalLow: 0,
    };
    render(<SummaryCards summary={zeroSummary} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(4);
  });
});
