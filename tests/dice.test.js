import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { Dice } from '../engine/dice.js';

const diceSource = fs.readFileSync(
    new URL('../engine/dice.js', import.meta.url),
    'utf8'
);

test('zar durumu tek reset sözleşmesiyle temizlenir', () => {
    const dice = new Dice();
    dice.values = [6, 4];

    dice.reset();
    assert.deepEqual(dice.values, []);
    assert.equal(Object.hasOwn(dice, 'movesLeft'), false);

    assert.doesNotThrow(() => dice.reset());
    assert.deepEqual(dice.values, []);
});

test('Dice sınıfında reset tanımı yinelenmez', () => {
    const resetDefinitions = diceSource.match(/^\s{4}reset\(\)\s*\{/gm) ?? [];
    assert.equal(resetDefinitions.length, 1);
});
