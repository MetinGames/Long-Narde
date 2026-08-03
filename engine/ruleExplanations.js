export const RULE_EXPLANATION_CODE = Object.freeze({
    PIECE_BLOCKED: 'pieceBlocked',
    HEAD_LIMIT: 'headLimit',
    MAXIMUM_DICE_USE: 'maximumDiceUse',
    ILLEGAL_PRIME: 'illegalPrime',
    BEARING_OFF_HOME_REQUIRED: 'bearingOffHomeRequired',
    BEARING_OFF_FARTHER_CHECKER: 'bearingOffFartherChecker',
    NO_LEGAL_MOVE: 'noLegalMove'
});

const EXPLANATIONS = Object.freeze({
    [RULE_EXPLANATION_CODE.PIECE_BLOCKED]: Object.freeze({
        code: RULE_EXPLANATION_CODE.PIECE_BLOCKED,
        messageKey: 'ruleExplanation.pieceBlocked'
    }),
    [RULE_EXPLANATION_CODE.HEAD_LIMIT]: Object.freeze({
        code: RULE_EXPLANATION_CODE.HEAD_LIMIT,
        messageKey: 'ruleExplanation.headLimit'
    }),
    [RULE_EXPLANATION_CODE.MAXIMUM_DICE_USE]: Object.freeze({
        code: RULE_EXPLANATION_CODE.MAXIMUM_DICE_USE,
        messageKey: 'ruleExplanation.maximumDiceUse'
    }),
    [RULE_EXPLANATION_CODE.ILLEGAL_PRIME]: Object.freeze({
        code: RULE_EXPLANATION_CODE.ILLEGAL_PRIME,
        messageKey: 'ruleExplanation.illegalPrime'
    }),
    [RULE_EXPLANATION_CODE.BEARING_OFF_HOME_REQUIRED]: Object.freeze({
        code: RULE_EXPLANATION_CODE.BEARING_OFF_HOME_REQUIRED,
        messageKey: 'ruleExplanation.bearingOffHomeRequired'
    }),
    [RULE_EXPLANATION_CODE.BEARING_OFF_FARTHER_CHECKER]: Object.freeze({
        code: RULE_EXPLANATION_CODE.BEARING_OFF_FARTHER_CHECKER,
        messageKey: 'ruleExplanation.bearingOffFartherChecker'
    }),
    [RULE_EXPLANATION_CODE.NO_LEGAL_MOVE]: Object.freeze({
        code: RULE_EXPLANATION_CODE.NO_LEGAL_MOVE,
        messageKey: 'ruleExplanation.noLegalMove'
    })
});

const UNPLAYABLE_REASON_TO_CODE = Object.freeze({
    headBlocked: RULE_EXPLANATION_CODE.HEAD_LIMIT,
    maxMoveConstraint: RULE_EXPLANATION_CODE.MAXIMUM_DICE_USE,
    illegalPrime: RULE_EXPLANATION_CODE.ILLEGAL_PRIME,
    bearingOffHomeRequired:
        RULE_EXPLANATION_CODE.BEARING_OFF_HOME_REQUIRED,
    bearingOffFartherChecker:
        RULE_EXPLANATION_CODE.BEARING_OFF_FARTHER_CHECKER,
    pieceBlocked: RULE_EXPLANATION_CODE.PIECE_BLOCKED
});

export function getUnplayableRuleExplanation(reason) {
    const code =
        UNPLAYABLE_REASON_TO_CODE[reason] ||
        RULE_EXPLANATION_CODE.PIECE_BLOCKED;

    return EXPLANATIONS[code];
}

export function getNoLegalMoveRuleExplanation() {
    return EXPLANATIONS[RULE_EXPLANATION_CODE.NO_LEGAL_MOVE];
}
