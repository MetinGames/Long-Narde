import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const root = path.resolve('./');

test('style.css contains mobile media queries and canvas responsive rules', () => {
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    assert.ok(css.includes('@media (max-width: 900px) and (orientation: landscape)'), 'Missing landscape mobile media query');
    assert.ok(css.includes('@media (max-width: 600px) and (orientation: portrait)'), 'Missing portrait mobile media query');
    assert.ok(css.includes('@media (max-height: 600px) and (orientation: landscape)'), 'Missing low landscape mobile media query');
    assert.ok(css.includes('#game-canvas') || css.includes('canvas'), 'Canvas responsive rules missing');
});

test('index.html contains rotate notice element, start screen, and restart button', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('id="rotate-notice"'), 'Rotate notice element missing');
    assert.ok(html.includes('id="start-screen"'), 'Start screen overlay missing');
    assert.ok(html.includes('id="start-button"'), 'Start button missing');
    assert.ok(html.includes('id="restart-button"'), 'Restart button missing');
    assert.ok(html.includes('id="sound-toggle"'), 'Sound toggle button missing');
    assert.ok(html.includes('id="die-right-1"'), 'Double move indicator 1 missing');
    assert.ok(html.includes('id="die-right-4"'), 'Double move indicator 4 missing');
    assert.ok(html.includes('viewport-fit=cover'), 'Viewport fit meta missing');
});
