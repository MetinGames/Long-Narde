import { NardeBot } from '../engine/bot.js';
import {
    DEFAULT_CHAMPION_BENCHMARK_SEEDS,
    EXTENDED_CHAMPION_BENCHMARK_SEEDS,
    formatChampionBenchmarkMarkdown,
    runChampionBenchmark
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
    let seedSelection = 'default';
    const options = {
        seeds: [...DEFAULT_CHAMPION_BENCHMARK_SEEDS],
        maxTurns: 240,
        legacyStrategy: false,
        json: false,
        help: false
    };

    for (let index = 0; index < argumentsList.length; index++) {
        const argument = argumentsList[index];

        if (argument === '--json') {
            options.json = true;
            continue;
        }

        if (argument === '--legacy-strategy') {
            options.legacyStrategy = true;
            continue;
        }

        if (argument === '--help') {
            options.help = true;
            continue;
        }

        if (argument === '--extended') {
            if (seedSelection === 'custom') {
                throw new Error('--extended cannot be combined with --seeds');
            }
            options.seeds = [...EXTENDED_CHAMPION_BENCHMARK_SEEDS];
            seedSelection = 'extended';
            continue;
        }

        if (argument === '--seeds') {
            if (seedSelection === 'extended') {
                throw new Error('--seeds cannot be combined with --extended');
            }
            const value = argumentsList[index + 1];
            if (!value) throw new Error('--seeds requires a value');
            options.seeds = parseSeeds(value);
            seedSelection = 'custom';
            index++;
            continue;
        }

        if (argument === '--max-turns') {
            const value = argumentsList[index + 1];
            if (!value) throw new Error('--max-turns requires a value');
            options.maxTurns = Number(value);
            index++;
            continue;
        }

        throw new Error(`Unknown argument: ${argument}`);
    }

    return options;
}

function printHelp() {
    console.log([
        'Usage: node scripts/champion-benchmark.mjs [options]',
        '',
        'Options:',
        '  --seeds 1103,2207    Deterministic paired-match seeds',
        '  --extended           Fixed 16-seed, 32-match evidence sample',
        '  --max-turns 240       Maximum turns per match',
        '  --legacy-strategy     Disable opponent-aware Champion scoring',
        '  --json                Print machine-readable JSON',
        '  --help                Show this help'
    ].join('\n'));
}

try {
    const options = parseArguments(process.argv.slice(2));

    if (options.help) {
        printHelp();
    } else {
        const {
            legacyStrategy,
            ...benchmarkOptions
        } = options;
        const report = runChampionBenchmark({
            ...benchmarkOptions,
            createBot: legacyStrategy
                ? ({ player, difficulty, random }) => new NardeBot(
                    player,
                    difficulty,
                    random,
                    difficulty === 'champion'
                        ? { useOpponentAwareStrategy: false }
                        : {}
                )
                : undefined
        });
        report.configuration.championStrategy = legacyStrategy
            ? 'pre-opponent-aware control'
            : 'opponent-aware beta';
        console.log(
            options.json
                ? JSON.stringify(report, null, 2)
                : formatChampionBenchmarkMarkdown(report)
        );
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
