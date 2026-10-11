// Responsive KPI tile grid: as many columns as fit at the minimum width, so a
// tile never shrinks until Thai labels break one word per line (2026-10-11
// visual review at 1024px with the 232px sidebar). Widths assume the 18px
// root: a 150px tile leaves ~114px for a text-kpi number with px-4 padding.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const MIN = {
  sm: 'grid-cols-[repeat(auto-fit,minmax(150px,1fr))]',
  md: 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
} as const;

export function KpiGrid({
  min = 'sm',
  className,
  children,
}: {
  min?: keyof typeof MIN;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('grid gap-3', MIN[min], className)}>{children}</div>;
}
