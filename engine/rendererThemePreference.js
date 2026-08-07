import { getTheme } from './themes.js';

export const DEFAULT_THEME_ID = 'anatolian';

export function readStoredThemeId(storage = globalThis.localStorage) {
    if (!storage) return null;

    try {
        return storage.getItem('narde-theme');
    } catch {
        return null;
    }
}

export function persistThemeId(themeId, storage = globalThis.localStorage) {
    if (!storage) return;

    try {
        storage.setItem('narde-theme', themeId);
    } catch {
        // Theme still changes in memory/canvas even if persistence fails.
    }
}

export function resolveThemeId(themeId) {
    if (typeof themeId !== 'string' || themeId.length === 0) {
        return DEFAULT_THEME_ID;
    }

    const resolved = getTheme(themeId);
    return resolved.id === themeId
        ? themeId
        : DEFAULT_THEME_ID;
}
