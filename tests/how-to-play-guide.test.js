import test from 'node:test';
import assert from 'node:assert/strict';

import { HowToPlayGuide } from '../engine/howToPlayGuide.js';

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    toggle(name, force) {
        if (force === undefined) {
            if (this.values.has(name)) {
                this.values.delete(name);
                return false;
            }
            this.values.add(name);
            return true;
        }

        if (force) {
            this.values.add(name);
            return true;
        }

        this.values.delete(name);
        return false;
    }

    contains(name) {
        return this.values.has(name);
    }
}

class FakeDocument {
    constructor() {
        this.activeElement = null;
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    emitKeydown(event) {
        const listener = this.listeners.get('keydown');
        if (listener) {
            listener(event);
        }
    }
}

class FakeElement {
    constructor(doc) {
        this.ownerDocument = doc;
        this.style = {};
        this.hidden = false;
        this.disabled = false;
        this.textContent = '';
        this.dataset = {};
        this.classList = new FakeClassList();
        this.attributes = new Map();
        this.listeners = new Map();
        this.pages = [];
        this.focusables = [];
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    dispatch(type, event = {}) {
        const listener = this.listeners.get(type);
        if (listener) {
            listener(event);
        }
    }

    click() {
        this.dispatch('click', { currentTarget: this });
    }

    focus() {
        this.ownerDocument.activeElement = this;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    querySelectorAll(selector) {
        if (selector === '[data-guide-page]') {
            return this.pages;
        }

        if (selector.includes('button')) {
            return this.focusables;
        }

        return [];
    }
}

function createGuideFixture() {
    const doc = new FakeDocument();

    const modal = new FakeElement(doc);
    const openButton = new FakeElement(doc);
    const closeTop = new FakeElement(doc);
    const closeFooter = new FakeElement(doc);
    const prev = new FakeElement(doc);
    const next = new FakeElement(doc);
    const start = new FakeElement(doc);
    const counter = new FakeElement(doc);

    const pages = [
        new FakeElement(doc),
        new FakeElement(doc),
        new FakeElement(doc)
    ];

    modal.pages = pages;
    modal.focusables = [prev, next, closeTop, closeFooter, start];

    return {
        doc,
        modal,
        openButton,
        closeTop,
        closeFooter,
        prev,
        next,
        start,
        counter,
        pages
    };
}

test('rehber acilir, kapanir ve sayfa gorunurlugu guncellenir', () => {
    const fixture = createGuideFixture();

    const guide = new HowToPlayGuide({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop, fixture.closeFooter],
        previousButton: fixture.prev,
        nextButton: fixture.next,
        startButton: fixture.start,
        pageCounter: fixture.counter,
        onStart: () => {}
    });

    fixture.openButton.click();

    assert.equal(fixture.modal.style.display, 'flex');
    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'false');
    assert.equal(fixture.pages[0].hidden, false);
    assert.equal(fixture.pages[1].hidden, true);
    assert.equal(fixture.prev.disabled, true);

    fixture.next.click();
    assert.equal(fixture.pages[1].hidden, false);
    assert.equal(fixture.prev.disabled, false);

    fixture.closeTop.click();
    assert.equal(fixture.modal.style.display, 'none');
    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');

    // Reopen should reset to first page.
    fixture.openButton.click();
    assert.equal(fixture.pages[0].hidden, false);
    assert.equal(fixture.pages[1].hidden, true);
    assert.equal(guide.currentPageIndex, 0);
});

test('Escape kapatir ve Tab focus tuzagi modal icinde kalir', () => {
    const fixture = createGuideFixture();

    new HowToPlayGuide({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        previousButton: fixture.prev,
        nextButton: fixture.next,
        startButton: fixture.start,
        pageCounter: fixture.counter,
        onStart: () => {}
    });

    fixture.openButton.click();

    fixture.start.focus();
    let prevented = false;
    fixture.doc.emitKeydown({
        key: 'Tab',
        shiftKey: false,
        preventDefault() {
            prevented = true;
        }
    });

    assert.equal(prevented, true);
    assert.equal(fixture.doc.activeElement, fixture.next);

    fixture.doc.emitKeydown({
        key: 'Escape',
        preventDefault() {}
    });

    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');
});

test('rehberde gezinmek oyunu baslatmaz; rehberden baslatma yalnizca bir kez calisir', () => {
    const fixture = createGuideFixture();
    let startCalls = 0;

    new HowToPlayGuide({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeTop],
        previousButton: fixture.prev,
        nextButton: fixture.next,
        startButton: fixture.start,
        pageCounter: fixture.counter,
        onStart: () => {
            startCalls++;
        }
    });

    fixture.openButton.click();
    fixture.next.click();
    fixture.prev.click();
    fixture.closeTop.click();

    assert.equal(startCalls, 0);

    fixture.openButton.click();
    fixture.start.click();
    fixture.start.click();

    assert.equal(startCalls, 1);
    assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');
});

