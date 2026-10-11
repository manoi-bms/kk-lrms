// src/components/shared/StatusChip.tsx
// One live-status pill (dot + Thai label). Used by the dashboard SSE chip and
// the ward feed chip (spec D11). `role="status"` so screen readers announce
// changes.
import { STATUS_TONE, type StatusTone } from '@/config/status-tone';
import { cn } from '@/lib/utils';

export interface StatusChipProps {
  tone: StatusTone;
  label: string;
  title?: string;
  pulse?: boolean;
  className?: string;
}

export function StatusChip({ tone, label, title, pulse = false, className }: StatusChipProps) {
  const t = STATUS_TONE[tone];
  return (
    <span
      role="status"
      title={title}
      data-tone={tone}
      className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-label', t.tint, t.text, className)}
    >
      <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', t.solid, pulse && 'motion-safe:animate-pulse')} />
      {label}
    </span>
  );
}
