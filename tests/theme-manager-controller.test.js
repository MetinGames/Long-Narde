import test from 'node:test';
import assert from 'node:assert/strict';

import { ThemeManagerController } from '../engine/themeManagerController.js';

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(value) {
        this.values.add(value);
    }

    remove(value) {
        this.values.delete(value);
    }

    toggle(value, force) {
        if (force) this.values.add(value);
        else this.values.delete(value);
    }

    contains(value) {
        return this.values.has(value);
    }
}

class FakeStyle {
    constructor() {
        this.values = new Map();
        this.display = '';
    }

    setProperty(name, value) {
        this.values.set(name, value);
    }

    getPropertyValue(name) {
        return this.values.get(name) ?? '';
    }
}

class FakeElement {
    constructor({ dataset = {}, documentRef = null } = {}) {
        this.dataset = { ...dataset };
        this.ownerDocument = documentRef;
        this.listeners = new Map();
        this.attributes = new Map();
        this.classList = new FakeClassList();
        this.style = new FakeStyle();
        this.disabled = false;
        this.hidden = false;
        this.value = '';
        this.textContent = '';
        this.focusables = [];
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type, overrides = {}) {
        const event = {
            type,
            target: this,
            currentTarget: this,
            preventDefault() {},
            ...overrides
        };
        for (const listener of this.listeners.get(type) ?? []) listener(event);
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    querySelectorAll() {
        return this.focusables;
    }

    focus() {
        if (this.ownerDocument) this.ownerDocument.activeElement = this;
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

class FakeDocument extends FakeElement {
    constructor() {
        super();
        this.ownerDocument = this;
        this.activeElement = null;
        this.body = new FakeElement({ documentRef: this });
        this.documentElement = new FakeElement({ documentRef: this });
    }
}

function createHarness() {
    const documentRef = new FakeDocument();
    const modal = new FakeElement({ documentRef });
    const openButton = new FakeElement({ documentRef });
    const closeButton = new FakeElement({ documentRef });
    const footerCloseButton = new FakeElement({ documentRef });
    const anatolianButton = new FakeElement({
        dataset: { themeOption: 'anatolian' },
        documentRef
    });
    const walnutButton = new FakeElement({
        dataset: { themeOption: 'walnut' },
        documentRef
    });
    const select = new FakeElement({ documentRef });
    const liveStatus = new FakeElement({ documentRef });
    modal.focusables = [anatolianButton, walnutButton, closeButton, footerCloseButton];

    const changes = [];
    const controller = new ThemeManagerController({
        modal,
        openButtons: [openButton],
        closeButtons: [closeButton, footerCloseButton],
        select,
        optionButtons: [anatolianButton, walnutButton],
        liveStatus,
        getCurrentThemeId: () => 'anatolian',
        onThemeChange: (themeId, themeName) => {
            changes.push({ themeId, themeName });
        },
        translate(key, values) {
            const labels = {
                'theme.anatolian': 'Anadolu',
                'theme.walnut': 'Dark Walnut'
            };
            if (key === 'status.themeChanged') {
                return `Theme changed: ${values.theme}`;
            }
            return labels[key] ?? key;
        },
        documentRef
    });

    return {
        controller,
        documentRef,
        modal,
        openButton,
        closeButton,
        footerCloseButton,
        anatolianButton,
        walnutButton,
        select,
        liveStatus,
        changes
    };
}

test('theme manager synchronizes gallery, select, reusable tokens, and persistence callback', () => {
    const harness = createHarness();

    assert.equal(harness.controller.start(), true);
    assert.equal(harness.controller.start(), false);
    assert.equal(harness.select.value, 'anatolian');
    assert.equal(harness.anatolianButton.getAttribute('aria-pressed'), 'true');
    assert.equal(harness.walnutButton.getAttribute('aria-pressed'), 'false');
    assert.equal(
        harness.documentRef.documentElement.getAttribute('data-nardora-theme'),
        'anatolian'
    );
    assert.equal(
        harness.anatolianButton.style.getPropertyValue('--theme-preview-board'),
        '#c4935d'
    );

    harness.walnutButton.dispatch('click');
    assert.deepEqual(harness.changes, [
        { themeId: 'walnut', themeName: 'Dark Walnut' }
    ]);
    assert.equal(harness.select.value, 'walnut');
    assert.equal(harness.anatolianButton.getAttribute('aria-pressed'), 'false');
    assert.equal(harness.walnutButton.getAttribute('aria-pressed'), 'true');
    assert.equal(harness.walnutButton.classList.contains('is-selected'), true);
    assert.equal(harness.liveStatus.textContent, 'Theme changed: Dark Walnut');
    assert.equal(
        harness.documentRef.documentElement.style.getPropertyValue(
            '--nardora-theme-panel'
        ),
        '#1a0e08'
    );

    harness.select.value = 'anatolian';
    harness.select.dispatch('change');
    assert.equal(harness.changes.length, 2);
    assert.equal(harness.changes[1].themeId, 'anatolian');
    assert.equal(harness.controller.selectTheme('unknown'), false);
    assert.equal(harness.changes.length, 2);
});

test('theme manager owns modal focus, escape, backdrop, and listener cleanup', () => {
    const harness = createHarness();
    harness.controller.start();

    harness.openButton.dispatch('click');
    assert.equal(harness.modal.style.display, 'flex');
    assert.equal(harness.modal.getAttribute('aria-hidden'), 'false');
    assert.equal(harness.documentRef.activeElement, harness.anatolianButton);
    assert.equal(
        harness.documentRef.body.classList.contains('is-theme-manager-open'),
        true
    );

    harness.documentRef.dispatch('keydown', { key: 'Escape' });
    assert.equal(harness.modal.style.display, 'none');
    assert.equal(harness.documentRef.activeElement, harness.openButton);

    harness.openButton.dispatch('click');
    harness.modal.dispatch('click', { target: harness.modal });
    assert.equal(harness.modal.getAttribute('aria-hidden'), 'true');

    assert.equal(harness.openButton.listenerCount('click'), 1);
    assert.equal(harness.select.listenerCount('change'), 1);
    assert.equal(harness.controller.stop(), true);
    assert.equal(harness.controller.stop(), false);
    assert.equal(harness.openButton.listenerCount('click'), 0);
    assert.equal(harness.select.listenerCount('change'), 0);
});

test('theme manager traps tab focus inside the open dialog', () => {
    const harness = createHarness();
    harness.controller.start();
    harness.openButton.dispatch('click');

    harness.documentRef.activeElement = harness.footerCloseButton;
    let prevented = false;
    harness.documentRef.dispatch('keydown', {
        key: 'Tab',
        preventDefault() {
            prevented = true;
        }
    });
    assert.equal(prevented, true);
    assert.equal(harness.documentRef.activeElement, harness.anatolianButton);

    harness.documentRef.activeElement = harness.anatolianButton;
    prevented = false;
    harness.documentRef.dispatch('keydown', {
        key: 'Tab',
        shiftKey: true,
        preventDefault() {
            prevented = true;
        }
    });
    assert.equal(prevented, true);
    assert.equal(harness.documentRef.activeElement, harness.footerCloseButton);
});

test('theme manager fails safely when its modal is unavailable', () => {
    const controller = new ThemeManagerController({ modal: null });
    assert.equal(controller.start(), false);
    assert.equal(controller.open(), false);
    assert.equal(controller.stop(), false);
});
