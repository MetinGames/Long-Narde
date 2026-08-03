import { NardeBot } from '../../engine/bot.js';
import { NardeGame } from '../../engine/game.js';

export const DEFAULT_CHAMPION_BENCHMARK_SEEDS = Object.freeze([
    1103,
    2207,
    3301,
    4409
]);

const UINT32_RANGE = 0x1_0000_0000;
const TRACE_OFFSET = 0x811c9dc5;
const TRACE_PRIME = 0x01000193;

function normalizeSeed(seed) {
    const numericSeed = Number(seed);
    if (!Number.isSafeInteger(numericSeed)) {
        throw new TypeError(`Invalid benchmark seed: ${seed}`);
    }

    return numericSeed >>> 0;
}

function normalizeMaxTurns(maxTurns) {
    const numericMaxTurns = Number(maxTurns);
    if (
        !Number.isSafeInteger(numericMaxTurns) ||
        numericMaxTurns <= 0
    ) {
        throw new TypeError(`Invalid maximum turn count: ${maxTurns}`);
    }

    return numericMaxTurns;
}

function defaultNow() {
    if (globalThis.performance?.now) {
        return globalThis.performance.now();
    }

    return Date.now();
}

function mixTrace(hash, value) {
    const mixed = (hash ^ (Number(value) >>> 0)) >>> 0;
    return Math.imul(mixed, TRACE_PRIME) >>> 0;
}

function formatTrace(hash) {
    return hash.toString(16).padStart(8, '0');
}

export function hashBenchmarkStateKey(value) {
    let hash = TRACE_OFFSET;
    for (let index = 0; index < value.length; index++) {
        hash = mixTrace(hash, value.charCodeAt(index));
    }

    return formatTrace(hash);
}

function percentile(values, ratio) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * ratio) - 1)
    );

    return sorted[index];
}

function summarizeTiming(samples) {
    const totalMs = samples.reduce((total, value) => total + value, 0);

    return {
        decisions: samples.length,
        totalMs,
        averageMs: samples.length === 0 ? 0 : totalMs / samples.length,
        p95Ms: percentile(samples, 0.95),
        maxMs: samples.length === 0 ? 0 : Math.max(...samples)
    };
}

function getPipTotal(game, player) {
    let total = 0;

    for (let slotId = 1; slotId <= 24; slotId++) {
        const slot = game.board.slots[slotId];
        if (slot.player !== player || slot.count <= 0) continue;

        total += game.board.getBearOffDistance(player, slotId) * slot.count;
    }

    return total;
}

function getCheckerTotal(game, player) {
    let total = game.board.borneOff[player] || 0;

    for (let slotId = 1; slotId <= 24; slotId++) {
        const slot = game.board.slots[slotId];
        if (slot.player === player && slot.count > 0) {
            total += slot.count;
        }
    }

    return total;
}

function assertCheckerConservation(game) {
    for (const player of [1, 2]) {
        const checkerTotal = getCheckerTotal(game, player);
        if (checkerTotal !== 15) {
            throw new Error(
                `Player ${player} checker total changed to ${checkerTotal}`
            );
        }
    }
}

function createPlayerMetrics(difficulty) {
    return {
        difficulty,
        moves: 0,
        decisionSamplesMs: [],
        decisions: []
    };
}

function finalizePlayerMetrics(metrics) {
    const slowestDecision = metrics.decisions.reduce(
        (slowest, decision) => (
            !slowest || decision.elapsedMs > slowest.elapsedMs
                ? decision
                : slowest
        ),
        null
    );

    return {
        difficulty: metrics.difficulty,
        moves: metrics.moves,
        decisionSamplesMs: [...metrics.decisionSamplesMs],
        timing: summarizeTiming(metrics.decisionSamplesMs),
        slowestDecision
    };
}

export function createSeededRandom(seed = 1) {
    let state = normalizeSeed(seed);

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
    };
}

