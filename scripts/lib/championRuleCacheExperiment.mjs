import { NardeBot } from '../../engine/bot.js';
import {
    DEFAULT_CHAMPION_BENCHMARK_SEEDS,
    runChampionBenchmark
} from './championBenchmark.mjs';
import { profileChampionDecision } from './championProfile.mjs';

function defaultNow() {
    if (globalThis.performance?.now) {
        return globalThis.performance.now();
    }

    return Date.now();
}

function normalizeSamples(samples) {
    const normalized = Number(samples);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) {
        throw new TypeError('Experiment samples must be a positive integer');
    }

    return normalized;
}

function ratio(numerator, denominator) {
    return denominator === 0 ? 0 : numerator / denominator;
}

function reduction(before, after) {
    return before === 0 ? 0 : 1 - (after / before);
}

export function installRuleAnalysisCache(game) {
    if (typeof game?.beginRuleAnalysisCacheScope !== 'function') {
        throw new TypeError('Rule-analysis cache requires a NardeGame instance');
    }

    return game.beginRuleAnalysisCacheScope();
}

export function createRuleCacheExperimentBot({
    player,
    difficulty,
    random
}) {
    return new NardeBot(player, difficulty, random);
}

export function createUncachedExperimentBot({
    player,
    difficulty,
    random
}) {
    return new NardeBot(
        player,
        difficulty,
        random,
        { useRuleAnalysisCache: false }
    );
}

function compactBenchmark(report) {
    return {
        configuration: { ...report.configuration },
        summary: {
            championWins: report.summary.championWins,
            masterWins: report.summary.masterWins,
            draws: report.summary.draws,
            averageTurns: report.summary.averageTurns,
            timing: report.summary.timing
        },
        matches: report.matches.map(match => ({
            seed: match.seed,
            championPlayer: match.championPlayer,
            masterPlayer: match.masterPlayer,
            outcome: match.outcome,
            turnsPlayed: match.turnsPlayed,
            terminatedBy: match.terminatedBy,
            winner: match.winner,
            winnerDifficulty: match.winnerDifficulty,
            traceHash: match.traceHash,
            diceTraceHash: match.diceTraceHash,
            final: match.final,
            player1Moves: match.players[1].moves,
            player2Moves: match.players[2].moves
        }))
    };
}

function stableBenchmarkEvidence(report) {
    return report.matches.map(match => ({
        seed: match.seed,
        championPlayer: match.championPlayer,
        outcome: match.outcome,
        turnsPlayed: match.turnsPlayed,
        terminatedBy: match.terminatedBy,
        winner: match.winner,
        winnerDifficulty: match.winnerDifficulty,
        traceHash: match.traceHash,
        diceTraceHash: match.diceTraceHash,
        final: match.final,
        player1Moves: match.players[1].moves,
        player2Moves: match.players[2].moves
    }));
}

export function compareChampionBenchmarkWithRuleCache({
    seeds = DEFAULT_CHAMPION_BENCHMARK_SEEDS,
    maxTurns = 240,
    now = defaultNow
} = {}) {
    const baseline = runChampionBenchmark({
        seeds,
        maxTurns,
        now,
        createBot: createUncachedExperimentBot
    });
    const cached = runChampionBenchmark({
        seeds,
        maxTurns,
        now,
        createBot: createRuleCacheExperimentBot
    });
    const baselineEvidence = stableBenchmarkEvidence(baseline);
    const cachedEvidence = stableBenchmarkEvidence(cached);
    const evidenceMatches = JSON.stringify(baselineEvidence) ===
        JSON.stringify(cachedEvidence);

    if (!evidenceMatches) {
        throw new Error(
            'Rule-sequence cache changed deterministic benchmark evidence'
        );
    }

    const baselineTiming = baseline.summary.timing.champion;
    const cachedTiming = cached.summary.timing.champion;

    return {
        evidenceMatches,
        baseline: compactBenchmark(baseline),
        cached: compactBenchmark(cached),
        timing: {
            averageSpeedup: ratio(
                baselineTiming.averageMs,
                cachedTiming.averageMs
            ),
            p95Speedup: ratio(
                baselineTiming.p95Ms,
                cachedTiming.p95Ms
            ),
            maximumSpeedup: ratio(
                baselineTiming.maxMs,
                cachedTiming.maxMs
            )
        }
    };
}

