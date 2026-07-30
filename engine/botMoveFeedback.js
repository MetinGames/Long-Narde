// engine/botMoveFeedback.js

const DEFAULT_HIGHLIGHT_DURATION_MS = 1250;
const REDUCED_MOTION_HIGHLIGHT_DURATION_MS = 1000;

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
