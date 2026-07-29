import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import {
    applyPostUndoLayout,
    getActionButtonState,
    shouldShowActionButtonsAfterUndo
} from '../engine/undoActionButtons.js';

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
    game.dice.values = Array.from(new Set(dice)).slice(0, 2);
    game.availableMoves = [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { 1: 1, 2: 1 };
    game.moveHistory = [];

    return game;
}

function createUiSpy() {
    return {
        calls: [],
        setHumanMoveLayout() {
            this.calls.push('move');
        },
        setHumanPlayingLayout() {
            this.calls.push('playing');
        }
    };
}

test('iki hamleden sonra bir kez undo edilince hamle gecmisi varsa aksiyon dugmeleri gorunur kalir', () => {
    const game = prepareGame({
        dice: [3, 4],
        pieces: [{ slot: 2, count: 2, owner: 1 }]
    });

    assert.equal(game.executeMove(2, 3), true);
    assert.equal(game.executeMove(5, 4), true);
    assert.equal(game.moveHistory.length, 2);

    assert.equal(game.undoTurnMoves(), true);
    assert.equal(game.moveHistory.length, 1);
    assert.equal(shouldShowActionButtonsAfterUndo(game), true);

    const ui = createUiSpy();
    applyPostUndoLayout({ game, ui });
    assert.deepEqual(ui.calls, ['move']);
});

test('undo sonrasi yasal hamle kalmadiginda confirm gorunur akif hesaplanir', () => {
    const syntheticGame = {
        currentPlayer: 1,
        gameStatus: 'PLAYING',
        moveHistory: [{ snapshot: true }],
        availableMoves: [3],
        hasValidMoves() {
            return false;
        }
    };

    const state = getActionButtonState(syntheticGame);
    assert.equal(shouldShowActionButtonsAfterUndo(syntheticGame), true);
    assert.equal(state.canUndo, true);
    assert.equal(state.canConfirm, true);
});

test('undo sonrasi yasal hamle varsa undo aktif ve confirm pasif olur', () => {
    const syntheticGame = {
        currentPlayer: 1,
        gameStatus: 'PLAYING',
        moveHistory: [{ snapshot: true }],
        availableMoves: [5],
        hasValidMoves() {
            return true;
        }
    };

    const state = getActionButtonState(syntheticGame);
    assert.equal(shouldShowActionButtonsAfterUndo(syntheticGame), true);
    assert.equal(state.canUndo, true);
    assert.equal(state.canConfirm, false);
});

test('butun hamleler geri alindiginda dugmeler baslangic duzenine doner', () => {
    const game = prepareGame({
        dice: [3],
        pieces: [{ slot: 2, count: 1, owner: 1 }]
    });

    assert.equal(game.executeMove(2, 3), true);
    assert.equal(game.moveHistory.length, 1);
    assert.equal(game.undoTurnMoves(), true);
    assert.equal(game.moveHistory.length, 0);

    const ui = createUiSpy();
    applyPostUndoLayout({ game, ui });
    assert.deepEqual(ui.calls, ['playing']);
});

test('cift zarda art arda iki undo dogru layout verir', () => {
    const game = prepareGame({
        dice: [4, 4, 4, 4],
        pieces: [{ slot: 2, count: 1, owner: 1 }]
    });

    assert.equal(game.executeMove(2, 4), true);
    assert.equal(game.executeMove(6, 4), true);
    assert.equal(game.moveHistory.length, 2);

    const ui = createUiSpy();

    assert.equal(game.undoTurnMoves(), true);
    applyPostUndoLayout({ game, ui });
    assert.equal(game.moveHistory.length, 1);

    assert.equal(game.undoTurnMoves(), true);
    applyPostUndoLayout({ game, ui });
    assert.equal(game.moveHistory.length, 0);

    assert.deepEqual(ui.calls, ['move', 'playing']);
});

test('gecersiz undo ui duzenini degistirmez', () => {
    const game = prepareGame({
        dice: [5],
        pieces: [{ slot: 2, count: 1, owner: 1 }]
    });
    const ui = createUiSpy();

    assert.equal(game.moveHistory.length, 0);
    assert.equal(game.undoTurnMoves(), false);

    // Invalid undo does not call post-undo layout helper.
    assert.deepEqual(ui.calls, []);
});
