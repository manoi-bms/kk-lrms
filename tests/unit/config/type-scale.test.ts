import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TYPE_SCALE, MIN_TEXT_PX } from '@/config/design-tokens';

const css = readFileSync(path.resolve(__dirname, '../../../src/app/globals.css'), 'utf8');

describe('Thai type scale', () => {
  it.each(Object.entries(TYPE_SCALE))('%s is declared in @theme with size, line-height, weight', (name, t) => {
    expect(css).toContain(`--text-${name}: ${t.px}px;`);
    expect(css).toContain(`--text-${name}--line-height: ${t.lineHeight};`);
    expect(css).toContain(`--text-${name}--font-weight: ${t.weight};`);
  });

  it('nothing in the scale is below the 13px Thai legibility floor', () => {
    expect(MIN_TEXT_PX).toBe(13);
    for (const t of Object.values(TYPE_SCALE)) expect(t.px).toBeGreaterThanOrEqual(MIN_TEXT_PX);
  });

  it('body defaults to text-body; the 18px rem root is preserved', () => {
    expect(css).toMatch(/body\s*\{\s*@apply bg-background text-foreground text-body;/);
    expect(css).toMatch(/html\s*\{\s*font-size: 18px;/);
  });
});
