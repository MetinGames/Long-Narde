// engine/victoryMoment.js

const WIN_END_REASONS = new Set(['white_win', 'black_win']);

export function isNormalBearOffVictory({
    winner,
    endReason,
    targetId
}) {
    return (
        (winner === 1 || winner === 2) &&
        targetId === 25 &&
        WIN_END_REASONS.has(endReason)
    );
}

export function getVictoryMomentProfile(prefersReducedMotion) {
    if (prefersReducedMotion) {
        return {
            durationMs: 220,
            settleDurationMs: 110,
            flashDurationMs: 190
        };
    }

    return {
        durationMs: 260,
        settleDurationMs: 140,
        flashDurationMs: 240
    };
}

export function shouldRunVictoryMoment({
    winner,
    endReason,
    targetId,
    alreadyTriggered
}) {
    if (alreadyTriggered) return false;

    return isNormalBearOffVictory({
        winner,
        endReason,
        targetId
    });
}

export function triggerVictoryMomentHook(hook, payload) {
    if (typeof hook !== 'function') return;
    hook(payload);
}
