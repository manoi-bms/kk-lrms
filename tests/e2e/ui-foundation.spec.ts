// tests/e2e/ui-foundation.spec.ts
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { attachDebugLogging, flushDebugLog } from './helpers/debug-log';

const TAG = process.env.UI_SNAPSHOT_TAG ?? 'after';
// Only the PHI-free /login screenshots are committed (PUBLIC_OUT). Authenticated
// pages can show patient names / AN / CID, so they go to the gitignored
// e2e-private/ (not test-results/, which Playwright wipes every run) and must
// never be added to git.
const PUBLIC_OUT = 'docs/ui-foundation-screenshots';
const PRIVATE_OUT = 'e2e-private/ui-foundation';
const WIDTHS = [1440, 1024, 768] as const;
const AUTH_ROUTES = ['/', '/pregnancies', '/hospitals', '/referrals', '/outcomes', '/hospital-maternity-ward', '/profile'];
const SESSION = process.env.E2E_BMS_SESSION_ID;
// Dashboard screenshots can show masked names / AN — gitignored e2e-private only.
const DASH_OUT = 'e2e-private/ui-dashboard';

mkdirSync(PUBLIC_OUT, { recursive: true });
mkdirSync(PRIVATE_OUT, { recursive: true });
mkdirSync(DASH_OUT, { recursive: true });

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

  test('provincial dashboard: no overflow, KPI numbers on one line, one presence badge @dashboard', async ({ page }, testInfo) => {
    test.skip(!SESSION, 'requires E2E_BMS_SESSION_ID');
    const log = attachDebugLogging(page);
    await login(page, log);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      const dash = page
        .waitForResponse((r) => new URL(r.url()).pathname === '/api/dashboard', { timeout: 20_000 })
        .catch(() => null);
      await page.goto('/');
      const res = await dash;
      log.push(`/ @${w}: /api/dashboard ${res ? res.status() : 'no request'}`);
      await expect(page.getByRole('heading', { level: 1, name: 'ภาพรวมจังหวัดขอนแก่น' })).toBeVisible();
      const m = await page.evaluate(() => {
        const lines = (el: HTMLElement) =>
          Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
        const values = [...document.querySelectorAll<HTMLElement>('[data-kpi-value]')];
        const labels = [...document.querySelectorAll<HTMLElement>('[data-kpi-label]')];
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          kpis: values.length,
          wrappedValues: values.filter((el) => lines(el) > 1).map((el) => el.textContent?.trim()),
          overflowingValues: values.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent?.trim()),
          tallLabels: labels.filter((el) => lines(el) > 2).map((el) => el.textContent?.trim()),
          presenceBadges: document.querySelectorAll('[aria-label$="online users"]').length,
          twoColumns: getComputedStyle(document.querySelector('[data-testid="province-overview"]')!).position === 'sticky',
        };
      });
      log.push(`/ @${w}: ${JSON.stringify(m)}`);
      expect(m.scrollWidth, `/ @${w} scrolls horizontally`).toBeLessThanOrEqual(m.clientWidth);
      expect(m.kpis).toBeGreaterThan(10);
      expect(m.wrappedValues, `/ @${w} KPI numbers wrapped`).toEqual([]);
      expect(m.overflowingValues, `/ @${w} KPI numbers overflow their tile`).toEqual([]);
      expect(m.tallLabels, `/ @${w} KPI labels over two lines`).toEqual([]);
      expect(m.presenceBadges, `/ @${w} online-users badge count`).toBe(1);
      expect(m.twoColumns).toBe(w === 1440); // container ≥ 1160px only at 1440
      await page.screenshot({ path: `${DASH_OUT}/${TAG}-root-${w}.png`, fullPage: true });
    }

    // The sticky overview panel must stay below the sticky shell header.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('province-overview')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(200);
    const pos = await page.evaluate(() => ({
      headerBottom: document.querySelector('header.sticky')!.getBoundingClientRect().bottom,
      panelTop: document.querySelector('[data-testid="province-overview"]')!.getBoundingClientRect().top,
      scrollY: window.scrollY,
      headerVar: getComputedStyle(document.documentElement).getPropertyValue('--app-header-h'),
    }));
    log.push(`/ @1440 after scroll: ${JSON.stringify(pos)}`);
    expect(pos.scrollY).toBeGreaterThan(0);
    expect(pos.panelTop).toBeGreaterThanOrEqual(pos.headerBottom - 1);
    await page.screenshot({ path: `${DASH_OUT}/${TAG}-root-1440-scrolled.png` });
    await flushDebugLog(log, testInfo);
    expect(log.filter((l) => l.includes('PAGEERROR'))).toEqual([]);
  });

  test('kiosk button enters the frozen kiosk and hides the shell @dashboard', async ({ page }, testInfo) => {
    test.skip(!SESSION, 'requires E2E_BMS_SESSION_ID');
    const log = attachDebugLogging(page);
    await login(page, log);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.getByRole('button', { name: /โหมดจอภาพ/ }).click();
    await expect(page.getByText('PPHO WAR-ROOM')).toBeVisible();
    await expect(page.locator('header.sticky')).toBeHidden();
    await expect(page.locator('aside').first()).toBeHidden();
    log.push('kiosk via button: war-room footer visible, shell hidden');
    await page.screenshot({ path: `${DASH_OUT}/${TAG}-kiosk-1920.png` });
    await page.getByRole('button', { name: 'Exit kiosk mode' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ภาพรวมจังหวัดขอนแก่น' })).toBeVisible();
    log.push('kiosk exit: page heading back');
    await flushDebugLog(log, testInfo);
    expect(log.filter((l) => l.includes('PAGEERROR'))).toEqual([]);
  });
});
