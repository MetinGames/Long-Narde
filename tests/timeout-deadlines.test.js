import test from 'node:test';
import assert from 'node:assert/strict';

import { TurnTimeoutController } from '../engine/timeoutController.js';

function createClock(startAtMs = 0) {
    let now = startAtMs;
    return {
        now: () => now,
        set: value => {
            now = value;
        },
        advance: ms => {
            now += ms;
        }
    };
}

test('60 saniye sonunda ilk timeout tetiklenir', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(60, 0);

    clock.advance(59000);
    const beforeExpiry = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(beforeExpiry.action, 'none');
    assert.equal(beforeExpiry.remainingSeconds, 1);

    clock.advance(1000);
    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });

    assert.equal(firstTimeout.action, 'firstTimeout');
    assert.equal(controller.absoluteForfeitDeadlineAt, 120000);
});

test('120 saniyeden uzun arka plan dönüşünde mağlubiyet timeoutu tetiklenir', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(60, 0);
    clock.set(60000);

    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');

    // İlk timeout sonrası bot hamlesi beklenirken kullanıcı sekmeden uzun süre uzak kalsın.
    clock.set(181000);

    const finalTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'WAITING_FOR_DICE',
        currentPlayer: 2,
        timeoutStrikes: 1
    });

    assert.equal(finalTimeout.action, 'finalTimeout');
});

test('ilk uyarıdan sonra geçerli hamle timeout durumunu sıfırlar', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(60, 0);
    clock.set(60000);

    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');
    assert.ok(controller.absoluteForfeitDeadlineAt > 0);

    controller.clearForfeitWindow();
    assert.equal(controller.absoluteForfeitDeadlineAt, 0);

    clock.set(240000);
    const afterValidMove = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2,
        timeoutStrikes: 0
    });

    assert.equal(afterValidMove.action, 'none');
});

test('başlangıç ekranındayken timeout işlemez', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(60, 0);
    clock.set(999999);

    const result = controller.evaluate({
        isStartScreen: true,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });

    assert.equal(result.action, 'none');
});

test('tekrarlı visibility/focus tetiklerinde aynı timeout cezası iki kez uygulanmaz', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(60, 0);
    clock.set(60000);
    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');

    clock.set(130000);
    const visibilityEventResult = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'WAITING_FOR_DICE',
        currentPlayer: 2,
        timeoutStrikes: 1
    });
    assert.equal(visibilityEventResult.action, 'finalTimeout');

    const focusEventResult = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'WAITING_FOR_DICE',
        currentPlayer: 2,
        timeoutStrikes: 1
    });
    assert.equal(focusEventResult.action, 'none');
});
