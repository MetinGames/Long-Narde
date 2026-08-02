import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import {
    applyNoLegalMoveAutoPass,
    hasAnyRuleCompliantTurnStart
} from '../engine/noLegalMoveAutoPass.js';
import { TurnTimeoutController } from '../engine/timeoutController.js';

function prepareGame({
    player = 1,
    dice = [6, 5],
    pieces = [],
    enemyPieces = [],
    borneOff = { 1: 0, 2: 0 },
    turnsCompleted = { 1: 1, 2: 1 },
    timeoutStrikes = 0
} = {}) {
    const game = new NardeGame();

    for (let slotId = 1; slotId <= 24; slotId++) {
        game.board.slots[slotId] = {
            count: 0,
            player: null
        };
    }

    for (const piece of pieces) {
        game.board.slots[piece.slot] = {
            count: piece.count,
            player: piece.owner
        };
    }

    for (const piece of enemyPieces) {
        game.board.slots[piece.slot] = {
            count: piece.count,
            player: piece.owner
        };
    }

    game.board.borneOff = { ...borneOff };
    game.currentPlayer = player;
    game.gameStatus = 'PLAYING';
    game.dice.values = [dice[0], dice[1]];
    game.availableMoves = dice[0] === dice[1]
        ? [dice[0], dice[0], dice[0], dice[0]]
        : [dice[0], dice[1]];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { ...turnsCompleted };
    game.timeoutStrikes = timeoutStrikes;
    game.moveHistory = [{ stub: true }];

    return game;
}

function createRuntimeStateSpy() {
    return {
        invalidations: 0,
        selectedClears: 0,
        invalidateSessionToken() {
            this.invalidations += 1;
        },
        clearSelectedSlotId() {
            this.selectedClears += 1;
        }
    };
}

test('ekrandaki 6-5 benzeri tamamen kapalı insan konumunda otomatik pas verir', () => {
    const game = prepareGame({
        player: 1,
        dice: [6, 5],
        pieces: [{ slot: 1, count: 15, owner: 1 }],
        enemyPieces: [
            { slot: 6, count: 2, owner: 2 },
            { slot: 7, count: 2, owner: 2 }
        ],
        timeoutStrikes: 1
    });

    assert.equal(hasAnyRuleCompliantTurnStart(game, { player: 1 }), false);

    const runtimeState = createRuntimeStateSpy();
    const timeoutController = new TurnTimeoutController({ getNow: () => 0 });
    timeoutController.startHumanTurn(30, 1);

    const bot = { resets: 0, resetPlannedTurn() { this.resets += 1; } };
    const autoBearOffFlow = { stops: [], stop(reason) { this.stops.push(reason); } };
    let timerStops = 0;
    let guardResets = 0;
    let botFeedbackEnds = 0;

    const result = applyNoLegalMoveAutoPass({
        game,
        runtimeState,
        timeoutController,
        bot,
        autoBearOffFlow,
        resetBotCallbackGuards() {
            guardResets += 1;
        },
        stopTurnTimer() {
            timerStops += 1;
        },
        endBotMoveFeedback() {
            botFeedbackEnds += 1;
        }
    });

    assert.equal(result.passed, true);
    assert.equal(result.fromPlayer, 1);
    assert.equal(result.toPlayer, 2);
    assert.equal(game.currentPlayer, 2);
    assert.equal(game.gameStatus, 'WAITING_FOR_DICE');
    assert.deepEqual(game.availableMoves, []);
    assert.equal(game.timeoutStrikes, 1);
    assert.equal(timeoutController.turnDeadlineAt, 0);
    assert.equal(runtimeState.invalidations, 1);
    assert.equal(runtimeState.selectedClears, 1);
    assert.equal(bot.resets, 1);
    assert.equal(autoBearOffFlow.stops.length, 1);
    assert.equal(timerStops, 1);
    assert.equal(guardResets, 1);
    assert.equal(botFeedbackEnds, 1);
    assert.deepEqual(game.moveHistory, []);

    timeoutController.startHumanTurn(30, game.timeoutStrikes);
    assert.equal(timeoutController.getRemainingSeconds(), 30);
});

