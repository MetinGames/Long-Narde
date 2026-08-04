import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { bindCanvasInput } from '../engine/input.js';

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

test('bot turunda dokunus hamle veya metin bildirimi uretmez', () => {
    const previousWindow = globalThis.window;
    globalThis.window = { PointerEvent: class {} };

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clickedSlots = [];

    try {
        bindCanvasInput(canvas, {
            canInteract: () => false,
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
    } finally {
        globalThis.window = previousWindow;
    }
});

test('desktop click fallback bot turunda sessizce engellenir', () => {
    const previousWindow = globalThis.window;
    globalThis.window = {};

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    try {
        bindCanvasInput(canvas, {
            canInteract: () => false,
            onSlotClick() {
                assert.fail('Blocked bot turn must not reach a slot click');
            }
        });

        canvas.emit('click', {
            clientX: 220,
            clientY: 120
        });
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
    assert.equal(appSource.includes('BotTurnTouchFeedback'), false);
    assert.equal(appSource.includes('status.waitForBotTurn'), false);
});
