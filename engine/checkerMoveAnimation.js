export const CHECKER_MOVE_DURATION_MS = 220;

function isEndpoint(slotId) {
    return Number.isInteger(slotId) && slotId >= 1 && slotId <= 25;
}

function getEndpointCount(game, slotId, player) {
    if (slotId === 25) {
        return game.board.borneOff?.[player] ?? 0;
    }

    const slot = game.board.slots?.[slotId];
    return slot?.player === player ? slot.count : 0;
}

export function captureCheckerTransition(game, {
    fromSlot,
    targetSlot,
    player = game?.currentPlayer
} = {}) {
    if (!game || !isEndpoint(fromSlot) || !isEndpoint(targetSlot)) {
        return null;
    }
    if (player !== 1 && player !== 2) return null;

    const sourceCountBefore = getEndpointCount(game, fromSlot, player);
    if (sourceCountBefore <= 0) return null;

    return {
        fromSlot,
        targetSlot,
        player,
        sourceCountBefore
    };
}

export function completeCheckerTransition(capture, game) {
    if (!capture || !game) return null;

    const targetCountAfter = getEndpointCount(
        game,
        capture.targetSlot,
        capture.player
    );
    if (targetCountAfter <= 0) return null;

    return {
        ...capture,
        targetCountAfter
    };
}

export function getCheckerMoveAnimationProfile(prefersReducedMotion) {
    return prefersReducedMotion
        ? { durationMs: 1, liftPx: 0 }
        : { durationMs: CHECKER_MOVE_DURATION_MS, liftPx: 24 };
}

export function easeCheckerMoveProgress(progress) {
    const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
    return 1 - Math.pow(1 - clamped, 3);
}

export function interpolateCheckerPoint({
    from,
    target,
    progress,
    liftPx = 0
}) {
    const eased = easeCheckerMoveProgress(progress);
    const arc = Math.sin(Math.PI * eased) * liftPx;

    return {
        x: from.x + ((target.x - from.x) * eased),
        y: from.y + ((target.y - from.y) * eased) - arc,
        scale: 1 - (0.18 * eased)
    };
}
