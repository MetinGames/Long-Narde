import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BOARD_LAYOUT,
    getPointRenderRect,
    getSlotFromCoordinates
} from '../engine/layout.js';

const anatolianLayout = {
    ...BOARD_LAYOUT,
    leftField: { x: 43, width: 331 },
    rightField: { x: 423, width: 331 },
    trayArea: {
        x: 758,
        width: 40,
        top: 42,
        bottom: 566
    },
    centerPointInset: 7
};

test('Anadolu temasında orta kasnak hamle alanı değildir', () => {
    assert.equal(
        getSlotFromCoordinates(400, 100, anatolianLayout),
        null
    );
});

test('Anadolu temasının sağ oyun alanı doğru haneyi seçer', () => {
    assert.equal(
        getSlotFromCoordinates(430, 100, anatolianLayout),
        6
    );
    assert.equal(
        getSlotFromCoordinates(700, 500, anatolianLayout),
        24
    );
});

test('orta çıta yanındaki dört hane görsel olarak menteşeden içeri çekilir', () => {
    const leftInnerPoint = getPointRenderRect(5, anatolianLayout);
    const rightInnerPoint = getPointRenderRect(6, anatolianLayout);

    assert.equal(
        leftInnerPoint.x + leftInnerPoint.width,
        anatolianLayout.leftField.x + anatolianLayout.leftField.width - 7
    );
    assert.equal(
        rightInnerPoint.x,
        anatolianLayout.rightField.x + 7
    );
    assert.ok(
        rightInnerPoint.x - (leftInnerPoint.x + leftInnerPoint.width) >= 60
    );
});
