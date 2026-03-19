'use client';

import { CpdBadge } from '@/components/shared/CpdBadge';
import { RiskLevel } from '@/types/domain';
import { formatRelativeTime } from '@/lib/utils';
import { CPD_FACTOR_WEIGHTS } from '@/config/risk-levels';

interface CpdFactorBreakdownProps {
  score: number;
  riskLevel: string; // 'LOW' | 'MEDIUM' | 'HIGH'
  factors: {
    gravida: number | null;
    ancCount: number | null;
    gaWeeks: number | null;
    heightCm: number | null;
    weightDiffKg: number | null;
    fundalHeightCm: number | null;
    usWeightG: number | null;
    hematocritPct: number | null;
  };
  missingFactors: string[];
  calculatedAt: string;
}

/** Max possible score for each factor */
const FACTOR_MAX_SCORES: Record<string, number> = {
  gravida: 2,
  ancCount: 1.5,
  gaWeeks: 1.5,
  heightCm: 2,
  weightDiffKg: 2,
  fundalHeightCm: 2,
  usWeightG: 2,
  hematocritPct: 1.5,
};

/** Ordered list of factor keys for consistent rendering */
const FACTOR_ORDER: (keyof CpdFactorBreakdownProps['factors'])[] = [
  'gravida',
  'ancCount',
  'gaWeeks',
  'heightCm',
  'weightDiffKg',
  'fundalHeightCm',
  'usWeightG',
  'hematocritPct',
];

/** Total max possible score across all factors */
const TOTAL_MAX_SCORE = Object.values(FACTOR_MAX_SCORES).reduce((sum, v) => sum + v, 0);

function getBarColor(contribution: number, maxScore: number): string {
  if (contribution <= 0) return 'bg-green-500';
  if (contribution < maxScore) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTotalBarColor(score: number): string {
  if (score < 5) return 'bg-green-500';
  if (score < 10) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTotalTrackColor(score: number): string {
  if (score < 5) return 'bg-green-100';
  if (score < 10) return 'bg-amber-100';
  return 'bg-red-100';
}

export function CpdFactorBreakdown({
  score,
  riskLevel,
  factors,
  missingFactors,
  calculatedAt,
}: CpdFactorBreakdownProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-slate-800">
          วิเคราะห์ปัจจัยเสี่ยง CPD
        </h3>
        <CpdBadge
          score={score}
          riskLevel={riskLevel as RiskLevel}
          size="md"
        />
      </div>

      {/* Factor list */}
      <div className="space-y-3">
        {FACTOR_ORDER.map((key) => {
          const factorConfig = CPD_FACTOR_WEIGHTS[key];
          const maxScore = FACTOR_MAX_SCORES[key];
          const isMissing = missingFactors.includes(key);
          const rawValue = factors[key];

          // Calculate contribution: use the evaluate function from config if value exists
          let contribution = 0;
          if (!isMissing && rawValue !== null) {
            contribution = factorConfig.evaluate(rawValue);
          }

          const barWidthPct = maxScore > 0 ? (contribution / maxScore) * 100 : 0;

          return (
            <div key={key} className="flex items-center gap-3">
              {/* Factor Thai name */}
              <span className="w-44 shrink-0 text-sm text-slate-600 truncate">
                {factorConfig.nameTh}
              </span>

              {/* Bar area */}
              <div className="flex-1 min-w-0">
                {isMissing ? (
                  <div className="flex items-center h-2">
                    <span className="text-xs text-slate-400 italic">
                      ไม่มีข้อมูล
                    </span>
                  </div>
                ) : (
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full transition-all ${getBarColor(contribution, maxScore)}`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Score */}
              <span className="w-12 shrink-0 text-right font-mono text-sm text-slate-700">
                {isMissing ? (
                  <span className="text-slate-300">-</span>
                ) : (
                  `${contribution}/${maxScore}`
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-slate-100" />

      {/* Total score */}
      <div className="flex items-center gap-3">
        <span className="w-44 shrink-0 text-sm font-semibold text-slate-800">
          คะแนนรวม
        </span>
        <div className="flex-1 min-w-0">
          <div className={`h-2.5 w-full rounded-full ${getTotalTrackColor(score)}`}>
            <div
              className={`h-2.5 rounded-full transition-all ${getTotalBarColor(score)}`}
              style={{ width: `${Math.min((score / TOTAL_MAX_SCORE) * 100, 100)}%` }}
            />
          </div>
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-sm font-bold text-slate-800">
          {score}/{TOTAL_MAX_SCORE}
        </span>
      </div>

      {/* Calculated at */}
      <p className="mt-4 text-xs text-slate-400">
        คำนวณเมื่อ {formatRelativeTime(calculatedAt)}
      </p>
    </div>
  );
}
