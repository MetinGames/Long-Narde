import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

function createSeededRandom(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function prepareGame({
    player = 2,
    dice = [3, 5],
    pieces = [],
    enemyPieces = [],
    borneOff = { 1: 0, 2: 0 },
    turnsCompleted = { 1: 1, 2: 1 }
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

    game.board.borneOff = { ...borneOff };
    game.currentPlayer = player;
    game.gameStatus = 'PLAYING';
    game.dice.values = [...dice];
    game.availableMoves = dice[0] === dice[1]
        ? [dice[0], dice[0], dice[0], dice[0]]
        : [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { ...turnsCompleted };
    game.moveHistory = [];

    return game;
}

function cloneGame(game) {
    const clone = new NardeGame();
    clone.currentPlayer = game.currentPlayer;
    clone.gameStatus = game.gameStatus;
    clone.dice.values = [...game.dice.values];
    clone.availableMoves = [...game.availableMoves];
    clone.headMovesThisTurn = game.headMovesThisTurn;
    clone.turnsCompleted = { ...game.turnsCompleted };
    clone.moveHistory = [...game.moveHistory];
    clone.board.borneOff = { ...game.board.borneOff };

    for (let slotId = 1; slotId <= 24; slotId++) {
        clone.board.slots[slotId] = {
            count: game.board.slots[slotId].count,
            player: game.board.slots[slotId].player
        };
    }

    return clone;
}

function assertPlanIsLegal(game, plan) {
    assert.ok(plan, 'Expected a non-null plan');
    assert.ok(Array.isArray(plan.moves), 'Expected plan.moves to be an array');

    const probe = cloneGame(game);
    for (const move of plan.moves) {
        const ok = probe.executeMove(move.from, move.dice, false);
        assert.equal(ok, true, `Fallback move must stay legal: ${move.from}-${move.dice}-${move.target}`);
    }
}

function runSeededCrashPath(seed) {
    const rng = createSeededRandom(seed);

    const game = new NardeGame();
    game.initGame();

    const hardBot = new NardeBot(2, 'hard');
    hardBot.evaluateMasterV2Plan = () => Number.NEGATIVE_INFINITY;

    for (let turn = 0; turn < 32; turn++) {
        if (game.gameStatus === 'GAME_OVER') break;

        game.gameStatus = 'PLAYING';
        const die1 = Math.floor(rng() * 6) + 1;
        const die2 = Math.floor(rng() * 6) + 1;
        game.dice.values = [die1, die2];
        game.availableMoves = die1 === die2
            ? [die1, die1, die1, die1]
            : [die1, die2];
        game.headMovesThisTurn = 0;
        game.moveHistory = [];

        if (game.currentPlayer !== hardBot.playerNumber) {
            game.confirmTurnEnd();
            continue;
        }

        if (!game.hasValidMoves()) {
            game.confirmTurnEnd();
            continue;
        }

        const move = hardBot.makeDecision(game);
        if (!move) {
            game.confirmTurnEnd();
            continue;
        }

        assert.equal(game.executeMove(move.from, move.dice), true);
        game.confirmTurnEnd();
    }
}

test('seed 20260802 crash yolunda master planlayıcısı null tie-break çökmesine düşmez', () => {
    assert.doesNotThrow(() => {
        runSeededCrashPath(20260802);
    });
});

test('çok düşük master bütçesinde tamamlanmış yasal fallback plan döner', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 16, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'hard');
    const planA = bot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 0
    });
    const planB = bot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 0
    });

    assertPlanIsLegal(game, planA);
    assertPlanIsLegal(game, planB);
    assert.equal(planA.tieBreakKey, planB.tieBreakKey);
});

test('master için hiç yasal hamle yoksa plan null döner', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [{ slot: 13, count: 15, owner: 2 }],
        enemyPieces: [
            { slot: 14, count: 2, owner: 1 },
            { slot: 15, count: 2, owner: 1 }
        ]
    });

    const bot = new NardeBot(2, 'hard');
    const plan = bot.buildMasterV2Plan(game, {
        player: 2,
        timeBudgetMs: 260
    });

    assert.equal(plan, null);
    assert.equal(game.hasValidMoves(), false);
});

test('yarıda kesilen master aramasında tamamlanan en iyi aday korunur', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 16, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'hard');
    const totalPlans = bot.enumerateFullTurnPlans(cloneGame(game), 2).length;

    let evalCalls = 0;
    const originalEval = bot.evaluateMasterV2Plan.bind(bot);
    bot.evaluateMasterV2Plan = (liveGame, plan, options) => {
        evalCalls += 1;

        const start = performance.now();
        while (performance.now() - start < 3) {
            // Intentional busy loop to force budget expiration for later candidates.
        }

        return originalEval(liveGame, plan, options);
    };

    const plan = bot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 1
    });

    assert.ok(evalCalls >= 1);
    assert.ok(evalCalls < totalPlans);
    assertPlanIsLegal(game, plan);
});

test('eşit puanda tie-break deterministik olarak en küçük anahtarı seçer', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 16, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'hard');
    const plans = bot.enumerateFullTurnPlans(cloneGame(game), 2);
    assert.ok(plans.length > 1);

    bot.evaluateMasterV2Plan = () => 42;

    const plan = bot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 260
    });

    assert.ok(plan);
    assert.equal(plan.tieBreakKey, plans[0].tieBreakKey);
});

test('master değerlendirmeleri tamamen -Infinity olsa da null olmadan fallback döner', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 16, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'hard');
    bot.evaluateMasterV2Plan = () => Number.NEGATIVE_INFINITY;

    const plan = bot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 260
    });

    assertPlanIsLegal(game, plan);
});
