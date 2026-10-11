import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/shared/EmptyState';

afterEach(() => vi.unstubAllEnvs());

describe('EmptyState', () => {
  it('flag off (default): icon fallback, no image request', () => {
    vi.stubEnv('NEXT_PUBLIC_ILLUSTRATIONS_ENABLED', '');
    const { container } = render(<EmptyState illustration="ward" title="ยังไม่มีผู้คลอดในห้องคลอดขณะนี้" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'ยังไม่มีผู้คลอดในห้องคลอดขณะนี้' })).toBeInTheDocument();
  });
  it('flag on: decorative illustration from /illustrations', () => {
    vi.stubEnv('NEXT_PUBLIC_ILLUSTRATIONS_ENABLED', 'true');
    const { container } = render(<EmptyState illustration="stale" title="ข้อมูลไม่อัปเดต" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toContain('state-stale.webp');
    expect(img).toHaveAttribute('alt', '');
  });
  it('warn tone + description + action render', () => {
    render(
      <EmptyState
        illustration="stale"
        tone="warn"
        title="ข้อมูลโรงพยาบาลบ้านไผ่ไม่อัปเดตมา 18 วัน"
        description="วิธีแก้: เปิด KK-LRMS บนเครื่องห้องคลอดที่ล็อกอิน HOSxP ไว้"
        action={<a href="/about#sync">ดูวิธีตั้งค่าการซิงค์</a>}
      />,
    );
    expect(screen.getByRole('status').className).toContain('bg-warn-tint');
    expect(screen.getByText(/วิธีแก้/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ดูวิธีตั้งค่าการซิงค์' })).toBeInTheDocument();
  });
});
