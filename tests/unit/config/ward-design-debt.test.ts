// tests/unit/config/ward-design-debt.test.ts
// Sub-project 3's owned files may not drift back to ad-hoc design values or
// English mono styling. Comments are stripped before scanning.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const wardDir = 'src/components/maternity/ward';
const WARD_FILES = [
  'src/app/(hospital)/hospital-maternity-ward/page.tsx',
  'src/components/maternity/BedTileFull.tsx',
  'src/components/maternity/WardLayoutViewFull.tsx',
  'src/components/maternity/PatientDrawer.tsx',
  'src/components/maternity/BedMoveReasonModal.tsx',
  ...readdirSync(path.join(root, wardDir)).map((f) => `${wardDir}/${f}`),
];
const PATIENT_FILES: string[] = []; // Tasks 6 and 7 add their files here

const BANNED: Array<[string, RegExp]> = [
  ['hex literal', /#[0-9a-fA-F]{3,8}\b/],
  ['slate class', /\bslate-\d/],
  ['inline zoom', /\bzoom\s*:/],
  ['uppercase', /\buppercase\b/],
  ['font-mono', /\bfont-mono\b/],
];

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('sub-project 3 owned files use tokens only', () => {
  it.each([...WARD_FILES, ...PATIENT_FILES])('%s', (file) => {
    const src = stripComments(readFileSync(path.join(root, file), 'utf8'));
    expect(BANNED.filter(([, re]) => re.test(src)).map(([name]) => name)).toEqual([]);
  });
});

