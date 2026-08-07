import { expect, test } from '@playwright/test';

const FIRST_MATCH_TUTORIAL_STORAGE_KEY =
    'nardora-first-match-tutorial-v1';

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

async function openReadyStartScreen(page, { tutorialSeen = true } = {}) {
    if (tutorialSeen) {
        await page.addInitScript(storageKey => {
            localStorage.setItem(storageKey, 'seen');
        }, FIRST_MATCH_TUTORIAL_STORAGE_KEY);
    }

    await page.goto('/');
    await expect(page).toHaveTitle(/Nardora/);
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
}

async function readGameLayoutGeometry(page) {
    return page.evaluate(() => {
        const toRect = element => {
            const rect = element.getBoundingClientRect();
            return {
                id: element.id,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                right: rect.right,
                bottom: rect.bottom
            };
        };
        const panel = document.getElementById('panel-controls');
        const cards = Array.from(panel.children)
            .filter(element => getComputedStyle(element).display !== 'none')
            .map(toRect);
        const overlaps = [];

        for (let firstIndex = 0; firstIndex < cards.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < cards.length; secondIndex += 1) {
                const first = cards[firstIndex];
                const second = cards[secondIndex];
                const overlapWidth = Math.max(
                    0,
                    Math.min(first.right, second.right) - Math.max(first.x, second.x)
                );
                const overlapHeight = Math.max(
                    0,
                    Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y)
                );

                if (overlapWidth * overlapHeight > 1) {
                    overlaps.push(`${first.id}:${second.id}`);
                }
            }
        }

        return {
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            documentWidth: document.documentElement.scrollWidth,
            game: toRect(document.getElementById('game-container')),
            board: toRect(document.getElementById('board-wrapper')),
            info: toRect(document.getElementById('info-panel')),
            turn: toRect(document.getElementById('turn-indicator')),
            panel: toRect(panel),
            autoBearOff: toRect(document.getElementById('auto-bearoff-container')),
            autoBearOffHelp: toRect(document.querySelector('#auto-bearoff-help summary')),
            displayControls: toRect(document.getElementById('fullscreen-container')),
            cards,
            overlaps
        };
    });
}

function expectContained(inner, outer, tolerance = 1) {
    expect(inner.x).toBeGreaterThanOrEqual(outer.x - tolerance);
    expect(inner.y).toBeGreaterThanOrEqual(outer.y - tolerance);
    expect(inner.right).toBeLessThanOrEqual(outer.right + tolerance);
    expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + tolerance);
}

async function clickCanvasSlot(page, slotId) {
    const canvas = page.locator('#game-canvas');
    const themeId = await page.locator('#theme-select').inputValue();
    const columnIndex = slotId <= 12
        ? 12 - slotId
        : slotId - 13;
    let logicalX;

    if (themeId === 'anatolian') {
        const field = columnIndex < 6
            ? { x: 43, width: 331 }
            : { x: 423, width: 331 };
        logicalX = field.x +
            ((columnIndex % 6) + 0.5) * (field.width / 6);
    } else {
        const slotWidth = 675 / 12;
        logicalX = 20 + (columnIndex + 0.5) * slotWidth;
        if (columnIndex >= 6) logicalX += 30;
    }

    const logicalY = slotId <= 12 ? 90 : 510;
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await canvas.click({
        position: {
            x: logicalX * (box.width / 800),
            y: logicalY * (box.height / 600)
        }
    });
}

test('first-match guide can be dismissed and reopened on keyboard and touch layouts', async ({
    page
}, testInfo) => {
    test.skip(
        !['desktop-chromium', 'iphone-16e-portrait'].includes(
            testInfo.project.name
        ),
        'Tutorial keyboard and touch behavior is covered on representative layouts.'
    );

    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page, { tutorialSeen: false });

    const modal = page.locator('#how-to-play-modal');
    const card = page.locator('#how-to-play-card');
    const howToPlayButton = page.locator('#how-to-play-button');
    const closeButton = page.locator('#guide-close-button');
    const isTouchProject =
        testInfo.project.name === 'iphone-16e-portrait';

    await expect(modal).toBeVisible();
    await expect(page.locator('#guide-page-counter')).toHaveText('1 / 6');

    const cardBox = await card.boundingBox();
    const viewport = page.viewportSize();
    expect(cardBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(cardBox.x).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height + 1);

    if (isTouchProject) {
        await closeButton.tap();
    } else {
        await expect(closeButton).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(howToPlayButton).toBeFocused();
    }
    await expect(modal).toBeHidden();

    await page.reload();
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
    await expect(modal).toBeHidden();

    if (isTouchProject) {
        await howToPlayButton.tap();
        await page.locator('#guide-next-button').tap();
    } else {
        await howToPlayButton.click();
        await page.locator('#guide-next-button').click();
    }

    await expect(modal).toBeVisible();
    await expect(page.locator('#guide-page-counter')).toHaveText('2 / 6');
    await page.locator('#guide-close-footer-button').click();
    await expect(modal).toBeHidden();

    const horizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - window.innerWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    expect(runtimeErrors).toEqual([]);
});

