// engine/appRuntimeState.js

export function createAppRuntimeState() {
    let selectedSlotId = null;
    let totalMoveCounter = 0;
    let turnTimerInterval = null;
    const scheduledTimeouts = new Set();
    let isInitialStartPending = true;
    let isTimeoutResolutionInProgress = false;
    let hasVictoryMomentPlayed = false;
    let sessionToken = 0;

    function resetForSession({ initialStartPending }) {
        selectedSlotId = null;
        totalMoveCounter = 0;
        turnTimerInterval = null;
        scheduledTimeouts.clear();
        isInitialStartPending = initialStartPending;
        isTimeoutResolutionInProgress = false;
        hasVictoryMomentPlayed = false;
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
        incrementTotalMoveCounter() {
            totalMoveCounter += 1;
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