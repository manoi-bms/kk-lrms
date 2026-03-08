// Login page smoke tests — component render tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next-auth/react before importing the page
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
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

import LoginPage from '@/app/(auth)/login/page';

describe('Login Page', () => {
  it('renders login heading', () => {
    render(<LoginPage />);
    expect(screen.getByText('เข้าสู่ระบบ KK-LRMS')).toBeTruthy();
  });

  it('renders session ID input field', () => {
    render(<LoginPage />);
    const input = screen.getByPlaceholderText('กรอก Session ID จาก BMS');
    expect(input).toBeTruthy();
    expect(input.getAttribute('id')).toBe('sessionId');
  });

  it('renders submit button with correct text', () => {
    render(<LoginPage />);
    expect(screen.getByText('เข้าสู่ระบบ')).toBeTruthy();
  });

  it('renders the subtitle description', () => {
    render(<LoginPage />);
    expect(screen.getByText('ระบบติดตามการคลอดจังหวัดขอนแก่น')).toBeTruthy();
  });

  it('renders BMS Session ID label', () => {
    render(<LoginPage />);
    expect(screen.getByText('BMS Session ID')).toBeTruthy();
  });
});