export function compareSlowStateWithRuleCache({
    samples = 3,
    now = defaultNow
} = {}) {
    const normalizedSamples = normalizeSamples(samples);
    const baseline = profileChampionDecision({
        samples: normalizedSamples,
        now,
        createBot: createUncachedExperimentBot
    });
    const cached = profileChampionDecision({
        samples: normalizedSamples,
        now,
        createBot: createRuleCacheExperimentBot
    });

    if (
        JSON.stringify(baseline.instrumented.move) !==
        JSON.stringify(cached.instrumented.move)
    ) {
        throw new Error('Rule-sequence cache changed the profiled move');
    }

    const baselineDerived = baseline.derived;
    const cachedDerived = cached.derived;

    return {
        moveMatches: true,
        baseline,
        cached,
        cache: cached.instrumented.experiment,
        timing: {
            averageSpeedup: ratio(
                baseline.baseline.timing.averageMs,
                cached.baseline.timing.averageMs
            ),
            minimumSpeedup: ratio(
                baseline.baseline.timing.minimumMs,
                cached.baseline.timing.minimumMs
            ),
            maximumSpeedup: ratio(
                baseline.baseline.timing.maximumMs,
                cached.baseline.timing.maximumMs
            )
        },
        workReduction: {
            memoLookups: reduction(
                baselineDerived.memoLookups,
                cachedDerived.memoLookups
            ),
            maximumSearchCalls: reduction(
                baselineDerived.maximumSearchCalls,
                cachedDerived.maximumSearchCalls
            ),
            rawMoveScans: reduction(
                baselineDerived.rawMoveScans,
                cachedDerived.rawMoveScans
            ),
            snapshots: reduction(
                baselineDerived.snapshotsCreated,
                cachedDerived.snapshotsCreated
            ),
            moveExecutions: reduction(
                baselineDerived.moveExecutions,
                cachedDerived.moveExecutions
            )
        }
    };
}

export function runChampionRuleCacheExperiment({
    samples = 3,
    seeds = DEFAULT_CHAMPION_BENCHMARK_SEEDS,
    maxTurns = 240,
    now = defaultNow
} = {}) {
    return {
        experimentVersion: 1,
        informational: true,
        scope: 'runtime request-scoped cache versus uncached control',
        slowState: compareSlowStateWithRuleCache({ samples, now }),
        benchmark: compareChampionBenchmarkWithRuleCache({
            seeds,
            maxTurns,
            now
        })
    };
}

function formatMilliseconds(value) {
    return Number(value).toFixed(2);
}

function formatSpeedup(value) {
    return `${Number(value).toFixed(2)}×`;
}

function formatPercentage(value) {
    return `${(Number(value) * 100).toFixed(2)}%`;
}

function formatInteger(value) {
    return Number(value).toLocaleString('en-US');
}

