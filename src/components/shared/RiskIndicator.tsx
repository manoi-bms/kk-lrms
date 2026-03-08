// T040: RiskIndicator — colored dot + Thai risk label
'use client';

import { RiskLevel } from '@/types/domain';
import { RISK_LEVELS } from '@/config/risk-levels';
import { cn } from '@/lib/utils';

interface RiskIndicatorProps {
  riskLevel: RiskLevel;
  pulse?: boolean;
  className?: string;
}

export function RiskIndicator({ riskLevel, pulse = false, className }: RiskIndicatorProps) {
  const config = RISK_LEVELS[riskLevel];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('inline-block h-2.5 w-2.5 rounded-full', pulse && 'animate-pulse')}
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      <span className="text-sm" style={{ color: config.color }}>
        {config.labelTh}
      </span>
    </span>
  );
}