test('start flow, language synchronization, and canvas readiness', async ({
    page
}) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const startTitle = page.locator('#start-screen h2');
    const startLanguage = page.locator('#start-language-select');
    const sideLanguage = page.locator('#language-select');
    const startDifficulty = page.locator('#start-bot-difficulty');
    const startTurnTimer = page.locator('#start-turn-timer');
    const sideDifficulty = page.locator('#bot-difficulty');
    const whiteCheckerColor = page.locator('input[name="checker-color"][value="white"]');
    const blackCheckerColor = page.locator('input[name="checker-color"][value="black"]');
    const friendMatch = page.locator('#friend-match-button');
    const onlineMatch = page.locator('#online-match-button');

    await expect(startTitle).toHaveText('Welcome to Nardora');
    await expect(page.locator('#start-button')).toContainText('Quick Play');
    await expect(page.locator('#bot-match-button')).toContainText('Bot Match');
    await page.locator('#bot-match-button').hover();
    const hoverPresentation = await page.evaluate(() => {
        const action = document.getElementById('bot-match-button');
        const card = action?.closest('.start-mode-card-bot');
        return {
            actionOutline: action
                ? getComputedStyle(action).outlineStyle
                : null,
            cardOutline: card
                ? getComputedStyle(card).outlineStyle
                : null
        };
    });
    expect(hoverPresentation.actionOutline).toBe('none');
    expect(hoverPresentation.cardOutline).toBe('solid');
    await expect(friendMatch).toBeDisabled();
    await expect(friendMatch).toHaveAttribute('aria-disabled', 'true');
    await expect(onlineMatch).toBeDisabled();
    await expect(onlineMatch).toHaveAttribute('aria-disabled', 'true');
    await expect(whiteCheckerColor).toBeChecked();
    await expect(blackCheckerColor).not.toBeChecked();

    await startLanguage.selectOption('ru');
    await expect(startTitle).toHaveText('Добро пожаловать в Nardora');
    await expect(sideLanguage).toHaveValue('ru');

    await startLanguage.selectOption('en');
    await startDifficulty.selectOption('champion');
    await expect(startTurnTimer).toHaveValue('30');
    await startTurnTimer.selectOption('0');
    await expect(page.locator('#timer-countdown')).toHaveText('Off');
    await expect(page.locator('#timer-container')).toHaveClass(/is-disabled/);
    await startTurnTimer.selectOption('60');
    expect(await page.evaluate(() =>
        localStorage.getItem('nardora.turnTimerSeconds.v1')
    )).toBe('60');
    await expect(sideDifficulty).toHaveValue('champion');
    await page.locator('.checker-color-option', {
        has: blackCheckerColor
    }).click();
    await expect(blackCheckerColor).toBeChecked();
    expect(await page.evaluate(() =>
        localStorage.getItem('nardora.checkerColor.v1')
    )).toBe('black');
    await page.locator('#bot-match-button').click();
    await expect(page.locator('#timer-countdown')).toContainText('60 s');

    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#turn-indicator')).toHaveAttribute(
        'data-active-player',
        'black'
    );
    await expect(page.locator('#current-player')).toHaveText('Black');
    await expect(page.locator('#fullscreen-toggle')).toHaveAttribute(
        'aria-pressed',
        'false'
    );
    await expect(page.locator('#fullscreen-toggle-label')).toHaveText(
        'Enter Fullscreen'
    );

    const pointNumbersToggle = page.locator('#point-numbers-toggle');
    await expect(pointNumbersToggle).toHaveAttribute('aria-pressed', 'false');
    await pointNumbersToggle.click();
    await expect(pointNumbersToggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() =>
        localStorage.getItem('narde-point-numbers')
    )).toBe('visible');

    await page.locator('#auto-bearoff-help summary').click();
    const autoBearOffContainer = page.locator('#auto-bearoff-container');
    const autoBearOffHint = page.locator('#auto-bearoff-hint');
    await expect(autoBearOffHint).toBeVisible();

    const fullscreenToggle = page.locator('#fullscreen-toggle');
    const [containerBox, hintBox, fullscreenBox] = await Promise.all([
        autoBearOffContainer.boundingBox(),
        autoBearOffHint.boundingBox(),
        fullscreenToggle.boundingBox()
    ]);
    expect(containerBox).not.toBeNull();
    expect(hintBox).not.toBeNull();
    expect(fullscreenBox).not.toBeNull();
    expect(hintBox.x).toBeGreaterThanOrEqual(containerBox.x - 1);
    expect(hintBox.x + hintBox.width).toBeLessThanOrEqual(
        containerBox.x + containerBox.width + 1
    );
    expect(hintBox.y).toBeGreaterThanOrEqual(containerBox.y - 1);
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(
        containerBox.y + containerBox.height + 1
    );
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(
        fullscreenBox.y + 1
    );
    await expect(page.locator('#die1')).not.toHaveText('-');
    await expect(page.locator('#die2')).not.toHaveText('-');
    expect(runtimeErrors).toEqual([]);
});

