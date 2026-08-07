import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import {
    RendererInvalidationMetrics,
    createRendererRenderSignature,
    evaluateRenderInvalidationBudget,
    isRendererMetricsEnabled
} from '../engine/rendererInvalidationMetrics.js';
import {
    formatRendererProfileMarkdown,
    runRepresentativeRendererProfile
} from '../scripts/renderer-invalidation-profile.mjs';

test('disabled metrics are a production no-op', () => {
    const metrics = new RendererInvalidationMetrics();
    metrics.recordRender({
        scenario: 'idle',
        signature: 'same'
    });
    metrics.recordStaticBoardRebuild('theme');

    assert.deepEqual(metrics.snapshot().counters, {
        fullRenders: 0,
        staticBoardRebuilds: 0,
        animationFrames: 0,
        idleFrames: 0,
        stateFrames: 0
    });
});

test('metrics neither mutate game state nor claim scheduling authority', () => {
    const originalRaf = globalThis.requestAnimationFrame;
    const originalTimeout = globalThis.setTimeout;
    let scheduleCalls = 0;
    globalThis.requestAnimationFrame = () => {
        scheduleCalls++;
    };
    globalThis.setTimeout = () => {
        scheduleCalls++;
    };

    try {
        const slots = Object.freeze([
            Object.freeze({ player: 0, count: 0 }),
            Object.freeze({ player: 1, count: 15 })
        ]);
        const game = Object.freeze({
            gameStatus: 'PLAYING',
            currentPlayer: 1,
            board: Object.freeze({
                slots,
                borneOff: Object.freeze({ 1: 0, 2: 0 })
            }),
            dice: Object.freeze({ values: Object.freeze([3, 4]) }),
            availableMoves: Object.freeze([3, 4])
        });
        const before = JSON.stringify(game);
        const metrics = new RendererInvalidationMetrics({ enabled: true });
        const signature = createRendererRenderSignature({ game });

        metrics.recordRender({ signature, scenario: 'roll' });
        metrics.recordRender({ signature, scenario: 'resize' });

        assert.equal(JSON.stringify(game), before);
        assert.equal(scheduleCalls, 0);
        assert.equal(metrics.snapshot().counters.idleFrames, 1);
    } finally {
        if (originalRaf === undefined) {
            delete globalThis.requestAnimationFrame;
        } else {
            globalThis.requestAnimationFrame = originalRaf;
        }
        globalThis.setTimeout = originalTimeout;
    }
});

test('representative trace stays below the architecture-change budget', () => {
    const report = runRepresentativeRendererProfile();

    assert.deepEqual(report.counters, {
        fullRenders: 39,
        staticBoardRebuilds: 2,
        animationFrames: 34,
        idleFrames: 1,
        stateFrames: 4
    });
    assert.equal(report.decision.hasRepresentativeSample, true);
    assert.equal(report.decision.renderOnDemandJustified, false);
    assert.equal(
        report.recommendation,
        'keep-current-event-driven-rendering'
    );
    assert.deepEqual(
        report.scenarioOrder,
        ['start', 'roll', 'move', 'bot-turn', 'resize', 'theme', 'victory']
    );
    assert.deepEqual(
        Object.keys(report.scenarios),
        ['start', 'roll', 'move', 'bot-turn', 'resize', 'theme', 'victory']
    );
});

test('budget does justify an experiment when measured idle work crosses the gate', () => {
    const decision = evaluateRenderInvalidationBudget({
        fullRenders: 100,
        idleFrames: 12,
        staticBoardRebuilds: 2
    });

    assert.equal(decision.hasRepresentativeSample, true);
    assert.equal(decision.renderOnDemandJustified, true);
});

test('development flag is explicit and fail-safe', () => {
    assert.equal(isRendererMetricsEnabled({
        location: { search: '?renderMetrics=1' }
    }), true);
    assert.equal(isRendererMetricsEnabled({
        location: { search: '?renderMetrics=0' }
    }), false);
    assert.equal(isRendererMetricsEnabled(null), false);
});

test('profile script emits both machine-readable JSON and Markdown', () => {
    const jsonRun = spawnSync(
        process.execPath,
        ['scripts/renderer-invalidation-profile.mjs', '--json'],
        { encoding: 'utf8' }
    );
    assert.equal(jsonRun.status, 0, jsonRun.stderr);
    assert.equal(
        JSON.parse(jsonRun.stdout).recommendation,
        'keep-current-event-driven-rendering'
    );

    const markdown = formatRendererProfileMarkdown(
        runRepresentativeRendererProfile()
    );
    assert.match(markdown, /^# Renderer Invalidation Profile/m);
    assert.match(markdown, /\| victory \| 18 \| 0 \| 18 \| 0 \|/);
    assert.match(markdown, /does not justify/);
});
