'use client';
import { describeSyncAge, type FreshnessTone } from '@/lib/sync-age';
import { cn } from '@/lib/utils';

const TEXT: Record<FreshnessTone, string> = {
  ok: 'text-ok-text',
  warn: 'text-warn-text',
  danger: 'text-danger-text',
};
const DOT: Record<FreshnessTone, string> = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' };

export interface FreshnessBadgeProps {
  lastSyncAt: string | null | undefined;
  syncStatus?: string;
  label?: string;
  now?: Date;
  className?: string;
}

export function FreshnessBadge({
  lastSyncAt,
  syncStatus,
  label = 'ซิงค์ล่าสุด',
  now,
  className,
}: FreshnessBadgeProps) {
  const a = describeSyncAge(lastSyncAt, syncStatus, now);
  return (
    <span
      role="status"
      data-tone={a.tone}
      suppressHydrationWarning
      className={cn('inline-flex items-center gap-2 text-label', TEXT[a.tone], className)}
    >
      <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT[a.tone])} />
      {a.clock ? (
        <span>
          {label} <b className="tabular-nums">{a.clock}</b> · {a.relative}
        </span>
      ) : (
        <span>{a.relative}</span>
      )}
    </span>
  );
}
