import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function getSection(startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    assert.ok(start >= 0, `Missing ${startMarker}`);
    assert.ok(end > start, `Missing ${endMarker}`);
    return source.slice(start, end);
}

test('auto confirm is persisted and restored with an unfinished match', () => {
    const persistSection = getSection(
        'function persistOngoingMatch() {',
        'function refreshContinueMatchEntry('
    );
    const resumeSection = getSection(
        'function resumeSavedMatch() {',
        'function clearRuntimeTasks() {'
    );

    assert.match(
        persistSection,
        /autoTurnConfirmEnabled:[\s\S]*autoTurnConfirmPreferenceController\?\.isEnabled\(\)/
    );
    assert.match(
        resumeSection,
        /setEnabled\([\s\S]*snapshot\.autoTurnConfirmEnabled/
    );
    assert.match(resumeSection, /synchronizeAutoTurnConfirmFlow\(\)/);
});

test('Undo and manual confirmation cancel the grace callback first', () => {
    const bindingSection = getSection(
        'function bindEvents() {',
        "window.addEventListener('DOMContentLoaded'"
    );
    const undoStop = bindingSection.indexOf(
        "autoTurnConfirmFlow.stop('undo')"
    );
    const undoMove = bindingSection.indexOf('game.undoLastMove()');
    assert.ok(undoStop >= 0 && undoStop < undoMove);

    const manualStop = bindingSection.indexOf(
        "autoTurnConfirmFlow.stop('manual-confirm')"
    );
    const finishTurn = bindingSection.indexOf(
        'finishCurrentTurn()',
        manualStop
    );
    assert.ok(manualStop >= 0 && manualStop < finishTurn);
});

test('turn, timeout, runtime, and auto-pass transitions stop pending confirmation', () => {
    for (const reason of [
        'runtime-cleared',
        'app-resumed',
        'game-terminated',
        'timeout-resolution',
        'turn-finished',
        'turn-changed',
        'no-legal-move-auto-pass'
    ]) {
        assert.ok(
            source.includes(`autoTurnConfirmFlow.stop('${reason}')`),
            `Missing lifecycle cancellation: ${reason}`
        );
    }
});

test('completed human moves evaluate auto confirm after checker animation', () => {
    const moveSection = getSection(
        'async function handleSlotClick(slotId) {',
        'function bindEvents() {'
    );
    const transition = moveSection.indexOf(
        'await playAppliedCheckerTransition(transition)'
    );
    const synchronize = moveSection.indexOf(
        'synchronizeAutoTurnConfirmFlow()'
    );

    assert.ok(transition >= 0 && transition < synchronize);
});
