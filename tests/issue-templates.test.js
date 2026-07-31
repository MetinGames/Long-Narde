import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const root = path.resolve('./');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('GitHub issue form files exist and collect the required fields', () => {
    const bug = read('.github/ISSUE_TEMPLATE/bug_report.yml');
    const feature = read('.github/ISSUE_TEMPLATE/feature_request.yml');

    assert.ok(bug.includes('name: Bug report'));
    assert.ok(bug.includes('id: summary'));
    assert.ok(bug.includes('id: steps'));
    assert.ok(bug.includes('id: expected'));
    assert.ok(bug.includes('id: actual'));
    assert.ok(bug.includes('id: device'));
    assert.ok(bug.includes('id: os'));
    assert.ok(bug.includes('id: browser'));
    assert.ok(bug.includes('id: orientation'));
    assert.ok(bug.includes('id: language'));
    assert.ok(bug.includes('id: media'));
    assert.ok(bug.includes('id: notes'));

    assert.ok(feature.includes('name: Feature request'));
    assert.ok(feature.includes('id: summary'));
    assert.ok(feature.includes('id: problem'));
    assert.ok(feature.includes('id: behavior'));
    assert.ok(feature.includes('id: benefit'));
    assert.ok(feature.includes('id: example'));
    assert.ok(feature.includes('id: notes'));
});

test('issue form config is safe and routes to the live game plus forms', () => {
    const config = read('.github/ISSUE_TEMPLATE/config.yml');

    assert.ok(config.includes('blank_issues_enabled: false'));
    assert.ok(config.includes('https://metingames.github.io/Long-Narde/'));
    assert.ok(config.includes('https://github.com/MetinGames/Long-Narde/issues/new?template=bug_report.yml'));
    assert.ok(config.includes('https://github.com/MetinGames/Long-Narde/issues/new?template=feature_request.yml'));
});