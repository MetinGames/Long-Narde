import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import {
    createAutoBearOffFlow,
    findBestAutoBearOffPlan,
    isAutoBearOffEligible,
    pickNextAutoBearOffMove
} from '../engine/autoBearOff.js';

function prepareGame({
    player = 1,
    dice = [3, 5],
    pieces = [],
    enemyPieces = []
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

    for (const { slot, count, owner } of enemyPieces) {
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

function createScheduledHarness() {
    let nextId = 1;
    const queue = [];

    return {
        scheduleStep(callback) {
            const id = nextId++;
            queue.push({ id, callback, canceled: false });
            return id;
        },
        cancelStep(id) {
            const task = queue.find(item => item.id === id);
            if (task) task.canceled = true;
        },
        runNext() {
            while (queue.length > 0) {
                const task = queue.shift();
                if (task.canceled) continue;
                task.callback();
                return true;
            }
            return false;
        },
        getPendingCount() {
            return queue.filter(item => !item.canceled).length;
        }
    };
}

test('bütün pullar son altı hanede değilken otomatik toplama uygun değildir', () => {
    const game = prepareGame({
        dice: [2, 4],
        pieces: [
            { slot: 18, count: 1, owner: 1 },
            { slot: 23, count: 1, owner: 1 }
        ]
    });

    assert.equal(isAutoBearOffEligible(game), false);
    assert.equal(findBestAutoBearOffPlan(game), null);
});

test('bütün pullar son altı hanedeyken otomatik toplama uygun olur', () => {
    const game = prepareGame({
        dice: [2, 4],
        pieces: [
            { slot: 21, count: 1, owner: 1 },
            { slot: 23, count: 1, owner: 1 }
        ]
    });

    assert.equal(isAutoBearOffEligible(game), true);
    const plan = findBestAutoBearOffPlan(game);
    assert.ok(plan);
    assert.ok(plan.usedDiceCount >= 1);
});

test('özellik kapalıyken otomatik hamle başlatılmaz', () => {
    const game = prepareGame({
        dice: [1],
        pieces: [{ slot: 24, count: 1, owner: 1 }]
    });

    const scheduler = createScheduledHarness();
    let enabled = false;
    let applyCount = 0;

    const flow = createAutoBearOffFlow({
        game,
        getContext: () => ({
            isEnabled: enabled,
            isStartScreen: false,
            isTimeoutResolutionInProgress: false
        }),
        scheduleStep: scheduler.scheduleStep,
        cancelStep: scheduler.cancelStep,
        applyMove: move => {
            applyCount++;
            return game.executeMove(move.from, move.dice);
        },
        onFinishTurn: () => {
            game.confirmTurnEnd();
        }
    });

    assert.equal(flow.evaluate(), false);
    assert.equal(applyCount, 0);
    assert.equal(game.board.borneOff[1], 0);
});

test('kesin zarla toplama kuralını kullanır', () => {
    const game = prepareGame({
        dice: [1],
        pieces: [{ slot: 24, count: 1, owner: 1 }]
    });

    const nextMove = pickNextAutoBearOffMove(game);
    assert.ok(nextMove);
    assert.equal(nextMove.from, 24);
    assert.equal(nextMove.dice, 1);
    assert.equal(nextMove.target, 25);
});

test('büyük zarla toplama sadece kurallar izin verirse seçilir', () => {
    const allowedGame = prepareGame({
        dice: [6],
        pieces: [{ slot: 24, count: 1, owner: 1 }]
    });

    const allowedMove = pickNextAutoBearOffMove(allowedGame);
    assert.ok(allowedMove);
    assert.equal(allowedMove.from, 24);
    assert.equal(allowedMove.target, 25);

    const forbiddenGame = prepareGame({
        dice: [6],
        pieces: [
            { slot: 24, count: 1, owner: 1 },
            { slot: 19, count: 1, owner: 1 }
        ]
    });

    const forbiddenMove = pickNextAutoBearOffMove(forbiddenGame);
    assert.ok(forbiddenMove);
    assert.notEqual(`${forbiddenMove.from}-${forbiddenMove.dice}`, '24-6');
});

test('yalnız tek zar oynanabiliyorsa büyük zarı kullanır', () => {
    const game = prepareGame({
        dice: [3, 5],
        pieces: [{ slot: 20, count: 1, owner: 1 }],
        enemyPieces: [{ slot: 23, count: 1, owner: 2 }]
    });

    const nextMove = pickNextAutoBearOffMove(game);
    assert.ok(nextMove);
    assert.equal(nextMove.dice, 5);
    assert.equal(nextMove.target, 25);
});

test('çift zarda dört hakkı doğru sırayla tüketir', () => {
    const game = prepareGame({
        dice: [1, 1, 1, 1],
        pieces: [{ slot: 21, count: 1, owner: 1 }]
    });

    const plan = findBestAutoBearOffPlan(game);
    assert.ok(plan);
    assert.equal(plan.usedDiceCount, 4);
    assert.equal(plan.bearOffCount, 1);
});

test('otomatik plan en fazla zar hakkı kullanan diziyi seçer', () => {
    const game = prepareGame({
        dice: [1, 1, 1, 1],
        pieces: [
            { slot: 21, count: 1, owner: 1 },
            { slot: 24, count: 1, owner: 1 }
        ]
    });

    const plan = findBestAutoBearOffPlan(game);
    assert.ok(plan);
    assert.equal(plan.usedDiceCount, game.getMaximumPlayableMoveCount());
});

test('yeni oyun, sıra değişimi, timeout çözümü ve game over durumlarında akış iptal edilir', () => {
    const game = prepareGame({
        dice: [1, 1, 1, 1],
        pieces: [{ slot: 21, count: 1, owner: 1 }]
    });

    const scheduler = createScheduledHarness();
    const appliedMoves = [];
    const state = {
        enabled: true,
        isStartScreen: false,
        isTimeoutResolutionInProgress: false
    };

    const flow = createAutoBearOffFlow({
        game,
        getContext: () => ({
            isEnabled: state.enabled,
            isStartScreen: state.isStartScreen,
            isTimeoutResolutionInProgress: state.isTimeoutResolutionInProgress
        }),
        scheduleStep: scheduler.scheduleStep,
        cancelStep: scheduler.cancelStep,
        applyMove: move => {
            appliedMoves.push(`${move.from}-${move.dice}-${move.target}`);
            return game.executeMove(move.from, move.dice);
        },
        onFinishTurn: () => {
            game.confirmTurnEnd();
        }
    });

    assert.equal(flow.evaluate(), true);
    assert.ok(appliedMoves.length >= 1);

    game.confirmTurnEnd();
    while (scheduler.runNext()) {
        // flush pending tasks
    }
    assert.equal(flow.isRunning(), false);

    // Yeni turu tekrar kur ve timeout çözümü ile iptal et.
    game.currentPlayer = 1;
    game.gameStatus = 'PLAYING';
    game.availableMoves = [1, 1, 1, 1];
    game.dice.values = [1, 1, 1, 1];
    game.board.slots[21] = { count: 1, player: 1 };
    game.board.borneOff[1] = 0;

    assert.equal(flow.evaluate(), true);
    state.isTimeoutResolutionInProgress = true;
    while (scheduler.runNext()) {
        // flush pending tasks
    }
    assert.equal(flow.isRunning(), false);

    // GAME_OVER sırasında yeni akış başlatılamaz.
    state.isTimeoutResolutionInProgress = false;
    game.gameStatus = 'GAME_OVER';
    assert.equal(flow.evaluate(), false);

    // Yeni oyun başlangıcı gibi start screen durumunda başlatılamaz.
    game.gameStatus = 'PLAYING';
    state.isStartScreen = true;
    assert.equal(flow.evaluate(), false);
});

test('aynı otomatik akış aynı hamleyi iki kez uygulamaz', () => {
    const game = prepareGame({
        dice: [1],
        pieces: [{ slot: 24, count: 1, owner: 1 }]
    });

    const scheduler = createScheduledHarness();
    const moveSignatures = [];

    const flow = createAutoBearOffFlow({
        game,
        getContext: () => ({
            isEnabled: true,
            isStartScreen: false,
            isTimeoutResolutionInProgress: false
        }),
        scheduleStep: scheduler.scheduleStep,
        cancelStep: scheduler.cancelStep,
        applyMove: move => {
            moveSignatures.push(`${move.from}-${move.dice}-${move.target}`);
            return game.executeMove(move.from, move.dice);
        },
        onFinishTurn: () => {
            game.confirmTurnEnd();
        }
    });

    flow.evaluate();
    while (scheduler.runNext()) {
        // flush pending tasks
    }

    assert.equal(moveSignatures.length, 1);
    assert.deepEqual(moveSignatures, ['24-1-25']);
});
