# UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the KK-LRMS UI from a basic prototype to a professional clinical dashboard with teal medical theme, sidebar navigation, card-based layouts, and informative data displays.

**Architecture:** Page-level redesign with a shared DashboardLayout shell (sidebar + top bar) wrapping all `(dashboard)` routes. Each page refactored to use card-based components. Font changed to Google Sarabun. No backend changes needed — purely UI/styling work.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, shadcn/ui (Base-UI), Recharts, next-auth/react (session), lucide-react (icons)

**Design Reference:** `docs/plans/2026-03-09-ui-redesign-design.md`

---

## Task 1: Font & Theme Foundation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update root layout — swap Noto Sans Thai for Sarabun**

In `src/app/layout.tsx`, replace:
```tsx
import { Noto_Sans_Thai } from 'next/font/google';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});
```
With:
```tsx
import { Sarabun } from 'next/font/google';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
});
```
And update the body className from `notoSansThai.variable` to `sarabun.variable`.

**Step 2: Update globals.css — add teal theme tokens + update font variable**

In `src/app/globals.css`, update `:root` to add these custom properties (keep existing risk/status colors):
```css
  /* Primary — Teal Medical */
  --primary-teal: #0d9488;
  --primary-teal-dark: #0f766e;
  --primary-teal-light: #ccfbf1;
  --primary-teal-50: #f0fdfa;
```

Update `@theme inline` to add:
```css
  --font-sans: var(--font-sarabun);
  --color-primary-teal: var(--primary-teal);
  --color-primary-teal-dark: var(--primary-teal-dark);
  --color-primary-teal-light: var(--primary-teal-light);
  --color-primary-teal-50: var(--primary-teal-50);
```

Also update `--font-sans` in the `@theme inline` block from `var(--font-sans)` to `var(--font-sarabun)`.

**Step 3: Verify — run dev server and confirm font changed**

