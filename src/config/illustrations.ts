// Static, pre-generated illustrations (scripts/illustrations/manifest.json).
// Qwen-Image-2.1 output; license signed off 2026-10-11 (see illustrationsEnabled).
export type IllustrationName = 'ward' | 'referral' | 'stale' | 'generic';

export const ILLUSTRATION_SRC: Record<IllustrationName, string> = {
  ward: '/illustrations/empty-ward.webp',
  referral: '/illustrations/empty-referral.webp',
  stale: '/illustrations/state-stale.webp',
  generic: '/illustrations/generic.webp',
};

/** Default ON — the Qwen Research License was signed off by the owner on
 *  2026-10-11. `NEXT_PUBLIC_ILLUSTRATIONS_ENABLED=false` is the kill switch
 *  (EmptyState then falls back to icons). */
export function illustrationsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ILLUSTRATIONS_ENABLED !== 'false';
}
