import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

const BENCHMARK_CHAMPION_TIME_BUDGET_MS = 120;
const BENCHMARK_CHAMPION_NODE_BUDGET = 1200;
const BENCHMARK_MASTER_TIME_BUDGET_MS = 40;

function createSeededRandom(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        matches: 120,
        runs: 3,
        maxTurns: 240,
        seed: 20260802,
        keepCheckpoints: false,
        debugTrace: true
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--matches' && args[i + 1]) {
            options.matches = Number(args[i + 1]);
            i += 1;
        } else if (arg === '--runs' && args[i + 1]) {
            options.runs = Number(args[i + 1]);
            i += 1;
        } else if (arg === '--seed' && args[i + 1]) {
            options.seed = Number(args[i + 1]);
            i += 1;
        } else if (arg === '--maxTurns' && args[i + 1]) {
            options.maxTurns = Number(args[i + 1]);
            i += 1;
        } else if (arg === '--keepCheckpoints') {
            options.keepCheckpoints = true;
        } else if (arg === '--noDebugTrace') {
            options.debugTrace = false;
        }
    }

    options.matches = Number.isFinite(options.matches) && options.matches > 0
        ? Math.floor(options.matches)
        : 120;

    options.runs = Number.isFinite(options.runs) && options.runs > 0
        ? Math.floor(options.runs)
        : 3;

    options.seed = Number.isFinite(options.seed)
        ? Math.floor(options.seed)
        : 20260802;

    options.maxTurns = Number.isFinite(options.maxTurns) && options.maxTurns > 0
        ? Math.floor(options.maxTurns)
        : 240;

    return options;
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

function rollMoves(rng) {
    const die1 = Math.floor(rng() * 6) + 1;
    const die2 = Math.floor(rng() * 6) + 1;
    const moves = die1 === die2
        ? [die1, die1, die1, die1]
        : [die1, die2];

    return {
        values: [die1, die2],
        moves
    };
}

function applyBenchmarkBudgets(bot) {
    bot.configureDebug({
        enabled: true,
        profile: true,
        collectChampionTrace: bot.difficulty === 'champion'
    });

    if (bot.difficulty === 'hard') {
        const originalBuildMasterV2Plan = bot.buildMasterV2Plan.bind(bot);
        bot.buildMasterV2Plan = (game, options = {}) => originalBuildMasterV2Plan(game, {
            ...options,
            timeBudgetMs: Math.min(
                options.timeBudgetMs ?? BENCHMARK_MASTER_TIME_BUDGET_MS,
                BENCHMARK_MASTER_TIME_BUDGET_MS
            )
        });
    }

    if (bot.difficulty === 'champion') {
        const originalBuildChampionPlanSync = bot.buildChampionPlanSync.bind(bot);
        bot.buildChampionPlanSync = (game, options = {}) => originalBuildChampionPlanSync(game, {
            ...options,
            timeBudgetMs: Math.min(
                options.timeBudgetMs ?? BENCHMARK_CHAMPION_TIME_BUDGET_MS,
                BENCHMARK_CHAMPION_TIME_BUDGET_MS
            ),
            nodeBudget: Math.min(
                options.nodeBudget ?? BENCHMARK_CHAMPION_NODE_BUDGET,
                BENCHMARK_CHAMPION_NODE_BUDGET
            )
        });
    }
}

function summarizeWinner(result, firstIsWhite) {
    if (result.winner === 0) {
        return 'none';
    }

    const firstWon =
        (firstIsWhite && result.winner === 1) ||
        (!firstIsWhite && result.winner === 2);

    return firstWon ? 'first' : 'second';
}

function safeNowIso() {
    return new Date().toISOString();
}

