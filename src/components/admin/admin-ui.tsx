// src/components/admin/admin-ui.tsx
// The admin vocabulary in one place: status chips, labelled fields and native
// selects on the direction-C tokens. Text never uses the base risk hue (B3).
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/config/status-tone';
import { cn } from '@/lib/utils';

export const TONE_CLASSES: Record<StatusTone, { chip: string; text: string; dot: string }> = {
  ok: { chip: 'border-ok/40 bg-ok-tint text-ok-text', text: 'text-ok-text', dot: 'bg-ok' },
  warn: { chip: 'border-warn/40 bg-warn-tint text-warn-text', text: 'text-warn-text', dot: 'bg-warn' },
  danger: { chip: 'border-danger/40 bg-danger-tint text-danger-text', text: 'text-danger-text', dot: 'bg-danger' },
  brand: { chip: 'border-brand/30 bg-brand-soft text-brand', text: 'text-brand', dot: 'bg-brand' },
  neutral: { chip: 'border-border bg-surface-muted text-ink-muted', text: 'text-ink-muted', dot: 'bg-ink-subtle' },
};

export function StatusPill({
  tone, icon: Icon, title, children, className,
}: { tone: StatusTone; icon?: LucideIcon; title?: string; children: ReactNode; className?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-semibold', TONE_CLASSES[tone].chip, className)}>
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-label text-ink">{label}</label>
      {children}
      {hint && <p className="text-caption text-ink-muted">{hint}</p>}
    </div>
  );
}

export const SELECT_CLASS =
  'h-11 w-full rounded-lg border border-border bg-surface-card px-3 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
