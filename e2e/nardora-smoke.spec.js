import { expect, test } from '@playwright/test';

function captureRuntimeErrors(page) {
    const errors = [];
    const localOrigin = 'http://127.0.0.1:4173';

    page.on('pageerror', error => {
        errors.push(`pageerror: ${error.message}`);
    });

    page.on('response', response => {
        const url = response.url();
        if (
            url.startsWith(localOrigin) &&
            !url.endsWith('/favicon.ico') &&
            response.status() >= 400
        ) {
            errors.push(`response: ${response.status()} ${url}`);
        }
    });

    page.on('requestfailed', request => {
        if (request.url().startsWith(localOrigin)) {
            errors.push(
                `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`
            );
        }
    });

    return errors;
}

async function openReadyStartScreen(page) {
    await page.goto('/');
    await expect(page).toHaveTitle(/Nardora/);
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
}

test('start flow, language synchronization, and canvas readiness', async ({
    page
}) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const startTitle = page.locator('#start-screen h2');
    const startLanguage = page.locator('#start-language-select');
    const sideLanguage = page.locator('#language-select');

    await expect(startTitle).toHaveText('Welcome to Nardora');
    await startLanguage.selectOption('ru');
    await expect(startTitle).toHaveText('Добро пожаловать в Nardora');
    await expect(sideLanguage).toHaveValue('ru');

    await startLanguage.selectOption('en');
    await page.locator('#start-button').click();

    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#fullscreen-toggle')).toHaveAttribute(
        'aria-pressed',
        'false'
    );
    await expect(page.locator('#die1')).not.toHaveText('-');
    await expect(page.locator('#die2')).not.toHaveText('-');
    expect(runtimeErrors).toEqual([]);
});

test('start-screen dialogs open and close without starting a match', async ({
    page
}) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const startScreen = page.locator('#start-screen');

    await page.locator('#how-to-play-button').click();
    await expect(page.locator('#how-to-play-modal')).toBeVisible();
    await page.locator('#guide-close-button').click();
    await expect(page.locator('#how-to-play-modal')).toBeHidden();

    await page.locator('#player-stats-button').click();
    await expect(page.locator('#player-stats-modal')).toBeVisible();
    await page.locator('#stats-close-button').click();
    await expect(page.locator('#player-stats-modal')).toBeHidden();

    await page.locator('#feedback-button').click();
    await expect(page.locator('#feedback-modal')).toBeVisible();
    await expect(page.locator('#feedback-bug-link')).toHaveAttribute(
        'href',
        /bug_report\.yml/
    );
    await page.locator('#feedback-close-button').click();
    await expect(page.locator('#feedback-modal')).toBeHidden();

    await expect(startScreen).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test('responsive shell stays inside the viewport', async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const startBox = page.locator('#start-screen-box');
    const box = await startBox.boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

    const horizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - window.innerWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    expect(runtimeErrors).toEqual([]);
});
