import test from 'node:test';
import assert from 'node:assert/strict';

import {
    bindCanvasInput,
    getCanvasCoordinates
} from '../engine/input.js';

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

test('ekran koordinatını mantıksal canvas ölçüsüne çevirir', () => {
    const canvas = new FakeCanvas({
        left: 10,
        top: 20,
        width: 400,
        height: 300
    });

    assert.deepEqual(
        getCanvasCoordinates(canvas, {
            clientX: 210,
            clientY: 170
        }),
        { x: 400, y: 300 }
    );
});

test('canvas backing DPR 1/2/3 iken aynı dokunuş aynı mantıksal koordinatı verir', () => {
    for (const pixelRatio of [1, 2, 3]) {
        const canvas = new FakeCanvas({
            left: 12,
            top: 18,
            width: 400,
            height: 300
        });
        canvas.width = 800 * pixelRatio;
        canvas.height = 600 * pixelRatio;

        assert.deepEqual(
            getCanvasCoordinates(canvas, {
                clientX: 212,
                clientY: 168
            }),
            { x: 400, y: 300 }
        );
    }
});

test('sıfır boyutlu canvas koordinat üretmez', () => {
    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 0,
        height: 0
    });

    assert.equal(
        getCanvasCoordinates(canvas, {
            clientX: 10,
            clientY: 10
        }),
        null
    );
});

test('kısa pointer dokunuşunu yalnız bir kez işler', () => {
    globalThis.window = { PointerEvent: class {} };

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clicked = [];

    const unbind = bindCanvasInput(canvas, {
        onSlotClick: slotId => clicked.push(slotId)
    });

    canvas.emit('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 60,
        clientY: 40
    });
    canvas.emit('pointerup', {
        pointerId: 1,
        clientX: 62,
        clientY: 42,
        preventDefault() {}
    });

    assert.equal(clicked.length, 1);
    unbind();
    assert.equal(canvas.listeners.size, 0);
    delete globalThis.window;
});

test('sürükleme hareketini hamle olarak işlemez', () => {
    globalThis.window = { PointerEvent: class {} };

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clicked = [];

    bindCanvasInput(canvas, {
        onSlotClick: slotId => clicked.push(slotId)
    });

    canvas.emit('pointerdown', {
        pointerId: 7,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 60,
        clientY: 40
    });
    canvas.emit('pointerup', {
        pointerId: 7,
        clientX: 100,
        clientY: 80,
        preventDefault() {}
    });

    assert.deepEqual(clicked, []);
    delete globalThis.window;
});

test('etkilesim kapaliyken engellenen dokunmayi callback ile bildirir', () => {
    globalThis.window = { PointerEvent: class {} };

    const canvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    let blockedCount = 0;
    const clicked = [];

    bindCanvasInput(canvas, {
        canInteract: () => false,
        onBlockedInteraction: () => {
            blockedCount++;
        },
        onSlotClick: slotId => clicked.push(slotId)
    });

    canvas.emit('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 120,
        clientY: 60
    });
    canvas.emit('pointerup', {
        pointerId: 2,
        clientX: 121,
        clientY: 61,
        preventDefault() {}
    });

    assert.equal(blockedCount, 1);
    assert.deepEqual(clicked, []);
    delete globalThis.window;
});

test('tıklama ve kısa sürükleme aynı yasal slot sonucunu verir', () => {
    const clickCanvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const pointerCanvas = new FakeCanvas({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    });
    const clickHits = [];
    const pointerHits = [];
    const previousWindow = globalThis.window;

    bindCanvasInput(clickCanvas, {
        onSlotClick: slotId => clickHits.push(slotId)
    });

    clickCanvas.emit('click', {
        clientX: 320,
        clientY: 100
    });

    globalThis.window = { PointerEvent: class {} };

    bindCanvasInput(pointerCanvas, {
        onSlotClick: slotId => pointerHits.push(slotId)
    });

    pointerCanvas.emit('pointerdown', {
        pointerId: 9,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 320,
        clientY: 100
    });
    pointerCanvas.emit('pointerup', {
        pointerId: 9,
        clientX: 326,
        clientY: 104,
        preventDefault() {}
    });

    assert.deepEqual(clickHits, [7]);
    assert.deepEqual(pointerHits, [7]);

    globalThis.window = previousWindow;
});
