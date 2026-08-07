import test from 'node:test';
import assert from 'node:assert/strict';

import {
    HELPER_MASCOT_STORAGE_KEY,
    HelperMascotController
} from '../engine/helperMascotController.js';

class FakeDocument {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    dispatch(type, event = {}) {
        this.listeners.get(type)?.(event);
    }
}

class FakeElement {
    constructor(ownerDocument) {
        this.ownerDocument = ownerDocument;
        this.listeners = new Map();
        this.attributes = new Map();
        this.dataset = {};
        this.hidden = false;
        this.focusCalls = 0;
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    click() {
        this.listeners.get('click')?.({ target: this });
    }

    focus() {
        this.focusCalls += 1;
    }
}

class FakeStorage {
    constructor(initial = {}) {
        this.values = new Map(Object.entries(initial));
    }

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

function createHarness({ storage = new FakeStorage() } = {}) {
    const doc = new FakeDocument();
    const elements = {
        root: new FakeElement(doc),
        toggleButton: new FakeElement(doc),
        panel: new FakeElement(doc),
        minimizeButton: new FakeElement(doc),
        bugLink: new FakeElement(doc),
        feedbackButton: new FakeElement(doc),
        guideButton: new FakeElement(doc)
    };
    const opened = [];
    const controller = new HelperMascotController({
        ...elements,
        storage,
        onOpenFeedback: trigger => opened.push(['feedback', trigger]),
        onOpenGuide: trigger => opened.push(['guide', trigger]),
        translate: key => `translated:${key}`
    });

    return { controller, doc, elements, opened, storage };
}

test('helper starts minimized and persists explicit expanded/minimized state', () => {
    const { controller, elements, storage } = createHarness();
    controller.start();

    assert.equal(elements.root.hidden, false);
    assert.equal(elements.root.dataset.state, 'minimized');
    assert.equal(elements.panel.hidden, true);
    assert.equal(elements.toggleButton.getAttribute('aria-expanded'), 'false');
    assert.equal(
        elements.toggleButton.getAttribute('aria-label'),
        'translated:helper.openLabel'
    );

    elements.toggleButton.click();
    assert.equal(elements.root.dataset.state, 'expanded');
    assert.equal(elements.panel.hidden, false);
    assert.equal(elements.panel.getAttribute('aria-hidden'), 'false');
    assert.equal(
        elements.toggleButton.getAttribute('aria-label'),
        'translated:helper.minimize'
    );
    assert.equal(
        storage.getItem(HELPER_MASCOT_STORAGE_KEY),
        'expanded'
    );

    elements.minimizeButton.click();
    assert.equal(elements.root.dataset.state, 'minimized');
    assert.equal(elements.toggleButton.focusCalls, 1);
    assert.equal(
        storage.getItem(HELPER_MASCOT_STORAGE_KEY),
        'minimized'
    );
});

test('helper routes feedback and guide actions, and collapses every action', () => {
    const { controller, elements, opened, storage } = createHarness({
        storage: new FakeStorage({
            [HELPER_MASCOT_STORAGE_KEY]: 'expanded'
        })
    });
    controller.start();
    assert.equal(elements.root.dataset.state, 'expanded');

    elements.feedbackButton.click();
    assert.deepEqual(opened, [['feedback', elements.feedbackButton]]);
    assert.equal(elements.root.dataset.state, 'minimized');

    elements.toggleButton.click();
    elements.guideButton.click();
    assert.deepEqual(opened, [
        ['feedback', elements.feedbackButton],
        ['guide', elements.guideButton]
    ]);

    elements.toggleButton.click();
    elements.bugLink.click();
    assert.equal(elements.root.dataset.state, 'minimized');
    assert.equal(storage.getItem(HELPER_MASCOT_STORAGE_KEY), 'minimized');
});

test('Escape and blocked storage keep the helper safely usable', () => {
    const storage = {
        getItem() {
            throw new Error('blocked');
        },
        setItem() {
            throw new Error('blocked');
        }
    };
    const { controller, doc, elements } = createHarness({ storage });
    controller.start();
    elements.toggleButton.click();

    let prevented = 0;
    doc.dispatch('keydown', {
        key: 'Escape',
        preventDefault() {
            prevented += 1;
        }
    });

    assert.equal(prevented, 1);
    assert.equal(elements.root.dataset.state, 'minimized');
    assert.equal(elements.toggleButton.focusCalls, 1);
});
