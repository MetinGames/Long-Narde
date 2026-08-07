import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHAMPION_LOSS_EVIDENCE_SEEDS,
    EXTENDED_CHAMPION_BENCHMARK_SEEDS,
    runChampionBenchmark
} from '../scripts/lib/championBenchmark.mjs';

test('loss evidence is immutable, unique, and remains part of the extended sample', () => {
    assert.equal(Object.isFrozen(CHAMPION_LOSS_EVIDENCE_SEEDS), true);
    assert.deepEqual(CHAMPION_LOSS_EVIDENCE_SEEDS, [14303]);
    assert.equal(new Set(CHAMPION_LOSS_EVIDENCE_SEEDS).size, 1);
    assert.ok(CHAMPION_LOSS_EVIDENCE_SEEDS.every(seed =>
        EXTENDED_CHAMPION_BENCHMARK_SEEDS.includes(seed)
    ));
});

test('loss seed replays both sides with stable outcomes, traces, and conserved checkers', () => {
    const report = runChampionBenchmark({
        seeds: CHAMPION_LOSS_EVIDENCE_SEEDS,
        maxTurns: 160,
        now: () => 0
    });

    assert.equal(report.configuration.pairedMatches, 2);
    assert.equal(report.summary.championWins, 1);
    assert.equal(report.summary.masterWins, 1);
    assert.equal(report.summary.draws, 0);
    assert.deepEqual(
        report.matches.map(match => ({
            championPlayer: match.championPlayer,
            outcome: match.outcome,
            traceHash: match.traceHash,
            turnsPlayed: match.turnsPlayed,
            championBorneOff: match.final.borneOff[match.championPlayer]
        })),
        [
            {
                championPlayer: 1,
                outcome: 'master',
                traceHash: 'cd389e42',
                turnsPlayed: 98,
                championBorneOff: 7
            },
            {
                championPlayer: 2,
                outcome: 'champion',
                traceHash: 'aeca676b',
                turnsPlayed: 92,
                championBorneOff: 15
            }
        ]
    );
    assert.ok(report.matches.every(match =>
        match.final.checkerTotals[1] === 15 &&
        match.final.checkerTotals[2] === 15
    ));
});