test('unfinished local match is offered and resumes after refresh', async ({
    page
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'desktop-chromium',
        'The persistence journey is covered once; storage validation is unit tested.'
    );

    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const continueButton = page.locator('#continue-match-button');
    await expect(continueButton).toBeHidden();
    const blackCheckerColor = page.locator(
        'input[name="checker-color"][value="black"]'
    );
    await page.locator('.checker-color-option', {
        has: blackCheckerColor
    }).click();
    await page.locator('#start-button').click();
    await expect(page.locator('#start-screen')).toBeHidden();

    await expect.poll(() => page.evaluate(() =>
        localStorage.getItem('nardora.ongoingMatch.v1')
    )).not.toBeNull();

    await page.reload();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toContainText('Continue Match');
    await expect(
        page.locator('input[name="checker-color"][value="black"]')
    ).toBeChecked();

    await continueButton.click();
    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
        localStorage.getItem('nardora.ongoingMatch.v1')
    )).not.toBeNull();
    expect(runtimeErrors).toEqual([]);
});

test('auto confirm keeps Undo available and manual Confirm wins the grace race', async ({
    page
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'desktop-chromium',
        'The rule-safe grace journey is covered once; the controller is unit tested.'
    );

    const runtimeErrors = captureRuntimeErrors(page);
    await page.addInitScript(() => {
        Math.random = () => 0.42;
        localStorage.setItem('nardora.autoTurnConfirm.v1', 'true');
    });
    await openReadyStartScreen(page);
    await expect(page.locator('#auto-turn-confirm-toggle')).toBeChecked();
    await page.locator('#start-button').click();
    await expect(page.locator('#status-message')).toHaveText(
        'Dice: 3, 3. Make your move.'
    );

    await clickCanvasSlot(page, 1);
    await clickCanvasSlot(page, 10);
    await expect(page.locator('#action-buttons')).toHaveClass(/is-visible/);
    await clickCanvasSlot(page, 1);
    await clickCanvasSlot(page, 4);

    const undo = page.locator('#undo-button');
    const confirm = page.locator('#confirm-button');
    await expect(confirm).toHaveClass(/is-auto-confirm-pending/);
    await expect(confirm).toHaveAttribute(
        'data-auto-confirm-pending',
        'true'
    );
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(page.locator('#status-message')).toHaveText(
        'The last move was undone.'
    );
    await expect(confirm).not.toHaveClass(/is-auto-confirm-pending/);
    await page.waitForTimeout(2_200);
    await expect(page.locator('#turn-indicator')).toHaveAttribute(
        'data-active-player',
        'white'
    );

    await clickCanvasSlot(page, 1);
    await clickCanvasSlot(page, 4);
    await expect(confirm).toHaveClass(/is-auto-confirm-pending/);
    await confirm.click();
    await expect(confirm).not.toHaveClass(/is-auto-confirm-pending/);
    await expect(page.locator('#turn-indicator')).toHaveAttribute(
        'data-active-player',
        'black'
    );
    expect(await page.evaluate(() => {
        const snapshot = JSON.parse(
            localStorage.getItem('nardora.ongoingMatch.v1')
        );
        return snapshot.autoTurnConfirmEnabled;
    })).toBe(true);
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
    await page.locator('#profile-display-name').fill('Metin Usta');
    await page.locator('[data-avatar-id="avatar-eagle"]').click();
    await page.locator('#profile-save-button').click();
    await expect(page.locator('#profile-preview-name')).toHaveText('Metin Usta');
    await expect(page.locator('#profile-preview-avatar')).toHaveText('🦅');
    await expect(page.locator('[data-avatar-id="avatar-eagle"]')).toHaveAttribute(
        'aria-pressed',
        'true'
    );
    await page.locator('#stats-close-button').click();
    await expect(page.locator('#player-stats-modal')).toBeHidden();

    await page.locator('#helper-mascot-toggle').click();
    await expect(page.locator('#helper-mascot-panel')).toBeVisible();
    await expect(page.locator('#helper-mascot-bug-link')).toHaveAttribute(
        'href',
        /bug_report\.yml/
    );
    await page.locator('#helper-mascot-feedback-button').click();
    await expect(page.locator('#helper-mascot-panel')).toBeHidden();
    await expect(page.locator('#feedback-modal')).toBeVisible();
    await expect(page.locator('#feedback-bug-link')).toHaveAttribute(
        'href',
        /bug_report\.yml/
    );
    await page.locator('#feedback-close-button').click();
    await expect(page.locator('#feedback-modal')).toBeHidden();

    await page.locator('#helper-mascot-toggle').click();
    await page.locator('#helper-mascot-guide-button').click();
    await expect(page.locator('#how-to-play-modal')).toBeVisible();
    await expect(page.locator('#helper-mascot-panel')).toBeHidden();
    await page.locator('#guide-close-button').click();

    await page.reload();
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
    await page.locator('#player-stats-button').click();
    await expect(page.locator('#profile-display-name')).toHaveValue('Metin Usta');
    await expect(page.locator('[data-avatar-id="avatar-eagle"]')).toHaveAttribute(
        'aria-pressed',
        'true'
    );
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#profile-reset-button').click();
    await expect(page.locator('#profile-display-name')).toHaveValue('Nardora Player');
    await page.locator('#stats-close-button').click();

    await expect(startScreen).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test('visual theme gallery selects, persists, localizes, and stays inside the viewport', async ({
    page
}) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const modal = page.locator('#theme-manager-modal');
    const card = page.locator('#theme-manager-card');
    const anatolian = page.locator('[data-theme-option="anatolian"]');
    const walnut = page.locator('[data-theme-option="walnut"]');

    await page.locator('#start-theme-manager-button').click();
    await expect(modal).toBeVisible();
    await expect(anatolian).toHaveAttribute('aria-pressed', 'true');
    await expect(anatolian).toBeFocused();

    await walnut.click();
    await expect(walnut).toHaveAttribute('aria-pressed', 'true');
    await expect(anatolian).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#theme-select')).toHaveValue('walnut');
    await expect(page.locator('html')).toHaveAttribute(
        'data-nardora-theme',
        'walnut'
    );
    expect(await page.evaluate(() => localStorage.getItem('narde-theme')))
        .toBe('walnut');

    const cardBox = await card.boundingBox();
    const viewport = page.viewportSize();
    expect(cardBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(cardBox.x).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height + 1);

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.locator('#start-theme-manager-button')).toBeFocused();

    await page.reload();
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#nardora-splash')).toHaveCount(0, {
        timeout: 7_000
    });
    await page.locator('#start-language-select').selectOption('ru');
    await page.locator('#start-theme-manager-button').click();
    await expect(page.locator('#theme-manager-title')).toHaveText('Выберите тему');
    await expect(walnut).toHaveAttribute('aria-pressed', 'true');

    const horizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - window.innerWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    expect(runtimeErrors).toEqual([]);
});

