// engine/botTurnTouchFeedback.js

export class BotTurnTouchFeedback {
    constructor() {
        this.hasShownInCurrentBotTurn = false;
    }

    reset() {
        this.hasShownInCurrentBotTurn = false;
    }

    shouldShowWaitMessage({
        isStartScreen,
        gameStatus,
        currentPlayer
    }) {
        if (isStartScreen) return false;
        if (gameStatus === 'GAME_OVER') return false;
        if (currentPlayer !== 2) return false;
        if (this.hasShownInCurrentBotTurn) return false;

        this.hasShownInCurrentBotTurn = true;
        return true;
    }
}
