// T010: StickyPatientHeader — sticky bar when main header scrolls out of view
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CpdBadge } from '@/components/shared/CpdBadge';
import type { RiskLevel } from '@/types/domain';

interface StickyPatientHeaderProps {
  name: string;
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
      className="fixed top-14 right-0 left-0 z-40 border-b bg-white/95 shadow-sm backdrop-blur-sm print:hidden md:left-60"
      role="banner"
      aria-label="Sticky patient header"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <span className="font-semibold truncate">{name}</span>
        <span className="text-xs text-slate-500 shrink-0">AN: {an}</span>
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
