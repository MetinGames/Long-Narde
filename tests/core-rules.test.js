import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

function prepareGame({
    player = 1,
    dice = [3, 5],
    pieces = []
} = {}) {
    const game = new NardeGame();

    for (let slotId = 1; slotId <= 24; slotId++) {
        game.board.slots[slotId] = {
            count: 0,
            player: null
        };
    }

    for (const { slot, count, owner } of pieces) {
        game.board.slots[slot] = {
            count,
            player: owner
        };
    }

    game.board.borneOff = { 1: 0, 2: 0 };
    game.currentPlayer = player;
    game.gameStatus = 'PLAYING';
    game.dice.values = [...dice];
    game.availableMoves = [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { 1: 1, 2: 1 };
    game.moveHistory = [];

    return game;
}

test('yalnız bir zar oynanabiliyorsa büyük zar zorunludur', () => {
    const game = prepareGame({
        pieces: [
            { slot: 1, count: 1, owner: 1 },
            { slot: 9, count: 1, owner: 2 }
        ]
    });

    assert.equal(game.getMaximumPlayableMoveCount(), 1);
    assert.deepEqual(game.getRequiredDiceValues(), [5]);
    assert.equal(game.processPlayerInput(1, 4), false);
    assert.equal(game.processPlayerInput(1, 6), true);
    assert.deepEqual(game.availableMoves, [3]);
});

test('iki zar oynanabiliyorsa iki sıra da yasal başlangıçtır', () => {
    const game = prepareGame({
        pieces: [
            { slot: 2, count: 1, owner: 1 }
        ]
    });

    assert.equal(game.getMaximumPlayableMoveCount(), 2);
    assert.deepEqual(
        [...game.getRequiredDiceValues()].sort((a, b) => a - b),
        [3, 5]
    );

    const sequences = game.getRuleCompliantDiceSequences(2)
        .map(sequence => sequence.join(','));

    assert.ok(sequences.includes('3'));
    assert.ok(sequences.includes('5'));
    assert.ok(sequences.includes('3,5'));
    assert.ok(sequences.includes('5,3'));
});

test('bot zorunlu büyük zarı seçer', () => {
    const game = prepareGame({
        player: 2,
        pieces: [
            { slot: 13, count: 1, owner: 2 },
            { slot: 21, count: 1, owner: 1 }
        ]
    });
    const bot = new NardeBot(2, 'hard');

    const move = bot.makeDecision(game);

    assert.ok(move);
    assert.equal(move.from, 13);
    assert.equal(move.dice, 5);
    assert.equal(move.target, 18);
});

test('yeni oyun bütün kural durumunu başlangıca sıfırlar', () => {
    const game = new NardeGame();

    game.initGame();
    game.currentPlayer = 2;
    game.gameStatus = 'GAME_OVER';
    game.dice.values = [4, 5];
    game.availableMoves = [4, 5];
    game.headMovesThisTurn = 2;
    game.turnsCompleted = { 1: 4, 2: 3 };
    game.moveHistory = [{ stale: true }];
    game.board.borneOff = { 1: 7, 2: 9 };
    game.board.slots[1] = { count: 0, player: null };
    game.board.slots[13] = { count: 0, player: null };

    game.initGame();

    assert.equal(game.currentPlayer, 1);
    assert.equal(game.gameStatus, 'WAITING_FOR_DICE');
    assert.deepEqual(game.dice.values, []);
    assert.deepEqual(game.availableMoves, []);
    assert.equal(game.headMovesThisTurn, 0);
    assert.deepEqual(game.turnsCompleted, { 1: 0, 2: 0 });
    assert.deepEqual(game.moveHistory, []);
    assert.deepEqual(game.board.borneOff, { 1: 0, 2: 0 });
    assert.deepEqual(
        game.board.slots[game.board.getHeadSlot(1)],
        { count: 15, player: 1 }
    );
    assert.deepEqual(
        game.board.slots[game.board.getHeadSlot(2)],
        { count: 15, player: 2 }
    );
});

test('siyah pul 24 sınırından 1 hanesine doğru sarılır', () => {
    const game = prepareGame({
        player: 2,
        dice: [4],
        pieces: [
            { slot: 23, count: 1, owner: 2 }
        ]
    });

    assert.equal(game.board.calculateTargetSlot(2, 23, 4), 3);
    assert.equal(game.processPlayerInput(23, 3), true);
    assert.deepEqual(game.board.slots[3], {
        count: 1,
        player: 2
    });
});

test('siyah ev bölgesinden taş toplarken yeniden 1 hanesine sarılmaz', () => {
    const game = prepareGame({
        player: 2,
        dice: [4],
        pieces: [
            { slot: 9, count: 1, owner: 2 }
        ]
    });

    assert.equal(game.board.calculateTargetSlot(2, 9, 4), 13);
    assert.equal(game.processPlayerInput(9, 25), true);
    assert.equal(game.board.borneOff[2], 1);
    assert.deepEqual(game.board.slots[1], {
        count: 0,
        player: null
    });
});