export function formatChampionRuleCacheExperimentMarkdown(report) {
    const slow = report.slowState;
    const benchmark = report.benchmark;
    const baselineTiming = slow.baseline.baseline.timing;
    const cachedTiming = slow.cached.baseline.timing;
    const baselineWork = slow.baseline.derived;
    const cachedWork = slow.cached.derived;
    const baselineBenchmark = benchmark.baseline.summary.timing.champion;
    const cachedBenchmark = benchmark.cached.summary.timing.champion;
    const traceRows = benchmark.baseline.matches.map(match => (
        `| ${match.seed} | P${match.championPlayer} | ` +
        `\`${match.traceHash}\` |`
    ));

    return [
        '# Nardora Champion Rule-Analysis Cache Experiment',
        '',
        `Scope: ${report.scope}  `,
        `Slow-state move preserved: ${slow.moveMatches ? 'yes' : 'no'}  `,
        `Full benchmark evidence preserved: ` +
            `${benchmark.evidenceMatches ? 'yes' : 'no'}`,
        '',
        '| Slow state | Baseline | Cached | Improvement |',
        '|---|---:|---:|---:|',
        `| Average decision ms | ` +
            `${formatMilliseconds(baselineTiming.averageMs)} | ` +
            `${formatMilliseconds(cachedTiming.averageMs)} | ` +
            `${formatSpeedup(slow.timing.averageSpeedup)} |`,
        `| Memo lookups | ${formatInteger(baselineWork.memoLookups)} | ` +
            `${formatInteger(cachedWork.memoLookups)} | ` +
            `${formatPercentage(slow.workReduction.memoLookups)} less |`,
        `| Maximum-search calls | ` +
            `${formatInteger(baselineWork.maximumSearchCalls)} | ` +
            `${formatInteger(cachedWork.maximumSearchCalls)} | ` +
            `${formatPercentage(slow.workReduction.maximumSearchCalls)} less |`,
        `| Snapshots created | ` +
            `${formatInteger(baselineWork.snapshotsCreated)} | ` +
            `${formatInteger(cachedWork.snapshotsCreated)} | ` +
            `${formatPercentage(slow.workReduction.snapshots)} less |`,
        `| Move attempts | ${formatInteger(baselineWork.moveExecutions)} | ` +
            `${formatInteger(cachedWork.moveExecutions)} | ` +
            `${formatPercentage(slow.workReduction.moveExecutions)} less |`,
        '',
        '| Slow-state cache | Count |',
        '|---|---:|',
        `| Sequence queries | ${formatInteger(slow.cache.sequence.queries)} |`,
        `| Sequence hits | ${formatInteger(slow.cache.sequence.hits)} |`,
        `| Sequence misses | ${formatInteger(slow.cache.sequence.misses)} |`,
        `| Sequence hit rate | ` +
            `${formatPercentage(slow.cache.sequence.hitRate)} |`,
        `| Sequence entries | ${formatInteger(slow.cache.sequence.entries)} |`,
        `| Maximum-search queries | ` +
            `${formatInteger(slow.cache.maximum.queries)} |`,
        `| Maximum-search hits | ` +
            `${formatInteger(slow.cache.maximum.hits)} |`,
        `| Maximum-search misses | ` +
            `${formatInteger(slow.cache.maximum.misses)} |`,
        `| Maximum-search hit rate | ` +
            `${formatPercentage(slow.cache.maximum.hitRate)} |`,
        `| Maximum-search entries | ` +
            `${formatInteger(slow.cache.maximum.entries)} |`,
        '',
        '| Eight-match Champion timing | Baseline | Cached | Improvement |',
        '|---|---:|---:|---:|',
        `| Average ms | ${formatMilliseconds(baselineBenchmark.averageMs)} | ` +
            `${formatMilliseconds(cachedBenchmark.averageMs)} | ` +
            `${formatSpeedup(benchmark.timing.averageSpeedup)} |`,
        `| P95 ms | ${formatMilliseconds(baselineBenchmark.p95Ms)} | ` +
            `${formatMilliseconds(cachedBenchmark.p95Ms)} | ` +
            `${formatSpeedup(benchmark.timing.p95Speedup)} |`,
        `| Maximum ms | ${formatMilliseconds(baselineBenchmark.maxMs)} | ` +
            `${formatMilliseconds(cachedBenchmark.maxMs)} | ` +
            `${formatSpeedup(benchmark.timing.maximumSpeedup)} |`,
        '',
        '| Seed | Champion side | Preserved trace |',
        '|---:|---|---|',
        ...traceRows,
        '',
        'This comparison command is development-only. Its cached side uses ' +
            'the live Champion engine boundary: entries live for one decision ' +
            'and return cloned sequence arrays. The control disables only ' +
            'that cache; strategy weights, dice, and rules stay unchanged.'
    ].join('\n');
}
