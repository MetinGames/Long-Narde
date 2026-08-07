import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_THEME_ID,
    persistThemeId,
    readStoredThemeId,
    resolveThemeId
} from '../engine/rendererThemePreference.js';

test('renderer theme preference keeps the existing default and validates ids', () => {
    assert.equal(DEFAULT_THEME_ID, 'anatolian');
    assert.equal(resolveThemeId('walnut'), 'walnut');
    assert.equal(resolveThemeId('unknown'), DEFAULT_THEME_ID);
    assert.equal(resolveThemeId(''), DEFAULT_THEME_ID);
});

test('renderer theme preference reads and writes injected storage', () => {
    const values = new Map();
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };

    persistThemeId('walnut', storage);
    assert.equal(readStoredThemeId(storage), 'walnut');
});

test('renderer theme preference fails safely when storage is unavailable', () => {
    const blockedStorage = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); }
    };

    assert.equal(readStoredThemeId(blockedStorage), null);
    assert.doesNotThrow(() => persistThemeId('walnut', blockedStorage));
});
