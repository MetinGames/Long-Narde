export const RULE_EXPLANATION_CODE = Object.freeze({
    PIECE_BLOCKED: 'pieceBlocked',
    HEAD_LIMIT: 'headLimit',
    MAXIMUM_DICE_USE: 'maximumDiceUse',
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
    [RULE_EXPLANATION_CODE.NO_LEGAL_MOVE]: Object.freeze({
        code: RULE_EXPLANATION_CODE.NO_LEGAL_MOVE,
        messageKey: 'ruleExplanation.noLegalMove'
    })
});

const UNPLAYABLE_REASON_TO_CODE = Object.freeze({
    headBlocked: RULE_EXPLANATION_CODE.HEAD_LIMIT,
    maxMoveConstraint: RULE_EXPLANATION_CODE.MAXIMUM_DICE_USE,
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
