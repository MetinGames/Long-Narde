import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: isCI ? 2 : undefined,
    timeout: 30_000,
    outputDir: 'test-results',
    reporter: isCI
        ? [
            ['line'],
            ['html', { open: 'never' }]
        ]
        : 'list',
    expect: {
        timeout: 7_000
    },
    use: {
        baseURL,
        locale: 'en-US',
        reducedMotion: 'reduce',
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'desktop-firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'desktop-webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'iphone-16e-portrait',
            use: { ...devices['iPhone 16e'] }
        },
        {
            name: 'iphone-17-pro-max-landscape',
            use: { ...devices['iPhone 17 Pro Max landscape'] }
        }
    ],
    webServer: {
        command: 'python3 -m http.server 4173 --bind 127.0.0.1',
        url: baseURL,
        reuseExistingServer: !isCI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 15_000
    }
});
