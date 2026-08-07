import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('Capacitor scaffold uses a generated web directory and secure defaults', async () => {
    const config = JSON.parse(await readFile(new URL('capacitor.config.json', root)));
    assert.equal(config.webDir, 'dist');
    assert.equal(config.android.allowMixedContent, false);
    assert.equal(config.ios.allowsLinkPreview, false);
    assert.match(config.appId, /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/);
});

test('native handoff is explicit about external signing and device gates', async () => {
    const handoff = await readFile(new URL('docs/NATIVE_PACKAGING.md', root), 'utf8');
    const privacy = await readFile(new URL('docs/store/PRIVACY_DRAFT.md', root), 'utf8');
    assert.match(handoff, /does not publish, sign, or upload/i);
    assert.match(handoff, /physical devices/i);
    assert.match(privacy, /not legal approval/i);
    assert.match(privacy, /must not be described as active/i);
});
