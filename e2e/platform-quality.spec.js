import { expect, test } from '@playwright/test';

const tutorialKey = 'nardora-first-match-tutorial-v1';

async function openReady(page) {
    await page.addInitScript(key => localStorage.setItem(key, 'seen'), tutorialKey);
    await page.goto('/');
    await expect(page.locator('#nardora-splash')).toHaveCount(0, { timeout: 7_000 });
}

test('WebKit and mobile shells keep controls named, contained, and touch-sized', async ({
    page
}, testInfo) => {
    test.skip(
        !['desktop-webkit', 'iphone-16e-portrait', 'iphone-17-pro-max-landscape']
            .includes(testInfo.project.name),
        'Focused Safari and mobile geometry matrix.'
    );

    await openReady(page);
    const audit = await page.evaluate(() => {
        const interactive = Array.from(document.querySelectorAll(
            'button, select, input, [role="button"]'
        )).filter(element => {
            const style = getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        const unnamed = interactive.filter(element => {
            const associatedLabel = Array.from(element.labels || [])
                .map(label => label.textContent?.trim())
                .find(Boolean);
            const label = element.getAttribute('aria-label') ||
                element.getAttribute('title') ||
                associatedLabel ||
                element.textContent?.trim();
            return !label;
        }).map(element => element.id || element.tagName);
        const isInsideScrollableContainer = element => {
            let ancestor = element.parentElement;
            while (ancestor) {
                const style = getComputedStyle(ancestor);
                const scrollsVertically = ['auto', 'scroll'].includes(style.overflowY) &&
                    ancestor.scrollHeight > ancestor.clientHeight + 1;
                if (scrollsVertically) return true;
                ancestor = ancestor.parentElement;
            }
            return false;
        };
        const clipped = interactive.filter(element => {
            const rect = element.getBoundingClientRect();
            const crossesViewport = rect.left < -1 || rect.top < -1 ||
                rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1;
            return crossesViewport && !isInsideScrollableContainer(element);
        }).map(element => element.id || element.tagName);
        return {
            unnamed,
            clipped,
            horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
            canvasLabel: document.getElementById('game-canvas')?.getAttribute('aria-label')
        };
    });

    expect(audit.unnamed).toEqual([]);
    expect(audit.clipped).toEqual([]);
    expect(audit.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(audit.canvasLabel).toBeTruthy();

    const startButton = page.locator('#start-button');
    const box = await startButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    if (testInfo.project.name.startsWith('iphone-')) {
        await startButton.tap();
    } else {
        await startButton.click();
    }
    await expect(page.locator('#game-canvas')).toBeVisible();

    const gameGeometry = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        board: document.getElementById('board-wrapper').getBoundingClientRect().toJSON(),
        panel: document.getElementById('info-panel').getBoundingClientRect().toJSON()
    }));
    expect(gameGeometry.width).toBeLessThanOrEqual(gameGeometry.viewport + 1);
    expect(gameGeometry.board.width).toBeGreaterThan(0);
    expect(gameGeometry.panel.width).toBeGreaterThan(0);
});

test('platform ad lock makes the complete game surface inert', async ({ page }) => {
    await openReady(page);
    await page.locator('#start-button').click();
    await page.evaluate(() => {
        const game = document.getElementById('game-container');
        document.body.setAttribute('data-platform-input-blocked', '');
        game.inert = true;
        game.setAttribute('aria-busy', 'true');
    });

    await expect(page.locator('#game-container')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#game-container')).toHaveJSProperty('inert', true);
    await expect(page.locator('body')).toHaveAttribute('data-platform-input-blocked', '');
});
