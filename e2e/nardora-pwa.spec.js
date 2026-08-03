import { expect, test } from '@playwright/test';

test('installed app shell reloads offline and starts a local bot match', async ({
    context,
    page
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'desktop-chromium',
        'One Chromium project verifies browser-level PWA and offline behavior.'
    );

    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
        'href',
        './manifest.webmanifest'
    );

    const manifest = await page.evaluate(async () => {
        const response = await fetch('./manifest.webmanifest');
        return response.json();
    });
    expect(manifest.name).toBe('Nardora: Long Narde Game');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some(icon => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some(icon => icon.sizes === '512x512')).toBe(true);

    await expect.poll(() => page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        return Boolean(navigator.serviceWorker.controller);
    }), { timeout: 15_000 }).toBe(true);

    await context.setOffline(true);
    try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/Nardora/);
        await expect(page.locator('#start-screen')).toBeVisible();
        await expect(page.locator('#nardora-splash')).toHaveCount(0, {
            timeout: 7_000
        });

        await page.locator('#start-button').click();
        await expect(page.locator('#start-screen')).toBeHidden();
        await expect(page.locator('#game-canvas')).toBeVisible();
        await expect(page.locator('#die1')).not.toHaveText('-');
        await expect(page.locator('#die2')).not.toHaveText('-');
    } finally {
        await context.setOffline(false);
    }
});