export function stageBenchmarkRoll(game, diceValues) {
    if (game.gameStatus !== 'WAITING_FOR_DICE') {
        throw new Error(
            `Benchmark roll requires WAITING_FOR_DICE, got ${game.gameStatus}`
        );
    }

    if (!Array.isArray(diceValues) || diceValues.length !== 2) {
        throw new TypeError('Benchmark roll requires exactly two dice values');
    }

    const values = diceValues.map(value => Number(value));
    if (values.some(value => (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 6
    ))) {
        throw new TypeError(`Invalid benchmark dice: ${diceValues.join(',')}`);
    }

    const [die1, die2] = values;
    game.dice.values = [...values];
    game.availableMoves = die1 === die2
        ? [die1, die1, die1, die1]
        : [die1, die2];
    game.gameStatus = 'PLAYING';
    game.headMovesThisTurn = 0;
    game.moveHistory = [];

    return [...values];
}

export function playBenchmarkTurn(
    game,
    bot,
    { now = defaultNow } = {}
) {
    const moves = [];
    const decisionSamplesMs = [];
    const decisions = [];

    for (let guard = 0; guard < 8; guard++) {
        if (
            game.gameStatus !== 'PLAYING' ||
            game.currentPlayer !== bot.playerNumber ||
            game.availableMoves.length === 0 ||
            !game.hasValidMoves()
        ) {
            break;
        }

        const stateKey = game.getSearchStateKey();
        const availableMoves = [...game.availableMoves];
        game.resetAnalysisMetrics();

        const startedAt = Number(now());
        const move = bot.makeDecision(game);
        const elapsed = Math.max(0, Number(now()) - startedAt);
        const analysis = game.getAnalysisMetrics();

        if (!Number.isFinite(elapsed)) {
            throw new Error('Benchmark clock returned a non-finite duration');
        }

        if (!move) {
            throw new Error(
                `${bot.difficulty} returned no move while legal moves exist`
            );
        }

        if (
            move.target <= 24 &&
            game.board.wouldCreateIllegalPrime(
                bot.playerNumber,
                move.from,
                move.target
            )
        ) {
            throw new Error(`${bot.difficulty} selected an illegal six-prime`);
        }

        if (!game.executeMove(move.from, move.dice)) {
            throw new Error(
                `${bot.difficulty} selected an unexecutable move ` +
                `${move.from}/${move.dice}/${move.target}`
            );
        }

        decisionSamplesMs.push(elapsed);
        decisions.push({
            elapsedMs: elapsed,
            stateHash: hashBenchmarkStateKey(stateKey),
            stateKey,
            availableMoves,
            move: { ...move },
            memoHits: analysis.memoHits,
            memoMisses: analysis.memoMisses
        });
        moves.push({ ...move });
        assertCheckerConservation(game);

        if (game.checkWinCondition() !== 0) break;
    }

    if (
        moves.length >= 8 &&
        game.gameStatus === 'PLAYING' &&
        game.availableMoves.length > 0 &&
        game.hasValidMoves()
    ) {
        throw new Error('Benchmark turn exceeded the eight-move safety guard');
    }

    return {
        moves,
        decisionSamplesMs,
        decisions
    };
}

