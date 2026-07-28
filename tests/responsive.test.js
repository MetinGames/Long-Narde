import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const root = path.resolve('./');

test('style.css contains mobile media queries and canvas responsive rules', () => {
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    assert.ok(css.includes('@media (max-width: 900px)'), 'Missing landscape mobile media query');
    assert.ok(css.includes('@media (max-width: 600px)'), 'Missing portrait mobile media query');
    assert.ok(css.includes('#game-canvas') || css.includes('canvas'), 'Canvas responsive rules missing');
});

test('index.html contains rotate notice element and restart button', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('id="rotate-notice"'), 'Rotate notice element missing');
    assert.ok(html.includes('id="restart-button"'), 'Restart button missing');
});
