import { clearAlarms, expect, guardStatus, litShare, OVERLAY, openGuarded, test, tile, waitIdle } from './helpers';

// Every test runs in a fresh browser context (a fresh Perspective session).
// Alarms are gateway-wide, so the alarm tests clear them first and last.

test.describe('idle and wake', () => {
    test('idles after the timeout and wakes on mouse movement with the page intact', async ({ page }) => {
        await openGuarded(page, 'clock', 5);
        await page.getByRole('button', { name: 'Start pump' }).click();
        await expect(tile(page, 'presses')).toHaveText('1');
        await expect(page.locator(OVERLAY)).toHaveCount(0);

        const overlay = await waitIdle(page);
        await expect(overlay).toHaveAttribute('data-mode', 'clock');
        await expect(page.locator('.mustry-idle-clock__time')).toBeVisible();

        // Jitter below the threshold (8 px) does not wake it.
        await page.mouse.move(400, 400);
        await page.mouse.move(403, 402);
        await page.waitForTimeout(400);
        await expect(overlay).toBeVisible();

        await page.mouse.move(600, 500, { steps: 4 });
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        // Same page, same state: nothing reloaded underneath.
        await expect(tile(page, 'presses')).toHaveText('1');
        await expect(tile(page, 'screen')).toHaveText('awake');
        await expect(guardStatus(page)).toContainText('last wake: input');
    });

    test('a waking click never reaches the page underneath', async ({ page }) => {
        await openGuarded(page, 'clock', 5);
        const jog = page.locator('#jog');
        const box = await jog.boundingBox();
        expect(box).not.toBeNull();
        const x = box!.x + box!.width / 2;
        const y = box!.y + box!.height / 2;
        // Park the pointer on the control so the click below involves no movement.
        await page.mouse.move(x, y);
        await waitIdle(page);

        // Press on the overlay, release where the jog control sits underneath.
        await page.mouse.down();
        await page.waitForTimeout(120);
        await page.mouse.up();
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        await page.waitForTimeout(1000);
        await expect(page.locator('#jog-count')).toHaveText('releases: 0');

        // Once awake, the same gesture works.
        await page.mouse.down();
        await page.mouse.up();
        await expect(page.locator('#jog-count')).toHaveText('releases: 1');
        await page.getByRole('button', { name: 'Start pump' }).click();
        await expect(tile(page, 'presses')).toHaveText('1');
    });

    test('a waking key press wakes the page and is swallowed', async ({ page }) => {
        await openGuarded(page, 'blank', 5);
        await page.getByRole('button', { name: 'Start pump' }).focus();
        await waitIdle(page);
        // Enter on a focused button would press it: it must only wake the page.
        await page.keyboard.press('Enter');
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        await page.waitForTimeout(1000);
        await expect(tile(page, 'presses')).toHaveText('0');
    });
});

test.describe('touch', () => {
    test.use({ hasTouch: true });

    // Chromium already drops a tap whose touch target (the overlay) went away,
    // so this passes even without the guard's swallowing; it is here as a
    // regression check. The mouse test above is the one that proves the
    // swallowing (verified by mutation: it fails with swallowing disabled).

    test('a waking tap never reaches the page underneath', async ({ page }) => {
        await openGuarded(page, 'starfield', 5);
        const jog = await page.locator('#jog').boundingBox();
        const pump = await page.getByRole('button', { name: 'Start pump' }).boundingBox();
        await waitIdle(page);
        await page.touchscreen.tap(jog!.x + jog!.width / 2, jog!.y + jog!.height / 2);
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        await page.waitForTimeout(1000);
        await expect(page.locator('#jog-count')).toHaveText('releases: 0');

        // Idle again, then tap the button itself.
        await waitIdle(page);
        await page.touchscreen.tap(pump!.x + pump!.width / 2, pump!.y + pump!.height / 2);
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        await page.waitForTimeout(1000);
        await expect(tile(page, 'presses')).toHaveText('0');
    });
});

