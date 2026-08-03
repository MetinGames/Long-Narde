import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import {
    createSeededRandom,
    formatChampionBenchmarkMarkdown,
    playDeterministicBotMatch,
    runChampionBenchmark,
    stageBenchmarkRoll
} from '../scripts/lib/championBenchmark.mjs';

function createStepClock() {
    let tick = 0;
    return () => tick++;
}

function stableMatchEvidence(match) {
    return {
        seed: match.seed,
        turnsPlayed: match.turnsPlayed,
        terminatedBy: match.terminatedBy,
        winner: match.winner,
        winnerDifficulty: match.winnerDifficulty,
        traceHash: match.traceHash,
        diceTraceHash: match.diceTraceHash,
        final: match.final,
        player1Moves: match.players[1].moves,
        player2Moves: match.players[2].moves
    };
}

test('seeded benchmark random is repeatable and seed-sensitive', () => {
    const first = createSeededRandom(1103);
    const second = createSeededRandom(1103);
    const different = createSeededRandom(2207);

    const firstValues = Array.from({ length: 6 }, () => first());
    const secondValues = Array.from({ length: 6 }, () => second());
    const differentValues = Array.from({ length: 6 }, () => different());

    assert.deepEqual(firstValues, secondValues);
    assert.notDeepEqual(firstValues, differentValues);
    assert.ok(firstValues.every(value => value >= 0 && value < 1));
});

test('benchmark roll expands doubles without using runtime randomness', () => {
    const game = new NardeGame();
    game.initGame();

    stageBenchmarkRoll(game, [4, 4]);

    assert.deepEqual(game.dice.values, [4, 4]);
    assert.deepEqual(game.availableMoves, [4, 4, 4, 4]);
    assert.equal(game.gameStatus, 'PLAYING');
});

test('same seed and sides produce the same bounded match evidence', () => {
    const first = playDeterministicBotMatch({
        seed: 1103,
        maxTurns: 4,
        now: createStepClock()
    });
    const second = playDeterministicBotMatch({
        seed: 1103,
        maxTurns: 4,
        now: createStepClock()
    });

    assert.deepEqual(
        stableMatchEvidence(first),
        stableMatchEvidence(second)
    );
    assert.deepEqual(first.final.checkerTotals, { 1: 15, 2: 15 });
});

test('paired report swaps Champion sides and stays informational', () => {
    const report = runChampionBenchmark({
        seeds: [1103],
        maxTurns: 1,
        now: createStepClock()
    });

    assert.equal(report.matches.length, 2);
    assert.deepEqual(
        report.matches.map(match => match.championPlayer),
        [1, 2]
    );
    assert.equal(
        report.summary.championWins +
        report.summary.masterWins +
        report.summary.draws,
        2
    );
    assert.ok(report.summary.timing.champion.decisions > 0);
    assert.ok(report.summary.slowestDecision.champion);
    assert.match(
        report.summary.slowestDecision.champion.stateHash,
        /^[0-9a-f]{8}$/
    );

    const markdown = formatChampionBenchmarkMarkdown(report);
    assert.match(markdown, /deterministic and informational/i);
    assert.match(markdown, /Champion wins/);
    assert.match(markdown, /Master wins/);
});
