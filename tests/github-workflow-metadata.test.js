import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const root = new URL('../', import.meta.url);

test('canonical labels provide one priority and status vocabulary', async () => {
    const labels = JSON.parse(await readFile(new URL('.github/labels.json', root)));
    const names = labels.map(label => label.name);
    assert.equal(new Set(names).size, names.length);
    assert.deepEqual(
        names.filter(name => name.startsWith('priority:')),
        ['priority:p0', 'priority:p1', 'priority:p2', 'priority:p3']
    );
    assert.deepEqual(
        names.filter(name => name.startsWith('status:')),
        ['status:triage', 'status:ready', 'status:in-progress', 'status:blocked', 'status:done']
    );
});

test('issue metadata automation is least-privilege and synchronizes lifecycle', async () => {
    const source = await readFile(
        new URL('.github/workflows/issue-metadata.yml', root),
        'utf8'
    );
    const workflow = YAML.parse(source);
    assert.equal(workflow.permissions.contents, 'read');
    assert.equal(workflow.permissions.issues, 'write');
    assert.deepEqual(workflow.on.issues.types, ['opened', 'reopened', 'closed']);
    assert.match(source, /status:done/);
    assert.match(source, /priority:p\$\{priority\}/);
});

test('active issue catalog preserves external gates and bounded #41 children', async () => {
    const issues = JSON.parse(await readFile(new URL('.github/active-issues.json', root)));
    const byNumber = new Map(issues.map(issue => [issue.number, issue]));
    assert.equal(byNumber.get(11).externalGate, true);
    assert.equal(byNumber.get(12).externalGate, true);
    assert.equal(byNumber.get(13).externalGate, true);
    assert.equal(byNumber.get(20).externalGate, true);
    assert.deepEqual([67, 68, 69].map(number => byNumber.get(number).status), [
        'ready', 'ready', 'ready'
    ]);
});
