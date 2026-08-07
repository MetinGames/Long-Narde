// engine/i18n.js

import { translations } from './translations.js';

const supportedLanguages = ['tr', 'en', 'ru'];
let currentLanguage = 'en';

// Test helper: allows key parity and fallback behavior checks.
export const __translations = translations;

function isSupportedLanguage(language) {
    return supportedLanguages.includes(language);
}

function getStoredLanguage() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('narde-language');
}

function detectBrowserLanguage() {
    if (typeof navigator === 'undefined') return 'en';

    const languageSource =
        navigator.language ||
        navigator.userLanguage ||
        (Array.isArray(navigator.languages) && navigator.languages[0]) ||
        'en';

    const normalized = String(languageSource)
        .slice(0, 2)
        .toLowerCase();

    return isSupportedLanguage(normalized) ? normalized : 'en';
}

export function initializeLanguage() {
    const savedLanguage = getStoredLanguage();

    if (savedLanguage !== null) {
        if (isSupportedLanguage(savedLanguage)) {
            currentLanguage = savedLanguage;
        } else {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('narde-language');
            }
            currentLanguage = 'en';
        }
    } else {
        currentLanguage = detectBrowserLanguage();
    }

    if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
    }

    return currentLanguage;
}

initializeLanguage();

export function getLanguage() {
    return currentLanguage;
}

export function setLanguage(language) {
    currentLanguage = isSupportedLanguage(language) ? language : 'en';

    if (typeof localStorage !== 'undefined') {
        if (isSupportedLanguage(language)) {
            localStorage.setItem('narde-language', currentLanguage);
        } else {
            localStorage.removeItem('narde-language');
        }
    }

    if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
    }
}

export function t(key, values = {}) {
    const dictionary =
        translations[currentLanguage] || translations.en;
    let text =
        dictionary[key] ??
        translations.en[key] ??
        key;

    for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
    }

    return text;
}

export function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll('[data-i18n-title]').forEach(element => {
        element.setAttribute('title', t(element.dataset.i18nTitle));
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });

    document.title = t('page.title');
}
