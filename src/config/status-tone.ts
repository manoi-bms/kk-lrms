// src/config/status-tone.ts
// One status-tone vocabulary → token classes. Replaces every ad-hoc
// `color-mix(in srgb, #hex …)` tint on the ward board and patient pages.
export type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral';

export const STATUS_TONE: Record<
  StatusTone,
  { tint: string; text: string; solid: string; border: string; accent: string }
> = {
  ok: { tint: 'bg-ok-tint', text: 'text-ok-text', solid: 'bg-ok', border: 'border-ok/40', accent: 'border-l-ok' },
  warn: { tint: 'bg-warn-tint', text: 'text-warn-text', solid: 'bg-warn', border: 'border-warn/40', accent: 'border-l-warn' },
  danger: {
    tint: 'bg-danger-tint',
    text: 'text-danger-text',
    solid: 'bg-danger',
    border: 'border-danger/40',
    accent: 'border-l-danger',
  },
  neutral: {
    tint: 'bg-surface-muted',
    text: 'text-ink-muted',
    solid: 'bg-ink-subtle',
    border: 'border-border',
    accent: 'border-l-ink-subtle',
  },
};
