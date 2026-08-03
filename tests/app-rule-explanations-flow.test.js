import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readAppSource() {
    return fs.readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
}

test('app routes engine reasons through the rule explanation catalog', () => {
    const source = readAppSource();

    assert.equal(
        source.includes(
            "getUnplayableRuleExplanation\n" +
            "} from './engine/ruleExplanations.js';"
        ),
        true
    );
    assert.equal(
        source.includes(
            'const explanation = getUnplayableRuleExplanation(reason);'
        ),
        true
    );
    assert.equal(
        source.includes('setStatus(t(explanation.messageKey));'),
        true
    );
});

test('automatic no-move pass uses the catalog without changing turn authority', () => {
    const source = readAppSource();
    const start = source.indexOf('function passCurrentTurnWhenNoLegalMove() {');
    const end = source.indexOf('function beginCurrentTurn(options = {})', start);
    const section = source.slice(start, end);

    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    assert.equal(
        section.includes('getNoLegalMoveRuleExplanation().messageKey'),
        true
    );
    assert.equal(section.includes('applyNoLegalMoveAutoPass({'), true);
});
