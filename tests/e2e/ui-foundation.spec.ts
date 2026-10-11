// tests/e2e/ui-foundation.spec.ts
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { attachDebugLogging, flushDebugLog } from './helpers/debug-log';

const TAG = process.env.UI_SNAPSHOT_TAG ?? 'after';
// Only the PHI-free /login screenshots are committed (PUBLIC_OUT). Authenticated
// pages can show patient names / AN / CID, so they go to the gitignored
// PRIVATE_OUT and must never be added to git.
const PUBLIC_OUT = 'docs/ui-foundation-screenshots';
const PRIVATE_OUT = 'test-results/ui-foundation';
const WIDTHS = [1440, 1024, 768] as const;
const AUTH_ROUTES = ['/', '/pregnancies', '/hospitals', '/referrals', '/outcomes', '/hospital-maternity-ward', '/profile'];
const SESSION = process.env.E2E_BMS_SESSION_ID;

mkdirSync(PUBLIC_OUT, { recursive: true });
mkdirSync(PRIVATE_OUT, { recursive: true });

async function login(page: Page, log: string[]) {
  await page.goto('/login');
  await page.fill('input#sessionId', SESSION!);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  log.push(`logged in → ${new URL(page.url()).pathname}`);
}

test.describe('UI foundation', () => {
  test('login page renders in Sarabun with no page errors @snapshot', async ({ page }, testInfo) => {
    const log = attachDebugLogging(page);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/login');
      await expect(page.locator('input#sessionId')).toBeVisible();
      const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
      log.push(`body font-family @${w}: ${font}`);
      expect(font.toLowerCase()).toContain('sarabun');
      await page.screenshot({ path: `${PUBLIC_OUT}/${TAG}-login-${w}.png`, fullPage: true });
    }
    await flushDebugLog(log, testInfo);
    expect(log.filter((l) => l.includes('PAGEERROR'))).toEqual([]);
  });

  test('authenticated shell, strip and routes @snapshot', async ({ page }, testInfo) => {
    test.skip(!SESSION, 'set E2E_BMS_SESSION_ID to run authenticated E2E (see tests/e2e/dashboard.spec.ts)');
    const log = attachDebugLogging(page);
    await login(page, log);
    for (const route of AUTH_ROUTES) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        const freshness = page
          .waitForResponse((r) => r.url().includes('/api/sync/freshness'), { timeout: 20_000 })
          .catch(() => null);
        await page.goto(route);
        const res = await freshness;
        log.push(`${route} @${w}: freshness ${res ? res.status() : 'no request'}`);
        await expect(page.locator('header.sticky')).toBeVisible();
        if (w >= 1024) await expect(page.locator('aside').first()).toBeVisible();
        else await expect(page.getByRole('button', { name: 'เปิดเมนู' })).toBeVisible();
        const tiny = await page.evaluate(
          () =>
            [...document.querySelectorAll('body *')]
              .filter((el) => (el as HTMLElement).innerText?.trim() && el.children.length === 0)
              // third-party map attribution (Leaflet) is not ours to restyle
              .filter((el) => !el.closest('.leaflet-container'))
              .map((el) => parseFloat(getComputedStyle(el).fontSize))
              .filter((px) => px < 13).length,
        );
        log.push(`${route} @${w}: leaf text elements under 13px = ${tiny}`);
        expect(tiny, `${route} @${w} has text under the 13px floor`).toBe(0);
        await page.screenshot({ path: `${PRIVATE_OUT}/${TAG}-${route.replaceAll('/', '_') || 'root'}-${w}.png`, fullPage: true });
      }
    }
    await flushDebugLog(log, testInfo);
    expect(log.filter((l) => l.includes('PAGEERROR'))).toEqual([]);
  });

  test('kiosk mode hides the shell', async ({ page }, testInfo) => {
    test.skip(!SESSION, 'requires E2E_BMS_SESSION_ID');
    const log = attachDebugLogging(page);
    await login(page, log);
    await page.goto('/');
    await page.evaluate(() => document.documentElement.classList.add('kiosk-mode'));
    await expect(page.locator('aside').first()).toBeHidden();
    await expect(page.locator('header.sticky')).toBeHidden();
    log.push('kiosk-mode: aside + header.sticky hidden');
    await flushDebugLog(log, testInfo);
  });
});
