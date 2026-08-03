import { NardeBot } from '../../engine/bot.js';
import { NardeGame } from '../../engine/game.js';
import { hashBenchmarkStateKey } from './championBenchmark.mjs';

const DEFAULT_PROFILE_SAMPLES = 3;

const GAME_METHODS = Object.freeze([
    'hasValidMoves',
    'createMoveStateSnapshot',
    'restoreMoveState',
    'getSearchStateKey',
    'simulateDiceSequence',
    'executeMove',
    'getRawLegalSingleMoves',
    'getMaximumPlayableMoveCount',
    'getRequiredDiceValues',
    'getRuleCompliantDiceSequences'
]);

const BOT_METHODS = Object.freeze([
    'buildChampionPlan',
    'getRuleCompliantSingleMoves',
    'evaluateChampionPlanTerminal',
    'isSingleMoveStillLegal',
    'compareChampionPlans'
]);

const TIMED_METHODS = new Set([
    'game.hasValidMoves',
    'game.getRequiredDiceValues',
    'game.getRuleCompliantDiceSequences',
    'bot.buildChampionPlan',
    'bot.getRuleCompliantSingleMoves',
    'bot.evaluateChampionPlanTerminal',
    'bot.isSingleMoveStillLegal'
]);

export const CHAMPION_DOUBLE_FOUR_PROFILE_CASE = Object.freeze({
    id: 'double-four-addb3dba',
    description: 'Seed 1103, Champion P2, turn 50, double fours',
    seed: 1103,
    turn: 50,
    player: 2,
    roll: Object.freeze([4, 4]),
    turnsCompleted: Object.freeze({ 1: 25, 2: 24 }),
    stateHash: 'addb3dba',
    stateKey: '2|0|4,4,4,4|0|0|' +
        '1:2:1;2:2:1;3:2:1;4:2:1;5:2:1;6:2:1;' +
        '7:2:1;8:2:1;9:1:1;10:1:1;15:1:8;16:1:2;' +
        '18:1:1;19:1:2;20:2:1;21:2:1;22:2:2;23:2:2;24:2:1;',
    expectedMove: Object.freeze({
        from: 3,
        dice: 4,
        target: 7
    })
});

function defaultNow() {
    if (globalThis.performance?.now) {
        return globalThis.performance.now();
    }

    return Date.now();
}

function normalizePositiveInteger(value, label) {
    const normalized = Number(value);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) {
        throw new TypeError(`${label} must be a positive integer`);
    }

    return normalized;
}

