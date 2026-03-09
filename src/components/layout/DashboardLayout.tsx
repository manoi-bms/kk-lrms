'use client';

import { SessionProvider } from 'next-auth/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({ children, breadcrumbs }: DashboardLayoutProps) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar breadcrumbs={breadcrumbs} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
