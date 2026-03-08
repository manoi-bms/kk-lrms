// Error page and Not-found page smoke tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation for any potential routing needs
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

import ErrorPage from '@/app/error';
import NotFoundPage from '@/app/not-found';

describe('Error Page', () => {
  it('renders error heading text', () => {
    const mockError = new Error('Test error message');
    const mockReset = vi.fn();

    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeTruthy();
  });

  it('displays the error message', () => {
    const mockError = new Error('Test error message');
    const mockReset = vi.fn();

    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('renders retry button', () => {
    const mockError = new Error('Something failed');
    const mockReset = vi.fn();

    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('ลองใหม่')).toBeTruthy();
  });

  it('shows default message when error has no message', () => {
    const mockError = new Error('');
    const mockReset = vi.fn();

    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง')).toBeTruthy();
  });
});

describe('Not Found Page', () => {
  it('renders not-found heading text', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('ไม่พบหน้าที่ต้องการ')).toBeTruthy();
  });

  it('renders description text', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('หน้าที่คุณเข้าถึงไม่มีอยู่ในระบบ')).toBeTruthy();
  });

  it('renders home link button', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('กลับหน้าหลัก')).toBeTruthy();
  });
});
