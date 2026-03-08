// RiskIndicator component tests
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskIndicator } from '@/components/shared/RiskIndicator';
import { RiskLevel } from '@/types/domain';

describe('RiskIndicator', () => {
  it('renders green dot with "เสี่ยงต่ำ" for LOW', () => {
    const { container } = render(<RiskIndicator riskLevel={RiskLevel.LOW} />);
    const label = screen.getByText('เสี่ยงต่ำ');
    expect(label).toBeTruthy();
    expect(label.style.color).toBe('rgb(34, 197, 94)'); // #22c55e green
    // Dot should have green background
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('rgb(34, 197, 94)');
  });

  it('renders yellow dot with "เสี่ยงปานกลาง" for MEDIUM', () => {
    const { container } = render(<RiskIndicator riskLevel={RiskLevel.MEDIUM} />);
    const label = screen.getByText('เสี่ยงปานกลาง');
    expect(label).toBeTruthy();
    expect(label.style.color).toBe('rgb(234, 179, 8)'); // #eab308 yellow
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('rgb(234, 179, 8)');
  });

  it('renders red dot with "เสี่ยงสูง" for HIGH', () => {
    const { container } = render(<RiskIndicator riskLevel={RiskLevel.HIGH} />);
    const label = screen.getByText('เสี่ยงสูง');
    expect(label).toBeTruthy();
    expect(label.style.color).toBe('rgb(239, 68, 68)'); // #ef4444 red
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('applies pulse animation when pulse prop is true', () => {
    const { container } = render(
      <RiskIndicator riskLevel={RiskLevel.HIGH} pulse />,
    );
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('animate-pulse');
  });

  it('does not apply pulse animation by default', () => {
    const { container } = render(
      <RiskIndicator riskLevel={RiskLevel.HIGH} />,
    );
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).not.toContain('animate-pulse');
  });
});
