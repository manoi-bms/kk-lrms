// SummaryCards component tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 4 summary cards', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBe(4);
  });

  it('shows total active patients count', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText('ผู้คลอดทั้งหมด')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
  });

  it('shows high-risk count with red background', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    expect(screen.getByText('เสี่ยงสูง')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    // Find the card that contains "เสี่ยงสูง" and check it has bg-red-50
    const redCard = Array.from(container.querySelectorAll('[data-slot="card"]')).find(
      (card) => card.textContent?.includes('เสี่ยงสูง'),
    );
    expect(redCard).toBeTruthy();
    expect(redCard!.className).toContain('bg-red-50');
  });

  it('shows medium-risk count with yellow background', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    expect(screen.getByText('เสี่ยงปานกลาง')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    const yellowCard = Array.from(container.querySelectorAll('[data-slot="card"]')).find(
      (card) => card.textContent?.includes('เสี่ยงปานกลาง'),
    );
    expect(yellowCard).toBeTruthy();
    expect(yellowCard!.className).toContain('bg-yellow-50');
  });

  it('shows low-risk count with green background', () => {
    const { container } = render(<SummaryCards summary={summary} />);
    expect(screen.getByText('เสี่ยงต่ำ')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    const greenCard = Array.from(container.querySelectorAll('[data-slot="card"]')).find(
      (card) => card.textContent?.includes('เสี่ยงต่ำ'),
    );
    expect(greenCard).toBeTruthy();
    expect(greenCard!.className).toContain('bg-green-50');
  });

  it('displays all card titles', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText('ผู้คลอดทั้งหมด')).toBeTruthy();
    expect(screen.getByText('เสี่ยงสูง')).toBeTruthy();
    expect(screen.getByText('เสี่ยงปานกลาง')).toBeTruthy();
    expect(screen.getByText('เสี่ยงต่ำ')).toBeTruthy();
  });

  it('displays current time label', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText(/เวลาปัจจุบัน:/)).toBeTruthy();
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
