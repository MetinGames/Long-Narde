import test from 'node:test';
import assert from 'node:assert/strict';

import {
    FIRST_MATCH_TUTORIAL_STORAGE_KEY,
    createFirstMatchTutorialController
} from '../engine/firstMatchTutorial.js';

class FakeStorage {
    constructor(initial = {}) {
        this.values = new Map(Object.entries(initial));
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

test('first visit opens the guide once and records the local seen state', () => {
    const storage = new FakeStorage();
    const trigger = { id: 'how-to-play-button' };
    const openedWith = [];
    const guide = {
        open(element) {
            openedWith.push(element);
            return true;
        }
    };
    const controller = createFirstMatchTutorialController({
        guide,
        storage
    });

    assert.equal(controller.openIfNeeded(trigger), true);
    assert.deepEqual(openedWith, [trigger]);
    assert.equal(
        storage.getItem(FIRST_MATCH_TUTORIAL_STORAGE_KEY),
        'seen'
    );
    assert.equal(controller.openIfNeeded(trigger), false);
    assert.deepEqual(openedWith, [trigger]);
});

test('returning visits do not auto-open the guide', () => {
    const storage = new FakeStorage({
        [FIRST_MATCH_TUTORIAL_STORAGE_KEY]: 'seen'
    });
    let openCalls = 0;
    const controller = createFirstMatchTutorialController({
        guide: {
            open() {
                openCalls++;
                return true;
            }
        },
        storage
    });

    assert.equal(controller.hasBeenSeen(), true);
    assert.equal(controller.openIfNeeded(), false);
    assert.equal(openCalls, 0);
});

test('a missing guide modal is not recorded as seen', () => {
    const storage = new FakeStorage();
    const controller = createFirstMatchTutorialController({
        guide: {
            open() {
                return false;
            }
        },
        storage
    });

    assert.equal(controller.openIfNeeded(), false);
    assert.equal(
        storage.getItem(FIRST_MATCH_TUTORIAL_STORAGE_KEY),
        null
    );
});

test('blocked localStorage never blocks the tutorial or repeats it in-session', () => {
    const storage = {
        getItem() {
            throw new Error('blocked');
        },
        setItem() {
            throw new Error('blocked');
        }
    };
    let openCalls = 0;
    const controller = createFirstMatchTutorialController({
        guide: {
            open() {
                openCalls++;
                return true;
            }
        },
        storage
    });

    assert.equal(controller.openIfNeeded(), true);
    assert.equal(controller.openIfNeeded(), false);
    assert.equal(openCalls, 1);
});
