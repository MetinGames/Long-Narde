import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { bindCanvasInput } from '../engine/input.js';
import { BotTurnTouchFeedback } from '../engine/botTurnTouchFeedback.js';
import { getLanguage, setLanguage, t } from '../engine/i18n.js';

class FakeCanvas {
    constructor(rect) {
        this.rect = rect;
        this.listeners = new Map();
    }

    getBoundingClientRect() {
        return this.rect;
    }

    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    removeEventListener(type, handler) {
        if (this.listeners.get(type) === handler) {
            this.listeners.delete(type);
        }
    }

    setPointerCapture() {}

    emit(type, event) {
        this.listeners.get(type)?.(event);
    }
}

function createBlockedInteractionHandler(feedback, gameState, messages) {
    return () => {
        if (
            feedback.shouldShowWaitMessage({
                isStartScreen: gameState.isStartScreen,
                gameStatus: gameState.gameStatus,
                currentPlayer: gameState.currentPlayer
            })
        ) {
            messages.push(t('status.waitForBotTurn'));
        }
    };
}

test('bot turunda dokunus hamle uretmez ve yalnizca ilk denemede gorunmez durum metnini gunceller', () => {
    const previousWindow = globalThis.window;
    const previousLanguage = getLanguage();
    globalThis.window = { PointerEvent: class {} };
    setLanguage('tr');

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clickedSlots = [];
    const messages = [];
    const feedback = new BotTurnTouchFeedback();
    const gameState = {
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2
    };

    try {
        bindCanvasInput(canvas, {
            canInteract: () => false,
            onBlockedInteraction: createBlockedInteractionHandler(
                feedback,
                gameState,
                messages
            ),
            onSlotClick: slotId => clickedSlots.push(slotId)
        });

        for (const pointerId of [10, 11]) {
            canvas.emit('pointerdown', {
                pointerId,
                pointerType: 'touch',
                isPrimary: true,
                clientX: 72,
                clientY: 48
            });
            canvas.emit('pointerup', {
                pointerId,
                clientX: 74,
                clientY: 49,
                preventDefault() {}
            });
        }

        assert.deepEqual(clickedSlots, []);
        assert.deepEqual(messages, [t('status.waitForBotTurn')]);
    } finally {
        setLanguage(previousLanguage);
        globalThis.window = previousWindow;
    }
});

test('desktop click fallback bot turunda ayni gorunmez durum yolunu kullanir', () => {
    const previousWindow = globalThis.window;
    globalThis.window = {};

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const messages = [];
    const gameState = {
        isStartScreen: false,
        gameStatus: 'PLAYING',
        currentPlayer: 2
    };

    try {
        bindCanvasInput(canvas, {
            canInteract: () => false,
            onBlockedInteraction: createBlockedInteractionHandler(
                new BotTurnTouchFeedback(),
                gameState,
                messages
            ),
            onSlotClick() {
                assert.fail('Blocked bot turn must not reach a slot click');
            }
        });

        canvas.emit('click', {
            clientX: 220,
            clientY: 120
        });

        assert.equal(messages.length, 1);
    } finally {
        globalThis.window = previousWindow;
    }
});

test('app bot geri bildirimini tahta vurgusuyla verir ve gorsel metin toastini baglamaz', () => {
    const appSource = fs.readFileSync(
        path.resolve('./app.js'),
        'utf8'
    );

    assert.ok(appSource.includes('applyBotMoveFeedback(renderer'));
    assert.equal(appSource.includes('GameFeedbackToast'), false);
    assert.equal(appSource.includes('gameFeedbackToast'), false);
});
