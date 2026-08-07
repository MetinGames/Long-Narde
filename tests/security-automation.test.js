import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const root = new URL('../', import.meta.url);

async function parse(relativePath) {
    return YAML.parse(await readFile(new URL(relativePath, root), 'utf8'));
}

test('CodeQL runs on changes, weekly, and with least-privilege permissions', async () => {
    const workflow = await parse('.github/workflows/codeql.yml');
    assert.ok(workflow.on.pull_request);
    assert.ok(workflow.on.push);
    assert.equal(workflow.on.schedule.length, 1);
    assert.equal(workflow.permissions.contents, 'read');
    assert.equal(workflow.permissions['security-events'], 'write');
    assert.equal(workflow.jobs.analyze.steps[1].with.queries, 'security-extended');
});

test('Dependabot covers npm and GitHub Actions on bounded schedules', async () => {
    const config = await parse('.github/dependabot.yml');
    assert.equal(config.version, 2);
    assert.deepEqual(
        config.updates.map(update => update['package-ecosystem']),
        ['npm', 'github-actions']
    );
    assert.ok(config.updates.every(update => update['open-pull-requests-limit'] <= 5));
});

test('scheduled dependency audit is non-mutating and blocks high severity findings', async () => {
    const workflow = await readFile(
        new URL('.github/workflows/security-health.yml', root),
        'utf8'
    );
    assert.match(workflow, /npm ci --ignore-scripts/);
    assert.match(workflow, /npm audit --audit-level=high/);
    assert.doesNotMatch(workflow, /npm audit fix/);
});
