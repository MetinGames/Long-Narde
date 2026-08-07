import test from 'node:test';
import assert from 'node:assert/strict';

import {
    HAPTIC_STORAGE_KEY,
    HapticFeedbackController
} from '../engine/hapticFeedbackController.js';

class FakeButton {
    constructor() {
        this.attributes = new Map();
        this.listeners = new Map();
        this.activeClasses = new Set();
        this.label = { textContent: '' };
        this.classList = {
            toggle: (name, enabled) => {
                if (enabled) this.activeClasses.add(name);
                else this.activeClasses.delete(name);
            }
        };
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    querySelector(selector) {
        return selector === '[data-haptic-label]' ? this.label : null;
    }

    click() {
        this.listeners.get('click')?.({ preventDefault() {} });
    }
}

class FakeStorage {
    constructor(initialValue = null) {
        this.value = initialValue;
    }

    getItem(key) {
        assert.equal(key, HAPTIC_STORAGE_KEY);
        return this.value;
    }

    setItem(key, value) {
        assert.equal(key, HAPTIC_STORAGE_KEY);
        this.value = value;
    }
}

test('preference is default-off, explicit, accessible, and persistent', () => {
    const button = new FakeButton();
    const storage = new FakeStorage();
    const controller = new HapticFeedbackController({
        button,
        storage,
        navigatorRef: { vibrate: () => true },
        translate: key => `translated:${key}`
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(controller.isEnabled(), false);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(
        button.getAttribute('aria-label'),
        'translated:ui.enableHaptics'
    );
    assert.equal(button.listeners.size, 1);

    button.click();
    assert.equal(controller.isEnabled(), true);
    assert.equal(storage.value, 'true');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(
        button.label.textContent,
        'translated:ui.disableHaptics'
    );
    assert.equal(button.activeClasses.has('is-active'), true);

    assert.equal(controller.stop(), true);
    assert.equal(button.listeners.size, 0);
});

test('unsupported vibration capability is a named no-op', () => {
    const button = new FakeButton();
    const controller = new HapticFeedbackController({
        button,
        storage: new FakeStorage('true'),
        navigatorRef: {}
    });

    controller.start();
    assert.equal(controller.isEnabled(), true);
    assert.equal(controller.isSupported(), false);
    assert.equal(button.getAttribute('data-haptic-supported'), 'false');
    assert.equal(controller.trigger('move', { eventId: 1 }), false);
});

test('false-returning and throwing platform APIs never block the caller', () => {
    const denied = new HapticFeedbackController({
        storage: new FakeStorage('true'),
        navigatorRef: { vibrate: () => false }
    });
    denied.start();
    assert.equal(denied.trigger('move', { eventId: 1 }), false);

    const throwing = new HapticFeedbackController({
        storage: new FakeStorage('true'),
        navigatorRef: {
            vibrate() {
                throw new Error('platform denied');
            }
        }
    });
    throwing.start();
    assert.doesNotThrow(() => throwing.trigger('collect', { eventId: 2 }));
    assert.equal(throwing.trigger('collect', { eventId: 3 }), false);
});

test('event ids suppress duplicates without merging distinct successful events', () => {
    const calls = [];
    const controller = new HapticFeedbackController({
        storage: new FakeStorage('true'),
        navigatorRef: {
            vibrate(pattern) {
                calls.push(pattern);
                return true;
            }
        }
    });
    controller.start();

    assert.equal(controller.trigger('move', { eventId: 7 }), true);
    assert.equal(controller.trigger('move', { eventId: 7 }), false);
    assert.equal(controller.trigger('collect', { eventId: 7 }), true);
    assert.equal(controller.trigger('undo', { eventId: 7 }), true);
    assert.equal(controller.trigger('unknown', { eventId: 8 }), false);
    assert.deepEqual(calls, [[18], [24], [12]]);
});

test('blocked storage keeps an explicit in-memory preference usable', () => {
    const controller = new HapticFeedbackController({
        storage: {
            getItem() {
                throw new Error('blocked');
            },
            setItem() {
                throw new Error('blocked');
            }
        },
        navigatorRef: { vibrate: () => true }
    });

    controller.start();
    assert.equal(controller.isEnabled(), false);
    assert.doesNotThrow(() => controller.setEnabled(true));
    assert.equal(controller.isEnabled(), true);
    assert.equal(controller.trigger('move', { eventId: 1 }), true);
});
