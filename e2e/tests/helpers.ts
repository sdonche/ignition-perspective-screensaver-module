import { test as base, expect, Locator, Page } from '@playwright/test';
import { PNG } from 'pngjs';

/** Session-relative route of the committed "verify" Perspective project. */
const SESSION = '/data/perspective/client/verify';

/** The idle overlay the guard portals onto document.body. */
export const OVERLAY = '.mustry-idle-overlay';

/**
 * Test fixture that fails a test on any uncaught page error or console.error
 * emitted by the session. The guard must run clean.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
    consoleErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
            page.on('console', (msg) => {
                if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
            });
            await use(errors);
            expect(errors, 'the session must not log errors').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };

/**
 * Open the Overview page with the guard configured from the URL
 * (/test/<mode>/<timeoutSec>[/<wakePriority>]) and wait until the session is
 * connected and the guard is in its dock. Detects the Perspective
 * trial-expired screen and fails with instructions.
 */
export async function openGuarded(page: Page, mode: string, timeoutSec: number, wake?: string, quality?: string): Promise<void> {
    const route = `/test/${mode}/${timeoutSec}${wake || quality ? `/${wake || 'High'}` : ''}${quality ? `/${quality}` : ''}`;
    await page.goto(`${SESSION}${route}`);
    const heading = page.getByText('Packaging hall · overview');
    const trial = page.getByText('Trial Expired');
    await expect(heading.or(trial).first()).toBeVisible({ timeout: 30_000 });
    if (await trial.isVisible().catch(() => false)) {
        throw new Error('Perspective trial expired: run ops/fresh.sh --no-build for a fresh 2h trial, then re-run.');
    }
    await expect(page.locator('.mustry-idle-guard')).toHaveCount(1);
    await expect(page.locator('.connection-banner.banner-active')).toHaveCount(0, { timeout: 30_000 });
    // The header shows the bound config once session.custom.guard is set.
    await expect(page.getByText(`Idle Guard: ${mode} after ${timeoutSec} s`)).toBeVisible();
}

/** The value label of one Overview tile (meta.domId "tile-<name>"). */
export function tile(page: Page, name: 'presses' | 'screen' | 'rate' | 'state'): Locator {
    return page.locator(`#tile-${name}`);
}

/** The header's status line (meta.domId "guard-status"): mode, timeout and the last wake cause. */
export function guardStatus(page: Page): Locator {
    return page.locator('#guard-status');
}

/** Wait until the overlay is up. */
export async function waitIdle(page: Page, timeoutMs = 15_000): Promise<Locator> {
    const overlay = page.locator(OVERLAY);
    await expect(overlay).toBeVisible({ timeout: timeoutMs });
    return overlay;
}

/** Clear every demo alarm (a button click: it is input, so call it before waiting for idle). */
export async function clearAlarms(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Clear all alarms' }).click();
}

/**
 * Share of sampled screen pixels brighter than `threshold` (sum of R+G+B),
 * from a screenshot with the overlay's text hidden, so only the canvas counts.
 */
export async function litShare(page: Page, threshold = 300): Promise<number> {
    const style = await page.addStyleTag({ content: '.mustry-idle-overlay > :not(canvas) { visibility: hidden !important; }' });
    const shot = await page.screenshot();
    await style.evaluate((el) => el.remove());
    const png = PNG.sync.read(shot);
    let lit = 0;
    let seen = 0;
    for (let y = 0; y < png.height; y += 6) {
        for (let x = 0; x < png.width; x += 6) {
            const i = (y * png.width + x) * 4;
            seen++;
            if (png.data[i] + png.data[i + 1] + png.data[i + 2] > threshold) {
                lit++;
            }
        }
    }
    return lit / seen;
}