function buildCheckpointWriter() {
    const checkpointRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nardora-bench-'));

    const writer = {
        root: checkpointRoot,
        write(relativePath, data) {
            const filePath = path.join(checkpointRoot, relativePath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        },
        cleanup() {
            fs.rmSync(checkpointRoot, { recursive: true, force: true });
        }
    };

    return writer;
}

async function playSingleMatch({
    whiteDifficulty,
    blackDifficulty,
    rng,
    maxTurns,
    runIndex,
    duelLabel,
    matchIndex,
    matchTotal
}) {
    const game = new NardeGame();
    game.initGame();

    const whiteBot = new NardeBot(1, whiteDifficulty);
    const blackBot = new NardeBot(2, blackDifficulty);
    applyBenchmarkBudgets(whiteBot);
    applyBenchmarkBudgets(blackBot);

    const championTraces = [];
    const decisionTimesMs = {
        1: [],
        2: []
    };

    const matchStart = performance.now();
    let turnsPlayed = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
        turnsPlayed = turn + 1;
        if (game.gameStatus === 'GAME_OVER') break;
        if (game.gameStatus !== 'WAITING_FOR_DICE') {
            game.gameStatus = 'WAITING_FOR_DICE';
        }

        const roll = rollMoves(rng);
        game.dice.values = [...roll.values];
        game.availableMoves = [...roll.moves];
        game.headMovesThisTurn = 0;
        game.moveHistory = [];
        game.gameStatus = 'PLAYING';

        if (!game.hasValidMoves()) {
            game.confirmTurnEnd();
            continue;
        }

        const activeBot = game.currentPlayer === 1 ? whiteBot : blackBot;
        const turnStart = performance.now();

        if (activeBot.difficulty === 'champion') {
            await activeBot.prepareChampionTurn(game, {
                timeBudgetMs: BENCHMARK_CHAMPION_TIME_BUDGET_MS,
                nodeBudget: BENCHMARK_CHAMPION_NODE_BUDGET,
                sliceMs: 2,
                shouldCancel: () => false,
                onThinkingStatus: () => {}
            });
        }

        let guard = 0;
        while (
            game.currentPlayer === activeBot.playerNumber &&
            game.gameStatus === 'PLAYING' &&
            game.availableMoves.length > 0 &&
            game.hasValidMoves() &&
            guard < 8
        ) {
            guard += 1;
            const move = activeBot.makeDecision(game);
            if (!move || !game.executeMove(move.from, move.dice)) {
                break;
            }

            if (game.checkWinCondition() !== 0) {
                break;
            }
        }

        const elapsed = performance.now() - turnStart;
        decisionTimesMs[activeBot.playerNumber].push(elapsed);

        if (activeBot.difficulty === 'champion' && activeBot.lastChampionDecisionTrace) {
            championTraces.push({
                turn: turn + 1,
                trace: activeBot.lastChampionDecisionTrace
            });
        }

        if (game.gameStatus !== 'GAME_OVER') {
            game.confirmTurnEnd();
        }
    }

    const winner = game.board.hasPlayerWon(1)
        ? 1
        : game.board.hasPlayerWon(2)
            ? 2
            : 0;

    const completed = winner !== 0;
    const truncated = !completed;
    const loser = winner === 1 ? 2 : 1;
    const mars = completed && game.board.borneOff[loser] === 0;
    const pipDiffSigned = getPipTotal(game, 1) - getPipTotal(game, 2);
    const pipDiff = Math.abs(pipDiffSigned);
    const durationMs = performance.now() - matchStart;

    const whiteProfile = whiteBot.getDebugSnapshot().profile;
    const blackProfile = blackBot.getDebugSnapshot().profile;

    console.log(
        `[${duelLabel}] run ${runIndex + 1} match ${matchIndex + 1}/${matchTotal} ` +
        `${completed ? 'completed' : 'truncated'} turns=${turnsPlayed} ` +
        `duration=${durationMs.toFixed(1)}ms winner=${winner || 'none'} pipDiff=${pipDiff}`
    );

    return {
        winner,
        completed,
        truncated,
        mars,
        turnsPlayed,
        durationMs,
        pipDiff,
        pipDiffSigned,
        decisionTimesMs,
        championTraces,
        whiteProfile,
        blackProfile
    };
}