test('tek zar oynanabiliyorsa otomatik pas verilmez', () => {
    const game = prepareGame({
        player: 1,
        dice: [6, 5],
        pieces: [{ slot: 1, count: 15, owner: 1 }],
        enemyPieces: [{ slot: 7, count: 2, owner: 2 }]
    });

    assert.equal(hasAnyRuleCompliantTurnStart(game, { player: 1 }), true);

    const result = applyNoLegalMoveAutoPass({
        game,
        runtimeState: createRuntimeStateSpy(),
        timeoutController: new TurnTimeoutController({ getNow: () => 0 })
    });

    assert.equal(result.passed, false);
    assert.equal(game.currentPlayer, 1);
    assert.equal(game.gameStatus, 'PLAYING');
});

test('multi-hop dizisi varsa otomatik pas verilmez', () => {
    const game = prepareGame({
        player: 1,
        dice: [1, 2],
        pieces: [{ slot: 1, count: 1, owner: 1 }],
        enemyPieces: []
    });

    assert.equal(hasAnyRuleCompliantTurnStart(game, { player: 1 }), true);
});

test('çiftlerde en az bir yasal hareket varsa otomatik pas verilmez', () => {
    const game = prepareGame({
        player: 1,
        dice: [3, 3],
        pieces: [{ slot: 1, count: 2, owner: 1 }]
    });

    assert.equal(hasAnyRuleCompliantTurnStart(game, { player: 1 }), true);
});

test('toplama hamlesi varsa otomatik pas verilmez', () => {
    const game = prepareGame({
        player: 1,
        dice: [1, 6],
        pieces: [{ slot: 24, count: 1, owner: 1 }],
        borneOff: { 1: 14, 2: 0 }
    });

    assert.equal(hasAnyRuleCompliantTurnStart(game, { player: 1 }), true);
});

test('bot hamlesiz kaldığında aynı güvenli mekanizma ile sıra insana geçer', () => {
    const game = prepareGame({
        player: 2,
        dice: [6, 5],
        pieces: [{ slot: 13, count: 15, owner: 2 }],
        enemyPieces: [
            { slot: 18, count: 2, owner: 1 },
            { slot: 19, count: 2, owner: 1 }
        ]
    });

    const result = applyNoLegalMoveAutoPass({
        game,
        runtimeState: createRuntimeStateSpy(),
        timeoutController: new TurnTimeoutController({ getNow: () => 0 })
    });

    assert.equal(result.passed, true);
    assert.equal(result.fromPlayer, 2);
    assert.equal(result.toPlayer, 1);
    assert.equal(game.currentPlayer, 1);
    assert.equal(game.gameStatus, 'WAITING_FOR_DICE');
});

test('tekrarlı tetiklerde yalnızca bir kez pas verir', () => {
    const game = prepareGame({
        player: 1,
        dice: [6, 5],
        pieces: [{ slot: 1, count: 15, owner: 1 }],
        enemyPieces: [
            { slot: 6, count: 2, owner: 2 },
            { slot: 7, count: 2, owner: 2 }
        ]
    });

    const first = applyNoLegalMoveAutoPass({
        game,
        runtimeState: createRuntimeStateSpy(),
        timeoutController: new TurnTimeoutController({ getNow: () => 0 })
    });

    const second = applyNoLegalMoveAutoPass({
        game,
        runtimeState: createRuntimeStateSpy(),
        timeoutController: new TurnTimeoutController({ getNow: () => 0 })
    });

    assert.equal(first.passed, true);
    assert.equal(second.passed, false);
});

test('GAME_OVER durumunda pas uygulanmaz', () => {
    const game = prepareGame({
        player: 1,
        dice: [6, 5],
        pieces: [{ slot: 1, count: 15, owner: 1 }],
        enemyPieces: [
            { slot: 6, count: 2, owner: 2 },
            { slot: 7, count: 2, owner: 2 }
        ]
    });
    game.gameStatus = 'GAME_OVER';

    const result = applyNoLegalMoveAutoPass({
        game,
        runtimeState: createRuntimeStateSpy(),
        timeoutController: new TurnTimeoutController({ getNow: () => 0 })
    });

    assert.equal(result.passed, false);
    assert.equal(game.currentPlayer, 1);
});
