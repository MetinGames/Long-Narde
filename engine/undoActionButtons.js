// engine/undoActionButtons.js

export function getActionButtonState(game) {
    if (!game) {
        return {
            canUndo: false,
            canConfirm: false
        };
    }

    const isHumanPlayingTurn =
        game.currentPlayer === 1 &&
        game.gameStatus === 'PLAYING';

    const canUndo =
        isHumanPlayingTurn &&
        game.moveHistory.length > 0;

    const canConfirm =
        isHumanPlayingTurn &&
        !(
            game.availableMoves.length > 0 &&
            game.hasValidMoves()
        );

    return {
        canUndo,
        canConfirm
    };
}

export function shouldShowActionButtonsAfterUndo(game) {
    if (!game) return false;

    return game.currentPlayer === 1 &&
        game.gameStatus === 'PLAYING' &&
        game.moveHistory.length > 0;
}

export function applyPostUndoLayout({ game, ui }) {
    if (!ui) return;

    if (shouldShowActionButtonsAfterUndo(game)) {
        ui.setHumanMoveLayout();
        return;
    }

    ui.setHumanPlayingLayout();
}
