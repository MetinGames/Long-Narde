// engine/botMoveFeedback.js

export const BOT_MOVE_STEP_DELAY_MS = 900;

const DEFAULT_HIGHLIGHT_DURATION_MS = 1700;
const REDUCED_MOTION_HIGHLIGHT_DURATION_MS = 1500;

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
