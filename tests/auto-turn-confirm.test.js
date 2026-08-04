import test from 'node:test';
import assert from 'node:assert/strict';

import {
    AUTO_TURN_CONFIRM_DELAY_MS,
    AUTO_TURN_CONFIRM_STORAGE_KEY,
    AutoTurnConfirmPreferenceController,
    createAutoTurnConfirmFlow,
    isAutoTurnConfirmEligible,
    persistAutoTurnConfirmPreference,
    readAutoTurnConfirmPreference
} from '../engine/autoTurnConfirm.js';

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

function createToggle() {
    const listeners = new Map();
    return {
        checked: false,
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
        removeEventListener(type, handler) {
            if (listeners.get(type) === handler) listeners.delete(type);
        },
        change(checked) {
            this.checked = checked;
            listeners.get('change')?.({ target: this });
        },
        listenerCount() {
            return listeners.size;
        }
    };
}

function createScheduler() {
    let nextId = 1;
    const tasks = [];

    return {
        schedule(callback, delayMs) {
            const task = {
                id: nextId++,
                callback,
                delayMs,
                canceled: false
            };
            tasks.push(task);
            return task.id;
        },
        cancel(id) {
            const task = tasks.find(candidate => candidate.id === id);
            if (task) task.canceled = true;
        },
        runNext({ includeCanceled = false } = {}) {
            const task = tasks.shift();
            if (!task) return false;
            if (!task.canceled || includeCanceled) task.callback();
            return true;
        },
        pendingCount() {
            return tasks.filter(task => !task.canceled).length;
        },
        tasks
    };
}

function createCompletedHumanTurn() {
    return {
        currentPlayer: 1,
        gameStatus: 'PLAYING',
        moveHistory: [{ move: { fromSlot: 1, targetSlot: 4 } }],
        availableMoves: [],
        hasValidMoves() {
            return false;
        }
    };
}

test('preference is off by default and persists an explicit device choice', () => {
    const storage = new FakeStorage();

    assert.equal(readAutoTurnConfirmPreference(storage), false);
    assert.equal(persistAutoTurnConfirmPreference(storage, true), true);
    assert.equal(
        storage.getItem(AUTO_TURN_CONFIRM_STORAGE_KEY),
        'true'
    );
    assert.equal(readAutoTurnConfirmPreference(storage), true);

    storage.setItem(AUTO_TURN_CONFIRM_STORAGE_KEY, 'unexpected');
    assert.equal(readAutoTurnConfirmPreference(storage), false);
});

