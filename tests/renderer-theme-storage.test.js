import test from 'node:test';
import assert from 'node:assert/strict';

import { Renderer } from '../engine/renderer.js';

class FakeStorage {
    constructor(initial = {}, {
        throwOnGet = false,
        throwOnSet = false
    } = {}) {
        this.store = { ...initial };
        this.throwOnGet = throwOnGet;
        this.throwOnSet = throwOnSet;
    }

    getItem(key) {
        if (this.throwOnGet) {
            throw new Error('SecurityError');
        }

        return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
    }

    setItem(key, value) {
        if (this.throwOnSet) {
            throw new Error('QuotaExceededError');
        }

        this.store[key] = String(value);
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

function createElement() {
    return {
        classList: {
            toggle() {}
        },
        style: {},
        dataset: {},
        textContent: '',
        setAttribute() {}
    };
}

function createCanvasElement() {
    const element = createElement();
    element.getContext = () => ({
        setTransform() {},
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    return element;
}

function installMockDom() {
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;

    const map = {
        'game-canvas': createCanvasElement(),
        'turn-indicator': createElement(),
        'current-player': createElement(),
        die1: createElement(),
        die2: createElement(),
        'die-right-1': createElement(),
        'die-right-2': createElement(),
        'die-right-3': createElement(),
        'die-right-4': createElement(),
        'dice-display': createElement(),
        'status-message': createElement()
    };

    globalThis.document = {
        getElementById(id) {
            return map[id] || null;
        },
        createElement() {
            return createCanvasElement();
        }
    };

    globalThis.window = {
        devicePixelRatio: 1
    };

    return () => {
        globalThis.document = previousDocument;
        globalThis.window = previousWindow;
    };
}

test('localStorage undefined iken renderer varsayilan tema ile acilir', async () => {
    const restoreDom = installMockDom();
    const originalLocalStorage = defineGlobalProperty('localStorage', undefined);

    try {
        const renderer = new Renderer();
        await renderer.initialize();

        assert.equal(renderer.theme.id, 'anatolian');
    } finally {
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreDom();
    }
});

test('localStorage getItem hata firlatirsa renderer acilmaya devam eder', async () => {
    const restoreDom = installMockDom();
    const storage = new FakeStorage({}, { throwOnGet: true });
    const originalLocalStorage = defineGlobalProperty('localStorage', storage);

    try {
        const renderer = new Renderer();
        await renderer.initialize();

        assert.equal(renderer.theme.id, 'anatolian');
    } finally {
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreDom();
    }
});

test('localStorage setItem hata firlatirsa tema yine degisir', () => {
    const restoreDom = installMockDom();
    const storage = new FakeStorage({}, { throwOnSet: true });
    const originalLocalStorage = defineGlobalProperty('localStorage', storage);

    try {
        const renderer = new Renderer();
        renderer.setTheme('walnut');

        assert.equal(renderer.theme.id, 'walnut');
    } finally {
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreDom();
    }
});

test('gecerli kayitli tema yuklenir', async () => {
    const restoreDom = installMockDom();
    const storage = new FakeStorage({
        'narde-theme': 'walnut'
    });
    const originalLocalStorage = defineGlobalProperty('localStorage', storage);

    try {
        const renderer = new Renderer();
        await renderer.initialize();

        assert.equal(renderer.theme.id, 'walnut');
    } finally {
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreDom();
    }
});

test('gecersiz kayitli tema varsayilan temaya duser', async () => {
    const restoreDom = installMockDom();
    const storage = new FakeStorage({
        'narde-theme': 'invalid-theme'
    });
    const originalLocalStorage = defineGlobalProperty('localStorage', storage);

    try {
        const renderer = new Renderer();
        await renderer.initialize();

        assert.equal(renderer.theme.id, 'anatolian');
    } finally {
        restoreGlobalProperty('localStorage', originalLocalStorage);
        restoreDom();
    }
});