function summarizeResults(results, firstLabel, secondLabel) {
    const total = results.length;
    let completedMatches = 0;
    let truncatedMatches = 0;
    let firstWins = 0;
    let secondWins = 0;
    let firstMars = 0;
    let secondMars = 0;
    let pipDiffTotal = 0;
    let completedPipDiffTotal = 0;
    let totalDurationMs = 0;

    const decisionTimes = {
        first: [],
        second: []
    };

    const profileTotals = {
        first: {
            enumerateCalls: 0,
            enumerateCacheHits: 0,
            legalMoveCalls: 0,
            legalMoveCacheHits: 0,
            replyCalls: 0,
            replyCacheHits: 0,
            masterPlanCalls: 0,
            championPlanCalls: 0,
            masterPlanMs: 0,
            championPlanMs: 0
        },
        second: {
            enumerateCalls: 0,
            enumerateCacheHits: 0,
            legalMoveCalls: 0,
            legalMoveCacheHits: 0,
            replyCalls: 0,
            replyCacheHits: 0,
            masterPlanCalls: 0,
            championPlanCalls: 0,
            masterPlanMs: 0,
            championPlanMs: 0
        }
    };

    for (const result of results) {
        pipDiffTotal += result.pipDiff;
        totalDurationMs += result.durationMs;

        if (result.completed) {
            completedMatches += 1;
            completedPipDiffTotal += result.pipDiff;
        }

        if (result.truncated) {
            truncatedMatches += 1;
        }

        if (result.firstIsWhite) {
            decisionTimes.first.push(...result.decisionTimesMs[1]);
            decisionTimes.second.push(...result.decisionTimesMs[2]);
            mergeProfile(profileTotals.first, result.whiteProfile);
            mergeProfile(profileTotals.second, result.blackProfile);
        } else {
            decisionTimes.first.push(...result.decisionTimesMs[2]);
            decisionTimes.second.push(...result.decisionTimesMs[1]);
            mergeProfile(profileTotals.first, result.blackProfile);
            mergeProfile(profileTotals.second, result.whiteProfile);
        }

        if (!result.completed) continue;

        const firstWon =
            (result.firstIsWhite && result.winner === 1) ||
            (!result.firstIsWhite && result.winner === 2);

        if (firstWon) {
            firstWins += 1;
            if (result.mars) firstMars += 1;
        } else {
            secondWins += 1;
            if (result.mars) secondMars += 1;
        }
    }

    return {
        total,
        completedMatches,
        truncatedMatches,
        firstLabel,
        secondLabel,
        firstWins,
        secondWins,
        firstWinRate: completedMatches > 0 ? (firstWins / completedMatches) * 100 : 0,
        secondWinRate: completedMatches > 0 ? (secondWins / completedMatches) * 100 : 0,
        firstMarsRate: completedMatches > 0 ? (firstMars / completedMatches) * 100 : 0,
        secondMarsRate: completedMatches > 0 ? (secondMars / completedMatches) * 100 : 0,
        avgPipDiffAll: total > 0 ? pipDiffTotal / total : 0,
        avgPipDiffCompleted: completedMatches > 0 ? completedPipDiffTotal / completedMatches : 0,
        avgDecisionMsFirst: avg(decisionTimes.first),
        avgDecisionMsSecond: avg(decisionTimes.second),
        totalDurationMs,
        profileTotals
    };
}

function mergeProfile(target, source) {
    if (!source) return;
    for (const key of Object.keys(target)) {
        target[key] += source[key] || 0;
    }
}

