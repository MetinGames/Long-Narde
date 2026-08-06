// engine/botMoveFeedback.js

export const BOT_MOVE_PACING_MS = Object.freeze({
    simple: 650,
    standard: 760,
    complex: 900,
    collectBonus: 80,
    reducedMotionMinimum: 760,
    maximum: 980
});

const DEFAULT_HIGHLIGHT_DURATION_MS = 1700;
const REDUCED_MOTION_HIGHLIGHT_DURATION_MS = 1500;

export function getBotMoveStepDelay({
    remainingMoveRights = 0,
    isDouble = false,
    afterCollect = false,
    reducedMotion = false
} = {}) {
    const rights = Math.max(0, Number(remainingMoveRights) || 0);
    let delay = BOT_MOVE_PACING_MS.simple;

    if (rights >= 3 || isDouble) {
        delay = BOT_MOVE_PACING_MS.complex;
    } else if (rights >= 2) {
        delay = BOT_MOVE_PACING_MS.standard;
    }

    if (afterCollect) {
        delay += BOT_MOVE_PACING_MS.collectBonus;
    }

    if (reducedMotion) {
        delay = Math.max(delay, BOT_MOVE_PACING_MS.reducedMotionMinimum);
    }

    return Math.min(delay, BOT_MOVE_PACING_MS.maximum);
}

export function clearBotMoveFeedback(renderer) {
    renderer?.clearBotMoveHighlight?.();
}

export function startBotMoveFeedback(renderer) {
    clearBotMoveFeedback(renderer);
}

export function applyBotMoveFeedback(
    renderer,
    {
        fromSlot,
        targetSlot,
        reducedMotion
    }
) {
    renderer?.setBotMoveHighlight?.({
        fromSlot,
        targetSlot,
        reducedMotion,
        durationMs: reducedMotion
            ? REDUCED_MOTION_HIGHLIGHT_DURATION_MS
            : DEFAULT_HIGHLIGHT_DURATION_MS
    });
}

export function resetBotMoveFeedback(renderer) {
    clearBotMoveFeedback(renderer);
}

export function endBotMoveFeedback(renderer) {
    clearBotMoveFeedback(renderer);
}
