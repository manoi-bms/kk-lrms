// FlagChip — small clinical flag chip (LBW, เกินกำหนด, HR3, อายุ < 20 …).
// `tone` renders token text on a token tint (AA, foundation deviation 5).
// `color` is the legacy marker-colour mode. Remaining consumers: the journey
// detail page flag rows (/pregnancies/[journeyId]), NewbornOutcomesCard and
// ReferralHistoryCard (patient detail). Do not use it in new code.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FlagTone = 'danger' | 'warn' | 'ok' | 'brand' | 'neutral';

const TONE: Record<FlagTone, string> = {
  danger: 'border-danger/40 bg-danger-tint text-danger-text',
  warn: 'border-warn/40 bg-warn-tint text-warn-text',
  ok: 'border-ok/40 bg-ok-tint text-ok-text',
  brand: 'border-brand/30 bg-brand-soft text-brand-strong',
  neutral: 'border-border bg-surface-muted text-ink-muted',
};

export function FlagChip({
  tone,
  color,
  title,
  children,
}: {
  tone?: FlagTone;
  /** @deprecated legacy marker colour — use `tone`. */
  color?: string;
  title?: string;
  children: ReactNode;
}) {
  if (tone || !color) {
    return (
      <span
        title={title}
        className={cn('inline-block rounded-md border px-1.5 py-px text-caption font-semibold', TONE[tone ?? 'neutral'])}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      title={title}
      className="inline-block border px-1 py-px font-mono text-caption font-semibold tracking-[0.04em]"
      style={{ color, borderColor: color, background: 'transparent' }}
    >
      {children}
    </span>
  );
}
