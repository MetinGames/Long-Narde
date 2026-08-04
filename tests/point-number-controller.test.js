import test from 'node:test';
import assert from 'node:assert/strict';

import {
    POINT_NUMBER_STORAGE_KEY,
    PointNumberController
} from '../engine/pointNumberController.js';

class FakeButton {
    constructor() {
        this.attributes = new Map();
        this.listeners = new Map();
        this.activeClasses = new Set();
        this.classList = {
            toggle: (name, enabled) => {
                if (enabled) this.activeClasses.add(name);
                else this.activeClasses.delete(name);
            }
        };
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    removeEventListener(type, handler) {
        if (this.listeners.get(type) === handler) {
            this.listeners.delete(type);
        }
    }

    click() {
        this.listeners.get('click')?.({
            preventDefault() {}
        });
    }
}

class FakeStorage {
    constructor(initialValue = null) {
        this.value = initialValue;
    }

    getItem(key) {
        assert.equal(key, POINT_NUMBER_STORAGE_KEY);
        return this.value;
    }

    setItem(key, value) {
        assert.equal(key, POINT_NUMBER_STORAGE_KEY);
        this.value = value;
    }
}

test('hane numaraları varsayılan kapalıdır ve ikonla açılıp kalıcılaşır', () => {
    const button = new FakeButton();
    const storage = new FakeStorage();
    const rendererValues = [];
    let renderCount = 0;
    const controller = new PointNumberController({
        button,
        storage,
        renderer: {
            setPointNumbersVisible(value) {
                rendererValues.push(value);
            }
        },
        translate: key => `translated:${key}`,
        onChange() {
            renderCount += 1;
        }
    });

    controller.start();
    assert.deepEqual(rendererValues, [false]);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(
        button.getAttribute('aria-label'),
        'translated:ui.showPointNumbers'
    );

    button.click();
    assert.deepEqual(rendererValues, [false, true]);
    assert.equal(storage.value, 'visible');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(
        button.getAttribute('title'),
        'translated:ui.hidePointNumbers'
    );
    assert.equal(button.activeClasses.has('is-active'), true);
    assert.equal(renderCount, 2);
});

test('kaydedilmiş tercih yüklenir, dil etiketi yenilenir ve listener tek sahipte kalır', () => {
    const button = new FakeButton();
    const storage = new FakeStorage('visible');
    let language = 'tr';
    const controller = new PointNumberController({
        button,
        storage,
        renderer: {
            setPointNumbersVisible() {}
        },
        translate: key => `${language}:${key}`
    });

    controller.start();
    controller.start();
    assert.equal(button.listeners.size, 1);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(
        button.getAttribute('aria-label'),
        'tr:ui.hidePointNumbers'
    );

    language = 'en';
    controller.refreshForLanguage();
    assert.equal(
        button.getAttribute('aria-label'),
        'en:ui.hidePointNumbers'
    );

    controller.dispose();
    assert.equal(button.listeners.size, 0);
});

test('depolama engellense bile numara düğmesi bellek içinde çalışır', () => {
    const button = new FakeButton();
    const rendererValues = [];
    const controller = new PointNumberController({
        button,
        storage: {
            getItem() {
                throw new Error('blocked');
            },
            setItem() {
                throw new Error('blocked');
            }
        },
        renderer: {
            setPointNumbersVisible(value) {
                rendererValues.push(value);
            }
        },
        translate: key => key
    });

    controller.start();
    button.click();

    assert.deepEqual(rendererValues, [false, true]);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
});
