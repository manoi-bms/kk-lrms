// LoadingState component tests
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '@/components/shared/LoadingState';

describe('LoadingState', () => {
  it('renders spinner element', () => {
    const { container } = render(<LoadingState />);
    // Spinner is a div with animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows custom Thai message when message prop provided', () => {
    render(<LoadingState message="กำลังโหลดรายชื่อ..." />);
    expect(screen.getByText('กำลังโหลดรายชื่อ...')).toBeTruthy();
  });

  it('shows default message when no prop', () => {
    render(<LoadingState />);
    expect(screen.getByText('กำลังโหลดข้อมูล...')).toBeTruthy();
  });

  it('renders skeleton variant without spinner', () => {
    const { container } = render(<LoadingState variant="skeleton" />);
    // Skeleton variant has animate-pulse, not animate-spin
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).toBeTruthy();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeNull();
  });
});
