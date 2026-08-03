import test from 'node:test';
import assert from 'node:assert/strict';

import { createStartModeController } from '../engine/startModeController.js';

class FakeButton {
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

    click() {
        let prevented = false;
        for (const listener of this.listeners.get('click') ?? []) {
            listener({
                target: this,
                preventDefault() {
                    prevented = true;
                }
            });
        }
        return prevented;
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

test('available modes start once and reset permits a new session', () => {
    const quickPlayButton = new FakeButton();
    const botMatchButton = new FakeButton();
    const starts = [];
    const controller = createStartModeController({
        availableModes: [
            { mode: 'quick-play', button: quickPlayButton },
            { mode: 'bot-match', button: botMatchButton }
        ],
        onStart: mode => {
            starts.push(mode);
            return true;
        }
    });

    assert.equal(controller.start(), true);
    assert.equal(quickPlayButton.click(), true);
    botMatchButton.click();
    assert.deepEqual(starts, ['quick-play']);
    assert.equal(controller.isStartLocked(), true);

    controller.reset();
    botMatchButton.click();
    assert.deepEqual(starts, ['quick-play', 'bot-match']);
});

test('failed start attempts remain retryable', () => {
    const quickPlayButton = new FakeButton();
    let attempts = 0;
    const controller = createStartModeController({
        availableModes: [{ mode: 'quick-play', button: quickPlayButton }],
        onStart: () => {
            attempts += 1;
            return attempts === 2;
        }
    });

    controller.start();
    quickPlayButton.click();
    quickPlayButton.click();
    quickPlayButton.click();

    assert.equal(attempts, 2);
    assert.equal(controller.isStartLocked(), true);
});

test('unavailable modes never call the gameplay start callback', () => {
    const quickPlayButton = new FakeButton();
    const friendButton = new FakeButton();
    const onlineButton = new FakeButton();
    const unavailable = [];
    let startCalls = 0;
    const controller = createStartModeController({
        availableModes: [{ mode: 'quick-play', button: quickPlayButton }],
        unavailableModes: [
            { mode: 'friend-match', button: friendButton },
            { mode: 'online', button: onlineButton }
        ],
        onStart: () => {
            startCalls += 1;
            return true;
        },
        onUnavailable: mode => unavailable.push(mode)
    });

    controller.start();
    assert.equal(friendButton.click(), true);
    assert.equal(onlineButton.click(), true);

    assert.equal(startCalls, 0);
    assert.deepEqual(unavailable, ['friend-match', 'online']);
});

test('listener ownership is idempotent, removable, and restartable', () => {
    const quickPlayButton = new FakeButton();
    const controller = createStartModeController({
        availableModes: [{ mode: 'quick-play', button: quickPlayButton }]
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(quickPlayButton.listenerCount('click'), 1);
    assert.equal(controller.isActive(), true);

    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(quickPlayButton.listenerCount('click'), 0);
    assert.equal(controller.isActive(), false);

    assert.equal(controller.start(), true);
    assert.equal(quickPlayButton.listenerCount('click'), 1);
});

test('controller fails safely without an available mode button', () => {
    const controller = createStartModeController({
        availableModes: [{ mode: 'quick-play', button: null }]
    });

    assert.equal(controller.start(), false);
    assert.equal(controller.stop(), false);
    assert.equal(controller.isActive(), false);
});
