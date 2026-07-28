import test from 'node:test';
import assert from 'node:assert/strict';

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

    clear() {
        this.store = {};
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

test('restores saved language from localStorage', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'ru' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'tr-TR',
        languages: ['tr-TR', 'en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.getLanguage(), 'ru');
    assert.equal(savedStorage.getItem('narde-language'), 'ru');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('ignores unsupported stored language and falls back to English', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'de' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'ru-RU',
        languages: ['ru-RU', 'en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.getLanguage(), 'en');
    assert.equal(savedStorage.getItem('narde-language'), null);

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('saves new valid language selection to localStorage', async () => {
    const savedStorage = new FakeStorage();
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(i18n.getLanguage(), 'tr');
    assert.equal(savedStorage.getItem('narde-language'), 'tr');

    i18n.setLanguage('de');
    assert.equal(i18n.getLanguage(), 'en');
    assert.equal(savedStorage.getItem('narde-language'), null);

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});
