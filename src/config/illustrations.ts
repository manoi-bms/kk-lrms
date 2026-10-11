// Static, pre-generated illustrations (scripts/illustrations/manifest.json).
// Gated: Qwen-Image-2.1 output may ship only after the license sign-off —
// until then NEXT_PUBLIC_ILLUSTRATIONS_ENABLED stays unset and EmptyState
// falls back to icons.
export type IllustrationName = 'ward' | 'referral' | 'stale' | 'generic';

export const ILLUSTRATION_SRC: Record<IllustrationName, string> = {
  ward: '/illustrations/empty-ward.webp',
  referral: '/illustrations/empty-referral.webp',
  stale: '/illustrations/state-stale.webp',
  generic: '/illustrations/generic.webp',
};

export function illustrationsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ILLUSTRATIONS_ENABLED === 'true';
}
