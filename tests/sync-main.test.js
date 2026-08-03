import test from 'node:test';
import assert from 'node:assert/strict';

import { determineSyncAction } from '../scripts/sync-main.mjs';

function decide(overrides = {}) {
    return determineSyncAction({
        branch: 'main',
        isClean: true,
        headSha: 'local',
        remoteSha: 'remote',
        isHeadAncestor: false,
        isRemoteAncestor: false,
        ...overrides
    });
}

test('sync refuses to modify a non-main branch', () => {
    assert.equal(decide({ branch: 'feature/social' }), 'refuse-branch');
});

test('sync refuses to overwrite a dirty working tree', () => {
    assert.equal(decide({ isClean: false }), 'refuse-dirty');
});

test('sync recognizes an already current working copy', () => {
    assert.equal(decide({ headSha: 'same', remoteSha: 'same' }), 'up-to-date');
});

test('sync allows only a remote fast-forward', () => {
    assert.equal(decide({ isHeadAncestor: true }), 'fast-forward');
});

test('sync preserves local commits instead of pushing them automatically', () => {
    assert.equal(decide({ isRemoteAncestor: true }), 'local-ahead');
});

test('sync refuses divergent history', () => {
    assert.equal(decide(), 'diverged');
});
