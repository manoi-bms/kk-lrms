// tests/unit/components/layout/StatusStrip.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FreshnessSummary } from '@/types/sync-freshness';

const swrState: { data?: FreshnessSummary; error?: Error; isLoading: boolean; mutate: () => void } = {
  isLoading: false,
  mutate: vi.fn(),
};
vi.mock('@/hooks/useSyncFreshness', () => ({ useSyncFreshness: () => swrState }));

import { StatusStrip } from '@/components/layout/StatusStrip';

const summary: FreshnessSummary = {
  generatedAt: '2026-10-11T05:40:00Z',
  province: { reporting: 27, fresh: 16, stale: 10, never: 1, highRisk: 2, lastSyncAt: '2026-10-11T05:38:00Z' },
  own: { hcode: '11000', name: 'รพ.น้ำพอง', lastSyncAt: '2026-10-11T05:38:00Z', health: 'ok', highRisk: 1 },
};

describe('StatusStrip', () => {
  beforeEach(() => {
    swrState.data = undefined;
    swrState.error = undefined;
    swrState.isLoading = false;
  });

  it('provincial: fresh x/y, stale count linking to hospitals, high-risk link', () => {
    swrState.data = summary;
    render(<StatusStrip variant="provincial" />);
    expect(screen.getByText(/ข้อมูลสด/)).toHaveTextContent('ข้อมูลสด 16/27 รพ.');
    expect(screen.getByRole('link', { name: /ไม่ซิงค์เกิน 1 ชม\. 10 รพ\./ })).toHaveAttribute('href', '/hospitals');
    expect(screen.getByRole('link', { name: 'เสี่ยงสูง 2 ราย' })).toHaveAttribute('href', '/');
    expect(screen.getByText(/ยังไม่เคยซิงค์/)).toHaveTextContent('ยังไม่เคยซิงค์ 1 รพ.');
  });

  it('hospital: own freshness badge + ward high-risk link', () => {
    swrState.data = summary;
    render(<StatusStrip variant="hospital" />);
    expect(screen.getByRole('status')).toHaveTextContent('ข้อมูลจาก HOSxP ล่าสุด');
    expect(screen.getByRole('link', { name: 'เสี่ยงสูง 1 ราย' })).toHaveAttribute('href', '/hospital-maternity-ward');
  });

  it('hospital session without an own block explains why', () => {
    swrState.data = { ...summary, own: null };
    render(<StatusStrip variant="hospital" />);
    expect(screen.getByText('บัญชีนี้ไม่ได้ผูกกับโรงพยาบาลที่ส่งข้อมูล')).toBeInTheDocument();
  });

  it('zero high risk is calm, not a red pill', () => {
    swrState.data = { ...summary, province: { ...summary.province, highRisk: 0 } };
    render(<StatusStrip variant="provincial" />);
    expect(screen.getByText('ไม่มีผู้คลอดเสี่ยงสูง')).toBeInTheDocument();
  });

  it('API failure: quiet Thai notice with retry, page keeps working', async () => {
    swrState.error = new Error('HTTP 500');
    render(<StatusStrip variant="provincial" />);
    expect(screen.getByText('ไม่สามารถตรวจสอบสถานะข้อมูลได้')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(swrState.mutate).toHaveBeenCalled();
  });

  it('loading renders a fixed-height placeholder (no layout jump)', () => {
    swrState.isLoading = true;
    const { container } = render(<StatusStrip variant="provincial" />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });
});
