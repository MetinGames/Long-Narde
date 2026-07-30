import test from 'node:test';
import assert from 'node:assert/strict';

import { BotTurnTouchFeedback } from '../engine/botTurnTouchFeedback.js';
import { RestartButtonLock } from '../engine/restartButtonLock.js';
import {
    applyBotMoveFeedback,
    clearBotMoveFeedback,
    endBotMoveFeedback,
    resetBotMoveFeedback,
    startBotMoveFeedback
} from '../engine/botMoveFeedback.js';

function createButton() {
    return {
        disabled: false,
        attributes: new Map(),
        setAttribute(name, value) {
            this.attributes.set(name, value);
        },
        getAttribute(name) {
            return this.attributes.get(name);
        }
    };
}

test('bot turu bekleme mesaji bot turunda ilk dokunusta bir kez gosterilir', () => {
    const feedback = new BotTurnTouchFeedback();

    assert.equal(
        feedback.shouldShowWaitMessage({
            isStartScreen: false,
            gameStatus: 'PLAYING',
            currentPlayer: 2
        }),
        true
    );

    assert.equal(
        feedback.shouldShowWaitMessage({
            isStartScreen: false,
            gameStatus: 'PLAYING',
            currentPlayer: 2
        }),
        false
    );

    feedback.reset();

    assert.equal(
        feedback.shouldShowWaitMessage({
            isStartScreen: false,
            gameStatus: 'PLAYING',
            currentPlayer: 2
        }),
        true
    );
});

test('bot turu bekleme mesaji start ekrani ve oyun sonu durumunda gosterilmez', () => {
    const feedback = new BotTurnTouchFeedback();

    assert.equal(
        feedback.shouldShowWaitMessage({
            isStartScreen: true,
            gameStatus: 'PLAYING',
            currentPlayer: 2
        }),
        false
    );

    assert.equal(
        feedback.shouldShowWaitMessage({
            isStartScreen: false,
            gameStatus: 'GAME_OVER',
            currentPlayer: 2
        }),
        false
    );

    assert.equal(
        feedback.shouldShowWaitMessage({
            isStartScreen: false,
            gameStatus: 'PLAYING',
            currentPlayer: 1
        }),
        false
    );
});

test('restart kilidi butonu gecici olarak devre disi birakir ve sonra acar', async () => {
    const button = createButton();
    const timers = [];

    const lock = new RestartButtonLock({
        button,
        delayMs: 700,
        schedule(callback, delay) {
            const id = { callback, delay, cleared: false };
            timers.push(id);
            return id;
        },
        cancel(id) {
            id.cleared = true;
        }
    });

    lock.lock();

    assert.equal(lock.isLocked(), true);
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    assert.equal(timers[0].delay, 700);

    timers[0].callback();

    assert.equal(lock.isLocked(), false);
    assert.equal(button.disabled, false);
    assert.equal(button.getAttribute('aria-disabled'), 'false');

    lock.dispose();
});

test('restart kilidi yeniden lock cagrisinda eski zamanlayiciyi temizler', () => {
    const button = createButton();
    const timers = [];

    const lock = new RestartButtonLock({
        button,
        delayMs: 700,
        schedule(callback, delay) {
            const id = { callback, delay, cleared: false };
            timers.push(id);
            return id;
        },
        cancel(id) {
            id.cleared = true;
        }
    });

    lock.lock();
    const firstTimer = timers[0];

    lock.lock();

    assert.equal(firstTimer.cleared, true);
    assert.equal(timers.length, 2);
    assert.equal(button.disabled, true);

    lock.unlock();
    assert.equal(button.disabled, false);
    assert.equal(lock.isLocked(), false);
});

test('bot hamle geri bildirimi yardimcilari renderer metotlarini dogru cagirir', () => {
    const calls = [];
    const renderer = {
        clearBotMoveHighlight() {
            calls.push({ type: 'clear' });
        },
        setBotMoveHighlight(payload) {
            calls.push({ type: 'set', payload });
        }
    };

    startBotMoveFeedback(renderer);
    applyBotMoveFeedback(renderer, {
        fromSlot: 13,
        targetSlot: 16,
        reducedMotion: false
    });
    applyBotMoveFeedback(renderer, {
        fromSlot: 16,
        targetSlot: 25,
        reducedMotion: true
    });
    resetBotMoveFeedback(renderer);
    endBotMoveFeedback(renderer);
    clearBotMoveFeedback(renderer);

    assert.equal(calls[0].type, 'clear');
    assert.equal(calls[1].type, 'set');
    assert.equal(calls[1].payload.fromSlot, 13);
    assert.equal(calls[1].payload.targetSlot, 16);
    assert.equal(calls[1].payload.durationMs, 1250);

    assert.equal(calls[2].type, 'set');
    assert.equal(calls[2].payload.targetSlot, 25);
    assert.equal(calls[2].payload.durationMs, 1000);

    const clearCalls = calls.filter(item => item.type === 'clear').length;
    assert.equal(clearCalls, 4);
});
