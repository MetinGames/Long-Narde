// engine/appRuntimeState.js

export function createAppRuntimeState() {
    let selectedSlotId = null;
    let totalMoveCounter = 0;
    let turnTimerInterval = null;
    const scheduledTimeouts = new Set();
    let isInitialStartPending = true;
    let isTimeoutResolutionInProgress = false;
    let hasVictoryMomentPlayed = false;
    let pendingRoll = null;
    let activeRollAnimationToken = null;
    let rollSequence = 0;
    let sessionToken = 0;

    function resetForSession({ initialStartPending }) {
        selectedSlotId = null;
        totalMoveCounter = 0;
        turnTimerInterval = null;
        scheduledTimeouts.clear();
        isInitialStartPending = initialStartPending;
        isTimeoutResolutionInProgress = false;
        hasVictoryMomentPlayed = false;
        pendingRoll = null;
        activeRollAnimationToken = null;
        sessionToken += 1;
    }

    return {
        getSelectedSlotId() {
            return selectedSlotId;
        },
        setSelectedSlotId(slotId) {
            selectedSlotId = slotId;
        },
        clearSelectedSlotId() {
            selectedSlotId = null;
        },

        getTotalMoveCounter() {
            return totalMoveCounter;
        },
        resetTotalMoveCounter() {
            totalMoveCounter = 0;
        },
        setTotalMoveCounter(value) {
            totalMoveCounter = Number.isSafeInteger(value) && value >= 0
                ? value
                : 0;
            return totalMoveCounter;
        },
        incrementTotalMoveCounter(amount = 1) {
            const safeAmount = Number.isSafeInteger(amount) && amount > 0
                ? amount
                : 1;
            totalMoveCounter += safeAmount;
            return totalMoveCounter;
        },
        decrementTotalMoveCounter(amount = 1) {
            const safeAmount = Number.isSafeInteger(amount) && amount > 0
                ? amount
                : 1;
            totalMoveCounter = Math.max(0, totalMoveCounter - safeAmount);
            return totalMoveCounter;
        },

        getTurnTimerInterval() {
            return turnTimerInterval;
        },
        setTurnTimerInterval(intervalId) {
            turnTimerInterval = intervalId;
        },
        clearTurnTimerInterval() {
            turnTimerInterval = null;
        },

        addScheduledTimeout(timeoutId) {
            scheduledTimeouts.add(timeoutId);
        },
        removeScheduledTimeout(timeoutId) {
            scheduledTimeouts.delete(timeoutId);
        },
        clearScheduledTimeouts(cancel) {
            for (const timeoutId of scheduledTimeouts) {
                cancel(timeoutId);
            }
            scheduledTimeouts.clear();
        },
        getScheduledTimeoutCount() {
            return scheduledTimeouts.size;
        },

        isInitialStartPending() {
            return isInitialStartPending;
        },
        setInitialStartPending(value) {
            isInitialStartPending = Boolean(value);
        },

        isTimeoutResolutionInProgress() {
            return isTimeoutResolutionInProgress;
        },
        setTimeoutResolutionInProgress(value) {
            isTimeoutResolutionInProgress = Boolean(value);
        },

        hasVictoryMomentPlayed() {
            return hasVictoryMomentPlayed;
        },
        setVictoryMomentPlayed(value) {
            hasVictoryMomentPlayed = Boolean(value);
        },

        getOrCreatePendingRollToken(player) {
            if (
                pendingRoll &&
                pendingRoll.player === player
            ) {
                return pendingRoll.token;
            }

            rollSequence += 1;
            pendingRoll = {
                token: rollSequence,
                player
            };
            return pendingRoll.token;
        },
        markRollAnimationStarted(rollToken) {
            if (activeRollAnimationToken !== null) {
                return false;
            }

            if (!pendingRoll || pendingRoll.token !== rollToken) {
                return false;
            }

            activeRollAnimationToken = rollToken;
            return true;
        },
        markRollAnimationFinished(rollToken) {
            if (activeRollAnimationToken === rollToken) {
                activeRollAnimationToken = null;
            }

            if (pendingRoll?.token === rollToken) {
                pendingRoll = null;
            }
        },
        cancelPendingRoll() {
            pendingRoll = null;
            activeRollAnimationToken = null;
        },

        captureSessionToken() {
            return sessionToken;
        },
        invalidateSessionToken() {
            sessionToken += 1;
            return sessionToken;
        },
        isSessionTokenCurrent(token) {
            return token === sessionToken;
        },

        resetForSession
    };
}
