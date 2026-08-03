import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
    classifyLineCount,
    countSourceLines,
    createCodeHealthReport,
    formatMarkdownReport
} from '../scripts/code-health-report.mjs';

async function writeLineFixture(root, relativePath, lineCount) {
    const target = path.join(root, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const content = lineCount === 0
        ? ''
        : Array.from(
            { length: lineCount },
            (_, index) => `line ${index + 1}`
        ).join('\n') + '\n';
    await fs.writeFile(target, content, 'utf8');
}

test('line thresholds classify their exact boundaries', () => {
    assert.equal(classifyLineCount(999), 'healthy');
    assert.equal(classifyLineCount(1000), 'split-candidate');
    assert.equal(classifyLineCount(1999), 'split-candidate');
    assert.equal(classifyLineCount(2000), 'refactor-plan');
    assert.equal(classifyLineCount(2999), 'refactor-plan');
    assert.equal(classifyLineCount(3000), 'red-zone');
});

test('source line counting handles empty, trailing, and CRLF content', () => {
    assert.equal(countSourceLines(''), 0);
    assert.equal(countSourceLines('one'), 1);
    assert.equal(countSourceLines('one\ntwo\n'), 2);
    assert.equal(countSourceLines('one\r\ntwo\r\n'), 2);
});

test('report is sorted, informational, and excludes generated or asset paths', async () => {
    await fs.mkdir(os.tmpdir(), { recursive: true });
    const root = await fs.mkdtemp(
        path.join(os.tmpdir(), 'nardora-code-health-')
    );

    try {
        await writeLineFixture(root, 'style.css', 3000);
        await writeLineFixture(root, 'engine/renderer.js', 1181);
        await writeLineFixture(root, 'app.js', 1000);
        await writeLineFixture(root, 'engine/small.js', 999);
        await writeLineFixture(root, 'assets/generated.js', 5000);
        await writeLineFixture(root, 'node_modules/vendor.js', 5000);
        await writeLineFixture(root, 'docs/large.md', 5000);

        const report = await createCodeHealthReport(root);

        assert.equal(report.scannedFileCount, 4);
        assert.equal(report.thresholdCrossingCount, 3);
        assert.deepEqual(
            report.files.map(file => [
                file.path,
                file.lines,
                file.level
            ]),
            [
                ['style.css', 3000, 'red-zone'],
                ['engine/renderer.js', 1181, 'split-candidate'],
                ['app.js', 1000, 'split-candidate']
            ]
        );

        const markdown = formatMarkdownReport(report);
        assert.match(markdown, /informational/i);
        assert.match(markdown, /docs\/CODE_HEALTH\.md/);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});
