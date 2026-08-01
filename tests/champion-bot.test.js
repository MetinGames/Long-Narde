import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

function prepareGame({
    player = 2,
    dice = [3, 5],
    pieces = [],
    enemyPieces = [],
    borneOff = { 1: 0, 2: 0 }
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
    game.availableMoves = [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { 1: 1, 2: 1 };
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
    clone.moveHistory = [];
    clone.board.borneOff = { ...game.board.borneOff };

    for (let slotId = 1; slotId <= 24; slotId++) {
        clone.board.slots[slotId] = {
            count: game.board.slots[slotId].count,
            player: game.board.slots[slotId].player
        };
    }

    return clone;
}

function playChampionTurn(game, bot) {
    const moves = [];
    const maxGuard = 8;

    for (let step = 0; step < maxGuard; step++) {
        if (
            game.gameStatus !== 'PLAYING' ||
            game.currentPlayer !== bot.playerNumber ||
            game.availableMoves.length === 0 ||
            !game.hasValidMoves()
        ) {
            break;
        }

        const move = bot.makeDecision(game);
        assert.ok(move, 'Champion should produce a move while legal moves exist');

        if (move.target <= 24) {
            assert.equal(
                game.board.wouldCreateIllegalPrime(bot.playerNumber, move.from, move.target),
                false,
                'Champion must never choose a six-prime violating move'
            );
        }

        const executed = game.executeMove(move.from, move.dice);
        assert.equal(executed, true, 'Champion move must be legal at execution time');
        moves.push({ ...move });
    }

    return moves;
}

function enumerateChampionPlans(game, bot) {
    const plans = [];
    const startSnapshot = game.createMoveStateSnapshot();
    const player = bot.playerNumber;
    const startPip = bot.getPipTotal(game, player);
    const startOpponentPip = bot.getPipTotal(game, player === 1 ? 2 : 1);
    const startHeadCount = game.board.slots[game.board.getHeadSlot(player)]?.count || 0;
    const startBorneOff = game.board.borneOff[player] || 0;
    const startMadePoints = bot.getMadePoints(game, player);
    const startLongestPrime = bot.getLongestPrime(game);
    const startRearProgress = bot.getRearCheckerProgress(game, player);
    const isBearOffStage = game.board.areAllPiecesInHomeBoard(player);

    const build = (prefix = []) => {
        const legalSingles = bot.getRuleCompliantSingleMoves(game);
        if (legalSingles.length === 0) {
            plans.push(
                bot.evaluateChampionPlanTerminal({
                    game,
                    moves: prefix,
                    startPip,
                    startOpponentPip,
                    startHeadCount,
                    startBorneOff,
                    startMadePoints,
                    startLongestPrime,
                    startRearProgress,
                    isBearOffStage
                })
            );
            return;
        }

        for (const move of legalSingles) {
            const snapshot = game.createMoveStateSnapshot();
            try {
                if (!game.executeMove(move.from, move.dice, false)) {
                    continue;
                }
                build([...prefix, move]);
            } finally {
                game.restoreMoveState(snapshot);
            }
        }
    };

    try {
        build([]);
    } finally {
        game.restoreMoveState(startSnapshot);
    }

    plans.sort((a, b) => bot.compareChampionPlans(a, b));
    return plans;
}

test('şampiyon bot yalnızca yasal tam hamle dizisi seçer', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [{ slot: 13, count: 15, owner: 2 }]
    });
    const bot = new NardeBot(2, 'champion');

    const initialMaximum = game.getMaximumPlayableMoveCount();
    const moves = playChampionTurn(game, bot);

    assert.equal(moves.length, initialMaximum);
});

test('iki zar kullanılabiliyorsa şampiyon ikisini de kullanır', () => {
    const game = prepareGame({
        player: 2,
        dice: [2, 4],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 17, count: 1, owner: 2 }
        ]
    });
    const bot = new NardeBot(2, 'champion');

    const initialMaximum = game.getMaximumPlayableMoveCount();
    const moves = playChampionTurn(game, bot);

    assert.equal(initialMaximum, 2);
    assert.equal(moves.length, 2);
});

test('şampiyon 5-4 ile 13-17 sonra 17-22 oynar', () => {
    const game = prepareGame({
        player: 2,
        dice: [5, 4],
        pieces: [{ slot: 13, count: 15, owner: 2 }]
    });
    const bot = new NardeBot(2, 'champion');

    const moves = playChampionTurn(game, bot);

    assert.deepEqual(moves, [
        { from: 13, dice: 4, target: 17 },
        { from: 17, dice: 5, target: 22 }
    ]);
    assert.equal(game.availableMoves.length, 0);
    assert.equal(game.currentPlayer, 2);
});

