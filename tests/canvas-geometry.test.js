import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MAX_CANVAS_PIXEL_RATIO,
    canvasMatchesGeometry,
    getCanvasGeometry,
    mapClientPointToLogicalCoordinates,
    normalizeCanvasPixelRatio
} from '../engine/canvasGeometry.js';

test('DPR 1, 2 ve 3 mantıksal tahtayı doğru backing store ölçüsüne çevirir', () => {
    const expected = [
        [1, 800, 600],
        [2, 1600, 1200],
        [3, 2400, 1800]
    ];

    for (const [pixelRatio, backingWidth, backingHeight] of expected) {
        assert.deepEqual(
            getCanvasGeometry({
                logicalWidth: 800,
                logicalHeight: 600,
                pixelRatio
            }),
            {
                logicalWidth: 800,
                logicalHeight: 600,
                pixelRatio,
                backingWidth,
                backingHeight
            }
        );
    }
});

test('geçersiz DPR güvenli biçimde 1 olur ve aşırı yoğunluk 3 ile sınırlanır', () => {
    assert.equal(normalizeCanvasPixelRatio(undefined), 1);
    assert.equal(normalizeCanvasPixelRatio(0), 1);
    assert.equal(normalizeCanvasPixelRatio(-2), 1);
    assert.equal(normalizeCanvasPixelRatio(2.5), 2.5);
    assert.equal(normalizeCanvasPixelRatio(4), MAX_CANVAS_PIXEL_RATIO);
});

test('DPR backing store değişse de ters pointer eşlemesi aynı mantıksal noktayı verir', () => {
    for (const pixelRatio of [1, 2, 3]) {
        const geometry = getCanvasGeometry({
            logicalWidth: 800,
            logicalHeight: 600,
            pixelRatio
        });
        const canvas = {
            width: geometry.backingWidth,
            height: geometry.backingHeight,
            dataset: {
                logicalWidth: '800',
                logicalHeight: '600',
                pixelRatio: String(pixelRatio)
            }
        };

        assert.equal(canvasMatchesGeometry(canvas, geometry), true);
        assert.deepEqual(
            mapClientPointToLogicalCoordinates(
                { clientX: 210, clientY: 170 },
                { left: 10, top: 20, width: 400, height: 300 },
                { width: 800, height: 600 }
            ),
            { x: 400, y: 300 }
        );
    }
});

test('portrait ve landscape CSS ölçüleri tahta merkezini değiştirmez', () => {
    const layouts = [
        { left: 0, top: 0, width: 390, height: 292.5 },
        { left: 22, top: 12, width: 800, height: 600 },
        { left: 8, top: 6, width: 844, height: 633 }
    ];

    for (const rect of layouts) {
        const point = mapClientPointToLogicalCoordinates(
            {
                clientX: rect.left + (rect.width / 2),
                clientY: rect.top + (rect.height / 2)
            },
            rect,
            { width: 800, height: 600 }
        );
        assert.ok(Math.abs(point.x - 400) < Number.EPSILON * 400);
        assert.ok(Math.abs(point.y - 300) < Number.EPSILON * 300);
    }
});

test('görünmeyen veya ölçüsüz canvas pointer hit üretmez', () => {
    assert.equal(
        mapClientPointToLogicalCoordinates(
            { clientX: 20, clientY: 20 },
            { left: 0, top: 0, width: 0, height: 0 },
            { width: 800, height: 600 }
        ),
        null
    );
});
