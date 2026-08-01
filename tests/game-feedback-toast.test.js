import test from 'node:test';
import assert from 'node:assert/strict';

import { GameFeedbackToast } from '../engine/gameFeedbackToast.js';

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(name) {
        this.values.add(name);
    }

    remove(name) {
        this.values.delete(name);
    }

    contains(name) {
        return this.values.has(name);
    }
}

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.attributes = new Map();
        this.textContent = '';
        this.className = '';
        this.classList = new FakeClassList();
        this.id = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }
}

function createFakeDocument() {
    const elements = new Map();

    return {
        createElement(tagName) {
            return new FakeElement(tagName);
        },
        getElementById(id) {
            return elements.get(id) || null;
        },
        register(element) {
            if (element?.id) {
                elements.set(element.id, element);
            }
        }
    };
}

test('toast elementi bir kez olusturulur ve aria ozellikleri atanir', () => {
    const documentRef = createFakeDocument();
    const boardWrapper = new FakeElement('div');
    boardWrapper.id = 'board-wrapper';

    const toast = new GameFeedbackToast({
        container: boardWrapper,
        documentRef
    });

    const first = toast.ensureElement();
    documentRef.register(first);
    const second = toast.ensureElement();

    assert.equal(first, second);
    assert.equal(boardWrapper.children.length, 1);
    assert.equal(first.id, 'game-feedback-toast');
    assert.equal(first.getAttribute('role'), 'status');
    assert.equal(first.getAttribute('aria-live'), 'polite');
    assert.equal(first.getAttribute('aria-atomic'), 'true');
    assert.equal(first.getAttribute('aria-hidden'), 'true');
});

test('toast show/hide sureci gorunurluk sinifini yonetir', () => {
    const documentRef = createFakeDocument();
    const boardWrapper = new FakeElement('div');
    boardWrapper.id = 'board-wrapper';

    const timers = [];
    const toast = new GameFeedbackToast({
        container: boardWrapper,
        documentRef,
        durationMs: 1400,
        schedule(callback, delay) {
            const timer = { callback, delay, canceled: false };
            timers.push(timer);
            return timer;
        },
        cancel(timer) {
            timer.canceled = true;
        }
    });

    const element = toast.ensureElement();
    documentRef.register(element);

    const shown = toast.show('Bekleyin', { durationMs: 1400 });
    assert.equal(shown, true);
    assert.equal(element.classList.contains('is-visible'), true);
    assert.equal(element.getAttribute('aria-hidden'), 'false');
    assert.equal(element.textContent, 'Bekleyin');
    assert.equal(timers.length, 1);
    assert.equal(timers[0].delay, 1400);

    timers[0].callback();

    assert.equal(element.classList.contains('is-visible'), false);
    assert.equal(element.getAttribute('aria-hidden'), 'true');
});

