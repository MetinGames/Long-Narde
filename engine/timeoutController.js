// engine/timeoutController.js

function clampNonNegative(value) {
    return Math.max(0, value);
}

export class TurnTimeoutController {
    constructor(options = {}) {
        this.getNow = options.getNow || (() => Date.now());

        this.turnDeadlineAt = 0;
        this.absoluteForfeitDeadlineAt = 0;

        this.lastProcessedTurnDeadlineAt = 0;
        this.lastProcessedForfeitDeadlineAt = 0;
    }

    resetAll() {
        this.turnDeadlineAt = 0;
        this.absoluteForfeitDeadlineAt = 0;
        this.lastProcessedTurnDeadlineAt = 0;
        this.lastProcessedForfeitDeadlineAt = 0;
    }

    stopTurnDeadline() {
        this.turnDeadlineAt = 0;
    }

    clearForfeitWindow() {
        this.absoluteForfeitDeadlineAt = 0;
        this.lastProcessedForfeitDeadlineAt = 0;
    }

    startHumanTurn(turnDurationSeconds, timeoutStrikes) {
        const now = this.getNow();
        this.turnDeadlineAt = now + (turnDurationSeconds * 1000);

        if (timeoutStrikes > 0) {
            this.absoluteForfeitDeadlineAt = this.turnDeadlineAt;
        } else {
            this.absoluteForfeitDeadlineAt = 0;
            this.lastProcessedForfeitDeadlineAt = 0;
        }
    }

    getRemainingSeconds() {
        if (!this.turnDeadlineAt) return 0;

        return clampNonNegative(
            Math.ceil((this.turnDeadlineAt - this.getNow()) / 1000)
        );
    }

    evaluate({
        isStartScreen,
        gameStatus,
        currentPlayer,
        timeoutStrikes
    }) {
        if (isStartScreen || gameStatus === 'GAME_OVER') {
            return { action: 'none', remainingSeconds: 0 };
        }

        const now = this.getNow();

        if (currentPlayer !== 1 || !this.turnDeadlineAt) {
            return { action: 'none', remainingSeconds: 0 };
        }

        const remainingSeconds = this.getRemainingSeconds();
        if (remainingSeconds > 0) {
            return { action: 'none', remainingSeconds };
        }

        if (this.lastProcessedTurnDeadlineAt === this.turnDeadlineAt) {
            return { action: 'none', remainingSeconds: 0 };
        }

        this.lastProcessedTurnDeadlineAt = this.turnDeadlineAt;
        this.turnDeadlineAt = 0;

        if (timeoutStrikes === 0) {
            return {
                action: 'firstTimeout',
                remainingSeconds: 0
            };
        }

        if (this.absoluteForfeitDeadlineAt > 0) {
            this.lastProcessedForfeitDeadlineAt =
                this.absoluteForfeitDeadlineAt;
        }

        return { action: 'finalTimeout', remainingSeconds: 0 };
    }
}
