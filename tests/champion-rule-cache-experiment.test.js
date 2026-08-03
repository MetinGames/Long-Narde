import test from 'node:test';
import assert from 'node:assert/strict';

import {
    compareChampionBenchmarkWithRuleCache,
    compareSlowStateWithRuleCache,
    formatChampionRuleCacheExperimentMarkdown,
    installRuleAnalysisCache
} from '../scripts/lib/championRuleCacheExperiment.mjs';
import {
    createChampionProfileGame
} from '../scripts/lib/championProfile.mjs';

function createStepClock() {
    let tick = 0;
    return () => tick++;
}

let cachedSlowComparison;
function getSlowComparison() {
    if (!cachedSlowComparison) {
        cachedSlowComparison = compareSlowStateWithRuleCache({
            samples: 1,
            now: createStepClock()
        });
    }

    return cachedSlowComparison;
}

test('request-scoped cache returns cloned exact rule sequences', () => {
    const game = createChampionProfileGame();
    const cache = installRuleAnalysisCache(game);
    const first = game.getRuleCompliantDiceSequences(1);
    const second = game.getRuleCompliantDiceSequences(1);
    const metrics = cache.finish();

    assert.deepEqual(second, first);
    assert.notEqual(second, first);
    if (first.length > 0) {
        assert.notEqual(second[0], first[0]);
    }
    assert.equal(metrics.scope, 'single-champion-decision');
    assert.deepEqual(metrics.sequence, {
        queries: 2,
        hits: 1,
        misses: 1,
        hitRate: 0.5,
        entries: 1
    });
    assert.ok(metrics.maximum.queries > 0);
    assert.ok(metrics.maximum.hits > 0);
});

test('slow-state cache preserves the move and reduces repeated work', () => {
    const comparison = getSlowComparison();

    assert.equal(comparison.moveMatches, true);
    assert.deepEqual(comparison.cached.instrumented.move, {
        from: 3,
        dice: 4,
        target: 7
    });
    assert.ok(comparison.cache.sequence.hits > 0);
    assert.ok(comparison.cache.maximum.hits > 0);
    assert.ok(
        comparison.cached.derived.memoLookups <
        comparison.baseline.derived.memoLookups
    );
    assert.ok(comparison.workReduction.maximumSearchCalls > 0);
    assert.ok(comparison.workReduction.snapshots > 0);
    assert.ok(comparison.workReduction.moveExecutions > 0);
});

test('short paired benchmark preserves deterministic evidence', () => {
    const comparison = compareChampionBenchmarkWithRuleCache({
        seeds: [1103],
        maxTurns: 4,
        now: createStepClock()
    });

    assert.equal(comparison.evidenceMatches, true);
    assert.deepEqual(
        comparison.cached.matches,
        comparison.baseline.matches
    );
});

test('cache experiment formatter states the safety boundary', () => {
    const slowState = getSlowComparison();
    const benchmark = compareChampionBenchmarkWithRuleCache({
        seeds: [1103],
        maxTurns: 1,
        now: createStepClock()
    });
    const markdown = formatChampionRuleCacheExperimentMarkdown({
        scope: 'development-only request-scoped cache',
        slowState,
        benchmark
    });

    assert.match(markdown, /Slow-state move preserved: yes/);
    assert.match(markdown, /Full benchmark evidence preserved: yes/);
    assert.match(markdown, /development-only/i);
    assert.match(markdown, /does not change the live engine/i);
});
