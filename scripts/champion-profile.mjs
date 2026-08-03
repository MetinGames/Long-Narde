import {
    formatChampionProfileMarkdown,
    profileChampionDecision
} from './lib/championProfile.mjs';

function parseArguments(argumentsList) {
    const options = {
        samples: 3,
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
            const value = argumentsList[index + 1];
            if (!value) throw new Error('--samples requires a value');
            options.samples = Number(value);
            index++;
            continue;
        }

        throw new Error(`Unknown argument: ${argument}`);
    }

    return options;
}

function printHelp() {
    console.log([
        'Usage: node scripts/champion-profile.mjs [options]',
        '',
        'Options:',
        '  --samples 3      Uninstrumented timing samples',
        '  --json           Print machine-readable JSON',
        '  --help           Show this help'
    ].join('\n'));
}

try {
    const options = parseArguments(process.argv.slice(2));

    if (options.help) {
        printHelp();
    } else {
        const report = profileChampionDecision(options);
        console.log(
            options.json
                ? JSON.stringify(report, null, 2)
                : formatChampionProfileMarkdown(report)
        );
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
