import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeBot } from '../engine/bot.js';
import { NardeGame } from '../engine/game.js';
import { createChampionProfileGame } from '../scripts/lib/championProfile.mjs';

const FRONT_BLOCK_FIXTURE = Object.freeze({
    stateHash: '321328a7',
    stateKey: '2|0|1,4|0|0|' +
        '2:2:1;3:2:1;4:2:1;5:2:1;6:2:1;7:2:2;' +
        '8:1:1;9:1:1;11:2:2;12:2:5;15:1:1;19:1:1;' +
        '20:1:8;23:1:3;24:2:1;',
    roll: Object.freeze([1, 4]),
    turnsCompleted: Object.freeze({ 1: 10, 2: 10 })
});

const REPLY_LOOKAHEAD_FIXTURE = Object.freeze({
    stateHash: '6ae6c047',
    stateKey: '1|0|6,4|0|0|' +
        '1:1:2;4:1:2;6:1:1;7:1:2;8:1:1;9:1:1;10:1:3;' +
        '13:2:3;14:1:1;15:1:1;16:1:1;17:2:1;18:2:1;' +
        '19:2:2;20:2:1;21:2:1;23:2:1;24:2:5;',
    roll: Object.freeze([6, 4]),
    turnsCompleted: Object.freeze({ 1: 10, 2: 10 })
});

const BLACK_WRAP_PROGRESS_FIXTURE = Object.freeze({
    stateHash: 'a200798a',
    stateKey: '2|0|6,3|0|0|' +
        '1:1:7;5:1:1;6:1:1;7:1:1;8:1:1;9:1:2;10:1:2;' +
        '11:2:1;13:2:7;19:2:3;21:2:2;22:2:1;24:2:1;',
    roll: Object.freeze([6, 3]),
    turnsCompleted: Object.freeze({ 1: 8, 2: 7 })
});

function createFixture(fixture) {
    return createChampionProfileGame(fixture);
}

function applyPlan(game, plan) {
    for (const move of plan.moves) {
        assert.equal(
            game.executeMove(move.from, move.dice, false),
            true
        );
    }
}

function getLegacyPipTotal(game, player) {
    let total = 0;
    for (let slotId = 1; slotId <= 24; slotId++) {
        const slot = game.board.slots[slotId];
        if (slot.player !== player || slot.count <= 0) continue;
        total += game.board.getBearOffDistance(player, slotId) * slot.count;
    }
    return total;
}

test('Champion pip distance is symmetric and continuous across black wrap', () => {
    const initial = new NardeGame();
    initial.initGame();
    const champion = new NardeBot(2, 'champion', () => 0.5);

    assert.equal(champion.getPipTotal(initial, 1), 360);
    assert.equal(champion.getPipTotal(initial, 2), 360);

    for (let slotId = 1; slotId <= 24; slotId++) {
        initial.board.slots[slotId] = { count: 0, player: null };
    }
    initial.board.slots[24] = { count: 1, player: 2 };
    assert.equal(champion.getPipTotal(initial, 2), 13);

    initial.board.slots[24] = { count: 0, player: null };
    initial.board.slots[1] = { count: 1, player: 2 };
    assert.equal(champion.getPipTotal(initial, 2), 12);
});

test('Champion advances the black rear checker across the wrap boundary', () => {
    const legacyGame = createFixture(BLACK_WRAP_PROGRESS_FIXTURE);
    const legacy = new NardeBot(2, 'champion', () => 0.5);
    legacy.getPipTotal = (game, player) => getLegacyPipTotal(game, player);
    const legacyPlan = legacy.buildChampionPlan(legacyGame);

    const game = createFixture(BLACK_WRAP_PROGRESS_FIXTURE);
    const champion = new NardeBot(2, 'champion', () => 0.5);
    const plan = champion.buildChampionPlan(game);

    assert.equal(legacy.getPipTotal(legacyGame, 2), -52);
    assert.equal(champion.getPipTotal(game, 2), 284);
    assert.deepEqual(legacyPlan.moves, [
        { from: 13, dice: 3, target: 16 },
        { from: 16, dice: 6, target: 22 }
    ]);
    assert.deepEqual(plan.moves, [
        { from: 22, dice: 6, target: 4 },
        { from: 24, dice: 3, target: 3 }
    ]);
    assert.ok(
        plan.opponentReplyMobility.legalMoveCount <
        legacyPlan.opponentReplyMobility.legalMoveCount
    );
    assert.equal(game.getSearchStateKey(), BLACK_WRAP_PROGRESS_FIXTURE.stateKey);
});

