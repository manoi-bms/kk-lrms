// T062: CPD score calculation service
import type { CpdFactors } from '@/types/domain';
import { RiskLevel } from '@/types/domain';
import {
  CPD_FACTOR_WEIGHTS,
  classifyRiskLevel,
  RISK_LEVELS,
} from '@/config/risk-levels';

const ALL_FACTOR_KEYS: (keyof CpdFactors)[] = [
  'gravida',
  'ancCount',
  'gaWeeks',
  'heightCm',
  'weightDiffKg',
  'fundalHeightCm',
  'usWeightG',
  'hematocritPct',
];

export interface CpdScoreResult {
  score: number;
  riskLevel: RiskLevel;
  recommendation: string;
  factorScores: Record<string, number>;
  missingFactors: string[];
}

export function handleMissingFactors(factors: Partial<CpdFactors>): string[] {
  return ALL_FACTOR_KEYS.filter(
    (key) => factors[key] === undefined || factors[key] === null,
  );
}

export function calculateCpdScore(factors: Partial<CpdFactors>): CpdScoreResult {
  const missing = handleMissingFactors(factors);
  const factorScores: Record<string, number> = {};
  let totalScore = 0;

  for (const key of ALL_FACTOR_KEYS) {
    const value = factors[key];
    if (value !== undefined && value !== null) {
      const weight = CPD_FACTOR_WEIGHTS[key];
      const factorScore = weight.evaluate(value);
      factorScores[key] = factorScore;
      totalScore += factorScore;
    }
  }

  const riskLevel = classifyRiskLevel(totalScore);
  const recommendation = generateRecommendation(riskLevel);

  return {
    score: totalScore,
    riskLevel,
    recommendation,
    factorScores,
    missingFactors: missing,
  };
}

export function generateRecommendation(riskLevel: RiskLevel): string {
  return RISK_LEVELS[riskLevel].action;
}
