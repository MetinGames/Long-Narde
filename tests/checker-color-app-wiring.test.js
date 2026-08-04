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

test('devam eden maç seçilmiş pul rengini kaydeder ve geri yükler', () => {
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
        /humanCheckerColor:\s*renderer\.getHumanCheckerColor\(\)/
    );
    assert.match(
        resumeSection,
        /setColor\(snapshot\.humanCheckerColor\)/
    );
});

test('başlangıç radio seçenekleri renderer eşlemesini canlı günceller', () => {
    const bindingSection = getSection(
        'function bindEvents() {',
        "window.addEventListener('DOMContentLoaded'"
    );

    assert.match(
        bindingSection,
        /querySelectorAll\('input\[name="checker-color"\]'\)/
    );
    assert.match(
        bindingSection,
        /renderer\.setHumanCheckerColor\(color\)/
    );
    assert.match(
        bindingSection,
        /checkerColorPreferenceController\.start\(\)/
    );
});