function avg(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function printSummary(summary) {
    console.log('');
    console.log(`Duel: ${summary.firstLabel} vs ${summary.secondLabel}`);
    console.log(`Matches: ${summary.total}`);
    console.log(`Completed: ${summary.completedMatches}`);
    console.log(`Truncated: ${summary.truncatedMatches}`);
    console.log(`${summary.firstLabel} wins: ${summary.firstWins}`);
    console.log(`${summary.secondLabel} wins: ${summary.secondWins}`);
    console.log(`${summary.firstLabel} win rate (completed): ${summary.firstWinRate.toFixed(2)}%`);
    console.log(`${summary.secondLabel} win rate (completed): ${summary.secondWinRate.toFixed(2)}%`);
    console.log(`Average pip diff (all): ${summary.avgPipDiffAll.toFixed(2)}`);
    console.log(`Average pip diff (completed): ${summary.avgPipDiffCompleted.toFixed(2)}`);
    console.log(`${summary.firstLabel} avg decision time: ${summary.avgDecisionMsFirst.toFixed(2)} ms`);
    console.log(`${summary.secondLabel} avg decision time: ${summary.avgDecisionMsSecond.toFixed(2)} ms`);
    console.log(`Total duel duration: ${summary.totalDurationMs.toFixed(1)} ms`);

    printProfile(`${summary.firstLabel} profile`, summary.profileTotals.first);
    printProfile(`${summary.secondLabel} profile`, summary.profileTotals.second);
}

function printProfile(label, profile) {
    const enumerateHitRate = profile.enumerateCalls > 0
        ? (profile.enumerateCacheHits / profile.enumerateCalls) * 100
        : 0;
    const legalHitRate = profile.legalMoveCalls > 0
        ? (profile.legalMoveCacheHits / profile.legalMoveCalls) * 100
        : 0;
    const replyHitRate = profile.replyCalls > 0
        ? (profile.replyCacheHits / profile.replyCalls) * 100
        : 0;

    console.log('');
    console.log(`${label}:`);
    console.log(`  enumerate calls/cache hits: ${profile.enumerateCalls}/${profile.enumerateCacheHits} (${enumerateHitRate.toFixed(1)}%)`);
    console.log(`  legal move calls/cache hits: ${profile.legalMoveCalls}/${profile.legalMoveCacheHits} (${legalHitRate.toFixed(1)}%)`);
    console.log(`  reply calls/cache hits: ${profile.replyCalls}/${profile.replyCacheHits} (${replyHitRate.toFixed(1)}%)`);
    console.log(`  master plan calls/time: ${profile.masterPlanCalls}/${profile.masterPlanMs.toFixed(1)}ms`);
    console.log(`  champion plan calls/time: ${profile.championPlanCalls}/${profile.championPlanMs.toFixed(1)}ms`);
}

async function runDuel({
    firstDifficulty,
    secondDifficulty,
    matches,
    seed,
    maxTurns,
    runIndex,
    checkpointWriter,
    checkpointPrefix
}) {
    const rng = createSeededRandom(seed);
    const results = [];

    for (let i = 0; i < matches; i++) {
        const firstIsWhite = i % 2 === 0;

        const result = await playSingleMatch({
            whiteDifficulty: firstIsWhite ? firstDifficulty : secondDifficulty,
            blackDifficulty: firstIsWhite ? secondDifficulty : firstDifficulty,
            rng,
            maxTurns,
            runIndex,
            duelLabel: `${firstDifficulty}-vs-${secondDifficulty}`,
            matchIndex: i,
            matchTotal: matches
        });

        const winnerPerspective = summarizeWinner(result, firstIsWhite);
        results.push({
            ...result,
            firstIsWhite,
            winnerPerspective
        });

        checkpointWriter.write(
            path.join(checkpointPrefix, `match-${String(i + 1).padStart(3, '0')}.json`),
            {
                generatedAt: safeNowIso(),
                runIndex,
                matchIndex: i,
                firstDifficulty,
                secondDifficulty,
                firstIsWhite,
                winnerPerspective,
                winner: result.winner,
                completed: result.completed,
                truncated: result.truncated,
                turnsPlayed: result.turnsPlayed,
                durationMs: result.durationMs,
                pipDiff: result.pipDiff,
                pipDiffSigned: result.pipDiffSigned,
                decisionTimesMs: result.decisionTimesMs,
                championTraces: result.championTraces.slice(-6)
            }
        );

        checkpointWriter.write(
            path.join(checkpointPrefix, 'rolling-summary.json'),
            {
                generatedAt: safeNowIso(),
                runIndex,
                completed: results.filter(entry => entry.completed).length,
                truncated: results.filter(entry => entry.truncated).length,
                played: results.length,
                firstWins: results.filter(entry => entry.winnerPerspective === 'first').length,
                secondWins: results.filter(entry => entry.winnerPerspective === 'second').length
            }
        );
    }

    return summarizeResults(results, firstDifficulty, secondDifficulty);
}

function evaluateSuperiorityGate(summary) {
    const minCompletedRequired = Math.max(4, Math.ceil(summary.total * 0.5));
    if (summary.completedMatches < minCompletedRequired) {
        return {
            status: 'INCONCLUSIVE',
            reason: `Completed matches ${summary.completedMatches}/${summary.total} below required ${minCompletedRequired}.`
        };
    }

    const dominates = summary.firstWinRate >= 55 && summary.firstWinRate >= summary.secondWinRate + 5;
    if (!dominates) {
        return {
            status: 'FAIL',
            reason: 'Champion did not show clear superiority over Master V2.'
        };
    }

    return {
        status: 'PASS',
        reason: 'Champion superiority gate passed on completed matches.'
    };
}

async function main() {
    const { matches, runs, maxTurns, seed, keepCheckpoints } = parseArgs();
    const checkpointWriter = buildCheckpointWriter();

    console.log('Nardora Bot Benchmark (seeded, headless)');
    console.log(`Seed: ${seed}`);
    console.log(`Runs: ${runs}`);
    console.log(`Matches per duel: ${matches}`);
    console.log(`Max turns per match: ${maxTurns}`);

    const masterVsMediumSummaries = [];
    const championVsMasterSummaries = [];

    try {
        for (let runIndex = 0; runIndex < runs; runIndex++) {
            const runSeed = seed + runIndex * 101;

            masterVsMediumSummaries.push(await runDuel({
                firstDifficulty: 'hard',
                secondDifficulty: 'medium',
                matches,
                seed: runSeed,
                maxTurns,
                runIndex,
                checkpointWriter,
                checkpointPrefix: path.join(`run-${runIndex + 1}`, 'hard-vs-medium')
            }));

            championVsMasterSummaries.push(await runDuel({
                firstDifficulty: 'champion',
                secondDifficulty: 'hard',
                matches,
                seed: runSeed + 17,
                maxTurns,
                runIndex,
                checkpointWriter,
                checkpointPrefix: path.join(`run-${runIndex + 1}`, 'champion-vs-hard')
            }));
        }

        const masterVsMedium = mergeSummaries(masterVsMediumSummaries);
        const championVsMaster = mergeSummaries(championVsMasterSummaries);

        printSummary(masterVsMedium);
        printSummary(championVsMaster);

        const gate = evaluateSuperiorityGate(championVsMaster);
        console.log('');
        console.log(`Superiority gate: ${gate.status}`);
        console.log(`Gate reason: ${gate.reason}`);

        if (gate.status === 'FAIL') {
            process.exitCode = 1;
        }
    } finally {
        if (keepCheckpoints) {
            console.log(`Checkpoint directory: ${checkpointWriter.root}`);
        } else {
            checkpointWriter.cleanup();
        }
    }
}

function mergeSummaries(summaries) {
    const result = {
        total: 0,
        completedMatches: 0,
        truncatedMatches: 0,
        firstLabel: summaries[0]?.firstLabel ?? '',
        secondLabel: summaries[0]?.secondLabel ?? '',
        firstWins: 0,
        secondWins: 0,
        firstWinRate: 0,
        secondWinRate: 0,
        firstMarsRate: 0,
        secondMarsRate: 0,
        avgPipDiffAll: 0,
        avgPipDiffCompleted: 0,
        avgDecisionMsFirst: 0,
        avgDecisionMsSecond: 0,
        totalDurationMs: 0,
        profileTotals: {
            first: {
                enumerateCalls: 0,
                enumerateCacheHits: 0,
                legalMoveCalls: 0,
                legalMoveCacheHits: 0,
                replyCalls: 0,
                replyCacheHits: 0,
                masterPlanCalls: 0,
                championPlanCalls: 0,
                masterPlanMs: 0,
                championPlanMs: 0
            },
            second: {
                enumerateCalls: 0,
                enumerateCacheHits: 0,
                legalMoveCalls: 0,
                legalMoveCacheHits: 0,
                replyCalls: 0,
                replyCacheHits: 0,
                masterPlanCalls: 0,
                championPlanCalls: 0,
                masterPlanMs: 0,
                championPlanMs: 0
            }
        }
    };

    let pipDiffAllWeighted = 0;
    let pipDiffCompletedWeighted = 0;
    let firstDecisionWeighted = 0;
    let secondDecisionWeighted = 0;
    let firstDecisionCount = 0;
    let secondDecisionCount = 0;

    for (const summary of summaries) {
        result.total += summary.total;
        result.completedMatches += summary.completedMatches;
        result.truncatedMatches += summary.truncatedMatches;
        result.firstWins += summary.firstWins;
        result.secondWins += summary.secondWins;
        result.totalDurationMs += summary.totalDurationMs;

        pipDiffAllWeighted += summary.avgPipDiffAll * summary.total;
        pipDiffCompletedWeighted += summary.avgPipDiffCompleted * summary.completedMatches;

        mergeProfile(result.profileTotals.first, summary.profileTotals.first);
        mergeProfile(result.profileTotals.second, summary.profileTotals.second);

        if (summary.avgDecisionMsFirst > 0) {
            firstDecisionWeighted += summary.avgDecisionMsFirst * summary.total;
            firstDecisionCount += summary.total;
        }

        if (summary.avgDecisionMsSecond > 0) {
            secondDecisionWeighted += summary.avgDecisionMsSecond * summary.total;
            secondDecisionCount += summary.total;
        }
    }

    result.firstWinRate = result.completedMatches > 0
        ? (result.firstWins / result.completedMatches) * 100
        : 0;
    result.secondWinRate = result.completedMatches > 0
        ? (result.secondWins / result.completedMatches) * 100
        : 0;
    result.avgPipDiffAll = result.total > 0
        ? pipDiffAllWeighted / result.total
        : 0;
    result.avgPipDiffCompleted = result.completedMatches > 0
        ? pipDiffCompletedWeighted / result.completedMatches
        : 0;
    result.avgDecisionMsFirst = firstDecisionCount > 0
        ? firstDecisionWeighted / firstDecisionCount
        : 0;
    result.avgDecisionMsSecond = secondDecisionCount > 0
        ? secondDecisionWeighted / secondDecisionCount
        : 0;

    return result;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
