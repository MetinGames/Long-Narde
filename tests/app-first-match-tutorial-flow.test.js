import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readAppSource() {
    return fs.readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
}

test('app wires the first-match tutorial to the existing reopenable guide', () => {
    const source = readAppSource();

    assert.equal(
        source.includes(
            "createFirstMatchTutorialController\n" +
            "} from './engine/firstMatchTutorial.js';"
        ),
        true
    );
    assert.equal(
        source.includes(
            'firstMatchTutorialController = ' +
            'createFirstMatchTutorialController({'
        ),
        true
    );
    assert.equal(
        source.includes('openButton: howToPlayButton'),
        true
    );
});

test('automatic guide opening happens only after the start screen is ready', () => {
    const source = readAppSource();
    const bootStart = source.indexOf(
        "window.addEventListener('DOMContentLoaded'"
    );
    const bootSection = source.slice(bootStart);
    const initializeIndex = bootSection.indexOf('initializeBeforeStart();');
    const tutorialIndex = bootSection.indexOf(
        'firstMatchTutorialController?.openIfNeeded('
    );

    assert.notEqual(bootStart, -1);
    assert.notEqual(initializeIndex, -1);
    assert.notEqual(tutorialIndex, -1);
    assert.ok(initializeIndex < tutorialIndex);
});
