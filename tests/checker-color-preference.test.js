import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHECKER_COLOR,
    CHECKER_COLOR_STORAGE_KEY,
    CheckerColorPreferenceController,
    getOppositeCheckerColor,
    normalizeCheckerColor,
    readCheckerColorPreference
} from '../engine/checkerColorPreference.js';

class FakeStorage {
    constructor(initial = {}, { blocked = false } = {}) {
        this.values = new Map(Object.entries(initial));
        this.blocked = blocked;
    }

    getItem(key) {
        if (this.blocked) throw new Error('blocked');
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        if (this.blocked) throw new Error('blocked');
        this.values.set(key, String(value));
    }
}

class FakeInput {
    constructor(value) {
        this.value = value;
        this.checked = false;
        this.listeners = new Map();
    }

    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    removeEventListener(type, handler) {
        if (this.listeners.get(type) === handler) {
            this.listeners.delete(type);
        }
    }

    select() {
        this.checked = true;
        this.listeners.get('change')?.({ target: this });
    }
}

test('pul rengi yalnız desteklenen iki görsel kimliğe normalleştirilir', () => {
    assert.equal(normalizeCheckerColor('white'), CHECKER_COLOR.WHITE);
    assert.equal(normalizeCheckerColor('black'), CHECKER_COLOR.BLACK);
    assert.equal(normalizeCheckerColor('red'), CHECKER_COLOR.WHITE);
    assert.equal(getOppositeCheckerColor('white'), CHECKER_COLOR.BLACK);
    assert.equal(getOppositeCheckerColor('black'), CHECKER_COLOR.WHITE);
});

test('başlangıç seçimi cihazdan yüklenir ve iki radio seçeneğini senkronlar', () => {
    const storage = new FakeStorage({
        [CHECKER_COLOR_STORAGE_KEY]: CHECKER_COLOR.BLACK
    });
    const white = new FakeInput(CHECKER_COLOR.WHITE);
    const black = new FakeInput(CHECKER_COLOR.BLACK);
    const changes = [];
    const controller = new CheckerColorPreferenceController({
        inputs: [white, black],
        storage,
        onChange: color => changes.push(color)
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(controller.getColor(), CHECKER_COLOR.BLACK);
    assert.equal(white.checked, false);
    assert.equal(black.checked, true);
    assert.deepEqual(changes, [CHECKER_COLOR.BLACK]);

    white.select();
    assert.equal(controller.getColor(), CHECKER_COLOR.WHITE);
    assert.equal(storage.getItem(CHECKER_COLOR_STORAGE_KEY), CHECKER_COLOR.WHITE);
    assert.equal(white.checked, true);
    assert.equal(black.checked, false);
    assert.deepEqual(changes, [CHECKER_COLOR.BLACK, CHECKER_COLOR.WHITE]);

    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(white.listeners.size, 0);
    assert.equal(black.listeners.size, 0);
});

test('engellenen veya geçersiz depolama oyunu durdurmadan beyaza düşer', () => {
    const blocked = new FakeStorage({}, { blocked: true });
    const invalid = new FakeStorage({
        [CHECKER_COLOR_STORAGE_KEY]: 'purple'
    });

    assert.equal(readCheckerColorPreference(blocked), CHECKER_COLOR.WHITE);
    assert.equal(readCheckerColorPreference(invalid), CHECKER_COLOR.WHITE);

    const controller = new CheckerColorPreferenceController({
        inputs: [
            new FakeInput(CHECKER_COLOR.WHITE),
            new FakeInput(CHECKER_COLOR.BLACK)
        ],
        storage: blocked
    });
    assert.doesNotThrow(() => controller.start());
    assert.equal(controller.setColor(CHECKER_COLOR.BLACK), CHECKER_COLOR.BLACK);
});