test('preference controller owns one listener and keeps the toggle synchronized', () => {
    const storage = new FakeStorage({
        [AUTO_TURN_CONFIRM_STORAGE_KEY]: 'true'
    });
    const toggle = createToggle();
    const changes = [];
    const controller = new AutoTurnConfirmPreferenceController({
        toggle,
        storage,
        onChange: enabled => changes.push(enabled)
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(toggle.listenerCount(), 1);
    assert.equal(toggle.checked, true);
    assert.equal(controller.isEnabled(), true);

    toggle.change(false);
    assert.equal(controller.isEnabled(), false);
    assert.equal(storage.getItem(AUTO_TURN_CONFIRM_STORAGE_KEY), 'false');
    assert.deepEqual(changes, [true, false]);

    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(toggle.listenerCount(), 0);
});

test('only a completed human turn with an undoable move is eligible', () => {
    const game = createCompletedHumanTurn();
    assert.equal(isAutoTurnConfirmEligible(game), true);

    game.moveHistory = [];
    assert.equal(isAutoTurnConfirmEligible(game), false);

    game.moveHistory = [{}];
    game.availableMoves = [4];
    game.hasValidMoves = () => true;
    assert.equal(isAutoTurnConfirmEligible(game), false);

    game.hasValidMoves = () => false;
    assert.equal(isAutoTurnConfirmEligible(game), true);

    game.currentPlayer = 2;
    assert.equal(isAutoTurnConfirmEligible(game), false);
});

test('enabled eligible flow waits two seconds and confirms once', () => {
    const game = createCompletedHumanTurn();
    const scheduler = createScheduler();
    const pendingStates = [];
    let confirmCount = 0;
    const flow = createAutoTurnConfirmFlow({
        game,
        getContext: () => ({ isEnabled: true }),
        scheduleConfirm: scheduler.schedule,
        cancelConfirm: scheduler.cancel,
        onPendingChange: value => pendingStates.push(value),
        onConfirm: () => {
            confirmCount += 1;
            game.currentPlayer = 2;
        }
    });

    assert.equal(flow.evaluate(), true);
    assert.equal(flow.evaluate(), true);
    assert.equal(scheduler.pendingCount(), 1);
    assert.equal(scheduler.tasks[0].delayMs, AUTO_TURN_CONFIRM_DELAY_MS);
    assert.equal(flow.isPending(), true);

    scheduler.runNext();
    assert.equal(confirmCount, 1);
    assert.equal(flow.isPending(), false);
    assert.deepEqual(pendingStates, [true, false]);
    assert.equal(flow.getLastStopReason(), 'confirmed');
});

test('undo cancellation invalidates even a stale callback that still fires', () => {
    const game = createCompletedHumanTurn();
    const scheduler = createScheduler();
    let confirmCount = 0;
    const flow = createAutoTurnConfirmFlow({
        game,
        getContext: () => ({ isEnabled: true }),
        scheduleConfirm: scheduler.schedule,
        cancelConfirm: scheduler.cancel,
        onConfirm: () => { confirmCount += 1; }
    });

    assert.equal(flow.evaluate(), true);
    assert.equal(flow.stop('undo'), true);
    game.availableMoves = [3];
    scheduler.runNext({ includeCanceled: true });

    assert.equal(confirmCount, 0);
    assert.equal(flow.isPending(), false);
    assert.equal(flow.getLastStopReason(), 'undo');
});

test('scheduled confirmation revalidates mandatory moves before ending the turn', () => {
    const game = createCompletedHumanTurn();
    const scheduler = createScheduler();
    const pendingEvents = [];
    let confirmCount = 0;
    const flow = createAutoTurnConfirmFlow({
        game,
        getContext: () => ({ isEnabled: true }),
        scheduleConfirm: scheduler.schedule,
        cancelConfirm: scheduler.cancel,
        onPendingChange: (value, detail) => {
            pendingEvents.push([value, detail.reason ?? null]);
        },
        onConfirm: () => { confirmCount += 1; }
    });

    assert.equal(flow.evaluate(), true);
    game.availableMoves = [6];
    game.hasValidMoves = () => true;
    scheduler.runNext();

    assert.equal(confirmCount, 0);
    assert.equal(flow.getLastStopReason(), 'revalidation-failed');
    assert.deepEqual(pendingEvents, [
        [true, null],
        [false, 'revalidation-failed']
    ]);
});

test('disabled and unsafe lifecycle contexts never schedule confirmation', () => {
    const game = createCompletedHumanTurn();
    const scheduler = createScheduler();
    const context = {
        isEnabled: false,
        isStartScreen: false,
        isTimeoutResolutionInProgress: false,
        isCheckerMoveAnimating: false,
        isAutoBearOffRunning: false
    };
    const flow = createAutoTurnConfirmFlow({
        game,
        getContext: () => context,
        scheduleConfirm: scheduler.schedule,
        cancelConfirm: scheduler.cancel
    });

    for (const blockedKey of [
        'isStartScreen',
        'isTimeoutResolutionInProgress',
        'isCheckerMoveAnimating',
        'isAutoBearOffRunning'
    ]) {
        context.isEnabled = true;
        context[blockedKey] = true;
        assert.equal(flow.evaluate(), false);
        context[blockedKey] = false;
    }

    context.isEnabled = false;
    assert.equal(flow.evaluate(), false);
    assert.equal(scheduler.pendingCount(), 0);
});

test('storage failures never block the local preference', () => {
    const storage = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); }
    };

    assert.equal(readAutoTurnConfirmPreference(storage), false);
    assert.doesNotThrow(() => {
        assert.equal(persistAutoTurnConfirmPreference(storage, true), true);
    });
});
