import test from 'node:test';
import assert from 'node:assert/strict';

import { createFullscreenController } from '../engine/fullscreenController.js';

function createClassList() {
    const values = new Set();
    return {
        add: (...tokens) => tokens.forEach(token => values.add(token)),
        remove: (...tokens) => tokens.forEach(token => values.delete(token)),
        toggle: (token, force) => {
            if (typeof force === 'boolean') {
                if (force) {
                    values.add(token);
                    return true;
                }
                values.delete(token);
                return false;
            }

            if (values.has(token)) {
                values.delete(token);
                return false;
            }

            values.add(token);
            return true;
        },
        contains: token => values.has(token)
    };
}

class FakeElement {
    constructor(id = '') {
        this.id = id;
        this.style = {
            setProperty(name, value) {
                this[name] = String(value);
            },
            removeProperty(name) {
                delete this[name];
            }
        };
        this.classList = createClassList();
        this.attributes = new Map();
        this.listeners = new Map();
        this.children = [];
        this.parentNode = null;
        this.textContent = '';
    }

    addEventListener(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(handler);
    }

    removeEventListener(type, handler) {
        this.listeners.get(type)?.delete(handler);
    }

    dispatchEvent(type, event = {}) {
        const handlers = this.listeners.get(type);
        if (!handlers) return;
        for (const handler of handlers) {
            handler(event);
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) || null;
    }

    appendChild(child) {
        if (child.parentNode) {
            child.parentNode.children = child.parentNode.children.filter(node => node !== child);
        }
        child.parentNode = this;
        this.children.push(child);
    }

    contains(candidate) {
        if (candidate === this) return true;
        for (const child of this.children) {
            if (child === candidate) return true;
            if (typeof child.contains === 'function' && child.contains(candidate)) {
                return true;
            }
        }
        return false;
    }
}

class FakeDocument {
    constructor() {
        this.fullscreenElement = null;
        this.webkitFullscreenElement = null;
        this.body = new FakeElement('body');
        this.documentElement = new FakeElement('html');
        this.listeners = new Map();
        this.elements = new Map();
    }

    addEventListener(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(handler);
    }

    removeEventListener(type, handler) {
        this.listeners.get(type)?.delete(handler);
    }

    dispatchEvent(type, event = {}) {
        const handlers = this.listeners.get(type);
        if (!handlers) return;
        for (const handler of handlers) {
            handler(event);
        }
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    registerElement(element) {
        this.elements.set(element.id, element);
    }
}

class FakeWindow {
    constructor() {
        this.innerWidth = 1400;
        this.innerHeight = 900;
        this.listeners = new Map();
    }

    addEventListener(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(handler);
    }

    removeEventListener(type, handler) {
        this.listeners.get(type)?.delete(handler);
    }

