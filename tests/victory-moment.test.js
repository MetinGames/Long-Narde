import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
    getVictoryMomentProfile,
    shouldRunVictoryMoment,
    triggerVictoryMomentHook
} from '../engine/victoryMoment.js';

const root = path.resolve('./');

test('normal bear-off zaferde victory moment tetiklenir', () => {
    const shouldPlay = shouldRunVictoryMoment({
        winner: 1,
        endReason: 'white_win',
        targetId: 25,
        alreadyTriggered: false
    });

    assert.equal(shouldPlay, true);
});

test('timeout veya bear-off disi bitiste victory moment tetiklenmez', () => {
    const timeoutResult = shouldRunVictoryMoment({
        winner: 2,
        endReason: 'timeout',
        targetId: 25,
        alreadyTriggered: false
    });
    const nonBearOffResult = shouldRunVictoryMoment({
        winner: 1,
        endReason: 'white_win',
        targetId: 24,
        alreadyTriggered: false
    });

    assert.equal(timeoutResult, false);
    assert.equal(nonBearOffResult, false);
});

test('victory moment ayni oyunda ikinci kez tetiklenmez', () => {
    const shouldPlay = shouldRunVictoryMoment({
        winner: 1,
        endReason: 'white_win',
        targetId: 25,
        alreadyTriggered: true
    });

    assert.equal(shouldPlay, false);
});

test('victory profile yalnizca kisa hazne parlamasi uretir', () => {
    const reduced = getVictoryMomentProfile(true);
    const normal = getVictoryMomentProfile(false);

    assert.ok(normal.flashDurationMs >= 180 && normal.flashDurationMs <= 280);
    assert.ok(reduced.flashDurationMs >= 180 && reduced.flashDurationMs <= 280);
    assert.ok(reduced.durationMs < normal.durationMs);
    assert.ok(reduced.flashDurationMs <= reduced.durationMs);
});

test('victory akisi body/html/ana kapta shake veya transform baglamaz', () => {
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const victoryFunctionMatch = app.match(
        /async function playVictoryMomentIfEligible\([\s\S]*?\r?\n}/
    );

    assert.equal(/victory-board-shake/.test(css), false);
    assert.equal(/@keyframes\s+victoryBoardShake/.test(css), false);
    assert.equal(/classList\.(add|remove)\('victory-board-shake'\)/.test(app), false);
    assert.ok(victoryFunctionMatch, 'Victory flow function is missing');
    assert.equal(/style\.transform|classList\.(add|remove)/.test(victoryFunctionMatch[0]), false);
});

test('victory hook varsa cagirilir, yoksa guvenli no-op olur', () => {
    const calls = [];

    triggerVictoryMomentHook(null, { winner: 1 });
    triggerVictoryMomentHook(payload => {
        calls.push(payload);
    }, { winner: 1, endReason: 'white_win' });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].winner, 1);
    assert.equal(calls[0].endReason, 'white_win');
});
