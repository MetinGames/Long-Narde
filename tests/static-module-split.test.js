import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('friend preview styles are loaded as a focused stylesheet', async () => {
    const [html, baseCss, friendCss] = await Promise.all([
        readFile(new URL('index.html', root), 'utf8'),
        readFile(new URL('style.css', root), 'utf8'),
        readFile(new URL('friend-match-preview.css', root), 'utf8')
    ]);

    assert.match(html, /href="friend-match-preview\.css"/);
    assert.doesNotMatch(baseCss, /Local Friend Match flow preview/);
    assert.match(friendCss, /#friend-preview-modal/);
    assert.match(friendCss, /@media \(max-width: 600px\) and \(orientation: portrait\)/);
    assert.match(friendCss, /@media \(max-height: 600px\) and \(orientation: landscape\)/);
});

test('translation data is separate from the language runtime', async () => {
    const [runtime, catalog] = await Promise.all([
        readFile(new URL('engine/i18n.js', root), 'utf8'),
        readFile(new URL('engine/translations.js', root), 'utf8')
    ]);

    assert.match(runtime, /import \{ translations \} from '.\/translations\.js'/);
    assert.doesNotMatch(runtime, /'page\.title':/);
    assert.match(catalog, /export const translations =/);
    assert.match(catalog, /\btr:/);
    assert.match(catalog, /\ben:/);
    assert.match(catalog, /\bru:/);
});

test('index delegates splash startup to an external module', async () => {
    const [html, startup] = await Promise.all([
        readFile(new URL('index.html', root), 'utf8'),
        readFile(new URL('engine/startup.js', root), 'utf8')
    ]);

    assert.match(html, /src="\.\/engine\/startup\.js"/);
    assert.doesNotMatch(html, /mountNardoraSplash/);
    assert.match(startup, /mountNardoraSplash\(\)/);
});
