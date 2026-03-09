// ReferralBanner component tests — TDD
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReferralBanner } from '@/components/patient/ReferralBanner';
import { RiskLevel } from '@/types/domain';

describe('ReferralBanner', () => {
  it('renders nothing for LOW risk', () => {
    const { container } = render(
      <ReferralBanner score={3} riskLevel={RiskLevel.LOW} recommendation="ติดตามปกติ" />,
    );
    expect(container.firstElementChild).toBeNull();
  });

  it('renders amber banner for MEDIUM risk', () => {
    render(
      <ReferralBanner score={7} riskLevel={RiskLevel.MEDIUM} recommendation="เฝ้าระวังใกล้ชิด, เตรียมพร้อมส่งต่อ" />,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toBeTruthy();
    expect(banner.className).toContain('bg-amber-50');
    expect(banner.className).toContain('border-amber-200');
  });

  it('renders red banner for HIGH risk', () => {
    render(
      <ReferralBanner score={12} riskLevel={RiskLevel.HIGH} recommendation="ควรประสานส่งต่อทันที!" />,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toBeTruthy();
    expect(banner.className).toContain('bg-red-50');
    expect(banner.className).toContain('border-red-200');
  });

  it('displays the CPD score in the badge', () => {
    render(
      <ReferralBanner score={12} riskLevel={RiskLevel.HIGH} recommendation="ควรประสานส่งต่อทันที!" />,
    );
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('shows referral text for HIGH risk', () => {
    render(
      <ReferralBanner score={10} riskLevel={RiskLevel.HIGH} recommendation="ควรประสานส่งต่อทันที!" />,
    );
    expect(screen.getByText('คำแนะนำ ควรประสานส่งต่อทันที!')).toBeTruthy();
  });

  it('shows monitoring text for MEDIUM risk', () => {
    render(
      <ReferralBanner score={7} riskLevel={RiskLevel.MEDIUM} recommendation="เฝ้าระวังใกล้ชิด, เตรียมพร้อมส่งต่อ" />,
    );
    expect(screen.getByText('เฝ้าระวังใกล้ชิด เตรียมพร้อมส่งต่อ')).toBeTruthy();
  });

  it('shows recommendation text from props', () => {
    render(
      <ReferralBanner score={7} riskLevel={RiskLevel.MEDIUM} recommendation="Custom recommendation" />,
    );
    expect(screen.getByText(/Custom recommendation/)).toBeTruthy();
  });

  it('includes pulsing dot indicator for HIGH risk', () => {
    const { container } = render(
      <ReferralBanner score={12} riskLevel={RiskLevel.HIGH} recommendation="ควรประสานส่งต่อทันที!" />,
    );
    const pulsingElement = container.querySelector('.animate-ping');
    expect(pulsingElement).toBeTruthy();
  });

  it('does not include pulsing dot for MEDIUM risk', () => {
    const { container } = render(
      <ReferralBanner score={7} riskLevel={RiskLevel.MEDIUM} recommendation="เฝ้าระวังใกล้ชิด, เตรียมพร้อมส่งต่อ" />,
    );
    const pulsingElement = container.querySelector('.animate-ping');
    expect(pulsingElement).toBeNull();
  });

  it('has print:hidden class to avoid printing', () => {
    render(
      <ReferralBanner score={12} riskLevel={RiskLevel.HIGH} recommendation="ควรประสานส่งต่อทันที!" />,
    );
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('print:hidden');
  });

  it('has accessible aria-label', () => {
    render(
      <ReferralBanner score={12} riskLevel={RiskLevel.HIGH} recommendation="ควรประสานส่งต่อทันที!" />,
    );
    const banner = screen.getByRole('alert');
    expect(banner.getAttribute('aria-label')).toContain('เสี่ยงสูง');
  });
});
