import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';

function prepareGame({ player = 1, dice = [3, 5], pieces = [] } = {}) {
    const game = new NardeGame();

    for (let slotId = 1; slotId <= 24; slotId++) {
        game.board.slots[slotId] = { count: 0, player: null };
    }

    for (const { slot, count, owner } of pieces) {
        game.board.slots[slot] = { count, player: owner };
    }

    game.board.borneOff = { 1: 0, 2: 0 };
    game.currentPlayer = player;
    game.gameStatus = 'PLAYING';
    game.dice.values = [...dice];
    game.availableMoves = [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { 1: 1, 2: 1 };

    return game;
}

test('illegal six-point prime exposes a specific unplayable reason', () => {
    const game = prepareGame({
        dice: [6],
        pieces: [
            { slot: 1, count: 1, owner: 1 },
            { slot: 2, count: 1, owner: 1 },
            { slot: 3, count: 1, owner: 1 },
            { slot: 4, count: 1, owner: 1 },
            { slot: 5, count: 1, owner: 1 },
            { slot: 6, count: 1, owner: 1 },
            { slot: 13, count: 15, owner: 2 }
        ]
    });

    assert.equal(game.board.getInvalidMoveReason(1, 1, 7), 'illegalPrime');
    assert.equal(game.board.isValidMove(1, 1, 7), false);
    assert.equal(game.getUnplayableReason(1), 'illegalPrime');
});

test('bearing off reports when every checker is not home yet', () => {
    const game = prepareGame({
        dice: [1],
        pieces: [
            { slot: 1, count: 1, owner: 1 },
            { slot: 24, count: 1, owner: 1 }
        ]
    });

    assert.equal(
        game.board.getInvalidMoveReason(1, 24, 25),
        'bearingOffHomeRequired'
    );
    assert.equal(game.getUnplayableReason(24), 'bearingOffHomeRequired');
});

test('higher-die bearing off reports a farther checker in home', () => {
    const game = prepareGame({
        dice: [3],
        pieces: [
            { slot: 23, count: 1, owner: 1 },
            { slot: 24, count: 1, owner: 1 }
        ]
    });

    assert.equal(
        game.board.getInvalidMoveReason(1, 24, 27),
        'bearingOffFartherChecker'
    );
    assert.equal(
        game.getUnplayableReason(24),
        'bearingOffFartherChecker'
    );
});

test('valid exact bearing off remains valid and has no invalid reason', () => {
    const game = prepareGame({
        dice: [1],
        pieces: [{ slot: 24, count: 1, owner: 1 }]
    });

    assert.equal(game.board.getInvalidMoveReason(1, 24, 25), null);
    assert.equal(game.board.isValidMove(1, 24, 25), true);
    assert.equal(game.getUnplayableReason(24), null);
});
