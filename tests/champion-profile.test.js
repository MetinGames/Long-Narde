import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHAMPION_DOUBLE_FOUR_PROFILE_CASE,
    createChampionProfileGame,
    formatChampionProfileMarkdown,
    profileChampionDecision
} from '../scripts/lib/championProfile.mjs';

function createStepClock() {
    let tick = 0;
    return () => tick++;
}

let cachedProfileReport;
function getProfileReport() {
    if (!cachedProfileReport) {
        cachedProfileReport = profileChampionDecision({
            samples: 1,
            now: createStepClock()
        });
    }

    return cachedProfileReport;
}

test('slow Champion fixture restores the exact benchmark state', () => {
    const game = createChampionProfileGame();

    assert.equal(
        game.getSearchStateKey(),
        CHAMPION_DOUBLE_FOUR_PROFILE_CASE.stateKey
    );
    assert.deepEqual(game.dice.values, [4, 4]);
    assert.deepEqual(game.availableMoves, [4, 4, 4, 4]);
    assert.equal(game.currentPlayer, 2);
});

test('slow Champion profile preserves the selected move and work counts', () => {
    const report = getProfileReport();

    assert.deepEqual(report.instrumented.move, {
        from: 3,
        dice: 4,
        target: 7
    });
    assert.equal(report.case.stateHash, 'addb3dba');
    assert.equal(report.instrumented.analysis.memoHits, 38_736);
    assert.equal(report.instrumented.analysis.memoMisses, 75_786);
    assert.equal(report.derived.memoLookups, 114_522);
    assert.ok(report.derived.snapshotsCreated > 0);
    assert.equal(
        report.derived.snapshotsCreated,
        report.derived.snapshotsRestored
    );
    assert.ok(report.derived.ruleSequenceQueries > 0);
    assert.ok(report.derived.terminalPlans > 0);
});

test('slow Champion profile formats an informational report', () => {
    const report = getProfileReport();
    const markdown = formatChampionProfileMarkdown(report);

    assert.match(markdown, /addb3dba/);
    assert.match(markdown, /Memo misses/);
    assert.match(markdown, /Inclusive phase \(nested\)/);
    assert.match(markdown, /does not change strategy, dice, or rules/i);
});

test('profile state rejects invalid checker conservation', () => {
    assert.throws(
        () => createChampionProfileGame({
            ...CHAMPION_DOUBLE_FOUR_PROFILE_CASE,
            stateKey: CHAMPION_DOUBLE_FOUR_PROFILE_CASE.stateKey.replace(
                '15:1:8;',
                '15:1:7;'
            )
        }),
        /14 checkers for player 1/
    );
});
