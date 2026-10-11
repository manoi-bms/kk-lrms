import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FreshnessBadge } from '@/components/shared/FreshnessBadge';

const NOW = new Date('2026-10-11T05:40:00Z');

describe('FreshnessBadge', () => {
  it('renders label, clock and age as a status', () => {
    render(<FreshnessBadge lastSyncAt="2026-10-11T05:38:00Z" now={NOW} />);
    const s = screen.getByRole('status');
    expect(s).toHaveTextContent('ซิงค์ล่าสุด 12:38 · 2 นาทีที่แล้ว');
    expect(s).toHaveAttribute('data-tone', 'ok');
  });
  it('never-synced renders only the Thai explanation', () => {
    render(<FreshnessBadge lastSyncAt={null} now={NOW} />);
    expect(screen.getByRole('status')).toHaveTextContent('ยังไม่เคยซิงค์');
    expect(screen.getByRole('status')).toHaveAttribute('data-tone', 'danger');
  });
});