test('local friend preview completes the same-device lifecycle honestly', async ({
    page
}, testInfo) => {
    test.skip(
        !['desktop-chromium', 'iphone-16e-portrait'].includes(testInfo.project.name),
        'The local friend preview is covered on desktop and portrait touch layouts.'
    );

    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    await expect(page.locator('#friend-match-button')).toBeDisabled();
    await page.locator('#friend-preview-button').click();

    const modal = page.locator('#friend-preview-modal');
    const stageTitle = page.locator('#friend-preview-stage-title');
    const nextButton = page.locator('#friend-preview-next-button');

    await expect(modal).toBeVisible();
    await expect(page.locator('#friend-preview-disclosure')).toContainText(
        'This is not a real online match.'
    );
    await expect(stageTitle).toHaveText('Ready to create a local table');

    const stages = [
        'Local table created',
        'Local invite ready',
        'Simulated friend joined',
        'Host is ready',
        'Both players are ready',
        'Local table preview active',
        'Simulated friend disconnected',
        'Simulated friend resumed',
        'Simulated friend left the table',
        'Local table closed'
    ];

    for (const stage of stages) {
        await nextButton.click();
        await expect(stageTitle).toHaveText(stage);
    }

    await expect(page.locator('#friend-preview-revision')).toHaveText('10');
    await expect(page.locator('#friend-preview-room-status')).toHaveText('Closed');
    await expect(page.locator('#friend-preview-friend-status')).toHaveText('Left');

    await page.locator('#friend-preview-close-footer-button').click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#start-screen')).toBeVisible();
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

test('fullscreen control falls back to focus mode and exits cleanly', async ({
    page
}) => {
    await page.addInitScript(() => {
        const disableApi = (prototype, property) => {
            try {
                Object.defineProperty(prototype, property, {
                    configurable: true,
                    value: undefined
                });
            } catch {
                // The target browser already exposes no configurable API.
            }
        };

        disableApi(Element.prototype, 'requestFullscreen');
        disableApi(Element.prototype, 'webkitRequestFullscreen');
        disableApi(Document.prototype, 'exitFullscreen');
        disableApi(Document.prototype, 'webkitExitFullscreen');
    });

    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);
    await page.locator('#start-button').click();
    await expect(page.locator('#start-screen')).toBeHidden();

    const root = page.locator('#game-container');
    const toggle = page.locator('#fullscreen-toggle');

    await expect(page.locator('#game-container > #start-screen')).toHaveCount(1);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(root).toHaveClass(/is-focus-mode-root/);
    await expect(page.locator('body')).toHaveClass(/is-game-focus-mode/);

    await page.evaluate(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true
        }));
    });

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(root).not.toHaveClass(/is-focus-mode-root/);
    await expect(page.locator('body')).not.toHaveClass(/is-game-focus-mode/);
    expect(runtimeErrors).toEqual([]);
});

