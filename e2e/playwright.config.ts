import { defineConfig } from '@playwright/test';

// Where the dev gateway is published. Matches GATEWAY_HTTP_PORT in ../.env
// (ops/e2e.sh exports E2E_BASE_URL from the same source of truth).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:9388';

export default defineConfig({
    testDir: './tests',
    // The alarm tests raise gateway-wide alarms: run serially.
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL,
        viewport: { width: 1280, height: 760 },
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        launchOptions: {
            // A pre-installed Chromium (e.g. a container without `playwright install`).
            executablePath: process.env.PW_CHROMIUM_PATH || undefined
        }
    },
});
