export const AUTO_TURN_CONFIRM_STORAGE_KEY =
    'nardora.autoTurnConfirm.v1';
export const AUTO_TURN_CONFIRM_DELAY_MS = 2000;
export const DEFAULT_AUTO_TURN_CONFIRM_ENABLED = false;

export function normalizeAutoTurnConfirmEnabled(value) {
    return value === true || value === 'true';
}

export function readAutoTurnConfirmPreference(storage) {
    if (!storage) return DEFAULT_AUTO_TURN_CONFIRM_ENABLED;

    try {
        return normalizeAutoTurnConfirmEnabled(
            storage.getItem(AUTO_TURN_CONFIRM_STORAGE_KEY)
        );
    } catch {
        return DEFAULT_AUTO_TURN_CONFIRM_ENABLED;
    }
}

export function persistAutoTurnConfirmPreference(storage, value) {
    const enabled = normalizeAutoTurnConfirmEnabled(value);
    if (!storage) return enabled;

    try {
        storage.setItem(
            AUTO_TURN_CONFIRM_STORAGE_KEY,
            String(enabled)
        );
    } catch {
        // The in-memory choice still applies when browser storage is blocked.
    }

    return enabled;
}

export class AutoTurnConfirmPreferenceController {
    constructor({
        toggle = null,
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        onChange = () => {}
    } = {}) {
        this.toggle = toggle;
        this.storage = storage;
        this.onChange = onChange;
        this.enabled = DEFAULT_AUTO_TURN_CONFIRM_ENABLED;
        this.changeHandler = null;
    }

    start() {
        if (!this.toggle || this.changeHandler) return false;

        this.changeHandler = event => {
            this.setEnabled(event?.target?.checked);
        };
        this.toggle.addEventListener('change', this.changeHandler);
        this.setEnabled(
            readAutoTurnConfirmPreference(this.storage),
            { persist: false }
        );
        return true;
    }

    setEnabled(value, { persist = true, notify = true } = {}) {
        const enabled = normalizeAutoTurnConfirmEnabled(value);
        this.enabled = persist
            ? persistAutoTurnConfirmPreference(this.storage, enabled)
            : enabled;

        if (this.toggle) {
            this.toggle.checked = this.enabled;
        }
        if (notify) this.onChange(this.enabled);
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    stop() {
        if (!this.toggle || !this.changeHandler) return false;

        this.toggle.removeEventListener('change', this.changeHandler);
        this.changeHandler = null;
        return true;
    }
}

export function isAutoTurnConfirmEligible(game, { player = 1 } = {}) {
    if (!game) return false;

    const isHumanPlayingTurn =
        game.currentPlayer === player &&
        game.gameStatus === 'PLAYING';
    const hasMoveToUndo =
        Array.isArray(game.moveHistory) &&
        game.moveHistory.length > 0;
    const hasRequiredMove =
        game.availableMoves.length > 0 &&
        game.hasValidMoves();

    return isHumanPlayingTurn &&
        hasMoveToUndo &&
        !hasRequiredMove;
}

export function createAutoTurnConfirmFlow({
    game,
    player = 1,
    delayMs = AUTO_TURN_CONFIRM_DELAY_MS,
    getContext = () => ({}),
    scheduleConfirm = (callback, delay) => setTimeout(callback, delay),
    cancelConfirm = timeoutId => clearTimeout(timeoutId),
    onPendingChange = () => {},
    onConfirm = () => {}
} = {}) {
    let pendingTask = null;
    let flowToken = 0;
    let lastStopReason = null;

    function canRunInCurrentContext() {
        const context = getContext() || {};

        if (context.isEnabled !== true) return false;
        if (context.isStartScreen === true) return false;
        if (context.isTimeoutResolutionInProgress === true) return false;
        if (context.isCheckerMoveAnimating === true) return false;
        if (context.isAutoBearOffRunning === true) return false;

        return isAutoTurnConfirmEligible(game, { player });
    }

    function stop(reason = 'stopped') {
        const wasPending = pendingTask !== null;
        flowToken += 1;
        lastStopReason = reason;

        if (pendingTask !== null) {
            cancelConfirm(pendingTask.timeoutId);
            pendingTask = null;
        }

        if (wasPending) {
            onPendingChange(false, { reason });
        }
        return wasPending;
    }

    function evaluate() {
        if (!canRunInCurrentContext()) {
            stop('ineligible');
            return false;
        }

        if (pendingTask !== null) return true;

        const expectedToken = ++flowToken;
        const timeoutId = scheduleConfirm(() => {
            if (
                pendingTask === null ||
                expectedToken !== flowToken
            ) {
                return;
            }

            pendingTask = null;
            if (!canRunInCurrentContext()) {
                lastStopReason = 'revalidation-failed';
                onPendingChange(false, {
                    reason: lastStopReason
                });
                return;
            }

            lastStopReason = 'confirmed';
            onPendingChange(false, { reason: lastStopReason });
            onConfirm();
        }, delayMs);

        pendingTask = {
            timeoutId,
            token: expectedToken
        };
        lastStopReason = null;
        onPendingChange(true, { delayMs });
        return true;
    }

    return {
        evaluate,
        stop,
        isPending() {
            return pendingTask !== null;
        },
        getLastStopReason() {
            return lastStopReason;
        }
    };
}
