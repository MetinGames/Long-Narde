import test from 'node:test';
import assert from 'node:assert/strict';

import { createBotCallbackController } from '../engine/botCallbackController.js';

function flushTimers(timers) {
    while (timers.length > 0) {
        const timer = timers.shift();
        timer.callback();
    }
}

test('bot callback controller advances the next bot step after a successful first step', () => {
    const timers = [];
    const controller = createBotCallbackController({
        scheduleCallback(callback, delay) {
            const timer = { callback, delay };
            timers.push(timer);
            return timer;
        }
    });

    const moves = [];
    const state = {
        currentPlayer: 2,
        remainingSteps: 2
    };

    function runBotStep() {
        if (state.remainingSteps === 2) {
            moves.push('13-17');
            state.remainingSteps = 1;
            controller.scheduleNext(runBotStep, 550);
            return;
        }

        if (state.remainingSteps === 1) {
            moves.push('17-22');
            state.remainingSteps = 0;
            state.currentPlayer = 1;
        }
    }

    controller.scheduleNext(runBotStep, 550);
    flushTimers(timers);

    assert.deepEqual(moves, ['13-17', '17-22']);
    assert.equal(state.currentPlayer, 1);
    assert.equal(controller.isScheduled(), false);
    assert.equal(controller.isExecuting(), false);
});

test('bot callback controller still settles when a stale step is replaced by one safe retry', () => {
    const timers = [];
    const controller = createBotCallbackController({
        scheduleCallback(callback, delay) {
            const timer = { callback, delay };
            timers.push(timer);
            return timer;
        }
    });

    const executedSteps = [];
    let attempt = 0;
    const state = {
        currentPlayer: 2
    };

    function runBotStep() {
        attempt += 1;

        if (attempt === 1) {
            executedSteps.push('13-17');
            controller.scheduleNext(runBotStep, 550);
            return;
        }

        if (attempt === 2) {
            executedSteps.push('replanned-17-22');
            state.currentPlayer = 1;
        }
    }

    controller.scheduleNext(runBotStep, 550);
    flushTimers(timers);

    assert.deepEqual(executedSteps, ['13-17', 'replanned-17-22']);
    assert.equal(state.currentPlayer, 1);
    assert.equal(attempt, 2);
    assert.equal(controller.isScheduled(), false);
});

test('bot callback controller recovers from an async failure without leaving the turn locked', async () => {
    const timers = [];
    const recoveredErrors = [];
    const controller = createBotCallbackController({
        scheduleCallback(callback, delay) {
            const timer = { callback, delay };
            timers.push(timer);
            return timer;
        },
        onError(error) {
            recoveredErrors.push(error.message);
        }
    });

    controller.scheduleNext(async () => {
        throw new Error('bot-step-failed');
    }, 700);

    await timers[0].callback();

    assert.deepEqual(recoveredErrors, ['bot-step-failed']);
    assert.equal(controller.isScheduled(), false);
    assert.equal(controller.isExecuting(), false);
});
