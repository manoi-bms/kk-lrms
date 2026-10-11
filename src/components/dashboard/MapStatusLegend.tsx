'use client';

import { COLOR, MIN_TEXT_PX } from '@/config/design-tokens';
import { mapLegendTheme } from '@/config/map-palette';
import { MAP_LEGEND, type HospitalStatusTone } from '@/config/hospital-status';

export function MapStatusLegend({ mode }: { mode: 'light' | 'kiosk' }) {
  const isKiosk = mode === 'kiosk';
  const theme = mapLegendTheme(mode);
  const { bg, ink, inkMuted, border } = theme;
  const legend = MAP_LEGEND[mode];
  const dot: Record<HospitalStatusTone, string> = {
    ok: COLOR.riskLow,
    warn: COLOR.riskMedium,
    danger: COLOR.riskHigh,
    neutral: theme.unknown,
  };
  const items = legend.items.map((it) => ({ ...it, color: dot[it.tone] }));
  return (
    <div
      className="absolute"
      style={{
        top: 8,
        left: 8,
        zIndex: 500,
        background: bg,
        color: ink,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding: '6px 8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        fontFamily: isKiosk
          ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
          : undefined,
        pointerEvents: 'none',
      }}
      aria-label={legend.ariaLabel}
    >
      <div
        style={{
          fontSize: isKiosk ? 9 : MIN_TEXT_PX,
          letterSpacing: isKiosk ? '0.14em' : undefined,
          color: inkMuted,
          marginBottom: 4,
        }}
      >
        {legend.heading}
      </div>
      <div className="flex flex-col gap-[2px]">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: it.color,
                border: `1.5px solid ${theme.pinBorder}`,
                boxShadow: '0 0 0 0.5px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: isKiosk ? 10 : MIN_TEXT_PX, fontWeight: 600 }}>
              {it.label}
            </span>
            <span style={{ fontSize: isKiosk ? 10 : MIN_TEXT_PX, color: inkMuted }}>
              ·&nbsp;{it.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
