import test from 'node:test';
import assert from 'node:assert/strict';

import {
    THEMES,
    getTheme,
    getThemeIds,
    isThemeId
} from '../engine/themes.js';

function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return [0, 2, 4].map(offset => Number.parseInt(
        value.slice(offset, offset + 2),
        16
    ));
}

function relativeLuminance(hex) {
    const channels = hexToRgb(hex).map(channel => {
        const normalized = channel / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * channels[0]) +
        (0.7152 * channels[1]) +
        (0.0722 * channels[2]);
}

function contrastRatio(first, second) {
    const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
    const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
    return (lighter + 0.05) / (darker + 0.05);
}

test('theme catalog exposes only supported stable identifiers', () => {
    assert.deepEqual(getThemeIds().sort(), ['anatolian', 'walnut']);
    assert.equal(isThemeId('anatolian'), true);
    assert.equal(isThemeId('walnut'), true);
    assert.equal(isThemeId('unknown'), false);
    assert.equal(getTheme('unknown').id, 'walnut');
});

test('each theme provides reusable board, checker, panel, focus, and accessibility tokens', () => {
    for (const theme of Object.values(THEMES)) {
        assert.ok(theme.board.length >= 2);
        assert.ok(theme.lightPoint.length >= 2);
        assert.ok(theme.darkPoint.length >= 2);
        assert.equal(theme.checkers.white.gradient.length, 3);
        assert.equal(theme.checkers.black.gradient.length, 3);
        assert.match(theme.interface.panel, /^#[0-9a-f]{6}$/i);
        assert.match(theme.interface.text, /^#[0-9a-f]{6}$/i);
        assert.match(theme.interaction.focus, /^#[0-9a-f]{6}$/i);
        assert.equal(Object.isFrozen(theme.checkers), true);
        assert.equal(Object.isFrozen(theme.interface), true);
        assert.equal(Object.isFrozen(theme.interaction), true);
    }
});

test('theme manager text, muted copy, focus, and checker identities meet contrast gates', () => {
    for (const theme of Object.values(THEMES)) {
        assert.ok(
            contrastRatio(theme.interface.text, theme.interface.panel) >= 7,
            `${theme.id} primary text should exceed enhanced contrast`
        );
        assert.ok(
            contrastRatio(theme.interface.mutedText, theme.interface.panel) >= 4.5,
            `${theme.id} muted text should remain readable`
        );
        assert.ok(
            contrastRatio(theme.interaction.focus, theme.interface.panel) >= 4.5,
            `${theme.id} focus ring should remain visible`
        );
        assert.ok(
            contrastRatio(
                theme.checkers.white.gradient[0],
                theme.checkers.black.gradient[2]
            ) >= 12,
            `${theme.id} checker identities should remain visually distinct`
        );
    }
});