export function playDeterministicBotMatch({
    seed,
    player1Difficulty = 'champion',
    player2Difficulty = 'hard',
    maxTurns = 240,
    now = defaultNow,
    createBot = ({ player, difficulty, random }) => (
        new NardeBot(player, difficulty, random)
    )
}) {
    const normalizedSeed = normalizeSeed(seed);
    const turnLimit = normalizeMaxTurns(maxTurns);
    const diceRandom = createSeededRandom(normalizedSeed);
    const game = new NardeGame();
    game.initGame();

    const bots = {
        1: createBot({
            player: 1,
            difficulty: player1Difficulty,
            random: createSeededRandom(normalizedSeed ^ 0x9e3779b9)
        }),
        2: createBot({
            player: 2,
            difficulty: player2Difficulty,
            random: createSeededRandom(normalizedSeed ^ 0x243f6a88)
        })
    };

    for (const player of [1, 2]) {
        if (typeof bots[player]?.makeDecision !== 'function') {
            throw new TypeError(
                `Benchmark bot factory returned an invalid player ${player} bot`
            );
        }
    }
    const playerMetrics = {
        1: createPlayerMetrics(player1Difficulty),
        2: createPlayerMetrics(player2Difficulty)
    };

    let trace = TRACE_OFFSET;
    let diceTrace = TRACE_OFFSET;
    let winner = 0;
    let turnsPlayed = 0;

    assertCheckerConservation(game);

    while (turnsPlayed < turnLimit && winner === 0) {
        const player = game.currentPlayer;
        const diceValues = [
            Math.floor(diceRandom() * 6) + 1,
            Math.floor(diceRandom() * 6) + 1
        ];

        stageBenchmarkRoll(game, diceValues);
        turnsPlayed++;

        trace = mixTrace(trace, turnsPlayed);
        trace = mixTrace(trace, player);
        diceTrace = mixTrace(diceTrace, diceValues[0]);
        diceTrace = mixTrace(diceTrace, diceValues[1]);
        trace = mixTrace(trace, diceValues[0]);
        trace = mixTrace(trace, diceValues[1]);

        const turn = playBenchmarkTurn(game, bots[player], { now });
        playerMetrics[player].moves += turn.moves.length;
        playerMetrics[player].decisionSamplesMs.push(
            ...turn.decisionSamplesMs
        );
        playerMetrics[player].decisions.push(
            ...turn.decisions.map(decision => ({
                ...decision,
                turn: turnsPlayed,
                player,
                roll: [...diceValues]
            }))
        );

        for (const move of turn.moves) {
            trace = mixTrace(trace, move.from);
            trace = mixTrace(trace, move.dice);
            trace = mixTrace(trace, move.target);
        }

        winner = game.checkWinCondition();
        if (winner !== 0) break;

        game.confirmTurnEnd();
    }

    assertCheckerConservation(game);

    return {
        seed: normalizedSeed,
        maxTurns: turnLimit,
        turnsPlayed,
        terminatedBy: winner === 0 ? 'turn-limit' : 'win',
        winner: winner || null,
        winnerDifficulty: winner === 0
            ? null
            : bots[winner].difficulty,
        traceHash: formatTrace(trace),
        diceTraceHash: formatTrace(diceTrace),
        final: {
            borneOff: { ...game.board.borneOff },
            pips: {
                1: getPipTotal(game, 1),
                2: getPipTotal(game, 2)
            },
            checkerTotals: {
                1: getCheckerTotal(game, 1),
                2: getCheckerTotal(game, 2)
            }
        },
        players: {
            1: finalizePlayerMetrics(playerMetrics[1]),
            2: finalizePlayerMetrics(playerMetrics[2])
        }
    };
}

export function runChampionBenchmark({
    seeds = DEFAULT_CHAMPION_BENCHMARK_SEEDS,
    maxTurns = 240,
    now = defaultNow,
    createBot
} = {}) {
    if (!Array.isArray(seeds) || seeds.length === 0) {
        throw new TypeError('Champion benchmark requires at least one seed');
    }

    const normalizedSeeds = seeds.map(normalizeSeed);
    const matches = [];
    const championSamples = [];
    const masterSamples = [];
    const championSlowest = [];
    const masterSlowest = [];
    let championWins = 0;
    let masterWins = 0;
    let draws = 0;

    for (const seed of normalizedSeeds) {
        for (const championPlayer of [1, 2]) {
            const match = playDeterministicBotMatch({
                seed,
                player1Difficulty: championPlayer === 1
                    ? 'champion'
                    : 'hard',
                player2Difficulty: championPlayer === 2
                    ? 'champion'
                    : 'hard',
                maxTurns,
                now,
                createBot
            });

            const masterPlayer = championPlayer === 1 ? 2 : 1;
            const outcome = match.winner === null
                ? 'draw'
                : match.winner === championPlayer
                    ? 'champion'
                    : 'master';

            if (outcome === 'champion') championWins++;
            if (outcome === 'master') masterWins++;
            if (outcome === 'draw') draws++;

            championSamples.push(
                ...match.players[championPlayer].decisionSamplesMs
            );
            masterSamples.push(
                ...match.players[masterPlayer].decisionSamplesMs
            );

            if (match.players[championPlayer].slowestDecision) {
                championSlowest.push({
                    seed,
                    ...match.players[championPlayer].slowestDecision
                });
            }
            if (match.players[masterPlayer].slowestDecision) {
                masterSlowest.push({
                    seed,
                    ...match.players[masterPlayer].slowestDecision
                });
            }

            matches.push({
                ...match,
                championPlayer,
                masterPlayer,
                outcome
            });
        }
    }

    const decisiveMatches = championWins + masterWins;

    return {
        configuration: {
            seeds: normalizedSeeds,
            pairedMatches: matches.length,
            maxTurns: normalizeMaxTurns(maxTurns),
            championStrategy: 'runtime default',
            championEngineDifficulty: 'champion',
            masterEngineDifficulty: 'hard'
        },
        summary: {
            championWins,
            masterWins,
            draws,
            decisiveMatches,
            championDecisiveWinRate: decisiveMatches === 0
                ? null
                : championWins / decisiveMatches,
            averageTurns: matches.reduce(
                (total, match) => total + match.turnsPlayed,
                0
            ) / matches.length,
            timing: {
                champion: summarizeTiming(championSamples),
                master: summarizeTiming(masterSamples)
            },
            slowestDecision: {
                champion: championSlowest.reduce(
                    (slowest, decision) => (
                        !slowest || decision.elapsedMs > slowest.elapsedMs
                            ? decision
                            : slowest
                    ),
                    null
                ),
                master: masterSlowest.reduce(
                    (slowest, decision) => (
                        !slowest || decision.elapsedMs > slowest.elapsedMs
                            ? decision
                            : slowest
                    ),
                    null
                )
            }
        },
        matches
    };
}

