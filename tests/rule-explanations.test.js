import test from 'node:test';
import assert from 'node:assert/strict';

import {
    RULE_EXPLANATION_CODE,
    getNoLegalMoveRuleExplanation,
    getUnplayableRuleExplanation
} from '../engine/ruleExplanations.js';

test('engine unplayable reasons map to stable explanation keys', () => {
    assert.deepEqual(getUnplayableRuleExplanation('headBlocked'), {
        code: RULE_EXPLANATION_CODE.HEAD_LIMIT,
        messageKey: 'ruleExplanation.headLimit'
    });
    assert.deepEqual(getUnplayableRuleExplanation('maxMoveConstraint'), {
        code: RULE_EXPLANATION_CODE.MAXIMUM_DICE_USE,
        messageKey: 'ruleExplanation.maximumDiceUse'
    });
    assert.deepEqual(getUnplayableRuleExplanation('pieceBlocked'), {
        code: RULE_EXPLANATION_CODE.PIECE_BLOCKED,
        messageKey: 'ruleExplanation.pieceBlocked'
    });
    assert.deepEqual(getUnplayableRuleExplanation('illegalPrime'), {
        code: RULE_EXPLANATION_CODE.ILLEGAL_PRIME,
        messageKey: 'ruleExplanation.illegalPrime'
    });
    assert.deepEqual(
        getUnplayableRuleExplanation('bearingOffHomeRequired'),
        {
            code: RULE_EXPLANATION_CODE.BEARING_OFF_HOME_REQUIRED,
            messageKey: 'ruleExplanation.bearingOffHomeRequired'
        }
    );
    assert.deepEqual(
        getUnplayableRuleExplanation('bearingOffFartherChecker'),
        {
            code: RULE_EXPLANATION_CODE.BEARING_OFF_FARTHER_CHECKER,
            messageKey: 'ruleExplanation.bearingOffFartherChecker'
        }
    );
});

test('unknown reasons fail safe to the generic blocked-piece explanation', () => {
    assert.deepEqual(getUnplayableRuleExplanation('future-reason'), {
        code: RULE_EXPLANATION_CODE.PIECE_BLOCKED,
        messageKey: 'ruleExplanation.pieceBlocked'
    });
});

test('automatic pass uses its own engine-owned explanation', () => {
    assert.deepEqual(getNoLegalMoveRuleExplanation(), {
        code: RULE_EXPLANATION_CODE.NO_LEGAL_MOVE,
        messageKey: 'ruleExplanation.noLegalMove'
    });
});