function parseInteger(value, label, minimum, maximum) {
    const normalized = Number(value);
    if (
        !Number.isSafeInteger(normalized) ||
        normalized < minimum ||
        normalized > maximum
    ) {
        throw new TypeError(
            `${label} must be an integer from ${minimum} to ${maximum}`
        );
    }

    return normalized;
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

function summarizeTiming(samples) {
    const totalMs = samples.reduce((total, value) => total + value, 0);
    return {
        samples: samples.length,
        totalMs,
        averageMs: samples.length === 0 ? 0 : totalMs / samples.length,
        minimumMs: samples.length === 0 ? 0 : Math.min(...samples),
        maximumMs: samples.length === 0 ? 0 : Math.max(...samples)
    };
}

function assertExpectedMove(profileCase, move) {
    const expected = profileCase.expectedMove;
    if (
        !move ||
        move.from !== expected.from ||
        move.dice !== expected.dice ||
        move.target !== expected.target
    ) {
        throw new Error(
            `${profileCase.id} selected ${JSON.stringify(move)}; expected ` +
            JSON.stringify(expected)
        );
    }
}

function parseStateKey(stateKey) {
    if (typeof stateKey !== 'string' || stateKey.length === 0) {
        throw new TypeError('Profile state key must be a non-empty string');
    }

    const parts = stateKey.split('|');
    if (parts.length !== 6) {
        throw new TypeError('Profile state key must contain six sections');
    }

    const currentPlayer = parseInteger(parts[0], 'Current player', 1, 2);
    const headMoves = parseInteger(parts[1], 'Head move count', 0, 4);
    const availableMoves = parts[2] === ''
        ? []
        : parts[2].split(',').map((value, index) => (
            parseInteger(value, `Available die ${index + 1}`, 1, 6)
        ));
    const borneOff = {
        1: parseInteger(parts[3], 'Player 1 borne-off count', 0, 15),
        2: parseInteger(parts[4], 'Player 2 borne-off count', 0, 15)
    };
    const slots = [];
    const seenSlots = new Set();

    for (const entry of parts[5].split(';').filter(Boolean)) {
        const match = /^(\d+):([12]):(\d+)$/.exec(entry);
        if (!match) {
            throw new TypeError(`Invalid profile slot entry: ${entry}`);
        }

        const slotId = parseInteger(match[1], 'Slot ID', 1, 24);
        const player = parseInteger(match[2], 'Slot player', 1, 2);
        const count = parseInteger(match[3], 'Slot checker count', 1, 15);
        if (seenSlots.has(slotId)) {
            throw new TypeError(`Duplicate profile slot: ${slotId}`);
        }

        seenSlots.add(slotId);
        slots.push({ slotId, player, count });
    }

    return {
        currentPlayer,
        headMoves,
        availableMoves,
        borneOff,
        slots
    };
}

export function createChampionProfileGame(
    profileCase = CHAMPION_DOUBLE_FOUR_PROFILE_CASE
) {
    const parsed = parseStateKey(profileCase.stateKey);
    const game = new NardeGame();
    game.initGame();
    game.board.slots = Array.from({ length: 25 }, () => ({
        count: 0,
        player: null
    }));

    for (const slot of parsed.slots) {
        game.board.slots[slot.slotId] = {
            count: slot.count,
            player: slot.player
        };
    }

    game.board.borneOff = { ...parsed.borneOff };
    game.currentPlayer = parsed.currentPlayer;
    game.availableMoves = [...parsed.availableMoves];
    game.headMovesThisTurn = parsed.headMoves;
    game.dice.values = [...profileCase.roll];
    game.turnsCompleted = {
        1: normalizePositiveInteger(
            profileCase.turnsCompleted[1],
            'Player 1 completed turns'
        ),
        2: normalizePositiveInteger(
            profileCase.turnsCompleted[2],
            'Player 2 completed turns'
        )
    };
    game.gameStatus = 'PLAYING';
    game.moveHistory = [];
    game.resetAnalysisMetrics();

    for (const player of [1, 2]) {
        const checkerTotal = getCheckerTotal(game, player);
        if (checkerTotal !== 15) {
            throw new Error(
                `Profile state has ${checkerTotal} checkers for player ${player}`
            );
        }
    }

    const restoredKey = game.getSearchStateKey();
    if (restoredKey !== profileCase.stateKey) {
        throw new Error('Profile state key did not round-trip exactly');
    }

    if (hashBenchmarkStateKey(restoredKey) !== profileCase.stateHash) {
        throw new Error('Profile state hash does not match the fixture');
    }

    return game;
}

function installMethodProfiler({ game, bot, now }) {
    const counts = {};
    const timings = {};
    const restorers = [];

    const wrap = (scope, target, methodName) => {
        const original = target[methodName];
        if (typeof original !== 'function') {
            throw new TypeError(`${scope}.${methodName} is not callable`);
        }

        const key = `${scope}.${methodName}`;
        target[methodName] = function profiledMethod(...args) {
            counts[key] = (counts[key] || 0) + 1;
            if (!TIMED_METHODS.has(key)) {
                return original.apply(this, args);
            }

            const startedAt = Number(now());
            try {
                return original.apply(this, args);
            } finally {
                const elapsedMs = Math.max(0, Number(now()) - startedAt);
                const timing = timings[key] || {
                    calls: 0,
                    totalMs: 0,
                    maximumMs: 0
                };
                timing.calls++;
                timing.totalMs += elapsedMs;
                timing.maximumMs = Math.max(timing.maximumMs, elapsedMs);
                timings[key] = timing;
            }
        };
        restorers.push(() => {
            target[methodName] = original;
        });
    };

    for (const methodName of GAME_METHODS) {
        wrap('game', game, methodName);
    }
    for (const methodName of BOT_METHODS) {
        wrap('bot', bot, methodName);
    }

    return {
        finish() {
            for (const restore of restorers.reverse()) restore();

            const normalizedTimings = {};
            for (const [key, timing] of Object.entries(timings)) {
                normalizedTimings[key] = {
                    ...timing,
                    averageMs: timing.calls === 0
                        ? 0
                        : timing.totalMs / timing.calls
                };
            }

            return {
                counts: { ...counts },
                inclusiveTimings: normalizedTimings
            };
        }
    };
}

function runProfileDecision({
    profileCase,
    now,
    instrument,
    prepareRun,
    createBot
}) {
    const game = createChampionProfileGame(profileCase);
    const bot = createBot
        ? createBot({
            player: profileCase.player,
            difficulty: 'champion',
            random: () => 0.5
        })
        : new NardeBot(profileCase.player, 'champion', () => 0.5);
    const preparedRun = prepareRun?.({ game, bot }) || null;
    const profiler = instrument
        ? installMethodProfiler({ game, bot, now })
        : null;
    game.resetAnalysisMetrics();
    const startedAt = Number(now());
    let move;
    let elapsedMs;
    let methods = null;
    let experiment = null;

    try {
        move = bot.makeDecision(game);
        elapsedMs = Math.max(0, Number(now()) - startedAt);
    } finally {
        methods = profiler?.finish() || null;
        experiment = preparedRun?.finish?.() ||
            bot.lastRuleAnalysisCacheMetrics ||
            null;
    }

    if (!Number.isFinite(elapsedMs)) {
        throw new Error('Profile clock returned a non-finite duration');
    }

    assertExpectedMove(profileCase, move);
    if (game.getSearchStateKey() !== profileCase.stateKey) {
        throw new Error('Champion profiling mutated the source game state');
    }

    return {
        elapsedMs,
        move: { ...move },
        analysis: game.getAnalysisMetrics(),
        methods,
        experiment
    };
}

export function profileChampionDecision({
    profileCase = CHAMPION_DOUBLE_FOUR_PROFILE_CASE,
    samples = DEFAULT_PROFILE_SAMPLES,
    now = defaultNow,
    prepareRun,
    createBot
} = {}) {
    const sampleCount = normalizePositiveInteger(samples, 'Profile samples');
    const baselineRuns = [];

    for (let index = 0; index < sampleCount; index++) {
        baselineRuns.push(runProfileDecision({
            profileCase,
            now,
            instrument: false,
            prepareRun,
            createBot
        }));
    }

    const instrumented = runProfileDecision({
        profileCase,
        now,
        instrument: true,
        prepareRun,
        createBot
    });
    const analysis = instrumented.analysis;
    const memoLookups = analysis.memoHits + analysis.memoMisses;
    const counts = instrumented.methods.counts;

    return {
        profileVersion: 1,
        informational: true,
        case: {
            id: profileCase.id,
            description: profileCase.description,
            seed: profileCase.seed,
            turn: profileCase.turn,
            player: profileCase.player,
            roll: [...profileCase.roll],
            stateHash: profileCase.stateHash,
            stateKey: profileCase.stateKey,
            expectedMove: { ...profileCase.expectedMove }
        },
        baseline: {
            timing: summarizeTiming(
                baselineRuns.map(run => run.elapsedMs)
            ),
            runs: baselineRuns
        },
        instrumented,
        derived: {
            memoLookups,
            memoHitRate: memoLookups === 0
                ? 0
                : analysis.memoHits / memoLookups,
            snapshotsCreated:
                counts['game.createMoveStateSnapshot'] || 0,
            snapshotsRestored:
                counts['game.restoreMoveState'] || 0,
            stateKeysBuilt: counts['game.getSearchStateKey'] || 0,
            moveExecutions: counts['game.executeMove'] || 0,
            rawMoveScans: counts['game.getRawLegalSingleMoves'] || 0,
            maximumSearchCalls:
                counts['game.getMaximumPlayableMoveCount'] || 0,
            ruleSequenceQueries:
                counts['game.getRuleCompliantDiceSequences'] || 0,
            terminalPlans:
                counts['bot.evaluateChampionPlanTerminal'] || 0
        }
    };
}

function formatMilliseconds(value) {
    return Number(value).toFixed(2);
}

function formatInteger(value) {
    return Number(value).toLocaleString('en-US');
}

export function formatChampionProfileMarkdown(report) {
    const { baseline, case: profileCase, derived, instrumented } = report;
    const timingRows = Object.entries(
        instrumented.methods.inclusiveTimings
    )
        .sort((left, right) => right[1].totalMs - left[1].totalMs)
        .map(([method, timing]) => (
            `| \`${method}\` | ${formatInteger(timing.calls)} | ` +
            `${formatMilliseconds(timing.totalMs)} | ` +
            `${formatMilliseconds(timing.averageMs)} |`
        ));

    return [
        '# Nardora Champion Slow-State Profile',
        '',
        `Case: \`${profileCase.id}\`  `,
        `State: \`${profileCase.stateHash}\`  `,
        `Roll: ${profileCase.roll.join('-')}  `,
        `Selected move: ${instrumented.move.from} → ` +
            `${instrumented.move.target} with die ${instrumented.move.dice}`,
        '',
        '| Baseline samples | Average ms | Minimum ms | Maximum ms |',
        '|---:|---:|---:|---:|',
        `| ${baseline.timing.samples} | ` +
            `${formatMilliseconds(baseline.timing.averageMs)} | ` +
            `${formatMilliseconds(baseline.timing.minimumMs)} | ` +
            `${formatMilliseconds(baseline.timing.maximumMs)} |`,
        '',
        '| Deterministic work metric | Count |',
        '|---|---:|',
        `| Memo lookups | ${formatInteger(derived.memoLookups)} |`,
        `| Memo hits | ${formatInteger(instrumented.analysis.memoHits)} |`,
        `| Memo misses | ${formatInteger(instrumented.analysis.memoMisses)} |`,
        `| Memo hit rate | ${(derived.memoHitRate * 100).toFixed(2)}% |`,
        `| Maximum-search calls | ${formatInteger(derived.maximumSearchCalls)} |`,
        `| Raw legal-move scans | ${formatInteger(derived.rawMoveScans)} |`,
        `| Rule-sequence queries | ${formatInteger(derived.ruleSequenceQueries)} |`,
        `| State keys built | ${formatInteger(derived.stateKeysBuilt)} |`,
        `| Snapshots created | ${formatInteger(derived.snapshotsCreated)} |`,
        `| Snapshots restored | ${formatInteger(derived.snapshotsRestored)} |`,
        `| Move execution attempts | ${formatInteger(derived.moveExecutions)} |`,
        `| Terminal plans scored | ${formatInteger(derived.terminalPlans)} |`,
        '',
        '| Inclusive phase (nested) | Calls | Total ms | Average ms |',
        '|---|---:|---:|---:|',
        ...timingRows,
        '',
        'Inclusive phase timings overlap and are not additive. Method counts ' +
            'and the selected move are deterministic; wall-clock timings vary ' +
            'by device. This profile does not change strategy, dice, or rules.'
    ].join('\n');
}
