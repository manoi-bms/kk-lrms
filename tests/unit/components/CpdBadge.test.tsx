// T061: CpdBadge component tests — TDD: write tests FIRST
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CpdBadge } from '@/components/shared/CpdBadge';
import { RiskLevel } from '@/types/domain';

describe('CpdBadge', () => {
  it('renders score text for LOW risk with green background', () => {
    const { container } = render(
      <CpdBadge score={3} riskLevel={RiskLevel.LOW} />,
    );
    expect(screen.getByText('3')).toBeTruthy();
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(220, 252, 231)'); // #dcfce7
  });

  it('renders score text for MEDIUM risk with yellow background', () => {
    const { container } = render(
      <CpdBadge score={7} riskLevel={RiskLevel.MEDIUM} />,
    );
    expect(screen.getByText('7')).toBeTruthy();
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(254, 249, 195)'); // #fef9c3
  });

  it('renders score text for HIGH risk with red background', () => {
    const { container } = render(
      <CpdBadge score={12} riskLevel={RiskLevel.HIGH} />,
    );
    expect(screen.getByText('12')).toBeTruthy();
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(254, 226, 226)'); // #fee2e2
  });

  it('shows tooltip with referral recommendation for HIGH risk only', () => {
    const { container } = render(
      <CpdBadge score={12} riskLevel={RiskLevel.HIGH} />,
    );
    // HIGH risk badge should have title attribute with recommendation
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.getAttribute('title')).toBe('ควรประสานส่งต่อทันที!');
  });

  it('does not show referral tooltip for LOW risk', () => {
    const { container } = render(
      <CpdBadge score={3} riskLevel={RiskLevel.LOW} />,
    );
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.getAttribute('title')).not.toBe('ควรประสานส่งต่อทันที!');
  });

  it('renders small size variant', () => {
    const { container } = render(
      <CpdBadge score={5} riskLevel={RiskLevel.MEDIUM} size="sm" />,
    );
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.classList.contains('text-xs') || badge.className.includes('text-xs')).toBe(true);
  });

  it('renders large size variant', () => {
    const { container } = render(
      <CpdBadge score={10} riskLevel={RiskLevel.HIGH} size="lg" />,
    );
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.classList.contains('text-lg') || badge.className.includes('text-lg')).toBe(true);
  });
});
