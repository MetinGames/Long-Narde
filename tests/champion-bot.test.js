import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

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

function playBotTurn(game, bot) {
    const moves = [];
    const guard = 8;

    for (let i = 0; i < guard; i++) {
        if (
            game.gameStatus !== 'PLAYING' ||
            game.currentPlayer !== bot.playerNumber ||
            game.availableMoves.length === 0 ||
            !game.hasValidMoves()
        ) {
            break;
        }

        const move = bot.makeDecision(game);
        assert.ok(move, 'Bot should return a legal move while moves exist');

        const executed = game.executeMove(move.from, move.dice);
        assert.equal(executed, true, 'Planned move must be legal at execution');
        moves.push(move);
    }

    return moves;
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

    const build = (prefix = []) => {
        const legalSingles = bot.getRuleCompliantSingleMoves(game);
        if (legalSingles.length === 0) {
            const phaseHint = bot.detectGamePhase(game, player);
            const evaluation = bot.evaluatePositionForPlayer(game, player, {
                phaseHint,
                includeWinMarsEstimate: true
            });

            plans.push(
                {
                    moves: prefix,
                    score: evaluation.score,
                    tieBreakKey: prefix.map(move => `${move.from}-${move.dice}-${move.target}`).join('|'),
                    bearOffCount: game.board.borneOff[player] || 0,
                    pipReduction: bot.getPipTotal(game, player),
                    rearProgress: bot.getRearCheckerProgress(game, player),
                    stackPenalty: bot.getStackPenalty(game, player)
                }
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

    plans.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.tieBreakKey.localeCompare(b.tieBreakKey);
    });
    return plans;
}

test('usta v2 tam turu değerlendirir ve maksimum yasal zar hakkını kullanır', () => {
    const game = prepareGame({
        player: 2,
        dice: [2, 4],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 17, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'hard');
    const expectedMax = game.getMaximumPlayableMoveCount();
    const played = playBotTurn(game, bot);

    assert.equal(played.length, expectedMax);
});

test('usta v2 aynı konumda deterministik tam tur üretir', () => {
    const gameA = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [
            { slot: 13, count: 3, owner: 2 },
            { slot: 18, count: 2, owner: 2 }
        ],
        enemyPieces: [
            { slot: 5, count: 2, owner: 1 },
            { slot: 7, count: 2, owner: 1 }
        ]
    });

    const gameB = cloneGame(gameA);
    const botA = new NardeBot(2, 'hard');
    const botB = new NardeBot(2, 'hard');

    const movesA = playBotTurn(gameA, botA).map(move => `${move.from}-${move.dice}-${move.target}`);
    const movesB = playBotTurn(gameB, botB).map(move => `${move.from}-${move.dice}-${move.target}`);

    assert.deepEqual(movesA, movesB);
});

test('şampiyon deterministik aramayla tamamlanmış en iyi sonucu seçer', () => {
    const gameA = prepareGame({
        player: 2,
        dice: [1, 2],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 2, owner: 2 },
            { slot: 18, count: 1, owner: 2 },
            { slot: 19, count: 1, owner: 2 }
        ],
        enemyPieces: [
            { slot: 3, count: 2, owner: 1 },
            { slot: 4, count: 2, owner: 1 },
            { slot: 6, count: 1, owner: 1 }
        ]
    });

    const gameB = cloneGame(gameA);
    const botA = new NardeBot(2, 'champion');
    const botB = new NardeBot(2, 'champion');

    const movesA = playBotTurn(gameA, botA).map(move => `${move.from}-${move.dice}-${move.target}`);
    const movesB = playBotTurn(gameB, botB).map(move => `${move.from}-${move.dice}-${move.target}`);

    assert.deepEqual(movesA, movesB);
});