test.describe('alarms', () => {
    test.afterEach(async ({ page }) => {
        // Wake first if needed (the clear button is under the overlay otherwise).
        await page.mouse.move(10, 300);
        await page.mouse.move(300, 300, { steps: 3 });
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        await clearAlarms(page);
    });

    test('a High alarm wakes the page and keeps it awake', async ({ page }) => {
        await openGuarded(page, 'starfield', 5);
        await clearAlarms(page);
        await page.getByRole('button', { name: /High alarm/ }).click();
        const clickedAt = Date.now();
        await waitIdle(page);
        // Raised 8 s after the click; the feed polls every second.
        await expect(page.locator(OVERLAY)).toHaveCount(0, { timeout: 15_000 });
        const wokeAfter = Date.now() - clickedAt;
        expect(wokeAfter).toBeGreaterThan(7_500);
        expect(wokeAfter).toBeLessThan(8_000 + 3_000);
        await expect(guardStatus(page)).toContainText('last wake: alarm');
        // While it is active, the page does not idle again.
        await page.waitForTimeout(7_000);
        await expect(page.locator(OVERLAY)).toHaveCount(0);
    });

    test('a Medium alarm pins a banner over the idle mode without waking', async ({ page }) => {
        await openGuarded(page, 'pipes', 5);
        await clearAlarms(page);
        await page.getByRole('button', { name: /Medium alarm/ }).click();
        const overlay = await waitIdle(page);
        const banner = page.locator('.mustry-idle-banner');
        await expect(banner).toBeVisible({ timeout: 12_000 });
        await expect(banner).toContainText('1 active alarm');
        await expect(banner).toContainText('1 Medium');
        await expect(banner).toContainText('Line 1 glue temperature drifting');
        await expect(banner).toHaveClass(/mustry-idle-banner--medium/);
        await expect(overlay).toBeVisible();
    });

    test('a Critical alarm wakes the page even when wakePriority is Critical', async ({ page }) => {
        await openGuarded(page, 'clock', 5, 'Critical');
        await clearAlarms(page);
        await page.getByRole('button', { name: /High alarm/ }).click();
        await page.getByRole('button', { name: /Critical alarm/ }).click();
        await waitIdle(page);
        await expect(page.locator(OVERLAY)).toHaveCount(0, { timeout: 15_000 });
        await expect(guardStatus(page)).toContainText('last wake: alarm');
    });

    test('an active Critical alarm is never covered', async ({ page }) => {
        await openGuarded(page, 'clock', 5, 'Critical');
        await clearAlarms(page);
        await page.getByRole('button', { name: /Critical alarm/ }).click();
        // 8 s until it is raised: the page idles meanwhile, then wakes.
        await waitIdle(page);
        await expect(page.locator(OVERLAY)).toHaveCount(0, { timeout: 15_000 });
        // Twice the timeout with nobody touching it: still uncovered.
        await page.waitForTimeout(11_000);
        await expect(page.locator(OVERLAY)).toHaveCount(0);
    });
});

test.describe('fail open', () => {
    test('when the alarm feed goes quiet the guard removes itself and stays away', async ({ page }) => {
        let blockFeed = false;
        // Sit between the page and the gateway; drop only the feed's messages.
        await page.routeWebSocket(/.*/, (ws) => {
            const server = ws.connectToServer();
            ws.onMessage((m) => server.send(m));
            server.onMessage((m) => {
                if (blockFeed && typeof m === 'string' && m.includes('screensaver-alarms')) {
                    return;
                }
                ws.send(m);
            });
        });
        await openGuarded(page, 'starfield', 5);
        await waitIdle(page);
        blockFeed = true;
        // alarm.staleAfterSec defaults to 8.
        await expect(page.locator(OVERLAY)).toHaveCount(0, { timeout: 12_000 });
        await expect(guardStatus(page)).toContainText('last wake: feed-stale');
        await page.waitForTimeout(7_000);
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        // Feed back: it idles again.
        blockFeed = false;
        await waitIdle(page, 15_000);
    });
});

test.describe('modes', () => {
    // Each animated mode must run on WebGL2 (not the 2D fallback) and draw its bright features.
    // Share of bright pixels after 4 s on SwiftShader: pipes about 2.4 %, aurora 14 %, halo 4.6 %,
    // starfield 0.5 %. The same scenes with every line off (background only): pipes 0.00 %,
    // halo 0.29 %, aurora 0.13 %. The thresholds sit between the two.
    for (const [mode, minLit] of [['pipes', 0.01], ['aurora', 0.05], ['halo', 0.015], ['starfield', 0.002]] as const) {
        test(`${mode} renders with WebGL2`, async ({ page }) => {
            await openGuarded(page, mode, 5);
            await waitIdle(page);
            const canvas = page.locator('.mustry-idle-canvas');
            await expect(canvas).toHaveAttribute('data-renderer', 'webgl2');
            await page.waitForTimeout(4_000);
            expect(await litShare(page)).toBeGreaterThan(minLit);
        });
    }

    test('halo labels each line around the clock', async ({ page }) => {
        await openGuarded(page, 'halo', 5);
        await waitIdle(page);
        const labels = page.locator('.mustry-idle-halo__label');
        await expect(labels).toHaveCount(5);
        await expect(labels.first()).toContainText('Line 1');
        await expect(page.locator('.mustry-idle-halo__time')).toBeVisible();
    });

    test('external mode draws nothing but still reports idle', async ({ page }) => {
        await openGuarded(page, 'external', 5);
        await page.waitForTimeout(7_000);
        await expect(page.locator(OVERLAY)).toHaveCount(0);
        await expect(tile(page, 'screen')).toHaveText('idle');
        await page.mouse.move(100, 100);
        await page.mouse.move(400, 400, { steps: 3 });
        await expect(tile(page, 'screen')).toHaveText('awake');
    });
});
