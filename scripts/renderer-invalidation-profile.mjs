import { pathToFileURL } from 'node:url';

import {
    RendererInvalidationMetrics
} from '../engine/rendererInvalidationMetrics.js';

export function runRepresentativeRendererProfile() {
    const metrics = new RendererInvalidationMetrics({
        enabled: true
    });
    const render = (
        scenario,
        signature,
        {
            animationActive = false,
            staticBoardDirty = false,
            rebuildStaticBoard = false
        } = {}
    ) => {
        metrics.recordRender({
            scenario,
            signature,
            animationActive,
            staticBoardDirty
        });
        if (rebuildStaticBoard) {
            metrics.recordStaticBoardRebuild(scenario);
        }
    };

    render('start', 'start-state', {
        staticBoardDirty: true,
        rebuildStaticBoard: true
    });
    render('roll', 'roll-state');

    for (let frame = 0; frame < 16; frame++) {
        render('move', `move-animation:${frame}`, {
            animationActive: true
        });
    }

    render('bot-turn', 'bot-state');
    render('resize', 'bot-state');
    render('theme', 'theme-anatolian', {
        staticBoardDirty: true,
        rebuildStaticBoard: true
    });

    for (let frame = 0; frame < 18; frame++) {
        render('victory', `victory-animation:${frame}`, {
            animationActive: true
        });
    }

    const snapshot = metrics.snapshot();
    return {
        schemaVersion: 1,
        evidenceType: 'deterministic-representative-trace',
        scenarioOrder: [
            'start',
            'roll',
            'move',
            'bot-turn',
            'resize',
            'theme',
            'victory'
        ],
        ...snapshot,
        recommendation: snapshot.decision.renderOnDemandJustified
            ? 'run-bounded-render-on-demand-experiment'
            : 'keep-current-event-driven-rendering'
    };
}

function formatPercent(value) {
    return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

export function formatRendererProfileMarkdown(report) {
    const { counters, decision, budget } = report;
    const rows = Object.entries(report.scenarios)
        .map(([scenario, values]) =>
            `| ${scenario} | ${values.fullRenders} | ${values.staticBoardRebuilds} | ${values.animationFrames} | ${values.idleFrames} |`
        )
        .join('\n');

    return `# Renderer Invalidation Profile

- Evidence: ${report.evidenceType}
- Recommendation: \`${report.recommendation}\`
- Full renders: ${counters.fullRenders}
- Static-board rebuilds: ${counters.staticBoardRebuilds}
- Animation frames: ${counters.animationFrames}
- Idle frames: ${counters.idleFrames}
- Idle ratio: ${formatPercent(decision.idleFrameRatio)}
- Static rebuild ratio: ${formatPercent(decision.staticRebuildRatio)}

| Scenario | Renders | Static rebuilds | Animation | Idle |
|---|---:|---:|---:|---:|
${rows}

Decision budget: at least ${budget.minimumFullRenders} renders, idle ratio above ${formatPercent(budget.maximumIdleFrameRatio)}, or static rebuild ratio above ${formatPercent(budget.maximumStaticRebuildRatio)}. This trace does ${decision.renderOnDemandJustified ? '' : 'not '}justify a render-on-demand architecture experiment.
`;
}

function main() {
    const report = runRepresentativeRendererProfile();
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        return;
    }

    process.stdout.write(formatRendererProfileMarkdown(report));
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    main();
}
