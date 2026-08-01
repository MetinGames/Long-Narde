import test from 'node:test';
import assert from 'node:assert/strict';

import {
    applyTranslations,
    getLanguage,
    initializeLanguage,
    setLanguage
} from '../engine/i18n.js';
import { setupLanguageSelectors } from '../engine/languageSelectors.js';

class FakeStorage {
    constructor(initial = {}) {
        this.store = { ...initial };
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }
}

class FakeElement {
    constructor({ i18nKey = null, ariaKey = null } = {}) {
        this.textContent = '';
        this.value = '';
        this.dataset = {};
        this.listeners = new Map();
        this.attributes = new Map();

        if (i18nKey) {
            this.dataset.i18n = i18nKey;
        }
        if (ariaKey) {
            this.dataset.i18nAriaLabel = ariaKey;
        }
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    dispatchChange(nextValue) {
        this.value = nextValue;
        const listener = this.listeners.get('change');
        if (listener) {
            listener({ target: this });
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) || null;
    }
}

class FakeDocument {
    constructor(elements = []) {
        this.documentElement = { lang: 'en' };
        this.title = '';
        this.elements = elements;
    }

    querySelectorAll(selector) {
        if (selector === '[data-i18n]') {
            return this.elements.filter(element => element.dataset.i18n);
        }
        if (selector === '[data-i18n-title]') {
            return this.elements.filter(element => element.dataset.i18nTitle);
        }
        if (selector === '[data-i18n-aria-label]') {
            return this.elements.filter(element => element.dataset.i18nAriaLabel);
        }
        return [];
    }
}

function defineGlobalProperty(key, value) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    const original = descriptor ? { ...descriptor } : null;

    Object.defineProperty(globalThis, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
    });

    return original;
}

function restoreGlobalProperty(key, original) {
    if (original === null) {
        delete globalThis[key];
    } else {
        Object.defineProperty(globalThis, key, original);
    }
}

test('start screen language select updates welcome texts immediately and syncs side selector', () => {
    const storage = new FakeStorage({ 'narde-language': 'tr' });
    const startTitle = new FakeElement({ i18nKey: 'ui.startTitle' });
    const startDescription = new FakeElement({ i18nKey: 'ui.startDescription' });
    const startButtonText = new FakeElement({ i18nKey: 'ui.startButton' });
    const howToPlayText = new FakeElement({ i18nKey: 'ui.howToPlayButton' });
    const statsText = new FakeElement({ i18nKey: 'ui.statsButton' });
    const sideSelect = new FakeElement({ ariaKey: 'ui.language' });
    const startSelect = new FakeElement({ ariaKey: 'ui.language' });
    const fakeDocument = new FakeDocument([
        startTitle,
        startDescription,
        startButtonText,
        howToPlayText,
        statsText,
        sideSelect,
        startSelect
    ]);

    const originalLocalStorage = defineGlobalProperty('localStorage', storage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'tr-TR',
        languages: ['tr-TR', 'en-US']
    });
    const originalDocument = defineGlobalProperty('document', fakeDocument);

    try {
        initializeLanguage();
        applyTranslations(fakeDocument);

        const controller = setupLanguageSelectors({
            selectors: [sideSelect, startSelect],
            onLanguageApplied: () => {
                // Language refresh should not trigger game runtime transitions.
            },
            onStatusChange: () => {}
        });

        startSelect.dispatchChange('en');

        assert.equal(getLanguage(), 'en');
        assert.equal(sideSelect.value, 'en');
        assert.equal(startSelect.value, 'en');
        assert.equal(startTitle.textContent, 'Welcome to Nardora');
        assert.equal(startDescription.textContent, 'The board is ready. Tap Start Game when you are ready.');
        assert.equal(startButtonText.textContent, 'Start Game');
        assert.equal(howToPlayText.textContent, 'How to Play?');
        assert.equal(statsText.textContent, 'Statistics');
        assert.equal(storage.getItem('narde-language'), 'en');

        controller.dispose();
    } finally {
        setLanguage('en');
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreGlobalProperty('navigator', originalNavigator);
        restoreGlobalProperty('document', originalDocument);
    }
});

test('language selectors stay synchronized both directions and keep saved language across initializeLanguage', () => {
    const storage = new FakeStorage({ 'narde-language': 'ru' });
    const sideSelect = new FakeElement({ ariaKey: 'ui.language' });
    const startSelect = new FakeElement({ ariaKey: 'ui.language' });
    const fakeDocument = new FakeDocument([sideSelect, startSelect]);

    const originalLocalStorage = defineGlobalProperty('localStorage', storage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });
    const originalDocument = defineGlobalProperty('document', fakeDocument);

    const gameStartCalls = 0;
    const timerStartCalls = 0;
    const deadlineStartCalls = 0;

    try {
        initializeLanguage();

        const controller = setupLanguageSelectors({
            selectors: [sideSelect, startSelect],
            onLanguageApplied: () => {},
            onStatusChange: () => {}
        });

        assert.equal(sideSelect.value, 'ru');
        assert.equal(startSelect.value, 'ru');

        sideSelect.dispatchChange('tr');
        assert.equal(getLanguage(), 'tr');
        assert.equal(startSelect.value, 'tr');
        assert.equal(storage.getItem('narde-language'), 'tr');

        const restored = initializeLanguage();
        assert.equal(restored, 'tr');
        assert.equal(getLanguage(), 'tr');

        controller.syncToCurrentLanguage();
        assert.equal(sideSelect.value, 'tr');
        assert.equal(startSelect.value, 'tr');

        // Selector changes must not bootstrap gameplay runtime.
        assert.equal(gameStartCalls, 0);
        assert.equal(timerStartCalls, 0);
        assert.equal(deadlineStartCalls, 0);

        controller.dispose();
    } finally {
        setLanguage('en');
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreGlobalProperty('navigator', originalNavigator);
        restoreGlobalProperty('document', originalDocument);
    }
});

