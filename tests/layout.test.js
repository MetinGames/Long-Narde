import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BOARD_LAYOUT,
    getSlotFromCoordinates
} from '../engine/layout.js';

const anatolianLayout = {
    ...BOARD_LAYOUT,
    leftField: { x: 20, width: 337.5 },
    rightField: { x: 434, width: 291 }
};

test('Anadolu temasında orta kasnak hamle alanı değildir', () => {
    assert.equal(
        getSlotFromCoordinates(390, 100, anatolianLayout),
        null
    );
});

test('Anadolu temasının sağ oyun alanı doğru haneyi seçer', () => {
    assert.equal(
        getSlotFromCoordinates(440, 100, anatolianLayout),
        6
    );
    assert.equal(
        getSlotFromCoordinates(700, 500, anatolianLayout),
        24
    );
});