test('şampiyon 1-6 ile 13-14 sonra 14-20 oynar', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 6],
        pieces: [{ slot: 13, count: 15, owner: 2 }]
    });
    const bot = new NardeBot(2, 'champion');

    const moves = playChampionTurn(game, bot);

    assert.deepEqual(moves, [
        { from: 13, dice: 1, target: 14 },
        { from: 14, dice: 6, target: 20 }
    ]);
    assert.equal(game.availableMoves.length, 0);
    assert.equal(game.currentPlayer, 2);
});

test('şampiyon ilk plan hamlesinden sonra eski kaynak haneyi tekrar kullanmaz', () => {
    const game = prepareGame({
        player: 2,
        dice: [5, 4],
        pieces: [{ slot: 13, count: 15, owner: 2 }]
    });
    const bot = new NardeBot(2, 'champion');

    const firstMove = bot.makeDecision(game);
    assert.deepEqual(firstMove, { from: 13, dice: 4, target: 17 });
    assert.equal(game.executeMove(firstMove.from, firstMove.dice), true);

    const secondMove = bot.makeDecision(game);
    assert.ok(secondMove);
    assert.equal(secondMove.from, 17);
    assert.equal(secondMove.dice, 5);
    assert.equal(secondMove.target, 22);
});

test('geçersiz kuyruk adımı canlı durumdan yalnız bir kez güvenli yeniden planlanır', () => {
    const game = prepareGame({
        player: 2,
        dice: [5, 4],
        pieces: [{ slot: 13, count: 15, owner: 2 }]
    });
    const bot = new NardeBot(2, 'champion');
    const originalBuildChampionPlan = bot.buildChampionPlan.bind(bot);
    let replanCount = 0;

    const firstMove = bot.makeDecision(game);
    assert.deepEqual(firstMove, { from: 13, dice: 4, target: 17 });
    assert.equal(game.executeMove(firstMove.from, firstMove.dice), true);

    bot.plannedTurnStateKey = game.getSearchStateKey();
    bot.plannedTurnMoves = [{ from: 13, dice: 5, target: 18 }];
    bot.buildChampionPlan = liveGame => {
        replanCount += 1;
        return originalBuildChampionPlan(liveGame);
    };

    const repairedMove = bot.makeDecision(game);

    assert.equal(replanCount, 1);
    assert.deepEqual(repairedMove, { from: 17, dice: 5, target: 22 });
});

test('şampiyon büyük zar zorunluluğunu korur', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [{ slot: 13, count: 1, owner: 2 }],
        enemyPieces: [{ slot: 21, count: 1, owner: 1 }]
    });

    const bot = new NardeBot(2, 'champion');
    const move = bot.makeDecision(game);

    assert.ok(move);
    assert.equal(move.dice, 5);
});

test('şampiyon çiftlerde dört hakkı doğru değerlendirir', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 1, 1, 1],
        pieces: [{ slot: 13, count: 3, owner: 2 }]
    });
    const bot = new NardeBot(2, 'champion');

    const initialMaximum = game.getMaximumPlayableMoveCount();
    const moves = playChampionTurn(game, bot);

    assert.equal(initialMaximum, 4);
    assert.equal(moves.length, 4);
});

test('şampiyon altılı blok yasağını ihlal eden hamle seçmez', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 1],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 2, owner: 2 },
            { slot: 15, count: 2, owner: 2 },
            { slot: 16, count: 2, owner: 2 },
            { slot: 17, count: 2, owner: 2 },
            { slot: 18, count: 1, owner: 2 }
        ],
        enemyPieces: [{ slot: 2, count: 1, owner: 1 }]
    });

    const bot = new NardeBot(2, 'champion');
    const move = bot.makeDecision(game);

    if (move && move.target <= 24) {
        assert.equal(
            game.board.wouldCreateIllegalPrime(2, move.from, move.target),
            false
        );
    }
});

test('şampiyon güçlü blok kuran planı zayıf alternatife tercih eder', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [
            { slot: 13, count: 1, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 15, count: 1, owner: 2 },
            { slot: 18, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'champion');
    const plans = enumerateChampionPlans(cloneGame(game), bot);
    assert.ok(plans.length > 0);

    const best = plans[0];
    const primeStrength = plan => {
        const preview = cloneGame(game);
        for (const move of plan.moves) {
            preview.executeMove(move.from, move.dice);
        }
        return (
            bot.countPrimeSegments(preview, 2, 3) * 100 +
            bot.countPrimeSegments(preview, 2, 4) * 200 +
            bot.countPrimeSegments(preview, 2, 5) * 400
        );
    };

    const bestPrime = primeStrength(best);
    const maxPrime = Math.max(...plans.map(primeStrength));
    assert.equal(bestPrime, maxPrime);
});

