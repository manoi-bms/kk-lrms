// TopBar — breadcrumbs, real-time Bangkok clock, user info, logout
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Clock, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopBarProps {
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  OBSTETRICIAN: 'สูติแพทย์',
  NURSE: 'พยาบาล',
};

function useBangkokClock(): string {
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    setTime(formatBangkokTime());
    const interval = setInterval(() => {
      setTime(formatBangkokTime());
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function formatBangkokTime(): string {
  return new Date().toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function TopBar({ breadcrumbs = [], className }: TopBarProps) {
  const { data: session } = useSession();
  const clock = useBangkokClock();

  const userName = session?.user?.name ?? 'ผู้ใช้';
  const userRole = (session?.user as unknown as { role?: string })?.role;
  const roleLabel = userRole ? ROLE_LABELS[userRole] ?? userRole : '';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6',
        className
      )}
    >
      {/* Left: Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-slate-300">/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-slate-500 transition-colors hover:text-teal-700"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-800">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Right: Clock + User info + Logout */}
      <div className="flex items-center gap-4">
        {/* Real-time clock */}
        <div className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex">
          <Clock className="h-4 w-4" />
          <span className="tabular-nums">{clock}</span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100">
            <User className="h-4 w-4 text-teal-700" />
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-medium text-slate-700">
              {userName}
            </span>
            {roleLabel && (
              <span className="text-xs text-slate-500">{roleLabel}</span>
            )}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="ออกจากระบบ"
          title="ออกจากระบบ"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
