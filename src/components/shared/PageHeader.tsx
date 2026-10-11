import type { ReactNode } from 'react';
import { FreshnessBadge } from '@/components/shared/FreshnessBadge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  freshness?: { lastSyncAt: string | null; syncStatus?: string };
}

export function PageHeader({ title, subtitle, actions, freshness }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
      <div>
        <h1 className="text-page text-brand">{title}</h1>
        {subtitle && <p className="text-body text-ink-muted">{subtitle}</p>}
        {freshness && (
          <FreshnessBadge className="mt-1" lastSyncAt={freshness.lastSyncAt} syncStatus={freshness.syncStatus} />
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
