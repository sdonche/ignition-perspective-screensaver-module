import { Page } from '@playwright/test';
import { clearAlarms, openGuarded, test, waitIdle } from './helpers';

// Regenerates the README's pictures. Not part of the suite: run it on purpose
// against the dev gateway:
//
//     SCREENSHOTS=1 npx playwright test screenshots
//
// Output lands in docs/images/. The GL modes are forced to high quality: on a
// GPU-less machine the auto governor would otherwise step them down.
const OUT = '../docs/images';
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to regenerate docs/images');
test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
test.setTimeout(150_000);

async function wake(page: Page) {
    await page.mouse.move(10, 10);
    await page.mouse.move(300, 300, { steps: 3 });
}

test('overview (awake)', async ({ page }) => {
    await openGuarded(page, 'pipes', 30);
    await clearAlarms(page);
    await page.mouse.move(1270, 710);
    await page.screenshot({ path: `${OUT}/overview.png` });
});

test('pipes', async ({ page }) => {
    await openGuarded(page, 'pipes', 5, 'High', 'high');
    await clearAlarms(page);
    await page.getByRole('button', { name: 'Line 1 fault' }).click();
    await waitIdle(page);
    await page.waitForTimeout(22_000);
    await page.screenshot({ path: `${OUT}/pipes.png` });
    await wake(page);
    await page.getByRole('button', { name: 'Line 1 running' }).click();
});

test('aurora', async ({ page }) => {
    await openGuarded(page, 'aurora', 5, 'High', 'high');
    await clearAlarms(page);
    await waitIdle(page);
    await page.waitForTimeout(8_000);
    await page.screenshot({ path: `${OUT}/aurora.png` });
});

test('halo', async ({ page }) => {
    await openGuarded(page, 'halo', 5, 'High', 'high');
    await clearAlarms(page);
    await page.getByRole('button', { name: 'Line 1 fault' }).click();
    await waitIdle(page);
    await page.waitForTimeout(8_000);
    await page.screenshot({ path: `${OUT}/halo.png` });
    await wake(page);
    await page.getByRole('button', { name: 'Line 1 running' }).click();
});

test('starfield', async ({ page }) => {
    await openGuarded(page, 'starfield', 5, 'High', 'high');
    await clearAlarms(page);
    await page.getByRole('button', { name: 'Rate 160' }).click();
    await waitIdle(page);
    await page.waitForTimeout(6_000);
    await page.screenshot({ path: `${OUT}/starfield.png` });
    await wake(page);
    await page.getByRole('button', { name: 'Rate 10' }).click();
});

test('pipes with a pinned alarm', async ({ page }) => {
    await openGuarded(page, 'pipes', 5, 'High', 'high');
    await clearAlarms(page);
    await page.getByRole('button', { name: /Medium alarm/ }).click();
    await waitIdle(page);
    await page.locator('.mustry-idle-banner').waitFor({ timeout: 12_000 });
    await page.waitForTimeout(8_000);
    await page.screenshot({ path: `${OUT}/pipes-banner.png` });
    await wake(page);
    await clearAlarms(page);
});

// The showpieces and the funny ones.
for (const [mode, waitMs] of [['synthwave', 6_000], ['lava', 10_000], ['tunnel', 6_000], ['flow', 12_000],
    ['ducks', 9_000], ['pong', 8_000], ['bounce', 6_000]] as const) {
    test(mode, async ({ page }) => {
        await openGuarded(page, mode, 5, 'High', 'high');
        await clearAlarms(page);
        await waitIdle(page);
        await page.waitForTimeout(waitMs);
        await page.screenshot({ path: `${OUT}/${mode}.png` });
    });
}