    dispatchEvent(type, event = {}) {
        const handlers = this.listeners.get(type);
        if (!handlers) return;
        for (const handler of handlers) {
            handler(event);
        }
    }
}

function setupHarness({
    withStandardApi = true,
    withWebkitApi = false,
    withNoApi = false,
    language = 'tr'
} = {}) {
    const documentRef = new FakeDocument();
    const windowRef = new FakeWindow();
    const root = new FakeElement('game-container');
    const button = new FakeElement('fullscreen-toggle');
    const icon = new FakeElement('fullscreen-toggle-icon');
    const label = new FakeElement('fullscreen-toggle-label');

    const rotateNotice = new FakeElement('rotate-notice');
    const startScreen = new FakeElement('start-screen');
    const feedbackModal = new FakeElement('feedback-modal');
    const guideModal = new FakeElement('how-to-play-modal');
    const statsModal = new FakeElement('player-stats-modal');
    const gameOverOverlay = new FakeElement('game-over-overlay');

    documentRef.registerElement(root);
    documentRef.registerElement(button);
    documentRef.registerElement(icon);
    documentRef.registerElement(label);
    documentRef.registerElement(rotateNotice);
    documentRef.registerElement(startScreen);
    documentRef.registerElement(feedbackModal);
    documentRef.registerElement(guideModal);
    documentRef.registerElement(statsModal);
    documentRef.registerElement(gameOverOverlay);

    documentRef.body.appendChild(rotateNotice);
    documentRef.body.appendChild(root);
    documentRef.body.appendChild(startScreen);
    documentRef.body.appendChild(feedbackModal);
    documentRef.body.appendChild(guideModal);
    documentRef.body.appendChild(statsModal);
    documentRef.body.appendChild(gameOverOverlay);

    const diagnosticsEvents = [];
    const layoutEvents = [];
    let nativeRequestCount = 0;
    let nativeExitCount = 0;

    if (!withNoApi && withStandardApi) {
        root.requestFullscreen = async () => {
            nativeRequestCount += 1;
            documentRef.fullscreenElement = root;
            documentRef.dispatchEvent('fullscreenchange');
        };

        documentRef.exitFullscreen = async () => {
            nativeExitCount += 1;
            documentRef.fullscreenElement = null;
            documentRef.dispatchEvent('fullscreenchange');
        };
    }

    if (!withNoApi && withWebkitApi) {
        root.webkitRequestFullscreen = async () => {
            nativeRequestCount += 1;
            documentRef.webkitFullscreenElement = root;
            documentRef.dispatchEvent('webkitfullscreenchange');
        };

        documentRef.webkitExitFullscreen = async () => {
            nativeExitCount += 1;
            documentRef.webkitFullscreenElement = null;
            documentRef.dispatchEvent('webkitfullscreenchange');
        };
    }

    if (withNoApi) {
        root.requestFullscreen = undefined;
        root.webkitRequestFullscreen = undefined;
        documentRef.exitFullscreen = undefined;
        documentRef.webkitExitFullscreen = undefined;
    }

    const dictionary = {
        tr: {
            'ui.enterFullscreen': 'Tam Ekrana Geç',
            'ui.exitFullscreen': 'Tam Ekrandan Çık'
        },
        en: {
            'ui.enterFullscreen': 'Enter Fullscreen',
            'ui.exitFullscreen': 'Exit Fullscreen'
        },
        ru: {
            'ui.enterFullscreen': 'На весь экран',
            'ui.exitFullscreen': 'Выйти из полноэкранного режима'
        }
    };

    const controller = createFullscreenController({
        rootElement: root,
        toggleButton: button,
        iconElement: icon,
        labelElement: label,
        documentRef,
        windowRef,
        translate: key => dictionary[language][key] || key,
        runtimeDiagnostics: {
            recordStateChange: (eventType, detail) => diagnosticsEvents.push(`${eventType}:${detail}`)
        },
        onLayoutChange: payload => layoutEvents.push(payload)
    });

    return {
        controller,
        documentRef,
        windowRef,
        root,
        button,
        icon,
        label,
        diagnosticsEvents,
        layoutEvents,
        getNativeCounts: () => ({ nativeRequestCount, nativeExitCount }),
        overlays: {
            startScreen,
            feedbackModal,
            guideModal,
            statsModal,
            gameOverOverlay
        }
    };
}

test('standard Fullscreen API enter/exit updates button and aria state', async () => {
    const harness = setupHarness({ withStandardApi: true });

    await harness.controller.enter();
    assert.equal(harness.documentRef.fullscreenElement, harness.root);
    assert.equal(harness.button.getAttribute('aria-pressed'), 'true');
    assert.equal(harness.button.getAttribute('aria-label'), 'Tam Ekrandan Çık');
    assert.equal(harness.label.textContent, 'Tam Ekrandan Çık');

    await harness.controller.exit();
    assert.equal(harness.documentRef.fullscreenElement, null);
    assert.equal(harness.button.getAttribute('aria-pressed'), 'false');
    assert.equal(harness.button.getAttribute('aria-label'), 'Tam Ekrana Geç');
    assert.equal(harness.label.textContent, 'Tam Ekrana Geç');

    const { nativeRequestCount, nativeExitCount } = harness.getNativeCounts();
    assert.equal(nativeRequestCount, 1);
    assert.equal(nativeExitCount, 1);
});

test('fullscreenchange synchronizes labels and icon after external escape-like exit', async () => {
    const harness = setupHarness({ withStandardApi: true, language: 'en' });

    await harness.controller.enter();
    harness.documentRef.fullscreenElement = null;
    harness.documentRef.dispatchEvent('fullscreenchange');

    assert.equal(harness.button.getAttribute('aria-label'), 'Enter Fullscreen');
    assert.equal(harness.label.textContent, 'Enter Fullscreen');
    assert.equal(harness.icon.textContent, '⛶');
});

test('webkit Fullscreen API fallback path works when standard API is unavailable', async () => {
    const harness = setupHarness({ withStandardApi: false, withWebkitApi: true });

    await harness.controller.enter();
    assert.equal(harness.documentRef.webkitFullscreenElement, harness.root);

    await harness.controller.exit();
    assert.equal(harness.documentRef.webkitFullscreenElement, null);

    const { nativeRequestCount, nativeExitCount } = harness.getNativeCounts();
    assert.equal(nativeRequestCount, 1);
    assert.equal(nativeExitCount, 1);
});

test('CSS focus mode activates when Fullscreen API is not available', async () => {
    const harness = setupHarness({ withNoApi: true, language: 'ru' });

    await harness.controller.enter();

    assert.equal(harness.controller.isActive(), true);
    assert.equal(harness.root.classList.contains('is-focus-mode-root'), true);
    assert.equal(harness.documentRef.body.classList.contains('is-game-focus-mode'), true);
    assert.equal(harness.button.getAttribute('aria-label'), 'Выйти из полноэкранного режима');

    await harness.controller.exit();

    assert.equal(harness.controller.isActive(), false);
    assert.equal(harness.root.classList.contains('is-focus-mode-root'), false);
    assert.equal(harness.documentRef.body.classList.contains('is-game-focus-mode'), false);
    assert.equal(harness.button.getAttribute('aria-label'), 'На весь экран');
});

test('exiting fullscreen cleans body overflow lock and classes', async () => {
    const harness = setupHarness({ withNoApi: true });
    harness.documentRef.body.style.overflow = 'auto';
    harness.documentRef.documentElement.style.overflow = 'visible';

    await harness.controller.enter();
    assert.equal(harness.documentRef.body.style.overflow, 'hidden');
    assert.equal(harness.documentRef.documentElement.style.overflow, 'hidden');

    await harness.controller.exit();
    assert.equal(harness.documentRef.body.style.overflow, 'auto');
    assert.equal(harness.documentRef.documentElement.style.overflow, 'visible');
    assert.equal(harness.documentRef.body.classList.contains('is-game-fullscreen'), false);
});

test('repeated toggles do not duplicate listeners or native fullscreen calls', async () => {
    const harness = setupHarness({ withStandardApi: true });

    for (let index = 0; index < 3; index += 1) {
        await harness.controller.enter();
        await harness.controller.exit();
    }

    const { nativeRequestCount, nativeExitCount } = harness.getNativeCounts();
    assert.equal(nativeRequestCount, 3);
    assert.equal(nativeExitCount, 3);
    assert.equal(harness.documentRef.listeners.get('fullscreenchange').size, 1);
    assert.equal(harness.windowRef.listeners.get('resize').size, 1);
    assert.equal(harness.windowRef.listeners.get('orientationchange').size, 1);
});

test('TR/EN/RU labels are resolved from active language', async () => {
    const trHarness = setupHarness({ withNoApi: true, language: 'tr' });
    await trHarness.controller.enter();
    assert.equal(trHarness.label.textContent, 'Tam Ekrandan Çık');

    const enHarness = setupHarness({ withNoApi: true, language: 'en' });
    await enHarness.controller.enter();
    assert.equal(enHarness.label.textContent, 'Exit Fullscreen');

    const ruHarness = setupHarness({ withNoApi: true, language: 'ru' });
    await ruHarness.controller.enter();
    assert.equal(ruHarness.label.textContent, 'Выйти из полноэкранного режима');
});

test('overlay dialogs are moved into fullscreen root so they remain visible in native fullscreen subtree', () => {
    const harness = setupHarness({ withStandardApi: true });

    for (const overlay of Object.values(harness.overlays)) {
        assert.equal(harness.root.contains(overlay), true);
    }
});

test('layout signals run on resize and orientationchange without mutating game-like state', async () => {
    const harness = setupHarness({ withNoApi: true });
    const gameLikeState = {
        gameStatus: 'PLAYING',
        dice: [6, 3],
        moveHistory: ['8/2'],
        timeoutStrikes: 1
    };

    await harness.controller.enter();
    harness.windowRef.dispatchEvent('resize');
    harness.windowRef.dispatchEvent('orientationchange');
    await harness.controller.exit();

    assert.ok(harness.layoutEvents.length >= 4);
    assert.deepEqual(gameLikeState, {
        gameStatus: 'PLAYING',
        dice: [6, 3],
        moveHistory: ['8/2'],
        timeoutStrikes: 1
    });
});
