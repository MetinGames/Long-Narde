import {
    formatChampionRuleCacheExperimentMarkdown,
    runChampionRuleCacheExperiment
} from './lib/championRuleCacheExperiment.mjs';
import {
    DEFAULT_CHAMPION_BENCHMARK_SEEDS
} from './lib/championBenchmark.mjs';

function parseSeeds(value) {
    const seeds = value
        .split(',')
        .map(seed => Number(seed.trim()))
        .filter(seed => Number.isFinite(seed));

    if (seeds.length === 0) {
        throw new Error('--seeds requires comma-separated integer seeds');
    }

    return seeds;
}

function parseArguments(argumentsList) {
    const options = {
        samples: 3,
        seeds: [...DEFAULT_CHAMPION_BENCHMARK_SEEDS],
        maxTurns: 240,
        json: false,
        help: false
    };

    for (let index = 0; index < argumentsList.length; index++) {
        const argument = argumentsList[index];

        if (argument === '--json') {
            options.json = true;
            continue;
        }
        if (argument === '--help') {
            options.help = true;
            continue;
        }
        if (argument === '--samples') {
            const value = argumentsList[++index];
            if (!value) throw new Error('--samples requires a value');
            options.samples = Number(value);
            continue;
        }
        if (argument === '--seeds') {
            const value = argumentsList[++index];
            if (!value) throw new Error('--seeds requires a value');
            options.seeds = parseSeeds(value);
            continue;
        }
        if (argument === '--max-turns') {
            const value = argumentsList[++index];
            if (!value) throw new Error('--max-turns requires a value');
            options.maxTurns = Number(value);
            continue;
        }

        throw new Error(`Unknown argument: ${argument}`);
    }

    return options;
}

function printHelp() {
    console.log([
        'Usage: node scripts/champion-rule-cache-experiment.mjs [options]',
        '',
        'Options:',
        '  --samples 3           Slow-state timing samples per variant',
        '  --seeds 1103,2207     Deterministic paired-match seeds',
        '  --max-turns 240       Maximum turns per match',
        '  --json                Print machine-readable JSON',
        '  --help                Show this help'
    ].join('\n'));
}

try {
    const options = parseArguments(process.argv.slice(2));

    if (options.help) {
        printHelp();
    } else {
        const report = runChampionRuleCacheExperiment(options);
        console.log(
            options.json
                ? JSON.stringify(report, null, 2)
                : formatChampionRuleCacheExperimentMarkdown(report)
        );
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
