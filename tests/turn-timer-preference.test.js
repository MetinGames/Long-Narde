import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_TURN_TIMER_SECONDS,
    normalizeTurnTimerSeconds,
    persistTurnTimerPreference,
    readTurnTimerPreference,
    TURN_TIMER_SECONDS,
    TURN_TIMER_STORAGE_KEY,
    TurnTimerPreferenceController
} from '../engine/turnTimerPreference.js';

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

class FakeSelect {
    constructor() {
        this.value = '';
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

    change(value) {
        this.value = String(value);
        this.listeners.get('change')?.({ target: this });
    }
}

test('yalnız Kapalı, 30, 60 ve 90 saniye kabul edilir', () => {
    assert.equal(normalizeTurnTimerSeconds(0), TURN_TIMER_SECONDS.OFF);
    assert.equal(normalizeTurnTimerSeconds('30'), 30);
    assert.equal(normalizeTurnTimerSeconds(60), 60);
    assert.equal(normalizeTurnTimerSeconds('90'), 90);
    assert.equal(normalizeTurnTimerSeconds(null), DEFAULT_TURN_TIMER_SECONDS);
    assert.equal(normalizeTurnTimerSeconds(45), DEFAULT_TURN_TIMER_SECONDS);
});

test('süre tercihi bu cihazda saklanır ve geri okunur', () => {
    const storage = new FakeStorage();

    assert.equal(readTurnTimerPreference(storage), 30);
    assert.equal(persistTurnTimerPreference(storage, 60), 60);
    assert.equal(storage.getItem(TURN_TIMER_STORAGE_KEY), '60');
    assert.equal(readTurnTimerPreference(storage), 60);
});

test('Kapalı seçimi sıfır değeriyle kalıcıdır', () => {
    const storage = new FakeStorage();

    persistTurnTimerPreference(storage, TURN_TIMER_SECONDS.OFF);
    assert.equal(storage.getItem(TURN_TIMER_STORAGE_KEY), '0');
    assert.equal(readTurnTimerPreference(storage), TURN_TIMER_SECONDS.OFF);
});

test('seçici kayıtlı değeri yükler ve değişiklikleri bildirir', () => {
    const storage = new FakeStorage({
        [TURN_TIMER_STORAGE_KEY]: '90'
    });
    const select = new FakeSelect();
    const changes = [];
    const controller = new TurnTimerPreferenceController({
        select,
        storage,
        onChange: value => changes.push(value)
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(select.value, '90');
    assert.equal(controller.getDurationSeconds(), 90);

    select.change('0');
    assert.equal(controller.getDurationSeconds(), 0);
    assert.equal(storage.getItem(TURN_TIMER_STORAGE_KEY), '0');
    assert.deepEqual(changes, [90, 0]);

    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(select.listeners.has('change'), false);
});

test('engellenen depolama süre seçimini ve oyunu bozmaz', () => {
    const blockedStorage = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); }
    };

    assert.equal(
        readTurnTimerPreference(blockedStorage),
        DEFAULT_TURN_TIMER_SECONDS
    );
    assert.doesNotThrow(() => {
        persistTurnTimerPreference(blockedStorage, 90);
    });
});