test('portrait orientation notice responds to viewport rotation', async ({
    page
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'iphone-16e-portrait',
        'Orientation transition is covered by the portrait touch project.'
    );

    const runtimeErrors = captureRuntimeErrors(page);
    await openReadyStartScreen(page);

    const portraitViewport = page.viewportSize();
    expect(portraitViewport).not.toBeNull();
    expect(portraitViewport.width).toBeLessThan(portraitViewport.height);
    await expect(page.locator('#rotate-notice')).toBeHidden();

    await page.locator('#start-button').click();
    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#rotate-notice')).toBeVisible();

    await page.setViewportSize({
        width: portraitViewport.height,
        height: portraitViewport.width
    });
    await expect(page.locator('#rotate-notice')).toBeHidden();

    const landscapeOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - window.innerWidth
    );
    expect(landscapeOverflow).toBeLessThanOrEqual(1);

    await page.setViewportSize(portraitViewport);
    await expect(page.locator('#rotate-notice')).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test('compact iPhone Safari layouts keep game controls separated', async ({
    page
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'iphone-16e-portrait',
        'Compact physical-iPhone geometry is covered by the touch WebKit project.'
    );

    const runtimeErrors = captureRuntimeErrors(page);
    await page.setViewportSize({ width: 355, height: 710 });
    await openReadyStartScreen(page);
    await page.locator('#start-button').click();
    await expect(page.locator('#start-screen')).toBeHidden();

    const portrait = await readGameLayoutGeometry(page);
    expect(portrait.documentWidth).toBeLessThanOrEqual(
        portrait.viewport.width + 1
    );
    expect(portrait.overlaps).toEqual([]);
    expect(portrait.turn.bottom).toBeLessThanOrEqual(portrait.panel.y + 1);
    expectContained(portrait.autoBearOffHelp, portrait.autoBearOff);
    expect(portrait.autoBearOff.bottom).toBeLessThanOrEqual(
        portrait.displayControls.y + 1
    );
    for (const card of portrait.cards) {
        expectContained(card, portrait.panel);
    }

    await page.setViewportSize({ width: 710, height: 355 });
    await expect(page.locator('#rotate-notice')).toBeHidden();

    const landscape = await readGameLayoutGeometry(page);
    expect(landscape.documentWidth).toBeLessThanOrEqual(
        landscape.viewport.width + 1
    );
    expect(landscape.game.width).toBeGreaterThanOrEqual(
        landscape.viewport.width * 0.94
    );
    expect(landscape.game.height).toBeLessThanOrEqual(
        landscape.viewport.height + 1
    );
    expect(landscape.board.right).toBeLessThanOrEqual(landscape.info.x + 1);
    expect(landscape.overlaps).toEqual([]);
    expect(landscape.turn.bottom).toBeLessThanOrEqual(landscape.panel.y + 1);
    expectContained(landscape.autoBearOffHelp, landscape.autoBearOff);
    for (const card of landscape.cards) {
        expectContained(card, landscape.panel);
    }
    expect(runtimeErrors).toEqual([]);
});