test('şampiyon geride kalan pulu ilerleten planı gereksiz yığılmaya tercih eder', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 3],
        pieces: [
            { slot: 13, count: 3, owner: 2 },
            { slot: 16, count: 2, owner: 2 },
            { slot: 19, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'champion');
    const plans = enumerateChampionPlans(cloneGame(game), bot);
    assert.ok(plans.length > 0);

    const best = plans[0];
    const evaluateRearAndStack = plan => {
        const preview = cloneGame(game);
        for (const move of plan.moves) {
            preview.executeMove(move.from, move.dice);
        }

        return {
            rearProgress: bot.getRearCheckerProgress(preview, 2),
            stackPenalty: bot.getStackPenalty(preview, 2)
        };
    };

    const bestMetrics = evaluateRearAndStack(best);
    const candidates = plans.map(evaluateRearAndStack);
    const minStack = Math.min(...candidates.map(c => c.stackPenalty));
    const maxRear = Math.max(...candidates.map(c => c.rearProgress));

    assert.ok(bestMetrics.stackPenalty <= minStack || bestMetrics.rearProgress >= maxRear);
});

test('toplama aşamasında şampiyon daha iyi yasal diziyi seçer', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 6],
        pieces: [
            { slot: 12, count: 1, owner: 2 },
            { slot: 7, count: 1, owner: 2 },
            { slot: 10, count: 1, owner: 2 }
        ],
        borneOff: { 1: 0, 2: 12 }
    });

    const bot = new NardeBot(2, 'champion');
    const plans = enumerateChampionPlans(cloneGame(game), bot);
    assert.ok(plans.length > 0);

    const best = plans[0];
    const maxBearOff = Math.max(...plans.map(plan => plan.bearOffCount));
    assert.equal(best.bearOffCount, maxBearOff);

    if (plans.some(plan => plan.bearOffCount === maxBearOff && plan.pipReduction !== best.pipReduction)) {
        const maxPipReductionAmongBestBearOff = Math.max(
            ...plans
                .filter(plan => plan.bearOffCount === maxBearOff)
                .map(plan => plan.pipReduction)
        );
        assert.equal(best.pipReduction, maxPipReductionAmongBestBearOff);
    }
});

test('aynı tahta ve zarlar için şampiyon deterministik karar verir', () => {
    const gameA = prepareGame({
        player: 2,
        dice: [2, 5],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 15, count: 2, owner: 2 },
            { slot: 18, count: 1, owner: 2 }
        ],
        enemyPieces: [
            { slot: 4, count: 2, owner: 1 },
            { slot: 6, count: 2, owner: 1 }
        ]
    });
    const gameB = cloneGame(gameA);

    const botA = new NardeBot(2, 'champion');
    const botB = new NardeBot(2, 'champion');

    const movesA = playChampionTurn(gameA, botA)
        .map(move => `${move.from}-${move.dice}-${move.target}`);
    const movesB = playChampionTurn(gameB, botB)
        .map(move => `${move.from}-${move.dice}-${move.target}`);

    assert.deepEqual(movesA, movesB);
});

test('diğer zorluk seviyeleri davranışı korunur', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [
            { slot: 13, count: 1, owner: 2 },
            { slot: 21, count: 1, owner: 1 }
        ]
    });

    const easyBot = new NardeBot(2, 'easy', () => 0.25);
    const mediumBot = new NardeBot(2, 'medium', () => 0.25);
    const hardBot = new NardeBot(2, 'hard', () => 0.25);

    const easyMove = easyBot.makeDecision(cloneGame(game));
    const mediumMove = mediumBot.makeDecision(cloneGame(game));
    const hardMove = hardBot.makeDecision(cloneGame(game));

    assert.ok(easyMove);
    assert.ok(mediumMove);
    assert.ok(hardMove);
    assert.equal(hardMove.dice, 5);
});

test('şampiyon planlama makul performans sınırında kalır', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 1, 1, 1],
        pieces: [
            { slot: 13, count: 4, owner: 2 },
            { slot: 14, count: 3, owner: 2 },
            { slot: 15, count: 2, owner: 2 },
            { slot: 16, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'champion');
    const start = performance.now();
    const move = bot.makeDecision(game);
    const elapsed = performance.now() - start;

    assert.ok(move);
    assert.ok(elapsed < 300, `Champion planning took too long: ${elapsed.toFixed(2)}ms`);
});

