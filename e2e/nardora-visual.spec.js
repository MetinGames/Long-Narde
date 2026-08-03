import { expect, test } from '@playwright/test';

async function openStableStartScreen(page) {
    await page.addInitScript(() => {
        Math.random = () => 0.42;
    });

    await page.goto('/');
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
}

test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
        testInfo.project.name !== 'desktop-chromium',
        'Visual baselines intentionally use one stable reference renderer.'
    );

    await openStableStartScreen(page);
});

test('start screen visual baseline', async ({ page }) => {
    await expect(page.locator('#start-screen-box')).toHaveScreenshot(
        'start-screen.png',
        {
            animations: 'disabled',
            caret: 'hide',
            scale: 'css'
        }
    );
});

test('game shell visual baseline', async ({ page }) => {
    await page.locator('#start-button').click();
    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#die1')).not.toHaveText('-');
    await expect(page.locator('#die2')).not.toHaveText('-');

    await expect(page.locator('#game-container')).toHaveScreenshot(
        'game-shell.png',
        {
            animations: 'disabled',
            caret: 'hide',
            mask: [
                page.locator('#timer-countdown'),
                page.locator('#die1'),
                page.locator('#die2')
            ],
            maskColor: '#27150f',
            scale: 'css'
        }
    );
});
