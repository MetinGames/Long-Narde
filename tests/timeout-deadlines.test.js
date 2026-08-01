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

test('her yeni insan turu taze 30 saniye deadline ile baslar', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
    assert.equal(controller.turnDeadlineAt, 30000);
    assert.equal(controller.getRemainingSeconds(), 30);

    clock.advance(10000);
    assert.equal(controller.getRemainingSeconds(), 20);

    controller.stopTurnDeadline();

    // Bot turu bittiğinde yeni insan turu tekrar 30 saniyeden başlamalı.
    clock.advance(5000);
    controller.startHumanTurn(30, 0);
    assert.equal(controller.turnDeadlineAt, 45000);
    assert.equal(controller.getRemainingSeconds(), 30);
});

test('ilk timeout sonrasi bottan sonra insan turu tekrar 30 saniyeden baslar', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);

    clock.advance(30000);
    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });

    assert.equal(firstTimeout.action, 'firstTimeout');
    assert.equal(controller.turnDeadlineAt, 0);

    // Bot turunda insan sayacı/deadline işlemez.
    clock.advance(5000);
    const botTurnEval = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2,
        timeoutStrikes: 1
    });
    assert.equal(botTurnEval.action, 'none');

    controller.startHumanTurn(30, 1);
    assert.equal(controller.getRemainingSeconds(), 30);
});

test('30 -> 20 -> bot -> insan 30 olur, eski kalan sure tasinmaz', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
    clock.advance(10000);
    assert.equal(controller.getRemainingSeconds(), 20);

    controller.stopTurnDeadline();

    clock.advance(7000);
    controller.startHumanTurn(30, 0);
    assert.equal(controller.getRemainingSeconds(), 30);
});

test('60 -> 50 -> 40 gibi kumulatif azalma uygulanmaz', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
    assert.equal(controller.getRemainingSeconds(), 30);

    clock.advance(10000);
    assert.equal(controller.getRemainingSeconds(), 20);

    controller.stopTurnDeadline();
    clock.advance(4000);
    controller.startHumanTurn(30, 0);
    assert.equal(controller.getRemainingSeconds(), 30);
});

test('ilk 30 saniye dolunca ilk timeout uyarisi olusur', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);

    clock.advance(29000);
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
    assert.equal(controller.turnDeadlineAt, 0);
});

test('ikinci 30 saniye timeoutunda oyun sonu maglubiyet timeoutu tetiklenir', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
    clock.set(30000);

    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');

    // Sonraki insan turu taze 30 saniye ile başlar.
    controller.startHumanTurn(30, 1);
    assert.equal(controller.absoluteForfeitDeadlineAt, 60000);

    clock.set(60000);

    const finalTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 1
    });

    assert.equal(finalTimeout.action, 'finalTimeout');
});

test('ilk uyarıdan sonra geçerli hamle timeout durumunu sıfırlar', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
    clock.set(30000);

    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');

    controller.startHumanTurn(30, 1);
    assert.ok(controller.absoluteForfeitDeadlineAt > 0);

    // Geçerli hamle sonrası uygulama timeout strike/deadline durumunu temizler.
    controller.clearForfeitWindow();
    assert.equal(controller.absoluteForfeitDeadlineAt, 0);

    clock.set(45000);
    const duringBotTurn = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2,
        timeoutStrikes: 0
    });
    assert.equal(duringBotTurn.action, 'none');

    controller.startHumanTurn(30, 0);
    assert.equal(controller.absoluteForfeitDeadlineAt, 0);
    assert.equal(controller.getRemainingSeconds(), 30);
});

test('başlangıç ekranındayken timeout işlemez', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
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

    controller.startHumanTurn(30, 0);
    clock.set(30000);
    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');

    controller.startHumanTurn(30, 1);
    clock.set(60000);
    const visibilityEventResult = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 1
    });
    assert.equal(visibilityEventResult.action, 'finalTimeout');

    const focusEventResult = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 1
    });
    assert.equal(focusEventResult.action, 'none');
});

test('bot turunda timeout cezalari uygulanmaz', () => {
    const clock = createClock(0);
    const controller = new TurnTimeoutController({ getNow: clock.now });

    controller.startHumanTurn(30, 0);
    clock.set(30000);
    const firstTimeout = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 1,
        timeoutStrikes: 0
    });
    assert.equal(firstTimeout.action, 'firstTimeout');

    // Bot turu sürerken insan deadline'ı çalışmamalı.
    clock.set(120000);
    const duringBotTurn = controller.evaluate({
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2,
        timeoutStrikes: 1
    });

    assert.equal(duringBotTurn.action, 'none');
});

