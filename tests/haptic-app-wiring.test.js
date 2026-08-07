import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function readAppSource() {
    return readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
}

function getSection(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    assert.notEqual(start, -1, `section start not found: ${startMarker}`);
    const end = source.indexOf(endMarker, start);
    assert.notEqual(end, -1, `section end not found: ${endMarker}`);
    return source.slice(start, end);
}

test('automatic and direct human moves trigger haptics only after success', () => {
    const source = readAppSource();
    const autoSection = getSection(
        source,
        'const autoBearOffFlow = createAutoBearOffFlow({',
        'const autoTurnConfirmFlow = createAutoTurnConfirmFlow({'
    );
    const autoGuard = autoSection.indexOf('if (!applied) return false;');
    const autoHaptic = autoSection.indexOf(
        'hapticFeedbackController?.trigger('
    );
    assert.ok(autoGuard >= 0);
    assert.ok(autoHaptic > autoGuard);
    assert.equal(
        (autoSection.match(/hapticFeedbackController\?\.trigger\(/g) || [])
            .length,
        1
    );

    const humanSection = getSection(
        source,
        'async function handleSlotClick(slotId) {',
        'function bindEvents() {'
    );
    const humanGuard = humanSection.indexOf(
        'if (!game.processPlayerInput(selectedSlotId, slotId))'
    );
    const humanHaptic = humanSection.indexOf(
        'hapticFeedbackController?.trigger(',
        humanGuard
    );
    assert.ok(humanGuard >= 0);
    assert.ok(humanHaptic > humanGuard);
    assert.equal(
        (humanSection.match(/hapticFeedbackController\?\.trigger\(/g) || [])
            .length,
        1
    );
});

test('bot, dice, selection failure, and manual confirmation stay haptic-free', () => {
    const source = readAppSource();
    const botSection = getSection(
        source,
        'async function runBotMove() {',
        'function showGameOver(winner, messageKey = null) {'
    );
    assert.equal(/hapticFeedbackController/.test(botSection), false);

    const diceSection = getSection(
        source,
        'function startAutomaticDiceRoll() {',
        'async function runBotMove() {'
    );
    assert.equal(/hapticFeedbackController/.test(diceSection), false);

    const bindSection = getSection(
        source,
        'function bindEvents() {',
        "window.addEventListener('DOMContentLoaded', async () => {"
    );
    const confirmSection = getSection(
        bindSection,
        "ui.confirmButton?.addEventListener('click', () => {",
        'bindCanvasInput(canvas, {'
    );
    assert.equal(
        /hapticFeedbackController\?\.trigger/.test(confirmSection),
        false
    );
});

test('undo feedback follows a successful undo and its reverse animation', () => {
    const source = readAppSource();
    const bindSection = getSection(
        source,
        'function bindEvents() {',
        "window.addEventListener('DOMContentLoaded', async () => {"
    );
    const undoSection = getSection(
        bindSection,
        "ui.undoButton?.addEventListener('click', async () => {",
        "ui.confirmButton?.addEventListener('click', () => {"
    );
    const undoSuccess = undoSection.indexOf('game.undoLastMove()');
    const animation = undoSection.indexOf(
        'await playAppliedCheckerTransition(reverseTransition);'
    );
    const haptic = undoSection.indexOf(
        "hapticFeedbackController?.trigger('undo'"
    );

    assert.ok(undoSuccess >= 0);
    assert.ok(animation > undoSuccess);
    assert.ok(haptic > animation);
    assert.equal(
        (undoSection.match(/hapticFeedbackController\?\.trigger\(/g) || [])
            .length,
        1
    );
});
