import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const budget = JSON.parse(await readFile(path.join(root, 'performance-budget.json')));

async function filesIn(directory) {
    const output = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) output.push(...await filesIn(absolute));
        else output.push(absolute);
    }
    return output;
}

test('offline runtime remains inside explicit transfer-size budgets', async () => {
    const rootFiles = (await readdir(root, { withFileTypes: true }))
        .filter(entry => entry.isFile() && /\.(css|html|js|webmanifest)$/.test(entry.name))
        .map(entry => path.join(root, entry.name));
    const files = [
        ...rootFiles,
        ...await filesIn(path.join(root, 'engine')),
        ...await filesIn(path.join(root, 'assets'))
    ];
    const records = await Promise.all(files.map(async file => ({
        file,
        bytes: (await stat(file)).size
    })));
    const byExtension = extension => records.filter(record => record.file.endsWith(extension));

    assert.ok(records.reduce((sum, record) => sum + record.bytes, 0) <= budget.shellBytes);
    assert.ok(Math.max(...byExtension('.js').map(record => record.bytes)) <= budget.largestJavaScriptBytes);
    assert.ok(Math.max(...byExtension('.css').map(record => record.bytes)) <= budget.largestStylesheetBytes);
    assert.ok(Math.max(...byExtension('.mp3').map(record => record.bytes)) <= budget.largestAudioBytes);
});