test('şampiyon aynı konumda usta v2 planından daha düşük olmayan derinlik skoruna ulaşır', () => {
    const game = prepareGame({
        player: 2,
        dice: [1, 3],
        pieces: [
            { slot: 13, count: 3, owner: 2 },
            { slot: 16, count: 2, owner: 2 },
            { slot: 19, count: 1, owner: 2 }
        ],
        enemyPieces: [
            { slot: 2, count: 2, owner: 1 },
            { slot: 5, count: 2, owner: 1 },
            { slot: 8, count: 1, owner: 1 }
        ]
    });

    const championBot = new NardeBot(2, 'champion');
    const masterBot = new NardeBot(2, 'hard');

    const championPlan = championBot.buildChampionPlanSync(cloneGame(game), {
        timeBudgetMs: 900,
        nodeBudget: 12000,
        shouldCancel: () => false,
        epoch: 1
    });
    const masterPlan = masterBot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 260
    });

    assert.ok(championPlan);
    assert.ok(masterPlan);

    const rootDiceSamples = championBot.getDeterministicDiceSample(game.getSearchStateKey(), 21);
    const responseDiceSamples = championBot.getDeterministicDiceSample(`${game.getSearchStateKey()}|counter`, 13);

    const championScore = championBot.evaluateChampionRootPlanSync(cloneGame(game), {
        moves: championPlan.moves,
        tieBreakKey: championPlan.tieBreakKey || ''
    }, {
        player: 2,
        depth: 3,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop: () => false
    });

    const masterScore = championBot.evaluateChampionRootPlanSync(cloneGame(game), {
        moves: masterPlan.moves,
        tieBreakKey: masterPlan.tieBreakKey || ''
    }, {
        player: 2,
        depth: 3,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop: () => false
    });

    assert.ok(championScore >= masterScore);
});

test('şampiyon prepareChampionTurn iptal edildiğinde planı uygulamaz', async () => {
    const game = prepareGame({
        player: 2,
        dice: [6, 6],
        pieces: [
            { slot: 13, count: 4, owner: 2 },
            { slot: 14, count: 3, owner: 2 },
            { slot: 15, count: 2, owner: 2 },
            { slot: 16, count: 1, owner: 2 }
        ]
    });

    const bot = new NardeBot(2, 'champion');

    const prepared = await bot.prepareChampionTurn(game, {
        timeBudgetMs: 900,
        nodeBudget: 12000,
        sliceMs: 1,
        shouldCancel: () => true,
        onThinkingStatus: () => {}
    });

    assert.equal(prepared, false);
    assert.deepEqual(bot.plannedTurnMoves, []);
});

test('şampiyon araması event-loop dilimlerine bölünür ve UI benzeri görevleri engellemez', async () => {
    const game = prepareGame({
        player: 2,
        dice: [6, 6],
        pieces: [
            { slot: 13, count: 4, owner: 2 },
            { slot: 14, count: 4, owner: 2 },
            { slot: 15, count: 4, owner: 2 },
            { slot: 16, count: 3, owner: 2 }
        ],
        enemyPieces: [
            { slot: 1, count: 3, owner: 1 },
            { slot: 2, count: 3, owner: 1 },
            { slot: 3, count: 3, owner: 1 },
            { slot: 4, count: 3, owner: 1 }
        ]
    });

    const bot = new NardeBot(2, 'champion');

    let markerExecuted = false;
    setTimeout(() => {
        markerExecuted = true;
    }, 0);

    await bot.prepareChampionTurn(game, {
        timeBudgetMs: 200,
        nodeBudget: 6000,
        sliceMs: 1,
        shouldCancel: () => false,
        onThinkingStatus: () => {}
    });

    assert.equal(markerExecuted, true);
});

test('şampiyon temas açılışında ustadan farklı daha korumacı ilk plan seçer', () => {
    const game = prepareGame({
        player: 2,
        dice: [6, 1],
        pieces: [
            { slot: 5, count: 3, owner: 2 },
            { slot: 23, count: 2, owner: 2 },
            { slot: 17, count: 3, owner: 2 },
            { slot: 6, count: 1, owner: 2 },
            { slot: 1, count: 1, owner: 2 },
            { slot: 3, count: 2, owner: 2 },
            { slot: 4, count: 3, owner: 2 },
            { slot: 16, count: 3, owner: 2 }
        ],
        enemyPieces: [
            { slot: 11, count: 2, owner: 1 },
            { slot: 23, count: 1, owner: 1 },
            { slot: 12, count: 3, owner: 1 },
            { slot: 20, count: 1, owner: 1 },
            { slot: 9, count: 3, owner: 1 },
            { slot: 1, count: 2, owner: 1 },
            { slot: 5, count: 1, owner: 1 }
        ]
    });

    const hardBot = new NardeBot(2, 'hard', () => 0);
    const championBot = new NardeBot(2, 'champion', () => 0);

    const hardMove = hardBot.makeDecision(cloneGame(game));
    const championMove = championBot.makeDecision(game);

    assert.ok(hardMove);
    assert.ok(championMove);
    assert.notDeepEqual(
        { from: hardMove.from, dice: hardMove.dice, target: hardMove.target },
        { from: championMove.from, dice: championMove.dice, target: championMove.target }
    );
    assert.deepEqual(
        { from: championMove.from, dice: championMove.dice, target: championMove.target },
        { from: 4, dice: 6, target: 10 }
    );
});

