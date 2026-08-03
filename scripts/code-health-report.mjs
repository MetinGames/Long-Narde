import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CODE_HEALTH_THRESHOLDS = Object.freeze({
    splitCandidate: 1000,
    refactorPlan: 2000,
    redZone: 3000
});

const SOURCE_EXTENSIONS = new Set([
    '.cjs',
    '.css',
    '.html',
    '.js',
    '.jsx',
    '.mjs',
    '.scss',
    '.sql',
    '.ts',
    '.tsx'
]);

const EXCLUDED_DIRECTORIES = new Set([
    '.git',
    'assets',
    'build',
    'coverage',
    'dist',
    'node_modules',
    'playwright-report',
    'public',
    'test-results',
    'vendor'
]);

export function countSourceLines(content) {
    if (content.length === 0) return 0;

    const lineCount = content.split(/\r?\n/).length;
    return content.endsWith('\n') ? lineCount - 1 : lineCount;
}

export function classifyLineCount(lineCount) {
    if (lineCount >= CODE_HEALTH_THRESHOLDS.redZone) {
        return 'red-zone';
    }

    if (lineCount >= CODE_HEALTH_THRESHOLDS.refactorPlan) {
        return 'refactor-plan';
    }

    if (lineCount >= CODE_HEALTH_THRESHOLDS.splitCandidate) {
        return 'split-candidate';
    }

    return 'healthy';
}

export function getRequiredAction(level) {
    const actions = {
        'red-zone': 'Prioritize a staged, test-backed refactor plan',
        'refactor-plan': 'Document a refactor plan before further growth',
        'split-candidate': 'Review responsibility, churn, coupling and tests',
        healthy: 'No threshold action'
    };

    return actions[level] || actions.healthy;
}

async function collectSourcePaths(rootDirectory) {
    const collected = [];

    const visit = async directory => {
        const entries = await fs.readdir(directory, {
            withFileTypes: true
        });

        entries.sort((left, right) =>
            left.name.localeCompare(right.name)
        );

        for (const entry of entries) {
            if (entry.name.startsWith('.') && entry.name !== '.openai') {
                if (entry.isDirectory()) continue;
            }

            const absolutePath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
                await visit(absolutePath);
                continue;
            }

            if (
                entry.isFile() &&
                SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
            ) {
                collected.push(absolutePath);
            }
        }
    };

    await visit(rootDirectory);
    return collected;
}

export async function createCodeHealthReport(
    rootDirectory,
    { includeAll = false } = {}
) {
    const resolvedRoot = path.resolve(rootDirectory);
    const sourcePaths = await collectSourcePaths(resolvedRoot);
    const files = [];

    for (const absolutePath of sourcePaths) {
        const content = await fs.readFile(absolutePath, 'utf8');
        const lines = countSourceLines(content);
        const level = classifyLineCount(lines);

        files.push({
            path: path
                .relative(resolvedRoot, absolutePath)
                .split(path.sep)
                .join('/'),
            lines,
            level,
            action: getRequiredAction(level)
        });
    }

    files.sort((left, right) =>
        right.lines - left.lines ||
        left.path.localeCompare(right.path)
    );

    const thresholdCrossings =
        files.filter(file => file.level !== 'healthy');

    return {
        root: resolvedRoot,
        scannedFileCount: files.length,
        thresholdCrossingCount: thresholdCrossings.length,
        files: includeAll ? files : thresholdCrossings
    };
}

export function formatMarkdownReport(report) {
    const rows = report.files.length > 0
        ? report.files.map(file =>
            `| \`${file.path}\` | ${file.lines} | ${file.level} | ${file.action} |`
        )
        : ['| — | — | healthy | No threshold crossings |'];

    return [
        '# Nardora Code-Health Report',
        '',
        `Scanned ${report.scannedFileCount} source files; ` +
            `${report.thresholdCrossingCount} crossed a policy threshold.`,
        '',
        '| File | Lines | Level | Required action |',
        '|---|---:|---|---|',
        ...rows,
        '',
        'Thresholds: 1,000+ split candidate; 2,000+ refactor plan; ' +
            '3,000+ red zone.',
        'This report is informational. See docs/CODE_HEALTH.md for the ' +
            'qualitative review and staged plans.'
    ].join('\n');
}

function parseArguments(argumentsList) {
    const options = {
        root: process.cwd(),
        includeAll: false,
        json: false
    };

    for (let index = 0; index < argumentsList.length; index++) {
        const argument = argumentsList[index];

        if (argument === '--all') {
            options.includeAll = true;
            continue;
        }

        if (argument === '--json') {
            options.json = true;
            continue;
        }

        if (argument === '--root') {
            const root = argumentsList[index + 1];
            if (!root) throw new Error('--root requires a directory');
            options.root = root;
            index++;
            continue;
        }

        if (argument === '--help') {
            options.help = true;
            continue;
        }

        throw new Error(`Unknown argument: ${argument}`);
    }

    return options;
}

async function main() {
    const options = parseArguments(process.argv.slice(2));

    if (options.help) {
        console.log(
            'Usage: node scripts/code-health-report.mjs ' +
            '[--all] [--json] [--root DIRECTORY]'
        );
        return;
    }

    const report = await createCodeHealthReport(options.root, {
        includeAll: options.includeAll
    });

    console.log(
        options.json
            ? JSON.stringify(report, null, 2)
            : formatMarkdownReport(report)
    );
}

const isMainModule =
    Boolean(process.argv[1]) &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
