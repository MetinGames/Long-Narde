import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppRuntimeState } from '../engine/appRuntimeState.js';

test('app runtime state starts with expected defaults', () => {
    const state = createAppRuntimeState();

    assert.equal(state.getSelectedSlotId(), null);
    assert.equal(state.getTotalMoveCounter(), 0);
    assert.equal(state.getTurnTimerInterval(), null);
    assert.equal(state.getScheduledTimeoutCount(), 0);
    assert.equal(state.isInitialStartPending(), true);
    assert.equal(state.isTimeoutResolutionInProgress(), false);
    assert.equal(state.hasVictoryMomentPlayed(), false);
});

test('selected slot set and clear flow works', () => {
    const state = createAppRuntimeState();

    state.setSelectedSlotId(12);
    assert.equal(state.getSelectedSlotId(), 12);

    state.clearSelectedSlotId();
    assert.equal(state.getSelectedSlotId(), null);
});

test('move counters and timeout guard flags can be updated', () => {
    const state = createAppRuntimeState();

    assert.equal(state.incrementTotalMoveCounter(), 1);
    assert.equal(state.incrementTotalMoveCounter(), 2);
    assert.equal(state.getTotalMoveCounter(), 2);

    state.resetTotalMoveCounter();
    assert.equal(state.getTotalMoveCounter(), 0);

    state.setTimeoutResolutionInProgress(true);
    assert.equal(state.isTimeoutResolutionInProgress(), true);
    state.setTimeoutResolutionInProgress(false);
    assert.equal(state.isTimeoutResolutionInProgress(), false);

    state.setVictoryMomentPlayed(true);
    assert.equal(state.hasVictoryMomentPlayed(), true);
    state.setVictoryMomentPlayed(false);
    assert.equal(state.hasVictoryMomentPlayed(), false);
});

test('session reset clears game lifecycle runtime state for new game', () => {
    const state = createAppRuntimeState();

    state.setSelectedSlotId(8);
    state.incrementTotalMoveCounter();
    state.setTurnTimerInterval(12345);
    state.addScheduledTimeout('t1');
    state.addScheduledTimeout('t2');
    state.setTimeoutResolutionInProgress(true);
    state.setVictoryMomentPlayed(true);
    state.setInitialStartPending(false);

    state.resetForSession({ initialStartPending: false });

    assert.equal(state.getSelectedSlotId(), null);
    assert.equal(state.getTotalMoveCounter(), 0);
    assert.equal(state.getTurnTimerInterval(), null);
    assert.equal(state.getScheduledTimeoutCount(), 0);
    assert.equal(state.isInitialStartPending(), false);
    assert.equal(state.isTimeoutResolutionInProgress(), false);
    assert.equal(state.hasVictoryMomentPlayed(), false);
});

test('clearing scheduled timeouts cancels pending handles and leaves no stale state', () => {
    const state = createAppRuntimeState();
    const canceled = [];

    state.addScheduledTimeout('timeout-a');
    state.addScheduledTimeout('timeout-b');
    assert.equal(state.getScheduledTimeoutCount(), 2);

    state.clearScheduledTimeouts(id => {
        canceled.push(id);
    });

    canceled.sort();
    assert.deepEqual(canceled, ['timeout-a', 'timeout-b']);
    assert.equal(state.getScheduledTimeoutCount(), 0);
});

test('old callback session tokens are invalidated after reset', () => {
    const state = createAppRuntimeState();
    const oldToken = state.captureSessionToken();

    assert.equal(state.isSessionTokenCurrent(oldToken), true);

    state.resetForSession({ initialStartPending: false });

    assert.equal(state.isSessionTokenCurrent(oldToken), false);
    const newToken = state.captureSessionToken();
    assert.equal(state.isSessionTokenCurrent(newToken), true);
});

test('pending roll token ayni roll icin korunur, bitince temizlenir', () => {
    const state = createAppRuntimeState();

    const token = state.getOrCreatePendingRollToken(1);
    assert.equal(token > 0, true);
    assert.equal(state.getOrCreatePendingRollToken(1), token);

    assert.equal(state.markRollAnimationStarted(token), true);
    assert.equal(state.markRollAnimationStarted(token), false);

    state.markRollAnimationFinished(token);

    const nextToken = state.getOrCreatePendingRollToken(1);
    assert.equal(nextToken > token, true);
});

test('cancel pending roll temizligi yeni roll olusturulmasina izin verir', () => {
    const state = createAppRuntimeState();

    const token = state.getOrCreatePendingRollToken(2);
    assert.equal(state.markRollAnimationStarted(token), true);

    state.cancelPendingRoll();

    const nextToken = state.getOrCreatePendingRollToken(2);
    assert.equal(nextToken > token, true);
    assert.equal(state.markRollAnimationStarted(nextToken), true);
});