test('şampiyon race evresinde masterdan geri kalmadan daha güçlü plan puanı üretir', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 6],
        pieces: [
            { slot: 24, count: 2, owner: 2 },
            { slot: 1, count: 2, owner: 2 },
            { slot: 3, count: 2, owner: 2 },
            { slot: 5, count: 2, owner: 2 }
        ],
        enemyPieces: [
            { slot: 12, count: 2, owner: 1 },
            { slot: 14, count: 2, owner: 1 },
            { slot: 16, count: 2, owner: 1 },
            { slot: 18, count: 2, owner: 1 }
        ]
    });

    const championBot = new NardeBot(2, 'champion', () => 0);
    const masterBot = new NardeBot(2, 'hard', () => 0);

    assert.equal(championBot.detectGamePhase(game, 2), 'race');

    const championPlan = championBot.buildChampionPlanSync(cloneGame(game), {
        timeBudgetMs: 900,
        nodeBudget: 12000,
        epoch: 1,
        shouldCancel: () => false
    });
    const masterPlan = masterBot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 260
    });

    assert.ok(championPlan);
    assert.ok(masterPlan);

    const rootDiceSamples = championBot.getDeterministicDiceSample(game.getSearchStateKey(), 21);
    const responseDiceSamples = championBot.getDeterministicDiceSample(`${game.getSearchStateKey()}|counter`, 13);

    const championScore = championBot.evaluateChampionRootPlanSync(cloneGame(game), {
        moves: championPlan.moves,
        tieBreakKey: championPlan.tieBreakKey || ''
    }, {
        player: 2,
        depth: 3,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop: () => false
    });

    const masterScore = championBot.evaluateChampionRootPlanSync(cloneGame(game), {
        moves: masterPlan.moves,
        tieBreakKey: masterPlan.tieBreakKey || ''
    }, {
        player: 2,
        depth: 3,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop: () => false
    });

    assert.ok(championScore >= masterScore);
});

test('şampiyon bear-off evresinde masterdan daha düşük puanlı plana düşmez', () => {
    const game = prepareGame({
        player: 2,
        dice: [4, 2],
        pieces: [
            { slot: 7, count: 3, owner: 2 },
            { slot: 8, count: 3, owner: 2 },
            { slot: 9, count: 2, owner: 2 },
            { slot: 10, count: 2, owner: 2 },
            { slot: 11, count: 2, owner: 2 },
            { slot: 12, count: 1, owner: 2 }
        ],
        enemyPieces: [
            { slot: 1, count: 2, owner: 1 },
            { slot: 2, count: 2, owner: 1 },
            { slot: 3, count: 1, owner: 1 }
        ],
        borneOff: { 1: 0, 2: 0 }
    });

    const championBot = new NardeBot(2, 'champion', () => 0);
    const masterBot = new NardeBot(2, 'hard', () => 0);

    assert.equal(championBot.detectGamePhase(game, 2), 'bearoff');

    const championPlan = championBot.buildChampionPlanSync(cloneGame(game), {
        timeBudgetMs: 900,
        nodeBudget: 12000,
        epoch: 1,
        shouldCancel: () => false
    });
    const masterPlan = masterBot.buildMasterV2Plan(cloneGame(game), {
        player: 2,
        timeBudgetMs: 260
    });

    assert.ok(championPlan);
    assert.ok(masterPlan);

    const rootDiceSamples = championBot.getDeterministicDiceSample(game.getSearchStateKey(), 21);
    const responseDiceSamples = championBot.getDeterministicDiceSample(`${game.getSearchStateKey()}|counter`, 13);

    const championScore = championBot.evaluateChampionRootPlanSync(cloneGame(game), {
        moves: championPlan.moves,
        tieBreakKey: championPlan.tieBreakKey || ''
    }, {
        player: 2,
        depth: 3,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop: () => false
    });

    const masterScore = championBot.evaluateChampionRootPlanSync(cloneGame(game), {
        moves: masterPlan.moves,
        tieBreakKey: masterPlan.tieBreakKey || ''
    }, {
        player: 2,
        depth: 3,
        rootDiceSamples,
        responseDiceSamples,
        shouldStop: () => false
    });

    assert.ok(championScore >= masterScore);
});