Run: Open browser, check that all text renders in Sarabun (rounder, wider than Noto Sans Thai).

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "style: switch font to Sarabun, add teal theme tokens"
```

---

## Task 2: Dashboard Layout Shell — Sidebar

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

**Step 1: Create sidebar component**

Create `src/components/layout/Sidebar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'แดชบอร์ด', icon: <LayoutDashboard size={20} /> },
  { href: '/hospitals', label: 'โรงพยาบาล', icon: <Building2 size={20} /> },
  { href: '/admin', label: 'ตั้งค่า', icon: <Settings size={20} />, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = (session?.user as unknown as { role?: string })?.role;
  const userName = session?.user?.name ?? 'ผู้ใช้งาน';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navContent = (
    <>
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <Building2 size={28} className="shrink-0 text-teal-200" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">KK-LRMS</div>
            <div className="truncate text-xs text-teal-200">ระบบติดตามการคลอด</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.filter((item) => !item.adminOnly || userRole === 'ADMIN').map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-white/15 text-white'
                : 'text-teal-100 hover:bg-white/10 hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="mb-2 truncate px-1 text-xs text-teal-200">{userName}</div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-teal-100 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden border-t border-white/10 p-3 text-teal-200 transition-colors hover:text-white md:flex md:items-center md:justify-center"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-teal-700 p-2 text-white shadow-lg md:hidden"
        aria-label="เปิดเมนู"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-teal-700 transition-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 text-teal-200 hover:text-white"
          aria-label="ปิดเมนู"
        >
          <X size={20} />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden flex-col bg-teal-700 transition-all md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx next build --experimental-build-mode compile 2>&1 | head -20` or simply check the dev server compiles the import.

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add sidebar navigation component with teal theme"
```

---

## Task 3: Dashboard Layout Shell — TopBar

**Files:**
- Create: `src/components/layout/TopBar.tsx`

**Step 1: Create TopBar component**

Create `src/components/layout/TopBar.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Clock, LogOut, User } from 'lucide-react';

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export function TopBar({ breadcrumbs }: TopBarProps) {
  const { data: session } = useSession();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const userName = session?.user?.name ?? 'ผู้ใช้งาน';
  const userRole = (session?.user as unknown as { role?: string })?.role ?? '';

  const roleLabelMap: Record<string, string> = {
    ADMIN: 'ผู้ดูแลระบบ',
    OBSTETRICIAN: 'สูติแพทย์',
    NURSE: 'พยาบาล',
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">/</span>}
            {crumb.href ? (
              <a href={crumb.href} className="text-slate-500 hover:text-teal-600">
                {crumb.label}
              </a>
            ) : (
              <span className="font-medium text-slate-700">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side: clock + user */}
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex">
          <Clock size={14} />
          <span className="font-mono">{clock}</span>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <User size={14} />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-slate-700">{userName}</div>
            <div className="text-xs text-slate-400">{roleLabelMap[userRole] ?? userRole}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="ออกจากระบบ"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: add top bar with breadcrumbs, clock, and user info"
```

---

## Task 4: DashboardLayout — Combine Sidebar + TopBar + Content

**Files:**
- Create: `src/components/layout/DashboardLayout.tsx`
- Create: `src/app/(dashboard)/layout.tsx`

**Step 1: Create DashboardLayout wrapper**

Create `src/components/layout/DashboardLayout.tsx`:

```tsx
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
```

**Step 2: Create dashboard route group layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

**Step 3: Verify — open the dashboard in browser, confirm sidebar + topbar visible**

Open `http://10.8.0.28:3003` — you should see:
- Teal sidebar on the left (240px)
- White top bar above the content
- Content area with slate-50 background
- The existing dashboard content rendering inside

**Step 4: Commit**

```bash
git add src/components/layout/DashboardLayout.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add dashboard layout shell with sidebar and top bar"
```

---

## Task 5: Restyle Summary Cards

**Files:**
- Modify: `src/components/dashboard/SummaryCards.tsx`

**Step 1: Restyle summary cards with top border + subtitle + teal accent**

Rewrite `src/components/dashboard/SummaryCards.tsx`:

```tsx
'use client';

import type { DashboardSummary } from '@/types/api';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

const CARDS = [
  {
    key: 'total' as const,
    title: 'ผู้คลอดทั้งหมด',
    subtitle: 'กำลังคลอด',
    borderColor: 'border-t-teal-500',
    textColor: 'text-slate-800',
    getValue: (s: DashboardSummary) => s.totalActive,
  },
  {
    key: 'high' as const,
    title: 'เสี่ยงสูง',
    subtitle: 'ต้องเฝ้าระวัง',
    borderColor: 'border-t-red-500',
    textColor: 'text-red-600',
    getValue: (s: DashboardSummary) => s.totalHigh,
  },
  {
    key: 'medium' as const,
    title: 'เสี่ยงปานกลาง',
    subtitle: 'ติดตามต่อเนื่อง',
    borderColor: 'border-t-amber-500',
    textColor: 'text-amber-600',
    getValue: (s: DashboardSummary) => s.totalMedium,
  },
  {
    key: 'low' as const,
    title: 'เสี่ยงต่ำ',
    subtitle: 'ปกติ',
    borderColor: 'border-t-green-500',
    textColor: 'text-green-600',
    getValue: (s: DashboardSummary) => s.totalLow,
  },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl border-t-4 bg-white p-5 shadow-sm ${card.borderColor}`}
        >
          <div className="text-sm font-medium text-slate-500">{card.title}</div>
          <div className={`mt-2 text-3xl font-bold font-mono ${card.textColor}`}>
            {card.getValue(summary)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{card.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Verify — check dashboard shows new styled cards**

**Step 3: Commit**

```bash
git add src/components/dashboard/SummaryCards.tsx
git commit -m "style: restyle summary cards with top borders and teal accent"
```

---

## Task 6: Active Hospital Cards + Inactive Hospital List

**Files:**
- Create: `src/components/dashboard/ActiveHospitalCard.tsx`
- Create: `src/components/dashboard/InactiveHospitalList.tsx`

**Step 1: Create ActiveHospitalCard**

Create `src/components/dashboard/ActiveHospitalCard.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import type { DashboardHospital } from '@/types/api';
import { ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';

interface ActiveHospitalCardProps {
  hospital: DashboardHospital;
}

function getBorderColor(h: DashboardHospital): string {
  if (h.counts.high > 0) return 'border-l-red-500';
  if (h.counts.medium > 0) return 'border-l-amber-500';
  return 'border-l-green-500';
}

export function ActiveHospitalCard({ hospital: h }: ActiveHospitalCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/hospitals/${h.hcode}`)}
      className={`cursor-pointer rounded-xl border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${getBorderColor(h)}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-800">{h.name}</div>
          <span className="inline-block mt-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
            {h.level}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono text-slate-700">{h.counts.total}</div>
          <div className="text-xs text-slate-400">ราย</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {h.counts.low > 0 && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            {h.counts.low} ต่ำ
          </span>
        )}
        {h.counts.medium > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            {h.counts.medium} ปานกลาง
          </span>
        )}
        {h.counts.high > 0 && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            {h.counts.high} สูง
          </span>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-2">
        <ConnectionStatus
          status={h.connectionStatus as ConnectionStatusEnum}
          lastSyncAt={h.lastSyncAt}
        />
      </div>
    </div>
  );
}
```

**Step 2: Create InactiveHospitalList**

Create `src/components/dashboard/InactiveHospitalList.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DashboardHospital } from '@/types/api';

interface InactiveHospitalListProps {
  hospitals: DashboardHospital[];
}

export function InactiveHospitalList({ hospitals }: InactiveHospitalListProps) {
  const [expanded, setExpanded] = useState(true);
  const router = useRouter();

  if (hospitals.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        โรงพยาบาลอื่นๆ ({hospitals.length} แห่ง)
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.map((h) => (
            <div
              key={h.hcode}
              onClick={() => router.push(`/hospitals/${h.hcode}`)}
              className="flex cursor-pointer items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <span>
                {h.name}{' '}
                <span className="text-xs">({h.level})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                ไม่ทราบ
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/dashboard/ActiveHospitalCard.tsx src/components/dashboard/InactiveHospitalList.tsx
git commit -m "feat: add active hospital cards and inactive hospital list"
```

---

## Task 7: Redesign Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: Update dashboard page to use new components**

Rewrite `src/app/(dashboard)/page.tsx`:

```tsx
'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { useSSE } from '@/hooks/useSSE';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ActiveHospitalCard } from '@/components/dashboard/ActiveHospitalCard';
import { InactiveHospitalList } from '@/components/dashboard/InactiveHospitalList';
import { LoadingState } from '@/components/shared/LoadingState';

export default function DashboardPage() {
  const { hospitals, summary, updatedAt, isLoading, mutate } = useDashboard();

  useSSE({
    onPatientUpdate: () => mutate(),
    onConnectionStatus: () => mutate(),
    onSyncComplete: () => mutate(),
  });

  if (isLoading) {
    return <LoadingState message="กำลังโหลด Dashboard..." />;
  }

  const activeHospitals = hospitals.filter((h) => h.counts.total > 0);
  const inactiveHospitals = hospitals.filter((h) => h.counts.total === 0);

  return (
    <div className="space-y-6">
      {/* Page title + last update */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          แดชบอร์ดจังหวัดขอนแก่น
        </h1>
        {updatedAt && (
          <span className="text-sm text-slate-400">
            อัปเดตล่าสุด: {new Date(updatedAt).toLocaleTimeString('th-TH')}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} />

      {/* Active hospitals */}
      {activeHospitals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-slate-700">
            โรงพยาบาลที่มีผู้คลอด ({activeHospitals.length} แห่ง)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeHospitals.map((h) => (
              <ActiveHospitalCard key={h.hcode} hospital={h} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive hospitals */}
      <InactiveHospitalList hospitals={inactiveHospitals} />
    </div>
  );
}
```

**Step 2: Verify — open dashboard, confirm new layout**

Expected: Summary cards with top borders, active hospitals as cards in grid, inactive list collapsible at bottom.

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: redesign dashboard with card-based hospital layout"
```

---

## Task 8: Patient Card for Hospital List

**Files:**
- Create: `src/components/patient/PatientCard.tsx`

**Step 1: Create PatientCard component**

Create `src/components/patient/PatientCard.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { CpdBadge } from '@/components/shared/CpdBadge';
import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/types/domain';

interface PatientCardProps {
  an: string;
  hn: string;
  name: string;
  age: number;
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  admitDate: string;
  laborStatus: string;
  cpdScore: number | null;
  cpdRiskLevel: string | null;
  latestVitals?: {
    maternalHr: number | null;
    fetalHr: string | null;
    sbp: number | null;
    dbp: number | null;
  } | null;
  latestCervixCm?: number | null;
}

function getBorderColor(riskLevel: string | null): string {
  switch (riskLevel) {
    case 'HIGH': return 'border-l-red-500';
    case 'MEDIUM': return 'border-l-amber-500';
    case 'LOW': return 'border-l-green-500';
    default: return 'border-l-slate-300';
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'เมื่อสักครู่';
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วัน ที่แล้ว`;
}

function VitalPill({ label, value, unit }: { label: string; value: number | string | null; unit: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex flex-col items-center rounded-lg bg-slate-50 px-3 py-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold font-mono text-slate-700">{value}</span>
      <span className="text-xs text-slate-400">{unit}</span>
    </div>
  );
}

export function PatientCard({
  an, hn, name, age, gravida, gaWeeks, ancCount,
  admitDate, laborStatus, cpdScore, cpdRiskLevel,
  latestVitals, latestCervixCm,
}: PatientCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/patients/${an}`)}
      className={`cursor-pointer rounded-xl border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${getBorderColor(cpdRiskLevel)}`}
    >
      {/* Row 1: Name + CPD badge */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-800">{name}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>AN: {an}</span>
            <span>HN: {hn}</span>
            <span>{age} ปี</span>
            {gravida != null && <span>ครรภ์ที่ {gravida}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cpdScore != null && cpdRiskLevel && (
            <CpdBadge score={cpdScore} riskLevel={cpdRiskLevel as RiskLevel} size="sm" />
          )}
          <Badge variant={laborStatus === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
            {laborStatus === 'ACTIVE' ? 'คลอดอยู่' : 'คลอดแล้ว'}
          </Badge>
        </div>
      </div>

      {/* Row 2: GA + ANC */}
      <div className="mt-2 flex gap-3 text-xs text-slate-500">
        {gaWeeks != null && <span>GA {gaWeeks} สัปดาห์</span>}
        {ancCount != null && <span>ANC {ancCount} ครั้ง</span>}
      </div>

      {/* Row 3: Latest vitals preview */}
      {(latestVitals || latestCervixCm != null) && (
        <div className="mt-3 flex flex-wrap gap-2">
          <VitalPill label="MHR" value={latestVitals?.maternalHr ?? null} unit="bpm" />
          <VitalPill label="FHR" value={latestVitals?.fetalHr ?? null} unit="bpm" />
          <VitalPill
            label="BP"
            value={latestVitals?.sbp && latestVitals?.dbp ? `${latestVitals.sbp}/${latestVitals.dbp}` : null}
            unit="mmHg"
          />
          <VitalPill label="Cervix" value={latestCervixCm ?? null} unit="cm" />
        </div>
      )}

      {/* Row 4: Admit info */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
        <span>
          Admit: {new Date(admitDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' '}({relativeTime(admitDate)})
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/patient/PatientCard.tsx
git commit -m "feat: add patient card component with vitals preview"
```

---

## Task 9: Redesign Hospital Patient List Page

**Files:**
- Modify: `src/app/(dashboard)/hospitals/[hcode]/page.tsx`

**Step 1: Rewrite hospital patient list to use PatientCard**

Rewrite `src/app/(dashboard)/hospitals/[hcode]/page.tsx`:

```tsx
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PatientCard } from '@/components/patient/PatientCard';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import { LoadingState } from '@/components/shared/LoadingState';
import { Building2, ArrowLeft } from 'lucide-react';
import { ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';

interface PatientRow {
  id: string;
  hn: string;
  an: string;
  name: string;
  age: number;
  gravida: number | null;
  ga_weeks: number | null;
  anc_count: number | null;
  admit_date: string;
  labor_status: string;
  cpd_score: number | null;
  cpd_risk_level: string | null;
  latest_vitals?: {
    maternal_hr: number | null;
    fetal_hr: string | null;
    sbp: number | null;
    dbp: number | null;
  } | null;
  latest_cervix_cm?: number | null;
}

interface HospitalInfo {
  name: string;
  level: string;
  connectionStatus: string;
  lastSyncAt: string | null;
}

export default function HospitalPatientListPage({
  params,
}: {
  params: Promise<{ hcode: string }>;
}) {
  const { hcode } = use(params);
  const router = useRouter();

  const { data, isLoading } = useSWR(`/api/hospitals/${hcode}/patients`, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return <LoadingState message="กำลังโหลดรายชื่อผู้คลอด..." />;
  }

  const patients: PatientRow[] = data?.patients ?? [];
  const hospital: HospitalInfo | undefined = data?.hospital;

  // Sort: high-risk first
  const riskOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sortedPatients = [...patients].sort(
    (a, b) => (riskOrder[a.cpd_risk_level ?? 'LOW'] ?? 3) - (riskOrder[b.cpd_risk_level ?? 'LOW'] ?? 3),
  );

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600"
      >
        <ArrowLeft size={16} /> กลับแดชบอร์ด
      </button>

      {/* Hospital summary card */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {hospital?.name ?? `รหัส ${hcode}`}
            </h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {hospital?.level && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">
                  {hospital.level}
                </span>
              )}
              {hospital?.connectionStatus && (
                <ConnectionStatus
                  status={hospital.connectionStatus as ConnectionStatusEnum}
                  lastSyncAt={hospital.lastSyncAt ?? null}
                />
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-600">
          ผู้คลอด <span className="font-semibold">{patients.length}</span> ราย
        </div>
      </div>

      {/* Patient cards */}
      {sortedPatients.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-400 shadow-sm">
          ไม่มีผู้คลอดในขณะนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedPatients.map((p) => (
            <PatientCard
              key={p.id || p.an}
              an={p.an}
              hn={p.hn}
              name={p.name}
              age={p.age}
              gravida={p.gravida}
              gaWeeks={p.ga_weeks}
              ancCount={p.anc_count}
              admitDate={p.admit_date}
              laborStatus={p.labor_status}
              cpdScore={p.cpd_score}
              cpdRiskLevel={p.cpd_risk_level}
              latestVitals={p.latest_vitals ? {
                maternalHr: p.latest_vitals.maternal_hr,
                fetalHr: p.latest_vitals.fetal_hr,
                sbp: p.latest_vitals.sbp,
                dbp: p.latest_vitals.dbp,
              } : null}
              latestCervixCm={p.latest_cervix_cm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Note:** The API response may not include `latest_vitals` and `latest_cervix_cm` yet. The `PatientCard` handles null gracefully — the vitals row simply won't render. When the API is updated later, the data will flow through automatically.

**Step 2: Verify — navigate to a hospital from the dashboard**

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/hospitals/\[hcode\]/page.tsx
git commit -m "feat: redesign hospital patient list with patient cards"
```

---

## Task 10: Sticky Patient Header

**Files:**
- Create: `src/components/patient/StickyPatientHeader.tsx`

**Step 1: Create StickyPatientHeader**

Create `src/components/patient/StickyPatientHeader.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { CpdBadge } from '@/components/shared/CpdBadge';
import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/types/domain';

interface StickyPatientHeaderProps {
  name: string;
  an: string;
  laborStatus: string;
  hospitalName: string;
  cpdScore?: { score: number; riskLevel: RiskLevel } | null;
  /** Ref to the main header element — sticky header shows when this scrolls out of view */
  mainHeaderRef: React.RefObject<HTMLDivElement | null>;
}

export function StickyPatientHeader({
  name,
  an,
  laborStatus,
  hospitalName,
  cpdScore,
  mainHeaderRef,
}: StickyPatientHeaderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = mainHeaderRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [mainHeaderRef]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-14 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm print:hidden md:left-60">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2 md:px-6">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">{name}</span>
          <span className="text-xs text-slate-400">{an}</span>
          <Badge variant={laborStatus === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
            {laborStatus === 'ACTIVE' ? 'คลอดอยู่' : 'คลอดแล้ว'}
          </Badge>
          <span className="text-xs text-slate-400">{hospitalName}</span>
        </div>
        {cpdScore && (
          <CpdBadge score={cpdScore.score} riskLevel={cpdScore.riskLevel} size="sm" />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/patient/StickyPatientHeader.tsx
git commit -m "feat: add sticky patient header with intersection observer"
```

---

## Task 11: Redesign Patient Detail Page

**Files:**
- Modify: `src/app/(dashboard)/patients/[an]/page.tsx`
- Modify: `src/components/patient/ClinicalData.tsx`
- Modify: `src/components/charts/VitalSignGauge.tsx`

**Step 1: Update ClinicalData to 4-column grid in card wrapper**

Rewrite `src/components/patient/ClinicalData.tsx`:

```tsx
'use client';

interface ClinicalDataProps {
  gravida: number | null;
  gaWeeks: number | null;
  ancCount: number | null;
  heightCm: number | null;
  weightDiffKg: number | null;
  fundalHeightCm: number | null;
  usWeightG: number | null;
  hematocritPct: number | null;
}

function DataItem({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold font-mono text-slate-700">
        {value !== null && value !== undefined ? (
          <>{value}{unit ? <span className="text-slate-400 font-normal"> {unit}</span> : ''}</>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </div>
    </div>
  );
}

export function ClinicalData({
  gravida, gaWeeks, ancCount, heightCm,
  weightDiffKg, fundalHeightCm, usWeightG, hematocritPct,
}: ClinicalDataProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-medium text-slate-700">ข้อมูลทางคลินิก</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DataItem label="ครรภ์ที่ (Gravida)" value={gravida} />
        <DataItem label="อายุครรภ์ (GA)" value={gaWeeks} unit="สัปดาห์" />
        <DataItem label="ฝากครรภ์ (ANC)" value={ancCount} unit="ครั้ง" />
        <DataItem label="ส่วนสูง" value={heightCm} unit="ซม." />
        <DataItem label="ส่วนต่างน้ำหนัก" value={weightDiffKg} unit="กก." />
        <DataItem label="ยอดมดลูก" value={fundalHeightCm} unit="ซม." />
        <DataItem label="น้ำหนักเด็ก U/S" value={usWeightG} unit="กรัม" />
        <DataItem label="Hematocrit" value={hematocritPct} unit="%" />
      </div>
    </div>
  );
}
```

**Step 2: Add Thai status text to VitalSignGauge**

In `src/components/charts/VitalSignGauge.tsx`, add a `getStatusText` function and display it below the unit:

After the `<span>` for the unit, add:
```tsx
function getStatusText(value: number, normalMin: number, normalMax: number): { text: string; color: string } {
  if (value >= normalMin && value <= normalMax) return { text: 'ปกติ', color: '#22c55e' };
  if (value < normalMin * 0.8 || value > normalMax * 1.2) return { text: 'ผิดปกติ', color: '#ef4444' };
  return { text: 'เฝ้าระวัง', color: '#eab308' };
}
```

And in the JSX, after the unit span:
```tsx
{value !== null && (
  <span className="text-xs font-medium" style={{ color: getGaugeColor(value, normalMin, normalMax) }}>
    {getStatusText(value, normalMin, normalMax).text}
  </span>
)}
```

Also wrap the gauge in a card style: change the outer div to use `rounded-xl bg-white p-3 shadow-sm` instead of `rounded-lg border p-3`.

**Step 3: Rewrite patient detail page with card-wrapped sections + sticky header**

Rewrite `src/app/(dashboard)/patients/[an]/page.tsx`:

```tsx
'use client';

import { use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/hooks/usePatient';
import { usePartogram } from '@/hooks/usePartogram';
import { useSSE } from '@/hooks/useSSE';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { StickyPatientHeader } from '@/components/patient/StickyPatientHeader';
import { ClinicalData } from '@/components/patient/ClinicalData';
import { ContractionTable } from '@/components/patient/ContractionTable';
import { PrintForm } from '@/components/patient/PrintForm';
import { HighRiskAlert } from '@/components/shared/HighRiskAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { VitalSignGauge } from '@/components/charts/VitalSignGauge';
import { BpBarChart } from '@/components/charts/BpBarChart';
import { PartogramChart } from '@/components/charts/PartogramChart';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Printer } from 'lucide-react';
import type { RiskLevel } from '@/types/domain';

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ an: string }>;
}) {
  const { an } = use(params);
  const router = useRouter();
  const mainHeaderRef = useRef<HTMLDivElement>(null);

  const { patient, cpdScore, vitals, contractions, isLoading, mutate } = usePatient(an);
  const { partogram } = usePartogram(an);

  useSSE({
    onPatientUpdate: () => mutate(),
    onSyncComplete: () => mutate(),
  });

  if (isLoading) {
    return <LoadingState message="กำลังโหลดข้อมูลผู้คลอด..." />;
  }

  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-400">ไม่พบข้อมูลผู้คลอด</p>
          <button onClick={() => router.back()} className="mt-2 text-sm text-teal-600 underline">
            กลับ
          </button>
        </div>
      </div>
    );
  }

  const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const hrHistory = vitals.map((v) => v.maternalHr).filter((v): v is number => v !== null);
  const fhrHistory = vitals.map((v) => (v.fetalHr ? parseInt(v.fetalHr) : null)).filter((v): v is number => v !== null);

  return (
    <div className="space-y-5">
      {/* High Risk Alert */}
      {cpdScore && cpdScore.score >= 10 && (
        <HighRiskAlert score={cpdScore.score} an={patient.an} patientName={patient.name} />
      )}

      {/* Sticky header */}
      <StickyPatientHeader
        name={patient.name}
        an={patient.an}
        laborStatus={patient.laborStatus}
        hospitalName={patient.hospital.name}
        cpdScore={cpdScore ? { score: cpdScore.score, riskLevel: cpdScore.riskLevel as RiskLevel } : null}
        mainHeaderRef={mainHeaderRef}
      />

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 print:hidden"
      >
        <ArrowLeft size={16} /> กลับ
      </button>

      {/* Patient Header — in card */}
      <div ref={mainHeaderRef}>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <PatientHeader
            hn={patient.hn}
            an={patient.an}
            name={patient.name}
            age={patient.age}
            admitDate={patient.admitDate}
            laborStatus={patient.laborStatus}
            hospital={patient.hospital}
            cpdScore={cpdScore ? { score: cpdScore.score, riskLevel: cpdScore.riskLevel as RiskLevel } : null}
          />
        </div>
      </div>

      {/* Clinical Data — already self-wrapped in card */}
      <ClinicalData
        gravida={patient.gravida}
        gaWeeks={patient.gaWeeks}
        ancCount={patient.ancCount}
        heightCm={patient.heightCm}
        weightDiffKg={patient.weightDiffKg}
        fundalHeightCm={patient.fundalHeightCm}
        usWeightG={patient.usWeightG}
        hematocritPct={patient.hematocritPct}
      />

      {/* Vital Sign Gauges */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-medium text-slate-700">สัญญาณชีพล่าสุด</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <VitalSignGauge label="Maternal HR" value={latestVital?.maternalHr ?? null} unit="bpm" min={40} max={160} normalMin={60} normalMax={100} history={hrHistory} />
          <VitalSignGauge label="Fetal HR" value={latestVital?.fetalHr ? parseInt(latestVital.fetalHr) : null} unit="bpm" min={80} max={200} normalMin={110} normalMax={160} history={fhrHistory} />
          <VitalSignGauge label="BP (SBP)" value={latestVital?.sbp ?? null} unit="mmHg" min={60} max={200} normalMin={90} normalMax={140} />
          <VitalSignGauge label="PPH" value={latestVital?.pphAmountMl ?? null} unit="ml" min={0} max={1000} normalMin={0} normalMax={500} />
        </div>
      </div>

      {/* Partogram */}
      {partogram && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <PartogramChart entries={partogram.entries} startTime={partogram.startTime} />
        </div>
      )}

      {/* BP Chart */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <BpBarChart vitals={vitals} />
      </div>

      {/* Contractions */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <ContractionTable contractions={contractions} />
      </div>

      {/* Print Button */}
      <div className="flex justify-end print:hidden">
        <Dialog>
          <DialogTrigger render={
            <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Printer size={16} className="mr-2" />
              พิมพ์บันทึกการคลอด
            </Button>
          } />
          <DialogContent className="max-w-4xl">
            <PrintForm patient={patient} hospitalName={patient.hospital.name} vitals={vitals} />
            <div className="flex justify-end gap-2">
              <Button onClick={() => window.print()}>พิมพ์</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
```

**Step 4: Verify — open a patient detail page, scroll to see sticky header**

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/patients/\[an\]/page.tsx src/components/patient/ClinicalData.tsx src/components/charts/VitalSignGauge.tsx src/components/patient/StickyPatientHeader.tsx
git commit -m "feat: redesign patient detail with card sections and sticky header"
```

---

## Task 12: Redesign Login Page (Split Layout)

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Step 1: Rewrite login page with split layout**

Rewrite `src/app/(auth)/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Activity, BarChart3, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setError('กรุณากรอก BMS Session ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        sessionId: sessionId.trim(),
        redirect: false,
      });

      if (result?.error) {
        setError('Session ID ไม่ถูกต้องหรือหมดอายุ');
      } else {
        router.push('/');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — hero */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-teal-700 to-teal-900 p-10 text-white md:flex md:w-1/2 lg:w-[45%]">
        <div>
          <div className="flex items-center gap-3">
            <Building2 size={36} className="text-teal-200" />
            <div>
              <h1 className="text-2xl font-bold">KK-LRMS</h1>
              <p className="text-sm text-teal-200">ระบบติดตามการคลอดจังหวัดขอนแก่น</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-teal-300">
            Khon Kaen Labor Room Monitoring System
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-lg font-medium text-teal-100">
            ติดตามสถานะผู้คลอดทุกโรงพยาบาลในจังหวัดแบบ Real-time
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-teal-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <Building2 size={18} />
              </div>
              <span className="text-sm">26 โรงพยาบาลในเครือข่าย</span>
            </div>
            <div className="flex items-center gap-3 text-teal-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <Activity size={18} />
              </div>
              <span className="text-sm">CPD Score คำนวณอัตโนมัติ</span>
            </div>
            <div className="flex items-center gap-3 text-teal-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <BarChart3 size={18} />
              </div>
              <span className="text-sm">Partogram ติดตามความก้าวหน้าการคลอด</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-teal-400">
          v1.0.0 — สำนักงานสาธารณสุขจังหวัดขอนแก่น
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="mb-8 text-center md:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Building2 size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">KK-LRMS</h1>
            <p className="text-sm text-slate-500">ระบบติดตามการคลอดจังหวัดขอนแก่น</p>
          </div>

          <div className="hidden md:block">
            <h2 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-slate-500">KK-LRMS — ระบบติดตามการคลอด</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="sessionId" className="text-sm font-medium text-slate-700">
                BMS Session ID
              </label>
              <Input
                id="sessionId"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="กรอก Session ID จาก BMS"
                disabled={loading}
                autoFocus
                className="h-11 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-teal-600 text-white hover:bg-teal-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  กำลังตรวจสอบ...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield size={16} />
                  เข้าสู่ระบบ
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400">
              ระบบตรวจสอบสิทธิ์ผ่าน BMS Session ของ สสจ.ขอนแก่น
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify — visit /login, confirm split layout**

**Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat: redesign login page with split layout and teal hero"
```

---

## Task 13: Update PatientHeader Style

**Files:**
- Modify: `src/components/patient/PatientHeader.tsx`

**Step 1: Remove the border/rounded from PatientHeader since it's now inside a card wrapper**

In `src/components/patient/PatientHeader.tsx`, change the outer div from:
```tsx
<div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-start md:justify-between">
```
To:
```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
```

Also update the text colors to use slate:
- `text-muted-foreground` → `text-slate-500`
- `text-lg font-bold` → `text-lg font-semibold text-slate-800`

**Step 2: Commit**

```bash
git add src/components/patient/PatientHeader.tsx
git commit -m "style: update PatientHeader for card-wrapped layout"
```

---

## Task 14: Final Verification & Build Check

**Step 1: Run lint**

```bash
npm run lint
```

Fix any lint errors.

**Step 2: Run build**

```bash
npm run build
```

Fix any type errors or build failures.

**Step 3: Visual verification in browser**

Check all 4 pages:
1. `/login` — split layout with teal hero
2. `/` — dashboard with summary cards, active hospital cards, inactive list
3. `/hospitals/10670` — patient cards with vitals preview
4. `/patients/AN-2026-001` — card sections, sticky header on scroll

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from UI redesign"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Font & theme foundation | layout.tsx, globals.css |
| 2 | Sidebar component | Sidebar.tsx (new) |
| 3 | TopBar component | TopBar.tsx (new) |
| 4 | DashboardLayout shell | DashboardLayout.tsx (new), (dashboard)/layout.tsx (new) |
| 5 | Restyle summary cards | SummaryCards.tsx |
| 6 | Hospital card components | ActiveHospitalCard.tsx (new), InactiveHospitalList.tsx (new) |
| 7 | Dashboard page redesign | (dashboard)/page.tsx |
| 8 | Patient card component | PatientCard.tsx (new) |
| 9 | Hospital patient list redesign | hospitals/[hcode]/page.tsx |
| 10 | Sticky patient header | StickyPatientHeader.tsx (new) |
| 11 | Patient detail redesign | patients/[an]/page.tsx, ClinicalData.tsx, VitalSignGauge.tsx |
| 12 | Login page redesign | login/page.tsx |
| 13 | PatientHeader style update | PatientHeader.tsx |
| 14 | Verification & build check | all files |
