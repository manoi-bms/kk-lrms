// ReferralBanner — persistent banner showing referral recommendation for MEDIUM/HIGH CPD risk
'use client';

import { AlertTriangle } from 'lucide-react';
import { RiskLevel } from '@/types/domain';
import { RISK_LEVELS } from '@/config/risk-levels';
import { cn } from '@/lib/utils';

interface ReferralBannerProps {
  score: number;
  riskLevel: RiskLevel;
  recommendation: string;
}

const BANNER_STYLES: Record<'MEDIUM' | 'HIGH', {
  container: string;
  scoreBg: string;
  scoreText: string;
  pulsingDot: boolean;
}> = {
  MEDIUM: {
    container: 'bg-amber-50 border border-amber-200 text-amber-800',
    scoreBg: 'bg-amber-200 text-amber-900',
    scoreText: 'text-amber-700',
    pulsingDot: false,
  },
  HIGH: {
    container: 'bg-red-50 border border-red-200 text-red-800',
    scoreBg: 'bg-red-200 text-red-900',
    scoreText: 'text-red-700',
    pulsingDot: true,
  },
};

export function ReferralBanner({ score, riskLevel, recommendation }: ReferralBannerProps) {
  if (riskLevel === RiskLevel.LOW) return null;

  const config = RISK_LEVELS[riskLevel];
  const style = BANNER_STYLES[riskLevel as 'MEDIUM' | 'HIGH'];

  const bannerText = riskLevel === RiskLevel.HIGH
    ? 'คำแนะนำ ควรประสานส่งต่อทันที!'
    : 'เฝ้าระวังใกล้ชิด เตรียมพร้อมส่งต่อ';

  return (
    <div
      className={cn('rounded-xl p-4 flex items-center gap-3 print:hidden', style.container)}
      role="alert"
      aria-label={`${config.labelTh} — ${bannerText}`}
    >
      {/* Pulsing dot for HIGH risk */}
      {style.pulsingDot && (
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
      )}

      {/* Icon */}
      <AlertTriangle size={20} className="shrink-0" />

      {/* Score circle badge */}
      <span
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0',
          style.scoreBg,
        )}
        aria-label={`CPD Score ${score}`}
      >
        {score}
      </span>

      {/* Text content */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold leading-tight">
          {bannerText}
        </span>
        <span className={cn('text-xs leading-tight', style.scoreText)}>
          {config.labelTh} — {recommendation}
        </span>
      </div>
    </div>
  );
}
