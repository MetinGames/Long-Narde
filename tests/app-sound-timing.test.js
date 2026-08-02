import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readAppSource() {
    const appPath = path.resolve(process.cwd(), 'app.js');
    return fs.readFileSync(appPath, 'utf8');
}

function getSection(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    assert.notEqual(start, -1, `section start not found: ${startMarker}`);

    const end = source.indexOf(endMarker, start);
    assert.notEqual(end, -1, `section end not found: ${endMarker}`);

    return source.slice(start, end);
}

test('insan hamlesinde pul sesi, basarili uygulama sonrasinda ve renderdan once tetiklenir', () => {
    const source = readAppSource();
    const section = getSection(
        source,
        'async function handleSlotClick(slotId) {',
        'function bindEvents() {'
    );

    const applyIdx = section.indexOf('if (!game.processPlayerInput(selectedSlotId, slotId))');
    assert.notEqual(applyIdx, -1);

    const soundIdx = section.indexOf('sound.playPiecePlaceForMove({', applyIdx);
    assert.notEqual(soundIdx, -1);

    const updateIdx = section.indexOf('updateScreen();', applyIdx);
    assert.notEqual(updateIdx, -1);

    assert.ok(soundIdx > applyIdx);
    assert.ok(soundIdx < updateIdx);
});

test('pul sesi turn confirm akisina birakilmaz ve undo akisinda calmiyor', () => {
    const source = readAppSource();

    const bindSection = getSection(
        source,
        'function bindEvents() {',
        "window.addEventListener('DOMContentLoaded', async () => {"
    );

    const confirmIdx = bindSection.indexOf("ui.confirmButton?.addEventListener('click', () => {");
    assert.notEqual(confirmIdx, -1);

    const confirmTail = bindSection.slice(confirmIdx, bindSection.indexOf('bindCanvasInput(canvas, {', confirmIdx));
    assert.equal(/playPiecePlaceForMove\(/.test(confirmTail), false);

    const undoIdx = bindSection.indexOf("ui.undoButton?.addEventListener('click', () => {");
    assert.notEqual(undoIdx, -1);

    const undoTail = bindSection.slice(undoIdx, bindSection.indexOf("ui.confirmButton?.addEventListener('click', () => {", undoIdx));
    assert.equal(/playPiecePlaceForMove\(/.test(undoTail), false);
});

test('hamle akislarinda pul sesi her bir uygulama noktasi icin tek kez cagrilir', () => {
    const source = readAppSource();

    const autoFlowSection = getSection(
        source,
        'const autoBearOffFlow = createAutoBearOffFlow({',
        'function schedule(callback, delay, meta = null) {'
    );
    assert.equal(
        (autoFlowSection.match(/playPiecePlaceForMove\(/g) || []).length,
        1
    );

    const botSection = getSection(
        source,
        'async function runBotMove() {',
        'function showGameOver(winner, messageKey = null) {'
    );
    assert.equal((botSection.match(/playPiecePlaceForMove\(/g) || []).length, 1);

    const humanSection = getSection(
        source,
        'async function handleSlotClick(slotId) {',
        'function bindEvents() {'
    );
    assert.equal((humanSection.match(/playPiecePlaceForMove\(/g) || []).length, 1);
});

test('her roll akisi tek bir birlesik zar sesi cagrisi yapar', () => {
    const source = readAppSource();
    const section = getSection(
        source,
        'function startAutomaticDiceRoll() {',
        'async function runBotMove() {'
    );

    assert.equal((section.match(/playDiceRollForRoll\(/g) || []).length, 1);
    assert.equal(/markRollAnimationStarted\(/.test(section), true);
    assert.equal(/markRollAnimationFinished\(/.test(section), true);
});

test('zar sesi klasik playDiceRoll ile degil roll token yolu ile tetiklenir', () => {
    const source = readAppSource();
    assert.equal(/sound\.playDiceRoll\(/.test(source), false);
    assert.equal(/sound\.playDiceRollForRoll\(/.test(source), true);
});
