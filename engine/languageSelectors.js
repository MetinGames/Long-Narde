// engine/languageSelectors.js

import {
    applyTranslations,
    getLanguage,
    setLanguage,
    t
} from './i18n.js';

export function setupLanguageSelectors({
    selectors = [],
    onLanguageApplied = () => {},
    onStatusChange = () => {},
    i18n = {
        applyTranslations,
        getLanguage,
        setLanguage,
        t
    }
} = {}) {
    const activeSelectors = selectors.filter(Boolean);

    function syncSelectorValues(language) {
        for (const selector of activeSelectors) {
            if (selector.value !== language) {
                selector.value = language;
            }
        }
    }

    function applyLanguageSelection(requestedLanguage, { announce = true } = {}) {
        i18n.setLanguage(requestedLanguage);
        const activeLanguage = i18n.getLanguage();

        syncSelectorValues(activeLanguage);
        i18n.applyTranslations();
        onLanguageApplied(activeLanguage);

        if (announce) {
            onStatusChange(i18n.t('status.languageChanged'), activeLanguage);
        }

        return activeLanguage;
    }

    const listeners = [];
    for (const selector of activeSelectors) {
        const handleChange = event => {
            const value = event?.target?.value;
            applyLanguageSelection(value, { announce: true });
        };

        selector.addEventListener?.('change', handleChange);
        listeners.push({ selector, handleChange });
    }

    syncSelectorValues(i18n.getLanguage());

    return {
        applyLanguageSelection,
        syncToCurrentLanguage() {
            const current = i18n.getLanguage();
            syncSelectorValues(current);
            return current;
        },
        dispose() {
            for (const { selector, handleChange } of listeners) {
                selector.removeEventListener?.('change', handleChange);
            }
        }
    };
}
