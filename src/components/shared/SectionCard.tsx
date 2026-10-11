import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SectionTone = 'default' | 'warn' | 'danger';

const TONE: Record<SectionTone, string> = {
  default: 'bg-surface-card',
  warn: 'bg-warn-tint border border-warn/40',
  danger: 'bg-danger-tint border border-danger/40',
};

export interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: SectionTone;
  className?: string;
  children: ReactNode;
}

export function SectionCard({ title, description, actions, tone = 'default', className, children }: SectionCardProps) {
  return (
    <section aria-label={title} className={cn('rounded-2xl p-5 shadow-soft', TONE[tone], className)}>
      <header className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-title text-brand">{title}</h2>
          {description && <p className="text-caption text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
