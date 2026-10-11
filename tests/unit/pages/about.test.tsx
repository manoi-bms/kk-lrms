import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AboutPage from '@/app/about/page';
import { KK_HOSPITALS } from '@/config/hospitals';
import { CPD_FACTOR_WEIGHTS, RISK_LEVELS } from '@/config/risk-levels';
import { RiskLevel } from '@/types/domain';

describe('About page', () => {
  it('has one h1; the header art is decorative', () => {
    const { container } = render(<AboutPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const art = container.querySelector('img[src*="about-header"]');
    expect(art).not.toBeNull();
    expect(art).toHaveAttribute('alt', '');
    expect(art!.closest('[aria-hidden="true"]')).not.toBeNull();
  });
  it('never presents the header art as a map or geography', () => {
    render(<AboutPage />);
    expect(screen.getByTestId('about-header').textContent).not.toMatch(/แผนที่|ภูมิศาสตร์|map/i);
  });
  it('the table of contents links to every section card', () => {
    render(<AboutPage />);
    const links = within(screen.getByRole('navigation', { name: 'สารบัญ' })).getAllByRole('link');
    expect(links).toHaveLength(9);
    for (const a of links) {
      const id = a.getAttribute('href')!.replace('#', '');
      expect(document.getElementById(id)?.tagName).toBe('SECTION');
    }
  });
  it('facts come from config, not literals', () => {
    render(<AboutPage />);
    expect(screen.getByTestId('fact-hospitals')).toHaveTextContent(String(KK_HOSPITALS.length));
    expect(screen.getByTestId('fact-cpd-factors')).toHaveTextContent(String(Object.keys(CPD_FACTOR_WEIGHTS).length));
  });
  it('risk levels render labels and ranges from RISK_LEVELS', () => {
    render(<AboutPage />);
    for (const level of [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH]) {
      expect(screen.getAllByText(RISK_LEVELS[level].labelTh).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByText(`${RISK_LEVELS[RiskLevel.HIGH].minScore} ขึ้นไป`)).toBeInTheDocument();
  });
  it('static tables use the shared DataTable', () => {
    render(<AboutPage />);
    expect(screen.getByRole('table', { name: 'ปัจจัยเสี่ยง CPD' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'กลุ่มผู้ใช้งาน' })).toBeInTheDocument();
  });
  it('the PDPA copy matches what the app does (masked names, ProviderID read-only)', () => {
    render(<AboutPage />);
    expect(screen.queryByText(/ไม่แสดงชื่อ-สกุล/)).toBeNull();
    expect(screen.getByText(/แสดงชื่อแบบย่อ/)).toBeInTheDocument();
    expect(screen.getAllByText(/ProviderID \(สิทธิ์อ่านอย่างเดียว\)/).length).toBeGreaterThanOrEqual(1);
  });
  it('uses no categorical or slate palette', () => {
    const { container } = render(<AboutPage />);
    expect(container.innerHTML).not.toMatch(/\b(?:bg|text|border)-(?:amber|rose|blue|slate)-\d/);
  });
});