test('Champion extends a front prime without stalling black wrap progress', () => {
    const legacyGame = createFixture(FRONT_BLOCK_FIXTURE);
    const legacy = new NardeBot(
        2,
        'champion',
        () => 0.5,
        { useOpponentAwareStrategy: false }
    ).buildChampionPlan(legacyGame);

    const game = createFixture(FRONT_BLOCK_FIXTURE);
    const champion = new NardeBot(2, 'champion', () => 0.5);
    const plan = champion.buildChampionPlan(game);

    assert.deepEqual(legacy.moves, [
        { from: 7, dice: 4, target: 11 },
        { from: 24, dice: 1, target: 1 }
    ]);
    assert.deepEqual(plan.moves, [
        { from: 6, dice: 4, target: 10 },
        { from: 24, dice: 1, target: 1 }
    ]);
    assert.ok(
        plan.blockingStructure.pressure >
        legacy.blockingStructure.pressure
    );
    assert.equal(plan.blockingStructure.longest, 3);
    assert.equal(game.getSearchStateKey(), FRONT_BLOCK_FIXTURE.stateKey);
});

test('one-move reply lookahead chooses the plan with fewer opponent replies', () => {
    const withoutLookaheadGame = createFixture(REPLY_LOOKAHEAD_FIXTURE);
    const withoutLookahead = new NardeBot(
        1,
        'champion',
        () => 0.5,
        { useOpponentReplyLookahead: false }
    );
    const immediatePlan = withoutLookahead.buildChampionPlan(
        withoutLookaheadGame
    );
    assert.deepEqual(immediatePlan.moves, [
        { from: 1, dice: 6, target: 7 },
        { from: 4, dice: 4, target: 8 }
    ]);
    applyPlan(withoutLookaheadGame, immediatePlan);
    const immediateMobility = withoutLookahead.getOpponentReplyMobility(
        withoutLookaheadGame
    );

    const game = createFixture(REPLY_LOOKAHEAD_FIXTURE);
    const champion = new NardeBot(1, 'champion', () => 0.5);
    const plan = champion.buildChampionPlan(game);

    assert.deepEqual(plan.moves, [
        { from: 9, dice: 6, target: 15 },
        { from: 1, dice: 4, target: 5 }
    ]);
    assert.equal(immediateMobility.legalMoveCount, 34);
    assert.equal(plan.opponentReplyMobility.legalMoveCount, 32);
    assert.ok(
        plan.opponentReplyMobility.legalMoveCount <
        immediateMobility.legalMoveCount
    );
    assert.equal(game.getSearchStateKey(), REPLY_LOOKAHEAD_FIXTURE.stateKey);
});

test('opponent reply analysis restores the live game state exactly', () => {
    const game = createFixture(REPLY_LOOKAHEAD_FIXTURE);
    const champion = new NardeBot(1, 'champion', () => 0.5);
    const before = game.getSearchStateKey();
    const diceBefore = [...game.dice.values];
    const availableBefore = [...game.availableMoves];
    const headMovesBefore = game.headMovesThisTurn;

    const mobility = champion.getOpponentReplyMobility(game);

    assert.ok(mobility.legalMoveCount > 0);
    assert.equal(game.getSearchStateKey(), before);
    assert.deepEqual(game.dice.values, diceBefore);
    assert.deepEqual(game.availableMoves, availableBefore);
    assert.equal(game.headMovesThisTurn, headMovesBefore);
    assert.equal(game.currentPlayer, 1);
    assert.equal(game.gameStatus, 'PLAYING');
});
