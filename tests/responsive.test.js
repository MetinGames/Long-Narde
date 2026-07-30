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
    assert.ok(css.includes('#info-panel > #turn-indicator.is-white-turn'), 'Compact turn strip white-state style missing');
    assert.ok(css.includes('#info-panel > #turn-indicator.is-dark-turn'), 'Compact turn strip dark-state style missing');
    assert.ok(css.includes('#turn-indicator .turn-dot'), 'Turn strip dot style missing');
    assert.ok(css.includes('#how-to-play-modal'), 'How-to-play modal style missing');
    assert.ok(css.includes('#how-to-play-pages'), 'How-to-play pages container style missing');
    assert.ok(css.includes('#how-to-play-footer'), 'How-to-play footer style missing');
    assert.ok(css.includes('#game-feedback-toast'), 'Game feedback toast style missing');
    assert.ok(css.includes('#game-feedback-toast.is-visible'), 'Game feedback toast visibility style missing');
});

test('index.html contains rotate notice element, start screen, and restart button', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('id="rotate-notice"'), 'Rotate notice element missing');
    assert.ok(html.includes('id="start-screen"'), 'Start screen overlay missing');
    assert.ok(html.includes('id="start-button"'), 'Start button missing');
    assert.ok(html.includes('id="how-to-play-button"'), 'How-to-play button missing');
    assert.ok(/id="how-to-play-modal"[^>]*aria-modal="true"/i.test(html), 'How-to-play modal aria-modal missing');
    assert.ok(html.includes('id="guide-prev-button"'), 'Guide previous button missing');
    assert.ok(html.includes('id="guide-next-button"'), 'Guide next button missing');
    assert.ok(html.includes('id="guide-start-button"'), 'Guide start button missing');
    assert.ok(html.includes('id="restart-button"'), 'Restart button missing');
    assert.ok(html.includes('id="die-right-1"'), 'Double move indicator 1 missing');
    assert.ok(html.includes('id="die-right-4"'), 'Double move indicator 4 missing');
    assert.ok(/id="turn-indicator"[^>]*aria-live="polite"/i.test(html), 'Turn indicator aria-live polite missing');
    assert.ok(html.includes('viewport-fit=cover'), 'Viewport fit meta missing');
    assert.ok(html.includes('id="board-wrapper"'), 'Board wrapper missing for toast attachment');
});
