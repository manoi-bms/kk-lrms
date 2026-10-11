// `count` must be a server aggregate (pagination.total / counts / summary),
// never rows.length of a row-limited fetch — the count-provenance rule.
//
// With `href` the tile carries a stretched link (an absolute overlay) instead
// of wrapping its content, so the optional hint button is a sibling of the
// link — never an interactive element nested inside one.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HintButton } from '@/components/shared/HintButton';
import { cn } from '@/lib/utils';

export type KpiTone = 'default' | 'high' | 'warn' | 'ok';

const TONE: Record<KpiTone, { box: string; label: string; value: string; sub: string }> = {
  default: { box: 'bg-surface-card shadow-soft', label: 'text-ink-muted', value: 'text-brand', sub: 'text-ink-muted' },
  high: { box: 'bg-danger text-white', label: 'text-white', value: 'text-white', sub: 'text-white' },
  warn: { box: 'bg-warn-tint border border-warn/40', label: 'text-warn-text', value: 'text-warn-text', sub: 'text-warn-text' },
  ok: { box: 'bg-ok-tint border border-ok/40', label: 'text-ok-text', value: 'text-ok-text', sub: 'text-ok-text' },
};

export interface KpiTileProps {
  label: string;
  count: number;
  unit?: string;
  tone?: KpiTone;
  href?: string;
  hint?: { title: string; body: ReactNode };
  /** Secondary line under the number, e.g. "รับใหม่ 3 รายใน 24 ชม.". */
  sub?: ReactNode;
  testId?: string;
  className?: string;
}

export function KpiTile({ label, count, unit, tone = 'default', href, hint, sub, testId, className }: KpiTileProps) {
  const t = TONE[tone];
  const shown = Number.isFinite(count) ? count.toLocaleString('en-US') : '—';
  return (
    <div
      data-testid={testId}
      className={cn(
        'relative flex min-w-0 flex-col gap-1 rounded-2xl px-4 py-4',
        t.box,
        href && 'transition-transform hover:-translate-y-0.5',
        className,
      )}
    >
      {href && (
        <Link
          href={href}
          aria-label={`${label} ${shown}`}
          className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div data-kpi-label className={cn('min-w-0 text-label', t.label)}>
          {label}
        </div>
        {hint && <HintButton label={label} title={hint.title} body={hint.body} className={t.label} />}
      </div>
      <div data-kpi-value className={cn('whitespace-nowrap text-kpi tabular-nums', t.value)}>
        {shown}
        {unit && <span className="ml-1 text-body">{unit}</span>}
      </div>
      {sub && <div className={cn('text-caption', t.sub)}>{sub}</div>}
    </div>
  );
}
