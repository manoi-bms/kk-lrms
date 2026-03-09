// Sidebar navigation — teal-700, collapsible, mobile overlay, role-based nav
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/hospitals', label: 'โรงพยาบาล', icon: Building2 },
  { href: '/admin', label: 'ตั้งค่า', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as unknown as { role?: string })?.role;
  const userName = session?.user?.name ?? 'ผู้ใช้';

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: '/login' });
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN'
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <Building2 className="h-7 w-7 shrink-0 text-white" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-base font-semibold text-white">KK-LRMS</div>
            <div className="truncate text-xs text-teal-200">
              ระบบติดตามการคลอด
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-teal-100 hover:bg-white/10 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={toggleCollapse}
        className="mx-2 mb-2 hidden items-center justify-center rounded-lg p-2 text-teal-200 transition-colors hover:bg-white/10 hover:text-white md:flex"
        aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>

      {/* User info + Logout */}
      <div className="border-t border-white/10 px-3 py-3">
        {!collapsed && (
          <div className="mb-2 truncate text-sm text-teal-100">{userName}</div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-teal-100 transition-colors hover:bg-white/10 hover:text-white',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'ออกจากระบบ' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleMobile}
        className="fixed left-3 top-3 z-50 rounded-lg bg-teal-700 p-2 text-white shadow-lg md:hidden"
        aria-label="เปิดเมนู"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
            aria-hidden="true"
          />
          {/* Sidebar drawer */}
          <aside className="relative z-50 h-full w-60 bg-teal-700">
            <button
              onClick={closeMobile}
              className="absolute right-3 top-3 rounded-lg p-1 text-teal-200 hover:bg-white/10 hover:text-white"
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 bg-teal-700 transition-[width] duration-200 md:block',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