function formatMilliseconds(value) {
    return Number(value).toFixed(2);
}

export function formatChampionBenchmarkMarkdown(report) {
    const { configuration, summary, matches } = report;
    const matchRows = matches.map(match => {
        const winner = match.outcome === 'draw'
            ? 'Turn limit'
            : match.outcome === 'champion'
                ? 'Champion'
                : 'Master';

        return `| ${match.seed} | P${match.championPlayer} | ${winner} | ` +
            `${match.turnsPlayed} | \`${match.traceHash}\` |`;
    });
    const slowRows = [
        ['Champion', summary.slowestDecision.champion],
        ['Master', summary.slowestDecision.master]
    ].map(([label, decision]) => {
        if (!decision) {
            return `| ${label} | — | — | — | — | — | — |`;
        }

        return `| ${label} | ${decision.seed} | P${decision.player} | ` +
            `${decision.turn} | ${decision.availableMoves.join('-')} | ` +
            `${formatMilliseconds(decision.elapsedMs)} | ` +
            `${decision.stateHash} |`;
    });

    return [
        '# Nardora Champion Benchmark',
        '',
        `Seeds: ${configuration.seeds.join(', ')}  `,
        `Paired matches: ${configuration.pairedMatches}  `,
        `Turn limit: ${configuration.maxTurns}  `,
        `Champion strategy: ${configuration.championStrategy}`,
        '',
        '| Outcome | Count |',
        '|---|---:|',
        `| Champion wins | ${summary.championWins} |`,
        `| Master wins | ${summary.masterWins} |`,
        `| Turn-limit draws | ${summary.draws} |`,
        '',
        '| Bot | Decisions | Average ms | P95 ms | Max ms |',
        '|---|---:|---:|---:|---:|',
        `| Champion | ${summary.timing.champion.decisions} | ` +
            `${formatMilliseconds(summary.timing.champion.averageMs)} | ` +
            `${formatMilliseconds(summary.timing.champion.p95Ms)} | ` +
            `${formatMilliseconds(summary.timing.champion.maxMs)} |`,
        `| Master | ${summary.timing.master.decisions} | ` +
            `${formatMilliseconds(summary.timing.master.averageMs)} | ` +
            `${formatMilliseconds(summary.timing.master.p95Ms)} | ` +
            `${formatMilliseconds(summary.timing.master.maxMs)} |`,
        '',
        '| Slowest bot | Seed | Side | Turn | Available dice | ms | State |',
        '|---|---:|---|---:|---|---:|---|',
        ...slowRows,
        '',
        '| Seed | Champion side | Result | Turns | Trace |',
        '|---:|---|---|---:|---|',
        ...matchRows,
        '',
        'This benchmark is deterministic and informational. It measures the ' +
            'selected bot configuration without changing dice or legal-move rules.'
    ].join('\n');
}
