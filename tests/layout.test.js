import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BOARD_LAYOUT,
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
    }
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

