/**
 * Data-quality bounds, not clinical thresholds: a value outside these cannot
 * be a real measurement, so it is a mapping or entry error and must not be
 * stored. Severity interpretation belongs elsewhere.
 */
export const HB_G_DL_PLAUSIBLE_MAX = 25;

export function plausibleHbGDl(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value > 0 && value <= HB_G_DL_PLAUSIBLE_MAX ? value : null;
}
