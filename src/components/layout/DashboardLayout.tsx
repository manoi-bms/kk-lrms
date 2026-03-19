'use client';

import { SessionProvider } from 'next-auth/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BreadcrumbProvider } from './BreadcrumbContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SessionProvider>
      <BreadcrumbProvider>
        <div className="flex h-screen overflow-hidden bg-slate-50/50">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </BreadcrumbProvider>
    </SessionProvider>
  );
}
