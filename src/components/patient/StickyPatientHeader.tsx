// T010: StickyPatientHeader — sticky bar when main header scrolls out of view
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CpdBadge } from '@/components/shared/CpdBadge';
import type { RiskLevel } from '@/types/domain';

interface StickyPatientHeaderProps {
  name: string;
  hn: string;
  an: string;
  laborStatus: string;
  hospitalName: string;
  cpdScore?: {
    score: number;
    riskLevel: RiskLevel;
  } | null;
  mainHeaderRef: React.RefObject<HTMLDivElement | null>;
}

const LABOR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'คลอดอยู่',
  DELIVERED: 'คลอดแล้ว',
  TRANSFERRED: 'ส่งต่อแล้ว',
};

export function StickyPatientHeader({
  name,
  hn,
  an,
  laborStatus,
  hospitalName,
  cpdScore,
  mainHeaderRef,
}: StickyPatientHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const headerEl = mainHeaderRef.current;
    if (!headerEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky header when main header is NOT intersecting (scrolled away)
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(headerEl);

    return () => {
      observer.disconnect();
    };
  }, [mainHeaderRef]);

  if (!isVisible) return null;

  const laborLabel = LABOR_STATUS_LABELS[laborStatus] ?? laborStatus;

  return (
    <div
      className="fixed top-14 right-0 left-0 z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.05)] print:hidden md:left-60"
      role="banner"
      aria-label="Sticky patient header"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <span className="font-mono text-sm font-bold text-slate-800 truncate">AN {an}</span>
        <span className="text-xs text-slate-500 shrink-0">HN: {hn}</span>
        <Badge variant={laborStatus === 'ACTIVE' ? 'default' : 'secondary'}>
          {laborLabel}
        </Badge>
        <Badge variant="outline" className="shrink-0">
          {hospitalName}
        </Badge>
        {cpdScore && (
          <CpdBadge
            score={cpdScore.score}
            riskLevel={cpdScore.riskLevel}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
