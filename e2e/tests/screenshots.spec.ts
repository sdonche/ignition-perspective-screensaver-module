import { clearAlarms, openGuarded, test, waitIdle } from './helpers';

// Regenerates the README's pictures. Not part of the suite: run it on purpose
// against the dev gateway:
//
//     SCREENSHOTS=1 npx playwright test screenshots
//
// Output lands in docs/images/.
const OUT = '../docs/images';
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to regenerate docs/images');
test.use({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });

test('overview (awake)', async ({ page }) => {
    await openGuarded(page, 'pipes', 30);
    await clearAlarms(page);
    await page.mouse.move(1270, 750);
    await page.screenshot({ path: `${OUT}/overview.png` });
});

test('pipes', async ({ page }) => {
    await openGuarded(page, 'pipes', 5);
    await clearAlarms(page);
    await page.getByRole('button', { name: 'Line 1 fault' }).click();
    await waitIdle(page);
    await page.waitForTimeout(14_000);
    await page.screenshot({ path: `${OUT}/pipes.png` });
    await page.mouse.move(10, 10);
    await page.mouse.move(300, 300, { steps: 3 });
    await page.getByRole('button', { name: 'Line 1 running' }).click();
});

test('starfield', async ({ page }) => {
    await openGuarded(page, 'starfield', 5);
    await clearAlarms(page);
    await page.getByRole('button', { name: 'Rate 160' }).click();
    await waitIdle(page);
    await page.waitForTimeout(3_000);
    await page.screenshot({ path: `${OUT}/starfield.png` });
    await page.mouse.move(10, 10);
    await page.mouse.move(300, 300, { steps: 3 });
    await page.getByRole('button', { name: 'Rate 10' }).click();
});

test('clock with a pinned alarm', async ({ page }) => {
    await openGuarded(page, 'clock', 5);
    await clearAlarms(page);
    await page.getByRole('button', { name: /Medium alarm/ }).click();
    await waitIdle(page);
    await page.locator('.mustry-idle-banner').waitFor({ timeout: 12_000 });
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: `${OUT}/clock-banner.png` });
    await page.mouse.move(10, 10);
    await page.mouse.move(300, 300, { steps: 3 });
    await clearAlarms(page);
});
