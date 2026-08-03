import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeBot } from '../engine/bot.js';
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

test('Champion trades a rear stack for a prime in front of the opponent', () => {
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
        { from: 11, dice: 1, target: 12 }
    ]);
    assert.deepEqual(plan.moves, [
        { from: 2, dice: 1, target: 3 },
        { from: 6, dice: 4, target: 10 }
    ]);
    assert.ok(plan.stackPenalty < legacy.stackPenalty);
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
