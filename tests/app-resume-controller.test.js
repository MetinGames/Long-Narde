import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppResumeController } from '../engine/appResumeController.js';

class FakeEventTarget {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type) {
        for (const listener of this.listeners.get(type) ?? []) {
            listener({ type, target: this });
        }
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

test('resume controller synchronizes visible, focus, and pageshow signals', () => {
    const documentRef = new FakeEventTarget();
    const windowRef = new FakeEventTarget();
    const reasons = [];
    documentRef.visibilityState = 'hidden';

    const controller = createAppResumeController({
        documentRef,
        windowRef,
        onResume: reason => reasons.push(reason)
    });

    assert.equal(controller.start(), true);
    documentRef.dispatch('visibilitychange');
    assert.deepEqual(reasons, []);

    documentRef.visibilityState = 'visible';
    documentRef.dispatch('visibilitychange');
    windowRef.dispatch('focus');
    windowRef.dispatch('pageshow');

    assert.deepEqual(reasons, [
        'visibilitychange',
        'focus',
        'pageshow'
    ]);
    assert.equal(controller.isActive(), true);
});

test('resume controller start is idempotent and never duplicates listeners', () => {
    const documentRef = new FakeEventTarget();
    const windowRef = new FakeEventTarget();
    let resumeCalls = 0;
    documentRef.visibilityState = 'visible';

    const controller = createAppResumeController({
        documentRef,
        windowRef,
        onResume: () => {
            resumeCalls += 1;
        }
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(documentRef.listenerCount('visibilitychange'), 1);
    assert.equal(windowRef.listenerCount('focus'), 1);
    assert.equal(windowRef.listenerCount('pageshow'), 1);

    windowRef.dispatch('focus');
    assert.equal(resumeCalls, 1);
});

test('resume controller stop removes listeners and supports a clean restart', () => {
    const documentRef = new FakeEventTarget();
    const windowRef = new FakeEventTarget();
    let resumeCalls = 0;
    documentRef.visibilityState = 'visible';

    const controller = createAppResumeController({
        documentRef,
        windowRef,
        onResume: () => {
            resumeCalls += 1;
        }
    });

    controller.start();
    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(controller.isActive(), false);
    assert.equal(documentRef.listenerCount('visibilitychange'), 0);
    assert.equal(windowRef.listenerCount('focus'), 0);
    assert.equal(windowRef.listenerCount('pageshow'), 0);

    windowRef.dispatch('focus');
    assert.equal(resumeCalls, 0);

    assert.equal(controller.start(), true);
    windowRef.dispatch('pageshow');
    assert.equal(resumeCalls, 1);
});

test('resume controller fails safely when browser event targets are absent', () => {
    const controller = createAppResumeController({
        documentRef: null,
        windowRef: null,
        onResume: () => {
            throw new Error('resume callback should not run');
        }
    });

    assert.equal(controller.start(), false);
    assert.equal(controller.stop(), false);
    assert.equal(controller.isActive(), false);
});
