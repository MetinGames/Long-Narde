export function hasAnyRuleCompliantTurnStart(game, { player = game?.currentPlayer } = {}) {
    if (!game || game.gameStatus !== 'PLAYING') return false;
    if (game.currentPlayer !== player) return false;
    if (!Array.isArray(game.availableMoves) || game.availableMoves.length === 0) {
        return false;
    }

    for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
        const slot = game.board.slots[fromSlot];
        if (!slot || slot.player !== player || slot.count <= 0) {
            continue;
        }

        const sequences = game.getRuleCompliantDiceSequences(fromSlot);
        if (Array.isArray(sequences) && sequences.length > 0) {
            return true;
        }
    }

    return false;
}

export function applyNoLegalMoveAutoPass({
    game,
    runtimeState,
    timeoutController,
    bot,
    autoBearOffFlow,
    resetBotCallbackGuards = () => {},
    stopTurnTimer = () => {},
    endBotMoveFeedback = () => {}
}) {
    if (!game || game.gameStatus !== 'PLAYING') {
        return { passed: false };
    }

    const actingPlayer = game.currentPlayer;

    if (hasAnyRuleCompliantTurnStart(game, { player: actingPlayer })) {
        return { passed: false };
    }

    runtimeState?.invalidateSessionToken?.();
    runtimeState?.clearSelectedSlotId?.();

    bot?.resetPlannedTurn?.();
    autoBearOffFlow?.stop?.('no-legal-move-auto-pass');
    resetBotCallbackGuards();

    stopTurnTimer();
    timeoutController?.stopTurnDeadline?.();

    // No legal move pass should not carry per-turn preview history into next turn.
    game.moveHistory = [];

    endBotMoveFeedback();

    const fromPlayer = actingPlayer;
    game.confirmTurnEnd();

    return {
        passed: true,
        fromPlayer,
        toPlayer: game.currentPlayer
    };
}
