// T039: CpdBadge component — pill showing CPD score with risk color
'use client';

import { RiskLevel } from '@/types/domain';
import { RISK_LEVELS, HIGH_RISK_RECOMMENDATION } from '@/config/risk-levels';
import { cn } from '@/lib/utils';

interface CpdBadgeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs min-w-[2rem]',
  md: 'px-3 py-1 text-sm min-w-[2.5rem]',
  lg: 'px-4 py-2 text-lg min-w-[3.5rem] font-bold',
};

export function CpdBadge({ score, riskLevel, size = 'md', className }: CpdBadgeProps) {
  const config = RISK_LEVELS[riskLevel];
  const isHigh = riskLevel === RiskLevel.HIGH;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-center',
        SIZE_CLASSES[size],
        className,
      )}
      style={{ backgroundColor: config.bgColor, color: config.color }}
      title={isHigh ? HIGH_RISK_RECOMMENDATION : config.labelTh}
      role="status"
      aria-label={`CPD Score ${score} - ${config.labelTh}`}
    >
      {score}
    </span>
  );
}
