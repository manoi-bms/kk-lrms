// `count` must be a server aggregate (pagination.total / counts / summary),
// never rows.length of a row-limited fetch — the count-provenance rule.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { KpiTip } from '@/components/shared/KpiTip';
import { cn } from '@/lib/utils';

export type KpiTone = 'default' | 'high' | 'warn';

const TONE: Record<KpiTone, { box: string; label: string; value: string }> = {
  default: { box: 'bg-surface-card shadow-soft', label: 'text-ink-muted', value: 'text-brand' },
  high: { box: 'bg-danger text-white', label: 'text-white', value: 'text-white' },
  warn: { box: 'bg-warn-tint border border-warn/40', label: 'text-warn-text', value: 'text-warn-text' },
};

export interface KpiTileProps {
  label: string;
  count: number;
  unit?: string;
  tone?: KpiTone;
  href?: string;
  hint?: { title: string; body: ReactNode };
  className?: string;
}

export function KpiTile({ label, count, unit, tone = 'default', href, hint, className }: KpiTileProps) {
  const t = TONE[tone];
  const shown = Number.isFinite(count) ? count.toLocaleString('en-US') : '—';
  const labelNode = hint ? (
    <KpiTip title={hint.title} body={hint.body} trigger={<span className="cursor-help underline decoration-dotted" />}>
      {label}
    </KpiTip>
  ) : (
    label
  );
  const body = (
    <>
      <div className={cn('text-label', t.label)}>{labelNode}</div>
      <div className={cn('text-kpi tabular-nums', t.value)}>
        {shown}
        {unit && <span className="ml-1 text-body">{unit}</span>}
      </div>
    </>
  );
  const box = cn('block rounded-2xl px-5 py-4', t.box, className);
  return href ? (
    <Link href={href} aria-label={`${label} ${shown}`} className={cn(box, 'transition-transform hover:-translate-y-0.5')}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
