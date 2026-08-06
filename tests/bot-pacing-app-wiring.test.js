import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('app.js', 'utf8');

test('app bot callbacks use one visible-complexity pacing helper', () => {
    assert.match(source, /function getCurrentBotMoveStepDelay\(/);
    assert.match(source, /remainingMoveRights: game\.availableMoves\.length/);
    assert.match(source, /diceValues\[0\] === diceValues\[1\]/);
    assert.match(source, /reducedMotion: prefersReducedMotion\(\)/);
    assert.equal(
        (source.match(/scheduleBotMoveCallback\(getCurrentBotMoveStepDelay\(\)\);/g) || []).length,
        2
    );
    assert.match(
        source,
        /scheduleBotMoveCallback\(getCurrentBotMoveStepDelay\(\{[\s\S]*?afterCollect: move\.target === 25[\s\S]*?\}\)\);/
    );
    assert.doesNotMatch(source, /BOT_MOVE_STEP_DELAY_MS/);
});
