// HighRiskAlert component tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HighRiskAlert } from '@/components/shared/HighRiskAlert';

describe('HighRiskAlert', () => {
  it('renders dialog with alert content when CPD score >= 10', () => {
    render(<HighRiskAlert score={12} an="AN001" />);
    // Dialog title
    expect(screen.getByText('แจ้งเตือนผู้คลอดเสี่ยงสูง')).toBeTruthy();
  });

  it('shows "ควรประสานส่งต่อทันที!" text', () => {
    render(<HighRiskAlert score={10} an="AN002" />);
    expect(screen.getByText('ควรประสานส่งต่อทันที!')).toBeTruthy();
  });

  it('shows patient AN in description', () => {
    render(<HighRiskAlert score={12} an="AN003" />);
    expect(screen.getByText(/AN: AN003/)).toBeTruthy();
  });

  it('shows AN number', () => {
    render(<HighRiskAlert score={12} an="AN004" />);
    expect(screen.getByText(/AN004/)).toBeTruthy();
  });

  it('shows CpdBadge with score', () => {
    render(<HighRiskAlert score={14} an="AN005" />);
    // CpdBadge renders the score number as text
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('has dismiss button "รับทราบ"', () => {
    render(<HighRiskAlert score={10} an="AN006" />);
    expect(screen.getByText('รับทราบ')).toBeTruthy();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<HighRiskAlert score={10} an="AN007" onDismiss={onDismiss} />);
    const button = screen.getByText('รับทราบ');
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not render when score < 10', () => {
    const { container } = render(<HighRiskAlert score={5} an="AN008" />);
    // Component returns null for score < 10
    expect(container.firstElementChild).toBeNull();
  });
});
