import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';

function clearBoard(game) {
    for (let slotId = 1; slotId <= 24; slotId++) {
        game.board.slots[slotId] = { count: 0, player: null };
    }
}

test('rakip hic pul toplamadiysa beyaz galibiyeti Mars ve iki puandir', () => {
    const game = new NardeGame();
    clearBoard(game);
    game.board.slots[13] = { count: 15, player: 2 };
    game.board.borneOff = { 1: 15, 2: 0 };

    assert.equal(game.checkWinCondition(), 1);
    assert.equal(game.gameStatus, 'GAME_OVER');
    assert.equal(game.victoryType, 'mars');
    assert.equal(game.matchPoints, 2);
});

test('kaybeden en az bir pul topladiysa sonuc normal ve bir puandir', () => {
    const game = new NardeGame();
    clearBoard(game);
    game.board.slots[13] = { count: 14, player: 2 };
    game.board.borneOff = { 1: 15, 2: 1 };

    assert.equal(game.checkWinCondition(), 1);
    assert.equal(game.victoryType, 'normal');
    assert.equal(game.matchPoints, 1);
});

test('siyah da ayni Mars siniflandirmasini kullanir', () => {
    const game = new NardeGame();
    clearBoard(game);
    game.board.slots[1] = { count: 15, player: 1 };
    game.board.borneOff = { 1: 0, 2: 15 };

    assert.equal(game.checkWinCondition(), 2);
    assert.equal(game.victoryType, 'mars');
    assert.equal(game.matchPoints, 2);
});

test('zaman asimi Mars olarak siniflandirilmaz', () => {
    const game = new NardeGame();
    game.initGame();

    assert.equal(game.recordHumanTimeout(), 'warning');
    assert.equal(game.recordHumanTimeout(), 'gameOver');
    assert.equal(game.victoryType, 'timeout');
    assert.equal(game.matchPoints, 1);
});