test('şampiyon planlayıcısı sıkı bütçede güvenli biçimde geri döner', () => {
    const game = prepareGame({
        player: 2,
        dice: [6, 6],
        pieces: [
            { slot: 13, count: 4, owner: 2 },
            { slot: 14, count: 4, owner: 2 },
            { slot: 15, count: 4, owner: 2 },
            { slot: 16, count: 3, owner: 2 }
        ],
        enemyPieces: [
            { slot: 1, count: 3, owner: 1 },
            { slot: 2, count: 3, owner: 1 },
            { slot: 3, count: 3, owner: 1 },
            { slot: 4, count: 3, owner: 1 }
        ]
    });

    const bot = new NardeBot(2, 'champion', () => 0);
    const startedAt = performance.now();

    const plan = bot.buildChampionPlanSync(game, {
        timeBudgetMs: 15,
        nodeBudget: 150,
        epoch: 1,
        shouldCancel: () => false
    });

    const elapsed = performance.now() - startedAt;

    assert.ok(plan);
    assert.ok(elapsed < 300);
});

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
    const originalBuildChampionPlan = bot.buildChampionPlanSync.bind(bot);
    let replanCount = 0;

    const firstMove = bot.makeDecision(game);
    assert.deepEqual(firstMove, { from: 13, dice: 4, target: 17 });
    assert.equal(game.executeMove(firstMove.from, firstMove.dice), true);

    bot.plannedTurnStateKey = game.getSearchStateKey();
    bot.plannedTurnMoves = [{ from: 13, dice: 5, target: 18 }];
    bot.buildChampionPlanSync = (liveGame, options) => {
        replanCount += 1;
        return originalBuildChampionPlan(liveGame, options);
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

test('şampiyon debug izi top adaylar ve skor bileşenleri üretir', () => {
    const game = prepareGame({
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

    const bot = new NardeBot(2, 'champion');
    bot.configureDebug({ enabled: true, collectChampionTrace: true, profile: false });

    const plan = bot.buildChampionPlanSync(game, {
        timeBudgetMs: 120,
        nodeBudget: 1200,
        epoch: 1,
        shouldCancel: () => false
    });

    assert.ok(plan);
    assert.ok(plan.debugTrace);
    assert.ok(Array.isArray(plan.debugTrace.topCandidates));
    assert.ok(plan.debugTrace.topCandidates.length > 0);
    assert.ok(typeof plan.debugTrace.selectedPlan?.score === 'number');
    assert.ok(plan.debugTrace.topCandidates[0].components);
});

test('profil sayaçları karar sonrası çağrı ve cache bilgisi içerir', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [{ slot: 13, count: 15, owner: 2 }]
    });

    const bot = new NardeBot(2, 'champion');
    bot.configureDebug({ enabled: true, profile: true, collectChampionTrace: false });

    const move = bot.makeDecision(game);
    assert.ok(move);

    const snapshot = bot.getDebugSnapshot();
    assert.ok(snapshot.profile.championPlanCalls >= 1);
    assert.ok(snapshot.profile.enumerateCalls >= 1);
    assert.ok(snapshot.profile.legalMoveCalls >= 1);
    assert.ok(snapshot.profile.replyCalls >= 0);
    assert.ok(snapshot.profile.enumerateCacheHits >= 0);
    assert.ok(snapshot.profile.legalMoveCacheHits >= 0);
});
