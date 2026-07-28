// engine/timeoutController.js

const FINAL_FORFEIT_SECONDS = 60;

function clampNonNegative(value) {
    return Math.max(0, value);
}

export class TurnTimeoutController {
    constructor(options = {}) {
        this.getNow = options.getNow || (() => Date.now());
        this.finalForfeitSeconds =
            options.finalForfeitSeconds || FINAL_FORFEIT_SECONDS;

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
        const normalTurnDeadlineAt = now + (turnDurationSeconds * 1000);

        if (timeoutStrikes > 0 && this.absoluteForfeitDeadlineAt > 0) {
            this.turnDeadlineAt = Math.min(
                normalTurnDeadlineAt,
                this.absoluteForfeitDeadlineAt
            );
            return;
        }

        this.turnDeadlineAt = normalTurnDeadlineAt;
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

        if (
            timeoutStrikes === 1 &&
            this.absoluteForfeitDeadlineAt > 0 &&
            now >= this.absoluteForfeitDeadlineAt
        ) {
            if (
                this.lastProcessedForfeitDeadlineAt ===
                this.absoluteForfeitDeadlineAt
            ) {
                return { action: 'none', remainingSeconds: 0 };
            }

            this.lastProcessedForfeitDeadlineAt =
                this.absoluteForfeitDeadlineAt;
            this.turnDeadlineAt = 0;
            return { action: 'finalTimeout', remainingSeconds: 0 };
        }

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
            this.absoluteForfeitDeadlineAt =
                now + (this.finalForfeitSeconds * 1000);

            return {
                action: 'firstTimeout',
                remainingSeconds: 0,
                absoluteForfeitDeadlineAt: this.absoluteForfeitDeadlineAt
            };
        }

        return { action: 'finalTimeout', remainingSeconds: 0 };
    }
}
