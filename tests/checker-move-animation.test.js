import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import {
    captureCheckerTransition,
    completeCheckerTransition,
    easeCheckerMoveProgress,
    getCheckerMoveAnimationProfile,
    interpolateCheckerPoint
} from '../engine/checkerMoveAnimation.js';

function prepareSingleMoveGame() {
    const game = new NardeGame();
    game.initGame();
    game.gameStatus = 'PLAYING';
    game.dice.values = [3, 4];
    game.availableMoves = [3, 4];
    return game;
}

test('normal pul gecisi kaynak ve hedef yigin sayilarini korur', () => {
    const game = prepareSingleMoveGame();
    const capture = captureCheckerTransition(game, {
        fromSlot: 1,
        targetSlot: 4,
        player: 1
    });

    assert.equal(capture.sourceCountBefore, 15);
    assert.equal(game.executeMove(1, 3), true);

    const transition = completeCheckerTransition(capture, game);
    assert.equal(transition.targetCountAfter, 1);
    assert.equal(transition.player, 1);
});

test('toplama ve geri alma gecisleri tepsi ucunu destekler', () => {
    const game = new NardeGame();
    for (let slotId = 1; slotId <= 24; slotId++) {
        game.board.slots[slotId] = { count: 0, player: null };
    }
    game.board.slots[24] = { count: 1, player: 1 };
    game.board.slots[13] = { count: 15, player: 2 };
    game.board.borneOff = { 1: 14, 2: 0 };
    game.currentPlayer = 1;
    game.gameStatus = 'PLAYING';
    game.dice.values = [1, 2];
    game.availableMoves = [1, 2];

    const forward = captureCheckerTransition(game, {
        fromSlot: 24,
        targetSlot: 25,
        player: 1
    });
    assert.equal(game.executeMove(24, 1), true);
    assert.equal(completeCheckerTransition(forward, game).targetCountAfter, 15);

    const move = game.moveHistory.at(-1).move;
    const reverse = captureCheckerTransition(game, {
        fromSlot: move.targetSlot,
        targetSlot: move.fromSlot,
        player: move.player
    });
    assert.ok(game.undoLastMove());
    assert.equal(completeCheckerTransition(reverse, game).targetCountAfter, 1);
});

test('hareket profili azaltılmış hareket tercihini ve sınırları korur', () => {
    assert.deepEqual(getCheckerMoveAnimationProfile(true), {
        durationMs: 1,
        liftPx: 0
    });
    assert.ok(getCheckerMoveAnimationProfile(false).durationMs >= 180);
    assert.equal(easeCheckerMoveProgress(-1), 0);
    assert.equal(easeCheckerMoveProgress(2), 1);

    const point = interpolateCheckerPoint({
        from: { x: 10, y: 20 },
        target: { x: 110, y: 120 },
        progress: 1,
        liftPx: 24
    });
    assert.equal(point.x, 110);
    assert.equal(point.y, 120);
});
